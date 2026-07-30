<?php

require_once dirname(__DIR__) . "/config/database.php";

class ExpertDashboardAnalyticsService {
    private PDO $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->connect();
    }

    public function getDashboardAnalytics(int $userId): array {
        $cards = $this->getCardsWithChangePercentages($userId);

        $analyticsData = [
            'cards' => $cards,
            'daily_working_analytics' => $this->getDailyWorkingAnalytics($userId),
        ];

        return $analyticsData;
    }

    private function getCardsWithChangePercentages(int $userId): array {
        $cardsQuery = "
            SELECT
                COUNT(DISTINCT CASE
                    WHEN LOWER(tsm.name) = 'assigned'
                    THEN t.id
                END) AS assigned_count,
                COUNT(DISTINCT CASE
                    WHEN LOWER(tsm.name) = 'completed'
                    THEN t.id
                END) AS completed_count,
                COUNT(DISTINCT CASE
                    WHEN LOWER(tsm.name) = 'success'
                    THEN t.id
                END) AS success_count,
                COUNT(DISTINCT CASE
                    WHEN LOWER(tsm.name) = 'rejected'
                    THEN t.id
                END) AS rejected_count
            FROM task_assignments ta
            INNER JOIN tasks t
                ON t.id = ta.task_id
            INNER JOIN task_status_master tsm
                ON tsm.id = t.status_id
            WHERE ta.user_id = :user_id
              AND ta.is_active = 1
              AND DATE(t.created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        ";

        $cardsStmt = $this->conn->prepare($cardsQuery);
        $cardsStmt->execute([':user_id' => $userId]);
        $cardCounts = $cardsStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $today = new DateTimeImmutable('today');
        $currentStart = $today->modify('-29 days')->format('Y-m-d');
        $currentEnd = $today->format('Y-m-d');
        $previousStart = $today->modify('-59 days')->format('Y-m-d');
        $previousEnd = $today->modify('-30 days')->format('Y-m-d');

        $periodQuery = "
            SELECT
                LOWER(tsm.name) AS status_name,
                COUNT(DISTINCT t.id) AS total_count
            FROM task_assignments ta
            INNER JOIN tasks t
                ON t.id = ta.task_id
            INNER JOIN task_status_master tsm
                ON tsm.id = t.status_id
            WHERE ta.user_id = :user_id
              AND ta.is_active = 1
              AND DATE(t.created_at) BETWEEN :start_date AND :end_date
            GROUP BY LOWER(tsm.name)
        ";

        $currentCounts = $this->fetchStatusCountsForPeriod($periodQuery, $userId, $currentStart, $currentEnd);
        $previousCounts = $this->fetchStatusCountsForPeriod($periodQuery, $userId, $previousStart, $previousEnd);

        $statuses = ['assigned', 'completed', 'success', 'rejected'];
        $result = [];

        foreach ($statuses as $status) {
            $countKey = $status . '_count';
            $currentTotal = (int)($currentCounts[$status] ?? 0);
            $previousTotal = (int)($previousCounts[$status] ?? 0);

            $changePercentage = 0;
            if ($previousTotal > 0) {
                $changePercentage = (int)round((($currentTotal - $previousTotal) / $previousTotal) * 100);
            } elseif ($currentTotal > 0) {
                $changePercentage = 100;
            }

            $result[$status] = [
                'count' => (int)($cardCounts[$countKey] ?? 0),
                'change_percentage' => $changePercentage,
            ];
        }

        return $result;
    }

    private function fetchStatusCountsForPeriod(string $query, int $userId, string $startDate, string $endDate): array {
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            ':user_id' => $userId,
            ':start_date' => $startDate,
            ':end_date' => $endDate,
        ]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $counts = [];

        foreach ($rows as $row) {
            $statusName = (string)($row['status_name'] ?? '');
            $counts[$statusName] = (int)($row['total_count'] ?? 0);
        }

        return $counts;
    }

    public function recalculateCompletedTaskDurations(int $userId): array {
        $eligibleWhere = "ta.user_id = :logged_in_expert_id
            AND LOWER(ts.name) = 'completed'
            AND (
                t.duration IS NULL
                OR t.duration = 0
                OR t.duration = ''
            )
            AND t.task_start_time IS NOT NULL
            AND t.task_end_time IS NOT NULL
            AND t.task_end_time > t.task_start_time";

        $skippedWhere = "ta.user_id = :logged_in_expert_id
            AND LOWER(ts.name) = 'completed'
            AND (
                t.duration IS NULL
                OR t.duration = 0
                OR t.duration = ''
            )
            AND (
                t.task_start_time IS NULL
                OR t.task_end_time IS NULL
                OR t.task_end_time <= t.task_start_time
            )";

        $joinLatestAssignment = "
            FROM tasks t
            INNER JOIN task_assignments ta
                ON ta.id = (
                    SELECT ta2.id
                    FROM task_assignments ta2
                    WHERE ta2.task_id = t.id
                      AND ta2.is_active = 1
                    ORDER BY ta2.id DESC
                    LIMIT 1
                )
            INNER JOIN task_status_master ts
                ON ts.id = t.status_id
        ";

        $skippedStmt = $this->conn->prepare("SELECT COUNT(*) {$joinLatestAssignment} WHERE {$skippedWhere}");
        $skippedStmt->execute([':logged_in_expert_id' => $userId]);
        $skipped = (int)$skippedStmt->fetchColumn();

        $sql = "UPDATE tasks t
            INNER JOIN task_assignments ta
                ON ta.id = (
                    SELECT ta2.id
                    FROM task_assignments ta2
                    WHERE ta2.task_id = t.id
                      AND ta2.is_active = 1
                    ORDER BY ta2.id DESC
                    LIMIT 1
                )
            INNER JOIN task_status_master ts
                ON ts.id = t.status_id
            SET t.duration = TIMESTAMPDIFF(
                MINUTE,
                t.task_start_time,
                t.task_end_time
            )
            WHERE {$eligibleWhere}";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':logged_in_expert_id' => $userId]);

        return [
            'updated' => $stmt->rowCount(),
            'skipped' => $skipped,
        ];
    }

    private function getDailyWorkingAnalytics(int $userId): array {
        $query = "
            SELECT
                DATE(t.task_start_time) AS work_date,
                SUM(COALESCE(t.duration, 0)) AS total_minutes,
                COUNT(t.id) AS total_tasks,
                SUM(CASE WHEN LOWER(tt.name) LIKE '%interview%' THEN 1 ELSE 0 END) AS interview_support,
                SUM(CASE WHEN LOWER(tt.name) LIKE '%mock%' THEN 1 ELSE 0 END) AS mock_interview,
                SUM(CASE WHEN LOWER(tt.name) LIKE '%resume%' OR LOWER(tt.name) LIKE '%ruc%' THEN 1 ELSE 0 END) AS resume_support,
                SUM(CASE WHEN LOWER(tt.name) LIKE '%linkedin%' THEN 1 ELSE 0 END) AS linkedin_support,
                SUM(CASE WHEN LOWER(tt.name) NOT LIKE '%interview%'
                          AND LOWER(tt.name) NOT LIKE '%mock%'
                          AND LOWER(tt.name) NOT LIKE '%resume%'
                          AND LOWER(tt.name) NOT LIKE '%ruc%'
                          AND LOWER(tt.name) NOT LIKE '%linkedin%'
                    THEN 1 ELSE 0 END) AS other_tasks,
                COUNT(t.id) AS completed,
                0 AS success,
                0 AS rejected,
                100 AS productivity
            FROM tasks t
            INNER JOIN task_assignments ta
                ON ta.id = (
                    SELECT ta2.id
                    FROM task_assignments ta2
                    WHERE ta2.task_id = t.id
                      AND ta2.is_active = 1
                    ORDER BY ta2.id DESC
                    LIMIT 1
                )
            INNER JOIN task_status_master ts
                ON ts.id = t.status_id
            LEFT JOIN task_types tt
                ON tt.id = t.task_type_id
            WHERE
                ta.user_id = :logged_in_expert_id
                AND LOWER(ts.name) = 'completed'
                AND t.task_start_time IS NOT NULL
                AND t.task_end_time IS NOT NULL
                AND DATE(t.task_start_time) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY
                DATE(t.task_start_time)
            ORDER BY
                work_date DESC
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([':logged_in_expert_id' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $mappedRows = array_map(static function (array $row): array {
            $totalMinutes = (int)($row['total_minutes'] ?? 0);
            $productivity = min(100, round(($totalMinutes / 480) * 100, 2));
            $status = $totalMinutes >= 480 ? 'Excellent' : ($totalMinutes >= 300 ? 'Good' : 'Low');

            return [
                'work_date' => (string)($row['work_date'] ?? ''),
                'total_minutes' => $totalMinutes,
                'total_tasks' => (int)($row['total_tasks'] ?? 0),
                'interview_support' => (int)($row['interview_support'] ?? 0),
                'mock_interview' => (int)($row['mock_interview'] ?? 0),
                'resume_support' => (int)($row['resume_support'] ?? 0),
                'linkedin_support' => (int)($row['linkedin_support'] ?? 0),
                'other_tasks' => (int)($row['other_tasks'] ?? 0),
                'completed_tasks' => (int)($row['completed'] ?? 0),
                'success_tasks' => (int)($row['success'] ?? 0),
                'rejected_tasks' => (int)($row['rejected'] ?? 0),
                'productivity' => $productivity,
                'status' => $status,
            ];
        }, $rows);

        $daysCount = count($mappedRows);
        $totalMinutes = array_sum(array_column($mappedRows, 'total_minutes'));
        $totalTasks = array_sum(array_column($mappedRows, 'total_tasks'));
        $averageMinutes = $daysCount > 0 ? (int)round($totalMinutes / $daysCount) : 0;
        $avgProductivity = $daysCount > 0 ? round(array_sum(array_column($mappedRows, 'productivity')) / $daysCount, 2) : 0;

        return [
            'summary' => [
                'average_minutes' => $averageMinutes,
                'total_minutes' => (int)$totalMinutes,
                'total_tasks' => (int)$totalTasks,
                'productivity' => $avgProductivity,
            ],
            'rows' => $mappedRows,
        ];
    }
}
