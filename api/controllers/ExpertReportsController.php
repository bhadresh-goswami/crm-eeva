<?php

require_once dirname(__DIR__) . "/config/database.php";

class ExpertReportsController {
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
            if ($candidateName !== '') { $where[] = 'LOWER(COALESCE(c.name, \"\")) = LOWER(?)'; $params[] = $candidateName; }
            if ($taskType !== '') { $where[] = 'LOWER(COALESCE(tt.name, \"\")) = LOWER(?)'; $params[] = $taskType; }
            if ($statusName !== '') { $where[] = 'LOWER(COALESCE(ts.name, \"\")) = LOWER(?)'; $params[] = $statusName; }
            if ($dateFrom !== '') { $where[] = 'DATE(t.due_date) >= ?'; $params[] = $dateFrom; }
            if ($dateTo !== '') { $where[] = 'DATE(t.due_date) <= ?'; $params[] = $dateTo; }
            $whereClause = implode(' AND ', $where);

            $baseFrom = "
                FROM tasks t
                LEFT JOIN task_assignments ta ON ta.id = (
                    SELECT ta2.id FROM task_assignments ta2
                    WHERE ta2.task_id = t.id
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
                    CASE WHEN tf.id IS NULL THEN 'Pending' ELSE 'Submitted' END AS feedback_status,
                    t.created_at,
                    tf.id AS feedback_id
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
