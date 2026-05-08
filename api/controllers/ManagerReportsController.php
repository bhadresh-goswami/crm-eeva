<?php

class ManagerReportsController {
    private PDO $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->connect();
    }

    private function tableExists(string $table): bool {
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
        $stmt->execute([$table]);
        return (int)$stmt->fetchColumn() > 0;
    }

    private function hasColumn(string $table, string $column): bool {
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?");
        $stmt->execute([$table, $column]);
        return (int)$stmt->fetchColumn() > 0;
    }

    private function baseSelect(): string {
        $companyTable = 'clients';
        $statusTable = $this->tableExists('task_status') ? 'task_status' : 'task_status_master';
        $assignedByColumn = $this->hasColumn('tasks', 'assigned_by') ? 't.assigned_by' : 'ta.assigned_by';

        return "
            FROM tasks t
            LEFT JOIN candidates cd ON cd.id = t.candidate_id
            LEFT JOIN {$companyTable} c_task ON c_task.id = t.client_id
            LEFT JOIN {$companyTable} c_candidate ON c_candidate.id = cd.client_id
            LEFT JOIN {$companyTable} c_client ON c_client.id = t.client_id
            LEFT JOIN task_assignments ta ON ta.id = (
                SELECT ta2.id
                FROM task_assignments ta2
                WHERE ta2.task_id = t.id
                ORDER BY ta2.is_active DESC, ta2.assigned_at DESC, ta2.id DESC
                LIMIT 1
            )
            LEFT JOIN users u ON u.id = ta.user_id
            LEFT JOIN users assigned_by_user ON assigned_by_user.id = {$assignedByColumn}
            LEFT JOIN task_feedback tf ON tf.task_id = t.id
            LEFT JOIN users feedback_expert ON feedback_expert.id = tf.expert_id
            LEFT JOIN task_types tt ON tt.id = t.task_type_id
            LEFT JOIN {$statusTable} tsm ON tsm.id = t.status_id
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
        $companyId = isset($_GET['company_id']) && $_GET['company_id'] !== '' ? (int)$_GET['company_id'] : null;
        $statusId = isset($_GET['status_id']) && $_GET['status_id'] !== '' ? (int)$_GET['status_id'] : null;
        $fromDate = $_GET['from_date'] ?? null;
        $toDate = $_GET['to_date'] ?? null;

        $where = ["1=1"];
        if ($candidateId !== null) { $where[] = "t.candidate_id = :candidate_id"; $params[':candidate_id'] = $candidateId; }
        if ($expertId !== null) { $where[] = "ta.user_id = :expert_id"; $params[':expert_id'] = $expertId; }
        if ($taskTypeId !== null) { $where[] = "t.task_type_id = :task_type_id"; $params[':task_type_id'] = $taskTypeId; }
        if ($clientId !== null) { $where[] = "t.client_id = :client_id"; $params[':client_id'] = $clientId; }
        if ($companyId !== null) { $where[] = "(t.client_id = :company_id OR cd.client_id = :company_id)"; $params[':company_id'] = $companyId; }
        if ($statusId !== null) { $where[] = "t.status_id = :status_id"; $params[':status_id'] = $statusId; }
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
            $durationExpr = "CASE
                WHEN t.duration IS NOT NULL THEN t.duration
                WHEN t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN GREATEST(TIMESTAMPDIFF(MINUTE, t.start_time, t.end_time), 0)
                WHEN t.task_start_time IS NOT NULL AND t.task_end_time IS NOT NULL THEN GREATEST(TIMESTAMPDIFF(MINUTE, t.task_start_time, t.task_end_time), 0)
                ELSE 0
            END";
            $sql = "SELECT DISTINCT
                t.id AS task_id,
                COALESCE(cd.name, 'N/A') AS candidate_name,
                COALESCE(c_task.company_name, c_candidate.company_name, c_client.company_name, 'N/A') AS company_name,
                COALESCE(tt.name, 'N/A') AS task_type,
                COALESCE(u.name, feedback_expert.name, 'N/A') AS technical_expert,
                DATE(t.due_date) AS due_date,
                {$durationExpr} AS duration,
                COALESCE(
                    DATE_FORMAT(
                        CONVERT_TZ(COALESCE(t.task_start_time, t.start_time), '+00:00', 'America/New_York'),
                        '%m-%d-%Y %h:%i %p'
                    ),
                    'N/A'
                ) AS est_time,
                COALESCE(tsm.name, 'N/A') AS status_name,
                COALESCE(tsm.name, 'N/A') AS task_status,
                COALESCE(assigned_by_user.name, 'N/A') AS assigned_by,
                CASE WHEN tf.id IS NULL THEN 'Pending' ELSE 'Submitted' END AS feedback_status,
                DATE(tf.created_at) AS feedback_date,
                ROUND(((COALESCE(tf.communication,0) + COALESCE(tf.technical,0) + COALESCE(tf.confidence,0) + COALESCE(tf.project_explanation,0)) /
                    NULLIF(
                        (CASE WHEN tf.communication IS NOT NULL THEN 1 ELSE 0 END +
                         CASE WHEN tf.technical IS NOT NULL THEN 1 ELSE 0 END +
                         CASE WHEN tf.confidence IS NOT NULL THEN 1 ELSE 0 END +
                         CASE WHEN tf.project_explanation IS NOT NULL THEN 1 ELSE 0 END),0
                    )),2) AS average_score
                " . $this->baseSelect() . "
                WHERE {$where}
                ORDER BY t.due_date DESC, t.id DESC" . $this->paginateClause($params);
            $stmt = $this->conn->prepare($sql);
            foreach ($params as $k => $v) {
                $type = in_array($k, [':offset', ':limit', ':candidate_id', ':expert_id', ':task_type_id', ':client_id', ':company_id', ':status_id'], true) ? PDO::PARAM_INT : PDO::PARAM_STR;
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
            $durationExpr = "CASE
                WHEN t.duration IS NOT NULL THEN t.duration
                WHEN t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN GREATEST(TIMESTAMPDIFF(MINUTE, t.start_time, t.end_time), 0)
                WHEN t.task_start_time IS NOT NULL AND t.task_end_time IS NOT NULL THEN GREATEST(TIMESTAMPDIFF(MINUTE, t.task_start_time, t.task_end_time), 0)
                ELSE 0
            END";
            $sql = "SELECT
                ta.user_id AS expert_id,
                MAX(t.id) AS task_id,
                u.name AS technical_expert,
                ROUND(SUM({$durationExpr})/60,2) AS total_completed_hours,
                COUNT(DISTINCT t.id) AS completed_count,
                SUM(CASE WHEN LOWER(COALESCE(tsm.name,'')) IN ('completed','success') THEN 1 ELSE 0 END) AS success_count,
                SUM(CASE WHEN LOWER(COALESCE(tsm.name,'')) IN ('rejected','cancelled','failed') THEN 1 ELSE 0 END) AS rejected_count,
                ROUND((SUM(CASE WHEN LOWER(COALESCE(tsm.name,'')) IN ('completed','success') THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT t.id),0)) * 100,2) AS success_ratio
                " . $this->baseSelect() . "
                WHERE {$where}
                GROUP BY ta.user_id, u.name
                ORDER BY success_ratio DESC, completed_count DESC" . $this->paginateClause($params);
            $stmt = $this->conn->prepare($sql);
            foreach ($params as $k => $v) {
                $type = in_array($k, [':offset', ':limit', ':candidate_id', ':expert_id', ':task_type_id', ':client_id', ':company_id', ':status_id'], true) ? PDO::PARAM_INT : PDO::PARAM_STR;
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
            $request = $_SERVER['REQUEST_METHOD'] === 'POST'
                ? (json_decode(file_get_contents('php://input'), true) ?? [])
                : $_GET;

            $expertId = (int)($request['expert_id'] ?? 0);
            if ($expertId <= 0) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Expert ID is required']);
                return;
            }

            $status = strtolower(trim((string)($request['status'] ?? 'completed')));
            $fromDate = $request['from_date'] ?? null;
            $toDate = $request['to_date'] ?? null;
            $limit = max(1, min(5000, (int)($request['limit'] ?? 1000)));

            error_log('Expert detail expert_id: ' . $expertId);
            error_log('Expert detail status: ' . $status);

            $durationExpr = "CASE
                WHEN t.duration IS NOT NULL THEN t.duration
                WHEN t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN GREATEST(TIMESTAMPDIFF(MINUTE, t.start_time, t.end_time), 0)
                WHEN t.task_start_time IS NOT NULL AND t.task_end_time IS NOT NULL THEN GREATEST(TIMESTAMPDIFF(MINUTE, t.task_start_time, t.task_end_time), 0)
                ELSE 0
            END";

            $params = [':expert_id' => $expertId, ':status' => $status, ':limit' => $limit];
            $where = ["ta.user_id = :expert_id", "ta.is_active = 1", "LOWER(COALESCE(tsm.name,'')) = :status"];
            if (!empty($fromDate) && !empty($toDate)) { $where[] = "DATE(t.due_date) BETWEEN :from_date AND :to_date"; $params[':from_date'] = (string)$fromDate; $params[':to_date'] = (string)$toDate; }

            $sql = "SELECT DISTINCT
                t.id AS task_id,
                COALESCE(cd.name, 'N/A') AS candidate_name,
                COALESCE(c_task.company_name, c_candidate.company_name, c_client.company_name, 'N/A') AS client_company,
                COALESCE(tt.name, 'N/A') AS task_type,
                COALESCE(tsm.name, 'N/A') AS task_status,
                DATE(t.due_date) AS task_date,
                COALESCE(DATE_FORMAT(CONVERT_TZ(COALESCE(t.task_start_time, t.start_time), '+00:00', '-05:00'), '%m-%d-%Y %h:%i %p'), 'N/A') AS est_time,
                {$durationExpr} AS duration,
                CASE WHEN tf.id IS NULL THEN 'Pending' ELSE 'Submitted' END AS feedback_status,
                COALESCE(tf.overall, 0) AS average_score,
                COALESCE(assigned_by_user.name, 'N/A') AS assigned_by
                " . $this->baseSelect() . "
                WHERE " . implode(' AND ', $where) . "
                ORDER BY t.created_at DESC
                LIMIT :limit";

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
                COALESCE(cd.name, 'N/A') AS candidate,
                COALESCE(c_task.company_name, c_candidate.company_name, c_client.company_name, 'N/A') AS company_name,
                COALESCE(u.name, 'N/A') AS technical_expert,
                COALESCE(tt.name, 'N/A') AS task_type,
                COALESCE(tsm.name, 'N/A') AS status_name,
                COALESCE(tsm.name, 'N/A') AS task_status,
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
