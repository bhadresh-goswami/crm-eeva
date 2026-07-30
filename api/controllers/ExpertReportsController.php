<?php

require_once dirname(__DIR__) . "/config/database.php";

class ExpertReportsController {
    private function getStatusIdByName(PDO $conn, string $name): ?int {
        $stmt = $conn->prepare("SELECT id FROM task_status_master WHERE LOWER(name) = LOWER(?) LIMIT 1");
        $stmt->execute([$name]);
        $id = (int)$stmt->fetchColumn();

        return $id > 0 ? $id : null;
    }

    private function repairFeedbackCompletedTasks(PDO $conn, int $expertUserId): void {
        $completedStatusId = $this->getStatusIdByName($conn, 'Completed');
        $inProgressStatusId = $this->getStatusIdByName($conn, 'In Progress');

        if ($completedStatusId === null || $inProgressStatusId === null) {
            return;
        }

        $selectStmt = $conn->prepare("
            SELECT t.id, COALESCE(tf.created_at, NOW()) AS completed_at
            FROM tasks t
            INNER JOIN task_assignments ta ON ta.id = (
                SELECT ta2.id FROM task_assignments ta2
                WHERE ta2.task_id = t.id
                  AND ta2.is_active = 1
                ORDER BY ta2.id DESC LIMIT 1
            )
            INNER JOIN task_feedback tf ON tf.task_id = t.id
            WHERE ta.user_id = ?
              AND t.status_id = ?
        ");
        $selectStmt->execute([$expertUserId, $inProgressStatusId]);
        $rows = $selectStmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$rows) {
            return;
        }

        $updateStmt = $conn->prepare("
            UPDATE tasks
            SET status_id = ?,
                task_end_time = COALESCE(task_end_time, ?),
                duration = CASE
                    WHEN task_start_time IS NOT NULL THEN GREATEST(TIMESTAMPDIFF(MINUTE, task_start_time, COALESCE(task_end_time, ?)), 0)
                    ELSE duration
                END
            WHERE id = ?
        ");

        foreach ($rows as $row) {
            $completedAt = (string)($row['completed_at'] ?? '');
            $updateStmt->execute([$completedStatusId, $completedAt, $completedAt, (int)$row['id']]);
        }
    }

    public function index($authUser): void {
        try {
            $db = new Database();
            $conn = $db->connect();

            $expertUserId = is_array($authUser) ? (int)($authUser['id'] ?? 0) : (int)($authUser->id ?? 0);
            if ($expertUserId <= 0) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'Unauthorized']);
                return;
            }

            $this->repairFeedbackCompletedTasks($conn, $expertUserId);

            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;
            $candidateName = trim((string)($_GET['candidate_name'] ?? ''));
            $taskType = trim((string)($_GET['task_type'] ?? ''));
            $statusName = trim((string)($_GET['status_name'] ?? ''));
            $dateFrom = trim((string)($_GET['date_from'] ?? ''));
            $dateTo = trim((string)($_GET['date_to'] ?? ''));

            $where = ["ta.user_id = ?"];
            $params = [$expertUserId];
            if ($candidateName !== '') { $where[] = "LOWER(COALESCE(c.name, '')) = LOWER(?)"; $params[] = $candidateName; }
            if ($taskType !== '') { $where[] = "LOWER(COALESCE(tt.name, '')) = LOWER(?)"; $params[] = $taskType; }
            if ($statusName !== '') { $where[] = "LOWER(COALESCE(ts.name, '')) = LOWER(?)"; $params[] = $statusName; }
            if ($dateFrom !== '') { $where[] = 'DATE(t.due_date) >= ?'; $params[] = $dateFrom; }
            if ($dateTo !== '') { $where[] = 'DATE(t.due_date) <= ?'; $params[] = $dateTo; }
            $whereClause = implode(' AND ', $where);

            $baseFrom = "
                FROM tasks t
                LEFT JOIN task_assignments ta ON ta.id = (
                    SELECT ta2.id FROM task_assignments ta2
                    WHERE ta2.task_id = t.id
                      AND ta2.is_active = 1
                    ORDER BY ta2.id DESC LIMIT 1
                )
                LEFT JOIN users ex ON ex.id = ta.user_id
                LEFT JOIN candidates c ON c.id = t.candidate_id
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                LEFT JOIN task_types tt ON tt.id = t.task_type_id
                LEFT JOIN task_feedback tf ON tf.task_id = t.id
                WHERE {$whereClause}
            ";

            $countStmt = $conn->prepare("SELECT COUNT(DISTINCT t.id) {$baseFrom}");
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();
            $pages = max(1, (int)ceil($total / $limit));

            $listSql = "
                SELECT
                    t.id AS task_id,
                    DATE(t.due_date) AS task_date,
                    COALESCE(c.name, '') AS candidate_name,
                    COALESCE(ex.name, '') AS expert_name,
                    COALESCE(tt.name, '') AS task_type,
                    COALESCE(ts.name, '') AS status_name,
                    COALESCE(t.start_time, '') AS ist_start_time,
                    COALESCE(t.end_time, '') AS ist_end_time,
                    COALESCE(t.duration, 0) AS duration,
                    CASE
                        WHEN LOWER(COALESCE(ts.name, '')) = 'completed' AND tf.id IS NOT NULL THEN 'Submitted'
                        WHEN LOWER(COALESCE(ts.name, '')) = 'completed' THEN 'Pending'
                        ELSE 'Not Available'
                    END AS feedback_status,
                    t.created_at,
                    CASE WHEN LOWER(COALESCE(ts.name, '')) = 'completed' THEN tf.id ELSE NULL END AS feedback_id
                {$baseFrom}
                ORDER BY DATE(t.due_date) DESC, t.created_at DESC
                LIMIT {$limit} OFFSET {$offset}
            ";
            $stmt = $conn->prepare($listSql);
            $stmt->execute($params);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $badgeStmt = $conn->prepare("SELECT COALESCE(tt.name,'Unknown') AS task_type, COUNT(*) AS total {$baseFrom} GROUP BY COALESCE(tt.name,'Unknown') ORDER BY task_type ASC");
            $badgeStmt->execute($params);
            $badges = $badgeStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => ['items' => $items, 'task_type_counts' => $badges, 'pagination' => ['current_page' => $page, 'total_pages' => $pages, 'total_records' => $total, 'per_page' => $limit]]]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}
