<?php

class ManagerReportsController {
    private PDO $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->connect();
    }

    private function baseSelect(): string {
        return "
            FROM tasks t
            LEFT JOIN clients c ON c.id = t.client_id
            LEFT JOIN candidates cd ON cd.id = t.candidate_id
            LEFT JOIN task_assignments ta ON ta.task_id = t.id AND ta.is_active = 1
            LEFT JOIN users u ON u.id = ta.user_id
            LEFT JOIN users assigned_by_user ON assigned_by_user.id = ta.assigned_by
            LEFT JOIN task_feedback tf ON tf.task_id = t.id
            LEFT JOIN users feedback_expert ON feedback_expert.id = tf.expert_id
            LEFT JOIN task_types tt ON tt.id = t.task_type_id
            LEFT JOIN task_status_master tsm ON tsm.id = t.status_id
            LEFT JOIN (
                SELECT tc1.*
                FROM task_comments tc1
                INNER JOIN (
                    SELECT task_id, MAX(id) AS latest_id
                    FROM task_comments
                    GROUP BY task_id
                ) latest_comment ON latest_comment.latest_id = tc1.id
            ) latest_task_comment ON latest_task_comment.task_id = t.id
        ";
    }

    private function applyFilters(array &$params): string {
        $candidateId = isset($_GET['candidate_id']) && $_GET['candidate_id'] !== '' ? (int)$_GET['candidate_id'] : null;
        $expertId = isset($_GET['expert_id']) && $_GET['expert_id'] !== '' ? (int)$_GET['expert_id'] : null;
        $taskTypeId = isset($_GET['task_type_id']) && $_GET['task_type_id'] !== '' ? (int)$_GET['task_type_id'] : null;
        $clientId = isset($_GET['client_id']) && $_GET['client_id'] !== '' ? (int)$_GET['client_id'] : null;
        $fromDate = $_GET['from_date'] ?? null;
        $toDate = $_GET['to_date'] ?? null;

        $where = ["1=1"];
        if ($candidateId !== null) { $where[] = "t.candidate_id = :candidate_id"; $params[':candidate_id'] = $candidateId; }
        if ($expertId !== null) { $where[] = "ta.user_id = :expert_id"; $params[':expert_id'] = $expertId; }
        if ($taskTypeId !== null) { $where[] = "t.task_type_id = :task_type_id"; $params[':task_type_id'] = $taskTypeId; }
        if ($clientId !== null) { $where[] = "t.client_id = :client_id"; $params[':client_id'] = $clientId; }
        if (!empty($fromDate)) { $where[] = "DATE(t.due_date) >= :from_date"; $params[':from_date'] = $fromDate; }
        if (!empty($toDate)) { $where[] = "DATE(t.due_date) <= :to_date"; $params[':to_date'] = $toDate; }
        return implode(' AND ', $where);
    }

    private function paginateClause(array &$params): string {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(200, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $params[':offset'] = $offset;
        $params[':limit'] = $limit;
        return " LIMIT :offset, :limit";
    }

    private function runListReport(string $extraWhere = ''): void {
        try {
            $params = [];
            $where = $this->applyFilters($params);
            if ($extraWhere) $where .= " AND {$extraWhere}";
            $sql = "SELECT DISTINCT
                t.id AS task_id,
                cd.name AS candidate_name,
                c.company_name AS company_name,
                tt.name AS task_type,
                COALESCE(u.name, feedback_expert.name, '') AS technical_expert,
                DATE(t.due_date) AS due_date,
                t.duration,
                CONCAT(
                  COALESCE(DATE_FORMAT(CONVERT_TZ(CONCAT(DATE(t.due_date), ' ', t.start_time), 'Asia/Kolkata', 'America/New_York'), '%h:%i %p'), '--'),
                  ' - ',
                  COALESCE(DATE_FORMAT(CONVERT_TZ(CONCAT(DATE(t.due_date), ' ', t.end_time), 'Asia/Kolkata', 'America/New_York'), '%h:%i %p'), '--')
                ) AS est_time,
                tsm.name AS task_status,
                COALESCE(assigned_by_user.name, '') AS assigned_by,
                CASE WHEN tf.id IS NULL THEN 'Pending' ELSE 'Submitted' END AS feedback_status,
                DATE(tf.created_at) AS feedback_date,
                ((COALESCE(tf.communication,0) + COALESCE(tf.technical,0) + COALESCE(tf.confidence,0) + COALESCE(tf.project_explanation,0)) / 4) AS average_score
                " . $this->baseSelect() . "
                WHERE {$where}
                ORDER BY t.due_date DESC, t.id DESC" . $this->paginateClause($params);
            $stmt = $this->conn->prepare($sql);
            foreach ($params as $k => $v) {
                $type = in_array($k, [':offset', ':limit', ':candidate_id', ':expert_id', ':task_type_id', ':client_id'], true) ? PDO::PARAM_INT : PDO::PARAM_STR;
                $stmt->bindValue($k, $v, $type);
            }
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function feedbackPending(): void { $this->runListReport('tf.id IS NULL'); }
    public function tasksSummary(): void { $this->runListReport(); }
    public function feedbackReport(): void { $this->runListReport('tf.id IS NOT NULL'); }

    public function techVsTasks(): void {
        try {
            $params = [];
            $where = $this->applyFilters($params) . ' AND ta.user_id IS NOT NULL';
            $sql = "SELECT
                ta.user_id AS expert_id,
                MAX(t.id) AS task_id,
                u.name AS technical_expert,
                ROUND(SUM(COALESCE(t.duration,0))/60,2) AS total_completed_hours,
                SUM(CASE WHEN LOWER(COALESCE(tsm.name,'')) = 'completed' THEN 1 ELSE 0 END) AS completed_count,
                SUM(CASE WHEN LOWER(COALESCE(tsm.name,'')) IN ('completed','success') THEN 1 ELSE 0 END) AS success_count,
                SUM(CASE WHEN LOWER(COALESCE(tsm.name,'')) IN ('rejected','cancelled','failed') THEN 1 ELSE 0 END) AS rejected_count,
                ROUND((SUM(CASE WHEN LOWER(COALESCE(tsm.name,'')) IN ('completed','success') THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN LOWER(COALESCE(tsm.name,'')) = 'completed' THEN 1 ELSE 0 END),0)) * 100,2) AS success_ratio
                " . $this->baseSelect() . "
                WHERE {$where}
                GROUP BY ta.user_id, u.name
                ORDER BY success_ratio DESC, completed_count DESC" . $this->paginateClause($params);
            $stmt = $this->conn->prepare($sql);
            foreach ($params as $k => $v) {
                $type = in_array($k, [':offset', ':limit', ':candidate_id', ':expert_id', ':task_type_id', ':client_id'], true) ? PDO::PARAM_INT : PDO::PARAM_STR;
                $stmt->bindValue($k, $v, $type);
            }
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function techVsTaskDetails(): void {
        try {
            $expertId = isset($_GET['expert_id']) ? (int)$_GET['expert_id'] : 0;
            if ($expertId <= 0) {
                echo json_encode(['success' => true, 'data' => []]);
                return;
            }

            $params = [':expert_id' => $expertId];
            $where = ["ta.user_id = :expert_id"];
            if (!empty($_GET['from_date'])) { $where[] = "DATE(t.due_date) >= :from_date"; $params[':from_date'] = (string)$_GET['from_date']; }
            if (!empty($_GET['to_date'])) { $where[] = "DATE(t.due_date) <= :to_date"; $params[':to_date'] = (string)$_GET['to_date']; }
            if (!empty($_GET['task_type_id'])) { $where[] = "t.task_type_id = :task_type_id"; $params[':task_type_id'] = (int)$_GET['task_type_id']; }
            if (!empty($_GET['client_id'])) { $where[] = "t.client_id = :client_id"; $params[':client_id'] = (int)$_GET['client_id']; }

            $sql = "SELECT DISTINCT
                t.id AS task_id,
                cd.name AS candidate_name,
                c.company_name AS client_company,
                tt.name AS task_type,
                COALESCE(tsm.name, '') AS status,
                DATE(t.due_date) AS task_date,
                CONCAT(
                  COALESCE(DATE_FORMAT(CONVERT_TZ(CONCAT(DATE(t.due_date), ' ', t.start_time), 'Asia/Kolkata', 'America/New_York'), '%h:%i %p'), '--'),
                  ' - ',
                  COALESCE(DATE_FORMAT(CONVERT_TZ(CONCAT(DATE(t.due_date), ' ', t.end_time), 'Asia/Kolkata', 'America/New_York'), '%h:%i %p'), '--')
                ) AS est_time,
                COALESCE(t.duration, 0) AS duration,
                CASE WHEN tf.id IS NULL THEN 'Pending' ELSE 'Submitted' END AS feedback_status,
                ((COALESCE(tf.communication,0) + COALESCE(tf.technical,0) + COALESCE(tf.confidence,0) + COALESCE(tf.project_explanation,0)) / 4) AS average_score,
                COALESCE(assigned_by_user.name, '') AS assigned_by
                " . $this->baseSelect() . "
                WHERE " . implode(' AND ', $where) . "
                ORDER BY t.due_date DESC, t.id DESC";

            $stmt = $this->conn->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
            }
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function taskDetails(int $id): void {
        try {
            $sql = "SELECT
                t.id AS task_id,
                cd.name AS candidate,
                c.company_name AS company_name,
                u.name AS technical_expert,
                tt.name AS task_type,
                tsm.name AS task_status,
                DATE(t.due_date) AS due_date,
                t.start_time AS task_start_time,
                t.end_time AS task_end_time,
                t.duration,
                latest_task_comment.comment AS initial_comment,
                tf.communication,
                tf.technical,
                tf.confidence,
                tf.project_explanation,
                tf.overall,
                tf.area_of_improvements,
                DATE(tf.created_at) AS feedback_date,
                ((COALESCE(tf.communication,0) + COALESCE(tf.technical,0) + COALESCE(tf.confidence,0) + COALESCE(tf.project_explanation,0)) / 4) AS average_score
                " . $this->baseSelect() . "
                WHERE t.id = :task_id
                LIMIT 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':task_id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Task not found']); return; }
            echo json_encode(['success' => true, 'data' => $row]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}
