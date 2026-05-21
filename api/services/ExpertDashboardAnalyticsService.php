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

        error_log(print_r($analyticsData, true));

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

    private function getDailyWorkingAnalytics(int $userId): array {
        $query = "
            SELECT
                DATE(t.task_start_time) AS work_date,
                ROUND(
                    SUM(
                        TIMESTAMPDIFF(
                            MINUTE,
                            t.task_start_time,
                            t.task_end_time
                        )
                    ) / 60,
                    2
                ) AS worked_hours,
                COUNT(DISTINCT t.id) AS total_tasks,
                COUNT(DISTINCT CASE WHEN LOWER(tt.name) LIKE '%interview%' THEN t.id END) AS interview_support,
                COUNT(DISTINCT CASE WHEN LOWER(tt.name) LIKE '%mock%' THEN t.id END) AS mock_interview,
                COUNT(DISTINCT CASE WHEN LOWER(tt.name) LIKE '%resume%' THEN t.id END) AS resume_support,
                COUNT(DISTINCT CASE WHEN LOWER(tt.name) LIKE '%linkedin%' THEN t.id END) AS linkedin_support,
                COUNT(DISTINCT CASE
                    WHEN LOWER(tt.name) NOT LIKE '%interview%'
                     AND LOWER(tt.name) NOT LIKE '%mock%'
                     AND LOWER(tt.name) NOT LIKE '%resume%'
                     AND LOWER(tt.name) NOT LIKE '%linkedin%'
                    THEN t.id
                END) AS other_tasks,
                COUNT(DISTINCT CASE WHEN LOWER(tsm.name) = 'completed' THEN t.id END) AS completed_tasks,
                COUNT(DISTINCT CASE WHEN LOWER(tsm.name) = 'success' THEN t.id END) AS success_tasks,
                COUNT(DISTINCT CASE WHEN LOWER(tsm.name) = 'rejected' THEN t.id END) AS rejected_tasks
            FROM task_assignments ta
            INNER JOIN tasks t ON t.id = ta.task_id
            LEFT JOIN task_types tt ON tt.id = t.task_type_id
            LEFT JOIN task_status_master tsm ON tsm.id = t.status_id
            WHERE ta.user_id = :user_id
              AND ta.is_active = 1
              AND t.task_start_time IS NOT NULL
              AND t.task_end_time IS NOT NULL
              AND DATE(t.task_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            GROUP BY DATE(t.task_start_time)
            ORDER BY work_date DESC
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([':user_id' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $mappedRows = array_map(static function (array $row): array {
            $workedHours = (float)($row['worked_hours'] ?? 0);
            $productivity = min(100, round(($workedHours / 8) * 100, 2));
            $status = $workedHours >= 8 ? 'Excellent' : ($workedHours >= 5 ? 'Good' : 'Low');

            return [
                'work_date' => (string)($row['work_date'] ?? ''),
                'worked_hours' => $workedHours,
                'total_tasks' => (int)($row['total_tasks'] ?? 0),
                'interview_support' => (int)($row['interview_support'] ?? 0),
                'mock_interview' => (int)($row['mock_interview'] ?? 0),
                'resume_support' => (int)($row['resume_support'] ?? 0),
                'linkedin_support' => (int)($row['linkedin_support'] ?? 0),
                'other_tasks' => (int)($row['other_tasks'] ?? 0),
                'completed_tasks' => (int)($row['completed_tasks'] ?? 0),
                'success_tasks' => (int)($row['success_tasks'] ?? 0),
                'rejected_tasks' => (int)($row['rejected_tasks'] ?? 0),
                'productivity' => $productivity,
                'status' => $status,
            ];
        }, $rows);

        $daysCount = count($mappedRows);
        $totalHours = array_sum(array_column($mappedRows, 'worked_hours'));
        $totalTasks = array_sum(array_column($mappedRows, 'total_tasks'));
        $averageHours = $daysCount > 0 ? round($totalHours / $daysCount, 2) : 0;
        $avgProductivity = $daysCount > 0 ? round(array_sum(array_column($mappedRows, 'productivity')) / $daysCount, 2) : 0;

        return [
            'summary' => [
                'average_hours' => $averageHours,
                'total_hours' => round($totalHours, 2),
                'total_tasks' => (int)$totalTasks,
                'productivity' => $avgProductivity,
            ],
            'rows' => $mappedRows,
        ];
    }
}
