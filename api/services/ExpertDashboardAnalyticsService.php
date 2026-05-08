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

        return [
            'cards' => $cards,
            'working_hours_trend' => $this->getWorkingHoursTrend($userId),
            'task_status_ratio' => $this->getTaskStatusRatio($userId),
            'today_distribution' => $this->getTodayDistribution($userId),
        ];
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
        ";

        $cardsStmt = $this->conn->prepare($cardsQuery);
        $cardsStmt->execute([':user_id' => $userId]);
        $cardCounts = $cardsStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $today = new DateTimeImmutable('today');
        $currentStart = $today->modify('-9 days')->format('Y-m-d');
        $currentEnd = $today->format('Y-m-d');
        $previousStart = $today->modify('-19 days')->format('Y-m-d');
        $previousEnd = $today->modify('-10 days')->format('Y-m-d');

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

    private function getWorkingHoursTrend(int $userId): array {
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
                ) AS worked_hours
            FROM task_assignments ta
            INNER JOIN tasks t
                ON t.id = ta.task_id
            WHERE ta.user_id = :user_id
              AND ta.is_active = 1
              AND t.task_start_time IS NOT NULL
              AND t.task_end_time IS NOT NULL
              AND MONTH(t.task_start_time) = MONTH(CURRENT_DATE())
              AND YEAR(t.task_start_time) = YEAR(CURRENT_DATE())
            GROUP BY DATE(t.task_start_time)
            ORDER BY work_date ASC
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([':user_id' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map(static function (array $row): array {
            return [
                'date' => (string)($row['work_date'] ?? ''),
                'worked_hours' => (float)($row['worked_hours'] ?? 0),
            ];
        }, $rows);
    }

    private function getTaskStatusRatio(int $userId): array {
        $query = "
            SELECT
                LOWER(tsm.name) AS status_name,
                COUNT(DISTINCT t.id) AS total
            FROM task_assignments ta
            INNER JOIN tasks t
                ON t.id = ta.task_id
            INNER JOIN task_status_master tsm
                ON tsm.id = t.status_id
            WHERE ta.user_id = :user_id
              AND ta.is_active = 1
              AND LOWER(tsm.name) IN (
                  'assigned',
                  'completed',
                  'success',
                  'rejected'
              )
            GROUP BY LOWER(tsm.name)
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([':user_id' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map(static function (array $row): array {
            return [
                'status_name' => (string)($row['status_name'] ?? ''),
                'total' => (int)($row['total'] ?? 0),
            ];
        }, $rows);
    }

    private function getTodayDistribution(int $userId): array {
        $query = "
            SELECT
                LOWER(tsm.name) AS status_name,
                ROUND(
                    SUM(
                        TIMESTAMPDIFF(
                            MINUTE,
                            t.task_start_time,
                            t.task_end_time
                        )
                    ) / 60,
                    2
                ) AS total_hours
            FROM task_assignments ta
            INNER JOIN tasks t
                ON t.id = ta.task_id
            INNER JOIN task_status_master tsm
                ON tsm.id = t.status_id
            WHERE ta.user_id = :user_id
              AND ta.is_active = 1
              AND DATE(t.task_start_time) = CURRENT_DATE()
              AND t.task_start_time IS NOT NULL
              AND t.task_end_time IS NOT NULL
            GROUP BY LOWER(tsm.name)
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([':user_id' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map(static function (array $row): array {
            return [
                'status_name' => (string)($row['status_name'] ?? ''),
                'total_hours' => (float)($row['total_hours'] ?? 0),
            ];
        }, $rows);
    }
}
