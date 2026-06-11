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
                  AND ta2.is_active = 1
                ORDER BY ta2.assigned_at DESC, ta2.id DESC
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

    private function completedTaskWhere(): string {
        return "LOWER(COALESCE(tsm.name, '')) = 'completed'";
    }

    private function scheduledTimeExpression(string $preferredColumn, string $fallbackColumn): string {
        $candidates = [$preferredColumn, str_replace('scheduled_', 'assigned_', $preferredColumn), $fallbackColumn];
        $expressions = [];
        foreach ($candidates as $column) {
            if ($this->hasColumn('tasks', $column)) {
                $expressions[] = "t.{$column}";
            }
        }
        return $expressions ? 'COALESCE(' . implode(', ', $expressions) . ')' : 'NULL';
    }

    private function bindListParams(PDOStatement $stmt, array $params): void {
        foreach ($params as $k => $v) {
            $type = in_array($k, [':offset', ':limit', ':candidate_id', ':expert_id', ':task_type_id', ':client_id', ':company_id', ':status_id'], true) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue($k, $v, $type);
        }
    }


    private function formatEasternFromUtc(?string $value): string {
        if ($value === null || trim($value) === '') return 'N/A';
        try {
            $dt = new DateTime(trim($value), new DateTimeZone('UTC'));
            $dt->setTimezone(new DateTimeZone('America/New_York'));
            return $dt->format('m-d-Y h:i A T');
        } catch (Throwable $e) {
            return 'N/A';
        }
    }

    private function runListReport(string $extraWhere = '', string $baseWhere = '', bool $includeSchedule = false, bool $includePaginationMeta = false): void {
        try {
            $params = [];
            $where = $baseWhere !== '' ? $baseWhere : '1=1';
            $filterWhere = $this->applyFilters($params);
            if ($filterWhere !== '1=1') $where .= " AND {$filterWhere}";
            if ($extraWhere) $where .= " AND {$extraWhere}";
            $scheduleSelect = '';
            if ($includeSchedule) {
                $scheduledStartExpr = $this->scheduledTimeExpression('scheduled_start_time', 'start_time');
                $scheduledEndExpr = $this->scheduledTimeExpression('scheduled_end_time', 'end_time');
                $scheduleSelect = ",
                {$scheduledStartExpr} AS scheduled_start_time,
                {$scheduledEndExpr} AS scheduled_end_time";
            }
            $paginationMeta = null;
            if ($includePaginationMeta) {
                $page = max(1, (int)($_GET['page'] ?? 1));
                $limit = max(1, min(200, (int)($_GET['limit'] ?? 20)));
                $countStmt = $this->conn->prepare("SELECT COUNT(DISTINCT t.id) " . $this->baseSelect() . " WHERE {$where}");
                $this->bindListParams($countStmt, $params);
                $countStmt->execute();
                $totalRecords = (int)$countStmt->fetchColumn();
                $totalPages = max(1, (int)ceil($totalRecords / $limit));
                if ($page > $totalPages) {
                    $page = $totalPages;
                }
                $params[':offset'] = ($page - 1) * $limit;
                $params[':limit'] = $limit;
                $limitClause = " LIMIT :offset, :limit";
                $paginationMeta = ['total_records' => $totalRecords, 'total_pages' => $totalPages, 'page' => $page, 'limit' => $limit];
            } else {
                $limitClause = $this->paginateClause($params);
            }
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
                COALESCE(t.task_start_time, t.start_time) AS eastern_source_time,
                COALESCE(tsm.name, 'N/A') AS status_name,
                COALESCE(tsm.name, 'N/A') AS task_status,
                COALESCE(assigned_by_user.name, 'N/A') AS assigned_by,
                CASE WHEN tf.id IS NULL THEN 'Pending' ELSE 'Submitted' END AS feedback_status,
                DATE(tf.created_at) AS feedback_date{$scheduleSelect},
                ROUND(((COALESCE(tf.communication,0) + COALESCE(tf.technical,0) + COALESCE(tf.confidence,0) + COALESCE(tf.project_explanation,0)) /
                    NULLIF(
                        (CASE WHEN tf.communication IS NOT NULL THEN 1 ELSE 0 END +
                         CASE WHEN tf.technical IS NOT NULL THEN 1 ELSE 0 END +
                         CASE WHEN tf.confidence IS NOT NULL THEN 1 ELSE 0 END +
                         CASE WHEN tf.project_explanation IS NOT NULL THEN 1 ELSE 0 END),0
                    )),2) AS average_score
                " . $this->baseSelect() . "
                WHERE {$where}
                ORDER BY t.due_date DESC, t.id DESC" . $limitClause;
            $stmt = $this->conn->prepare($sql);
            $this->bindListParams($stmt, $params);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $rows = array_map(function (array $row) {
                $row['est_time'] = $this->formatEasternFromUtc(isset($row['eastern_source_time']) ? (string)$row['eastern_source_time'] : null);
                unset($row['eastern_source_time']);
                return $row;
            }, $rows);
            $response = ['success' => true, 'data' => $rows];
            if ($paginationMeta !== null) {
                $response = array_merge($response, $paginationMeta, ['pagination' => $paginationMeta]);
            }
            echo json_encode($response);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function recalculateTaskDuration(): void {
        try {
            $eligibleWhere = "duration = 0
                AND start_time IS NOT NULL
                AND end_time IS NOT NULL
                AND due_date IS NOT NULL
                AND start_time <> ''
                AND end_time <> ''
                AND status_id NOT IN (1,2,5)";
            $skippedWhere = "duration = 0
                AND (
                    start_time IS NULL
                    OR end_time IS NULL
                    OR due_date IS NULL
                    OR start_time = ''
                    OR end_time = ''
                    OR status_id IS NULL
                    OR status_id IN (1,2,5)
                )";

            $skippedStmt = $this->conn->query("SELECT COUNT(*) FROM tasks WHERE {$skippedWhere}");
            $skipped = (int)$skippedStmt->fetchColumn();

            $sql = "UPDATE tasks
                SET duration = CASE
                    WHEN TIME(end_time) < TIME(start_time) THEN
                        TIMESTAMPDIFF(
                            MINUTE,
                            CONCAT(DATE(due_date), ' ', TIME(start_time)),
                            DATE_ADD(CONCAT(DATE(due_date), ' ', TIME(end_time)), INTERVAL 1 DAY)
                        )
                    ELSE
                        TIMESTAMPDIFF(
                            MINUTE,
                            CONCAT(DATE(due_date), ' ', TIME(start_time)),
                            CONCAT(DATE(due_date), ' ', TIME(end_time))
                        )
                    END
                WHERE {$eligibleWhere}";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'updated' => $stmt->rowCount(),
                'skipped' => $skipped,
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function feedbackPending(): void { $this->runListReport('tf.id IS NULL', $this->completedTaskWhere(), true, true); }
    public function tasksSummary(): void { $this->runListReport(); }
    public function feedbackReport(): void { $this->runListReport('tf.id IS NOT NULL', $this->completedTaskWhere(), true, true); }

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
                SUM(CASE WHEN t.status_id = 8 THEN 1 ELSE 0 END) AS success_count,
                SUM(CASE WHEN t.status_id IN (5,6) OR LOWER(COALESCE(tsm.name,'')) IN ('rejected','cancelled','failed','no show','no-show') THEN 1 ELSE 0 END) AS rejected_count,
                ROUND((SUM(CASE WHEN t.status_id = 8 THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT t.id),0)) * 100,2) AS success_ratio
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

            $status = strtolower(trim((string)($request['status'] ?? '')));
            $allowedStatuses = ['completed', 'success', 'rejected'];
            if ($status !== '' && !in_array($status, $allowedStatuses, true)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Invalid status filter']);
                return;
            }
            $fromDate = $request['from_date'] ?? null;
            $toDate = $request['to_date'] ?? null;
            $limit = max(1, min(5000, (int)($request['limit'] ?? 1000)));

            $durationExpr = "CASE
                WHEN t.duration IS NOT NULL THEN t.duration
                WHEN t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN GREATEST(TIMESTAMPDIFF(MINUTE, t.start_time, t.end_time), 0)
                WHEN t.task_start_time IS NOT NULL AND t.task_end_time IS NOT NULL THEN GREATEST(TIMESTAMPDIFF(MINUTE, t.task_start_time, t.task_end_time), 0)
                ELSE 0
            END";

            $params = [':expert_id' => $expertId, ':limit' => $limit];
            $where = ["ta.user_id = :expert_id", "ta.is_active = 1"];
            if ($status !== '') { $where[] = "LOWER(tsm.name) = :status"; $params[':status'] = $status; }
            if (!empty($fromDate) && !empty($toDate)) { $where[] = "DATE(t.due_date) BETWEEN :from_date AND :to_date"; $params[':from_date'] = (string)$fromDate; $params[':to_date'] = (string)$toDate; }

            $sql = "SELECT DISTINCT
                t.id AS task_id,
                COALESCE(cd.name, 'N/A') AS candidate_name,
                COALESCE(c_task.company_name, c_candidate.company_name, c_client.company_name, 'N/A') AS client_company,
                COALESCE(tt.name, 'N/A') AS task_type,
                COALESCE(tsm.name, 'N/A') AS task_status,
                DATE(t.due_date) AS task_date,
                COALESCE(t.task_start_time, t.start_time) AS eastern_source_time,
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
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $rows = array_map(function (array $row) {
                $row['est_time'] = $this->formatEasternFromUtc(isset($row['eastern_source_time']) ? (string)$row['eastern_source_time'] : null);
                unset($row['eastern_source_time']);
                return $row;
            }, $rows);
            echo json_encode(['success' => true, 'data' => $rows]);
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

    public function expertAvailabilityMatrix(): void {
        try {
            $date = (string)($_GET['date'] ?? date('Y-m-d'));
            $expertId = isset($_GET['expert_id']) && $_GET['expert_id'] !== '' ? (int)$_GET['expert_id'] : null;
            $taskTypeId = isset($_GET['task_type_id']) && $_GET['task_type_id'] !== '' ? (int)$_GET['task_type_id'] : null;
            $status = strtolower(trim((string)($_GET['status'] ?? '')));

            $startIst = new DateTime($date . ' 17:00:00', new DateTimeZone('Asia/Kolkata'));
            $endIst = (clone $startIst)->modify('+13 hours');
            $startUtc = (clone $startIst)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
            $endUtc = (clone $endIst)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');

            $expertWhere = ["u.status = 'active'", "LOWER(COALESCE(r.name,'')) LIKE '%expert%'"];
            $expertParams = [];
            if ($expertId !== null) { $expertWhere[] = 'u.id = :expert_id'; $expertParams[':expert_id'] = $expertId; }
            $expertsStmt = $this->conn->prepare("SELECT DISTINCT u.id, u.name FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE " . implode(' AND ', $expertWhere) . " ORDER BY u.name ASC");
            foreach ($expertParams as $k => $v) { $expertsStmt->bindValue($k, $v, PDO::PARAM_INT); }
            $expertsStmt->execute();
            $experts = $expertsStmt->fetchAll(PDO::FETCH_ASSOC);

            $taskWhere = ['ta.user_id IS NOT NULL', 'COALESCE(ta.assigned_at, t.start_time, t.task_start_time, t.due_date) >= :start_utc', 'COALESCE(ta.assigned_at, t.start_time, t.task_start_time, t.due_date) < :end_utc'];
            $params = [':start_utc' => $startUtc, ':end_utc' => $endUtc];
            if ($expertId !== null) { $taskWhere[] = 'ta.user_id = :expert_id'; $params[':expert_id'] = $expertId; }
            if ($taskTypeId !== null) { $taskWhere[] = 't.task_type_id = :task_type_id'; $params[':task_type_id'] = $taskTypeId; }
            if ($status !== '') { $taskWhere[] = 'LOWER(REPLACE(tsm.name, " ", "_")) = :status'; $params[':status'] = $status; }

            $taskSql = "SELECT ta.user_id expert_id, cd.name candidate_name, tt.name task_type, LOWER(REPLACE(COALESCE(tsm.name,'assigned'),' ','_')) status_key,
                COALESCE(ta.assigned_at, t.start_time, t.task_start_time, t.due_date) as slot_utc
                FROM tasks t
                INNER JOIN task_assignments ta ON ta.task_id=t.id AND ta.is_active=1
                LEFT JOIN candidates cd ON cd.id=t.candidate_id
                LEFT JOIN task_types tt ON tt.id=t.task_type_id
                LEFT JOIN task_status_master tsm ON tsm.id=t.status_id
                WHERE " . implode(' AND ', $taskWhere) . " ORDER BY slot_utc ASC";
            $stmt = $this->conn->prepare($taskSql);
            foreach ($params as $k => $v) { $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR); }
            $stmt->execute();
            $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $slots = [];
            $cursor = clone $startIst;
            while ($cursor < $endIst) {
                $next = (clone $cursor)->modify('+30 minutes');
                $slotKey = $cursor->format('Y-m-d H:i');
                $slots[$slotKey] = ['slot_key' => $slotKey, 'ist_label' => $cursor->format('h:i A') . ' - ' . $next->format('h:i A') . ' IST', 'est_label' => (clone $cursor)->setTimezone(new DateTimeZone('America/New_York'))->format('h:i A T') . ' - ' . (clone $next)->setTimezone(new DateTimeZone('America/New_York'))->format('h:i A T'), 'tasks_by_expert' => []];
                $cursor = $next;
            }
            foreach ($tasks as $task) {
                $dt = new DateTime((string)$task['slot_utc'], new DateTimeZone('UTC'));
                $dt->setTimezone(new DateTimeZone('Asia/Kolkata'));
                $minute = ((int)$dt->format('i') >= 30) ? '30' : '00';
                $key = $dt->format('Y-m-d H:') . $minute;
                if (!isset($slots[$key])) continue;
                $slots[$key]['tasks_by_expert'][(string)$task['expert_id']] = [
                    'candidate_name' => (string)($task['candidate_name'] ?? 'N/A'),
                    'task_type' => (string)($task['task_type'] ?? 'N/A'),
                    'status_key' => (string)($task['status_key'] ?? 'assigned'),
                ];
            }

            $filterTaskTypes = $this->conn->query("SELECT id, name FROM task_types WHERE status='active' ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);
            $statusOptions = [
              ['key' => 'assigned', 'label' => 'Assigned'], ['key' => 'running', 'label' => 'Running'], ['key' => 'completed', 'label' => 'Completed'], ['key' => 'no_show', 'label' => 'No Show'], ['key' => 'rescheduled', 'label' => 'Rescheduled']
            ];
            echo json_encode(['success' => true, 'data' => ['date' => $date, 'experts' => $experts, 'slots' => array_values($slots), 'filters' => ['experts' => $experts, 'task_types' => $filterTaskTypes, 'statuses' => $statusOptions]]]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}
