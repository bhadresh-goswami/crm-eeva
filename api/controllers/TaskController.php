<?php

require_once dirname(__DIR__) . "/config/database.php";
require_once dirname(__DIR__) . "/services/EmailService.php";
require_once dirname(__DIR__) . "/services/LoggerService.php";

class TaskController {
    private function ensureTaskTimingColumns(PDO $conn): void {
        $columns = $this->getTableColumns($conn, 'tasks');
        if (!in_array('task_start_time', $columns, true)) {
            $conn->exec("ALTER TABLE tasks ADD COLUMN task_start_time DATETIME NULL");
        }
        if (!in_array('task_end_time', $columns, true)) {
            $conn->exec("ALTER TABLE tasks ADD COLUMN task_end_time DATETIME NULL");
        }
    }
    public function expertTasks($user_id) {
        ini_set('display_errors', '1');
        error_reporting(E_ALL);

        try {
            $db = new Database();
            $conn = $db->connect();

            $expertUserId = (int)$user_id;
            error_log('expertTasks user_id=' . print_r($expertUserId, true));

            $taskColumns = $this->getTableColumns($conn, 'tasks');
            $assignmentColumns = $this->getTableColumns($conn, 'task_assignments');
            $feedbackColumns = $this->getTableColumns($conn, 'task_feedback');
            $taskFilesColumns = $this->getTableColumns($conn, 'task_files');

            $hasIsActive = in_array('is_active', $assignmentColumns, true);
            $hasAssignedBy = in_array('assigned_by', $assignmentColumns, true);
            $hasAssignedById = in_array('assigned_by_id', $assignmentColumns, true);
            $hasFileUrl = in_array('file_url', $taskColumns, true);
            $hasFile = in_array('file', $taskColumns, true);
            $hasAttachment = in_array('attachment', $taskColumns, true);
            $hasAttachmentUrl = in_array('attachment_url', $taskColumns, true);
            $hasUploadedFile = in_array('uploaded_file', $taskColumns, true);
            $hasTaskStartTime = in_array('task_start_time', $taskColumns, true);
            $hasTaskEndTime = in_array('task_end_time', $taskColumns, true);
            $hasFeedbackOverall = in_array('overall', $feedbackColumns, true);
            $hasTaskFilesFileUrl = in_array('file_url', $taskFilesColumns, true);

            $userIds = $this->getHierarchyUserIds($conn, $expertUserId);
            if (count($userIds) === 0) {
                echo json_encode(["success" => true, "data" => []]);
                return;
            }

            $status = isset($_GET['status']) ? trim((string)$_GET['status']) : '';
            $fromDate = isset($_GET['from_date']) ? trim((string)$_GET['from_date']) : '';
            $toDate = isset($_GET['to_date']) ? trim((string)$_GET['to_date']) : '';
            $taskTypeId = isset($_GET['task_type_id']) ? (int)$_GET['task_type_id'] : 0;
            $activeOnly = !empty($_GET['active_only']) && (string)$_GET['active_only'] !== '0';
            $feedbackOnly = !empty($_GET['feedback_only']) && (string)$_GET['feedback_only'] !== '0';

            $placeholders = implode(',', array_fill(0, count($userIds), '?'));

            $assignedByExpr = "''";
            $assignedByJoin = '';
            if ($hasAssignedBy) {
                $assignedByExpr = "COALESCE(assigned_by_user.name, '')";
                $assignedByJoin = " LEFT JOIN users assigned_by_user ON assigned_by_user.id = ta.assigned_by";
            } elseif ($hasAssignedById) {
                $assignedByExpr = "COALESCE(assigned_by_user.name, '')";
                $assignedByJoin = " LEFT JOIN users assigned_by_user ON assigned_by_user.id = ta.assigned_by_id";
            }

            $activeWhere = $hasIsActive ? 'AND ta2.is_active = 1' : '';
            $taskStartExpr = $hasTaskStartTime ? 't.task_start_time' : 'NULL';
            $taskEndExpr = $hasTaskEndTime ? 't.task_end_time' : 'NULL';
            $fileUrlExpr = "''";
            if ($hasFileUrl) {
                $fileUrlExpr = "COALESCE(t.file_url, '')";
            } elseif ($hasFile) {
                $fileUrlExpr = "COALESCE(t.file, '')";
            } elseif ($hasAttachment) {
                $fileUrlExpr = "COALESCE(t.attachment, '')";
            } elseif ($hasAttachmentUrl) {
                $fileUrlExpr = "COALESCE(t.attachment_url, '')";
            } elseif ($hasUploadedFile) {
                $fileUrlExpr = "COALESCE(t.uploaded_file, '')";
            }
            if ($hasTaskFilesFileUrl) {
                $fileUrlExpr = "COALESCE(NULLIF({$fileUrlExpr}, ''), COALESCE(tf_latest.file_url, ''))";
            }
            $feedbackOverallExpr = $hasFeedbackOverall ? 'COALESCE(tfb.overall, 0)' : '0';

            if ($hasAssignedBy) {
                $queryAssignedByExpr = "COALESCE(assigned_by_user.name, '')";
                $assignedByJoin = " LEFT JOIN users assigned_by_user ON assigned_by_user.id = ta.assigned_by";
                $assignedByExpr = $queryAssignedByExpr;
            }

            $query = "
                SELECT
                    t.id AS task_id,
                    COALESCE(cand.name, '') AS candidate_name,
                    COALESCE(cl.company_name, cl.name, '') AS company_name,
                    COALESCE(t.title, '') AS title,
                    COALESCE(t.description, '') AS description,
                    t.due_date,
                    t.start_time,
                    t.end_time,
                    {$taskStartExpr} AS task_start_time,
                    {$taskEndExpr} AS task_end_time,
                    COALESCE(t.duration, 0) AS duration,
                    COALESCE(tt.name, '') AS support_type,
                    COALESCE(tt.name, '') AS task_type,
                    COALESCE(t.status_id, 0) AS status_id,
                    COALESCE(ts.name, '') AS status_name,
                    ta.user_id AS assigned_to_id,
                    COALESCE(assigned_to_user.name, '') AS assigned_to_name,
                    {$assignedByExpr} AS assigned_by_name,
                    CASE WHEN ta.user_id = ? THEN 1 ELSE 0 END AS is_own_task,
                    {$fileUrlExpr} AS file_url,
                    {$feedbackOverallExpr} AS feedback_overall,
                    CASE WHEN tfb.id IS NULL THEN 'ADD' ELSE 'VIEW' END AS feedback_action
                FROM tasks t
                INNER JOIN task_assignments ta ON ta.id = (
                    SELECT ta2.id
                    FROM task_assignments ta2
                    WHERE ta2.task_id = t.id
                      {$activeWhere}
                    ORDER BY ta2.id DESC
                    LIMIT 1
                )
                LEFT JOIN candidates cand ON cand.id = t.candidate_id
                LEFT JOIN clients cl ON cl.id = t.client_id
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                LEFT JOIN task_types tt ON tt.id = t.task_type_id
                LEFT JOIN users assigned_to_user ON assigned_to_user.id = ta.user_id
                {$assignedByJoin}
                LEFT JOIN (
                    SELECT tf1.task_id, tf1.file_url
                    FROM task_files tf1
                    INNER JOIN (
                        SELECT task_id, MAX(id) AS max_id
                        FROM task_files
                        GROUP BY task_id
                    ) tf2 ON tf2.max_id = tf1.id
                ) tf_latest ON tf_latest.task_id = t.id
                LEFT JOIN task_feedback tfb ON tfb.task_id = t.id
                WHERE ta.user_id IN ($placeholders)
            ";

            $params = array_merge([$expertUserId], array_map('intval', $userIds));

            if ($status !== '' && strtolower($status) !== 'all') {
                $query .= " AND LOWER(COALESCE(ts.name, '')) = LOWER(?)";
                $params[] = $status;
            }
            if ($fromDate !== '') {
                $query .= " AND DATE(t.due_date) >= ?";
                $params[] = $fromDate;
            }
            if ($toDate !== '') {
                $query .= " AND DATE(t.due_date) <= ?";
                $params[] = $toDate;
            }
            if ($taskTypeId > 0) {
                $query .= " AND t.task_type_id = ?";
                $params[] = $taskTypeId;
            }
            if ($activeOnly) {
                $query .= " AND LOWER(COALESCE(ts.name, '')) IN ('pending', 'assigned', 'in progress', 'active')";
            }
            if ($feedbackOnly) {
                $query .= " AND LOWER(COALESCE(ts.name, '')) = 'completed'";
            }

            $query .= " ORDER BY t.due_date DESC, t.start_time DESC, t.id DESC";

            $stmt = $conn->prepare($query);
            $stmt->execute($params);
            $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $tasks,
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
        }
    }

    private function getTableColumns(PDO $conn, string $tableName): array {
        $stmt = $conn->prepare("SHOW COLUMNS FROM {$tableName}");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(static fn ($row) => (string)$row['Field'], $rows);
    }

    private function getHierarchyUserIds(PDO $conn, int $rootUserId): array {
        $stmt = $conn->prepare("SELECT id FROM users WHERE team_lead_id = ?");
        $stmt->execute([$rootUserId]);
        $subUserIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

        return array_values(array_unique(array_merge([$rootUserId], $subUserIds)));
    }



    public function LoadTaskForFeedback() {
        try {
            $db = new Database();
            $conn = $db->connect();
            $taskColumns = $this->getTableColumns($conn, 'tasks');
            $assignmentColumns = $this->getTableColumns($conn, 'task_assignments');
            $hasTaskStartTime = in_array('task_start_time', $taskColumns, true);
            $hasTaskEndTime = in_array('task_end_time', $taskColumns, true);
            $hasIsActive = in_array('is_active', $assignmentColumns, true);
            $assignmentJoin = $hasIsActive
                ? "LEFT JOIN task_assignments ta ON ta.task_id = t.id AND ta.is_active = 1"
                : "LEFT JOIN task_assignments ta ON ta.task_id = t.id";

            $payload = json_decode(file_get_contents("php://input"), true) ?: [];

            $search = trim((string)($payload['search'] ?? ''));
            $dateFrom = trim((string)($payload['date_from'] ?? ''));
            $dateTo = trim((string)($payload['date_to'] ?? ''));
            $page = max(1, (int)($payload['page'] ?? 1));
            $limit = max(1, min(100, (int)($payload['limit'] ?? 10)));
            $offset = ($page - 1) * $limit;

            $allowedSort = [
                'task_date' => 't.due_date',
                'candidate_name' => 'cand.name',
                'task_type' => 'tt.name',
                'status_name' => 'ts.name',
                'duration' => 't.duration',
            ];

            $sortByKey = strtolower(trim((string)($payload['sort_by'] ?? 'task_date')));
            $sortOrder = strtoupper(trim((string)($payload['sort_order'] ?? 'DESC'))) === 'ASC' ? 'ASC' : 'DESC';
            $sortColumn = $allowedSort[$sortByKey] ?? 't.due_date';

            $where = ["LOWER(COALESCE(ts.name, '')) = 'completed'"];
            $params = [];

            if ($search !== '') {
                $where[] = "(cand.name LIKE ? OR tt.name LIKE ? OR ts.name LIKE ? OR CAST(t.id AS CHAR) LIKE ?)";
                $like = '%' . $search . '%';
                array_push($params, $like, $like, $like, $like);
            }

            if ($dateFrom !== '') {
                $where[] = 'DATE(t.due_date) >= ?';
                $params[] = $dateFrom;
            }

            if ($dateTo !== '') {
                $where[] = 'DATE(t.due_date) <= ?';
                $params[] = $dateTo;
            }

            $whereClause = implode(' AND ', $where);

            $countSql = "
                SELECT COUNT(DISTINCT t.id)
                FROM tasks t
                LEFT JOIN candidates cand ON cand.id = t.candidate_id
                LEFT JOIN task_types tt ON tt.id = t.task_type_id
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                LEFT JOIN task_feedback tf ON tf.task_id = t.id
                {$assignmentJoin}
                LEFT JOIN users u ON u.id = ta.user_id
                WHERE {$whereClause}
            ";

            $countStmt = $conn->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = (int)$countStmt->fetchColumn();
            $totalPages = max(1, (int)ceil($totalRecords / $limit));

            $dataSql = "
                SELECT
                    t.id,
                    DATE(t.due_date) AS task_date,
                    COALESCE(cand.name, '') AS candidate_name,
                    COALESCE(tt.name, '') AS task_type,
                    COALESCE(ts.name, '') AS status_name,
                    COALESCE(t.duration, 0) AS duration,
                    " . ($hasTaskStartTime ? "t.task_start_time" : "t.start_time") . " AS actual_from_time,
                    " . ($hasTaskEndTime ? "t.task_end_time" : "t.end_time") . " AS actual_to_time,
                    tf.id AS feedback_id
                FROM tasks t
                LEFT JOIN candidates cand ON cand.id = t.candidate_id
                LEFT JOIN task_types tt ON tt.id = t.task_type_id
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                LEFT JOIN task_feedback tf ON tf.task_id = t.id
                {$assignmentJoin}
                LEFT JOIN users u ON u.id = ta.user_id
                WHERE {$whereClause}
                ORDER BY
                    CASE WHEN tf.id IS NULL THEN 0 ELSE 1 END ASC,
                    {$sortColumn} {$sortOrder},
                    t.id DESC
                LIMIT {$limit} OFFSET {$offset}
            ";

            $stmt = $conn->prepare($dataSql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $sourceTz = new DateTimeZone('Asia/Kolkata');
            $estTz = new DateTimeZone('America/New_York');

            $items = array_map(function ($row) use ($sourceTz, $estTz) {
                $taskDate = (string)($row['task_date'] ?? '');

                $convert = function ($value) use ($taskDate, $sourceTz, $estTz) {
                    if (!$value || !$taskDate) return null;
                    $raw = trim((string)$value);
                    if ($raw === '') return null;

                    $dateTime = DateTime::createFromFormat('Y-m-d H:i:s', $raw, $sourceTz)
                        ?: DateTime::createFromFormat('Y-m-d H:i', $raw, $sourceTz)
                        ?: DateTime::createFromFormat('Y-m-d H:i:s', "{$taskDate} {$raw}", $sourceTz)
                        ?: DateTime::createFromFormat('Y-m-d H:i', "{$taskDate} {$raw}", $sourceTz)
                        ?: DateTime::createFromFormat('H:i:s', $raw, $sourceTz)
                        ?: DateTime::createFromFormat('H:i', $raw, $sourceTz)
                        ?: DateTime::createFromFormat('Y-m-d', $taskDate, $sourceTz);

                    if (!$dateTime) {
                        try {
                            $dateTime = new DateTime("{$taskDate} {$raw}", $sourceTz);
                        } catch (Throwable $e) {
                            return null;
                        }
                    }

                    $dateTime->setTimezone($estTz);
                    return $dateTime;
                };

                $fromEst = $convert($row['actual_from_time'] ?? null);
                $toEst = $convert($row['actual_to_time'] ?? null);

                $fromText = $fromEst ? $fromEst->format('h:i A') : null;
                $toText = $toEst ? $toEst->format('h:i A') : null;

                return [
                    'id' => (int)$row['id'],
                    'task_date' => $taskDate,
                    'candidate_name' => (string)($row['candidate_name'] ?? ''),
                    'task_type' => (string)($row['task_type'] ?? ''),
                    'status_name' => (string)($row['status_name'] ?? ''),
                    'duration' => (int)($row['duration'] ?? 0),
                    'actual_from_time_est' => $fromText,
                    'actual_to_time_est' => $toText,
                    'est_time_range' => ($fromText && $toText) ? "{$fromText} - {$toText} EST" : '--',
                    'has_feedback' => !empty($row['feedback_id']),
                    'feedback_id' => !empty($row['feedback_id']) ? (int)$row['feedback_id'] : null,
                ];
            }, $rows);

            echo json_encode([
                'success' => true,
                'data' => [
                    'items' => $items,
                    'pagination' => [
                        'current_page' => $page,
                        'total_pages' => $totalPages,
                        'total_records' => $totalRecords,
                        'per_page' => $limit,
                    ],
                ],
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to load task reports for feedback: ' . $e->getMessage(),
            ]);
        }
    }

    public function cancelTask() {

    $data = json_decode(file_get_contents("php://input"));

    if (empty($data->task_id)) {
        echo json_encode(["error" => "task_id required"]);
        return;
    }

    $db = new Database();
    $conn = $db->connect();

    $status_id = $conn->query("
        SELECT id FROM task_status_master WHERE name='Cancelled'
    ")->fetchColumn();

    $stmt = $conn->prepare("
        UPDATE tasks SET status_id=? WHERE id=?
    ");

    $stmt->execute([$status_id, $data->task_id]);

    echo json_encode(["message" => "Task cancelled"]);
}
    public function bulkAssign() {

    $data = json_decode(file_get_contents("php://input"));

    if (empty($data->task_ids) || empty($data->user_id)) {
        echo json_encode(["error" => "Invalid data"]);
        return;
    }

    $db = new Database();
    $conn = $db->connect();

    $status_id = $conn->query("
        SELECT id FROM task_status_master WHERE name='Assigned'
    ")->fetchColumn();

    foreach ($data->task_ids as $task_id) {
        $taskId = (int)$task_id;
        $userId = (int)$data->user_id;

        $conn->prepare("
            UPDATE task_assignments
            SET is_active = 0
            WHERE task_id = ? AND is_active = 1
        ")->execute([$taskId]);

        $assignmentColumns = $this->getTableColumns($conn, 'task_assignments');
        $insertColumns = ['task_id', 'user_id', 'is_active'];
        $insertValues = [$taskId, $userId, 1];

        if (in_array('assigned_by', $assignmentColumns, true)) {
            $insertColumns[] = 'assigned_by';
            $insertValues[] = $data->assigned_by ?? null;
        } elseif (in_array('assigned_by_id', $assignmentColumns, true)) {
            $insertColumns[] = 'assigned_by_id';
            $insertValues[] = $data->assigned_by ?? null;
        }

        if (in_array('assigned_at', $assignmentColumns, true)) {
            $insertColumns[] = 'assigned_at';
        }

        $columnList = implode(', ', $insertColumns);
        $placeholderList = implode(', ', array_fill(0, count($insertValues), '?'));
        if (in_array('assigned_at', $assignmentColumns, true)) {
            $placeholderList .= ', NOW()';
        }

        $stmt = $conn->prepare("
            INSERT INTO task_assignments ({$columnList})
            VALUES ({$placeholderList})
        ");
        $stmt->execute($insertValues);

        $conn->prepare("
            UPDATE tasks SET status_id=? WHERE id=?
        ")->execute([$status_id, $taskId]);
    }

    echo json_encode(["message" => "Bulk assign done"]);
}
    public function bulkUpdateStatus() {

    $data = json_decode(file_get_contents("php://input"));

    if (empty($data->task_ids) || empty($data->status)) {
        echo json_encode(["error" => "Invalid data"]);
        return;
    }

    $db = new Database();
    $conn = $db->connect();

    // GET STATUS ID
    $stmt = $conn->prepare("SELECT id FROM task_status_master WHERE name=?");
    $stmt->execute([$data->status]);
    $status_id = $stmt->fetchColumn();

    if (!$status_id) {
        echo json_encode(["error" => "Invalid status"]);
        return;
    }

    $ids = implode(",", array_map('intval', $data->task_ids));

    $conn->exec("
        UPDATE tasks 
        SET status_id = $status_id 
        WHERE id IN ($ids)
    ");

    echo json_encode(["message" => "Tasks updated"]);
}
public function downloadFile() {

    if (!isset($_GET['file'])) {
        echo json_encode(["error" => "File missing"]);
        return;
    }

    $file = basename($_GET['file']); // 🔐 prevent path traversal

    $filePath = dirname(__DIR__) . "/supporting-document/" . $file;

    if (!file_exists($filePath)) {
        http_response_code(404);
        echo json_encode(["error" => "File not found"]);
        return;
    }

    // FORCE DOWNLOAD
    header("Content-Description: File Transfer");
    header("Content-Type: application/octet-stream");
    header("Content-Disposition: attachment; filename=\"" . $file . "\"");
    header("Content-Length: " . filesize($filePath));

    readfile($filePath);
    exit;
}
    // ================= CREATE =================
    public function create($user_id = 1, $user_role = '') {

        $db = new Database();
        $conn = $db->connect();

        try {

            // ✅ VALIDATION
            if (
                empty($_POST['client_id']) ||
                empty($_POST['task_type_id']) ||
                empty($_POST['title']) ||
                empty($_POST['due_date']) ||
                empty($_POST['start_time']) ||
                empty($_POST['duration'])
            ) {
                throw new Exception("Required fields missing");
            }

            if ($_POST['duration'] <= 0 || $_POST['duration'] > 500) {
                throw new Exception("Invalid duration");
            }

            // ✅ TIME CALCULATION
            $start_time = $_POST['start_time'];
            $duration = (int)$_POST['duration'];

            $dt = new DateTime($_POST['due_date'] . ' ' . $start_time);
            $dt->modify("+$duration minutes");
            $end_time = $dt->format("H:i:s");

            // ✅ DEFAULT STATUS
            $status_id = $conn->query("SELECT id FROM task_status_master WHERE name='Pending'")->fetchColumn();
            $payment_status_id = $conn->query("SELECT id FROM payment_status_master WHERE name='Pending'")->fetchColumn();

            $conn->beginTransaction();

            // ✅ INSERT TASK
            $stmt = $conn->prepare("
                INSERT INTO tasks (
                    client_id, candidate_id, poc_id,
                    task_type_id, status_id,
                    title, description,
                    due_date, start_time, end_time, duration,
                    total_amount, payment_status_id, payment_mode
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $normalizedRole = strtolower(trim((string)$user_role));
            $canSetPrice = in_array($normalizedRole, ['admin', 'manager'], true);
            $amount = $canSetPrice ? (float)($_POST['total_amount'] ?? 0) : 0;

            $stmt->execute([
                $_POST['client_id'],
                $_POST['candidate_id'] ?? null,
                $_POST['poc_id'] ?? null,
                $_POST['task_type_id'],
                $status_id,
                $_POST['title'],
                $_POST['description'] ?? null,
                $_POST['due_date'],
                $start_time,
                $end_time,
                $duration,
                $amount,
                $payment_status_id,
                $_POST['payment_mode'] ?? null
            ]);

            $task_id = $conn->lastInsertId();

            // ✅ FILE UPLOAD
            $this->handleFileUpload($conn, $task_id, $user_id);

            $conn->commit();

            echo json_encode([
                "message" => "Task created",
                "task_id" => $task_id,
                "end_time" => $end_time
            ]);

        } catch (Exception $e) {
            $conn->rollback();
            LoggerService::logError('Task create failed', ['error' => $e->getMessage()]);
            echo json_encode(["success" => false, "message" => "Something went wrong. Please try again."]);
        }
    }


    // ================= LIST =================
    public function list() {

        $db = new Database();
        $conn = $db->connect();

        $status = $_GET['status'] ?? null;
        $client_id = $_GET['client_id'] ?? null;
        $date = $_GET['date'] ?? null;

        $query = "
            SELECT 
                t.id,
                t.client_id,
                t.candidate_id,
                t.poc_id,
                t.task_type_id,
                t.title,
                t.description,
                t.due_date,
                t.start_time,
                t.end_time,
                t.duration,
                t.total_amount,

                c.name AS client_name,
                cand.name AS candidate_name,
                p.name AS poc_name,

                ts.name AS status,
                tt.name AS task_type,
                ps.name AS payment_status,
                ta.user_id AS assigned_to_id,
                u.name AS assigned_to_name,

                tf.file_url

            FROM tasks t
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN candidates cand ON t.candidate_id = cand.id
            LEFT JOIN client_pocs p ON t.poc_id = p.id
            LEFT JOIN task_status_master ts ON t.status_id = ts.id
            LEFT JOIN task_types tt ON t.task_type_id = tt.id
            LEFT JOIN payment_status_master ps ON t.payment_status_id = ps.id
            LEFT JOIN task_assignments ta ON ta.task_id = t.id AND ta.is_active = 1
            LEFT JOIN users u ON ta.user_id = u.id

            LEFT JOIN task_files tf 
            ON tf.id = (
                SELECT id FROM task_files 
                WHERE task_id = t.id 
                ORDER BY id DESC LIMIT 1
            )

            WHERE 1=1
        ";

        $params = [];

        if ($status) {
            $query .= " AND LOWER(ts.name) = LOWER(?)";
            $params[] = $status;
        }

        if ($client_id) {
            $query .= " AND t.client_id = ?";
            $params[] = $client_id;
        }

        if ($date) {
            $query .= " AND DATE(t.due_date) = ?";
            $params[] = $date;
        }

        $query .= " ORDER BY t.due_date DESC, t.start_time DESC, t.id DESC";

        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        error_log("[TaskController::list] input_status={$status}; input_date={$date}; rows=" . count($rows));
        error_log("[TaskController::list] sql=" . preg_replace('/\s+/', ' ', trim($query)));

        echo json_encode([
            "success" => true,
            "data" => $rows
        ]);
    }

    public function bulkPriceList(): void {
        $db = new Database();
        $conn = $db->connect();

        try {
            $fromDate = $_GET['from_date'] ?? null;
            $toDate = $_GET['to_date'] ?? null;
            $clientId = $_GET['client_id'] ?? null;
            $search = trim((string)($_GET['search'] ?? ''));
            $assignmentOrderColumn = in_array('created_at', $this->getTableColumns($conn, 'task_assignments'), true)
                ? 'created_at'
                : 'id';

            $query = "
                SELECT
                    t.id,
                    t.title,
                    t.description,
                    t.created_at,
                    t.due_date,
                    t.start_time,
                    t.end_time,
                    t.total_amount,
                    LOWER(COALESCE(ts.name, 'pending')) AS status,
                    COALESCE(cand.name, '') AS candidate_name,
                    COALESCE(cl.company_name, cl.name, '') AS company_name,
                    COALESCE(cl.name, '') AS client_name,
                    COALESCE(tt.name, 'Support') AS support_type,
                    COALESCE(u.name, '') AS assigned_to_name,
                    LOWER(COALESCE(ps.name, 'pending')) AS payment_status,
                    LOWER(COALESCE(inv.status, '')) AS invoice_status,
                    COALESCE(pay.total_paid, 0) AS paid_amount,
                    GREATEST(t.total_amount - COALESCE(pay.total_paid, 0), 0) AS pending_amount
                FROM tasks t
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                LEFT JOIN payment_status_master ps ON ps.id = t.payment_status_id
                LEFT JOIN clients cl ON cl.id = t.client_id
                LEFT JOIN candidates cand ON cand.id = t.candidate_id
                LEFT JOIN task_types tt ON tt.id = t.task_type_id
                LEFT JOIN task_assignments ta ON ta.id = (
                    SELECT ta2.id
                    FROM task_assignments ta2
                    WHERE ta2.task_id = t.id
                    ORDER BY ta2.{$assignmentOrderColumn} DESC
                    LIMIT 1
                )
                LEFT JOIN users u ON u.id = ta.user_id
                LEFT JOIN (
                    SELECT task_id, MAX(invoice_id) AS invoice_id
                    FROM invoice_items
                    GROUP BY task_id
                ) task_invoice_map ON task_invoice_map.task_id = t.id
                LEFT JOIN invoices inv ON inv.id = COALESCE(t.invoice_id, task_invoice_map.invoice_id)
                LEFT JOIN (
                    SELECT invoice_id, COALESCE(SUM(amount_paid), 0) AS total_paid
                    FROM invoice_payments
                    GROUP BY invoice_id
                ) pay ON pay.invoice_id = inv.id
                WHERE LOWER(COALESCE(ts.name, '')) = 'completed'
            ";

            $params = [];
            if (!empty($fromDate)) {
                $query .= " AND DATE(t.created_at) >= ?";
                $params[] = $fromDate;
            }
            if (!empty($toDate)) {
                $query .= " AND DATE(t.created_at) <= ?";
                $params[] = $toDate;
            }
            if (!empty($clientId)) {
                $query .= " AND t.client_id = ?";
                $params[] = $clientId;
            }
            if ($search !== '') {
                $query .= " AND (
                    LOWER(COALESCE(cand.name, '')) LIKE ?
                    OR LOWER(COALESCE(cl.company_name, cl.name, '')) LIKE ?
                    OR LOWER(COALESCE(tt.name, '')) LIKE ?
                )";
                $searchTerm = '%' . strtolower($search) . '%';
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }

            $query .= "
                GROUP BY t.id
                HAVING pending_amount > 0 OR t.total_amount = 0
                ORDER BY t.created_at DESC, t.id DESC
            ";

            $stmt = $conn->prepare($query);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $summary = [
                'total_pending_tasks' => count($rows),
                'total_pending_amount' => array_reduce($rows, static function ($carry, $row) {
                    return $carry + (float)($row['pending_amount'] ?? 0);
                }, 0.0),
            ];

            echo json_encode(["success" => true, "data" => $rows, 'summary' => $summary]);
        } catch (Throwable $error) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $error->getMessage()]);
        }
    }

    public function updatePrices(): void {
        $payload = json_decode(file_get_contents("php://input"), true);
        $items = is_array($payload) ? $payload : [];

        if (!$items) {
            http_response_code(422);
            echo json_encode(["success" => false, "message" => "Price updates payload is required."]);
            return;
        }

        $db = new Database();
        $conn = $db->connect();

        try {
            $conn->beginTransaction();

            $selectTask = $conn->prepare("
                SELECT t.id, LOWER(COALESCE(i.status, 'pending')) AS invoice_status
                FROM tasks t
                LEFT JOIN invoices i ON i.id = t.invoice_id
                WHERE t.id = ?
                LIMIT 1
            ");
            $updateStmt = $conn->prepare("UPDATE tasks SET total_amount = ? WHERE id = ?");
            $statusIdStmt = $conn->prepare("SELECT id FROM task_status_master WHERE LOWER(name) = LOWER(?) LIMIT 1");
            $updateTaskMetaStmt = $conn->prepare("UPDATE tasks SET status_id = COALESCE(?, status_id), due_date = COALESCE(?, due_date), start_time = COALESCE(?, start_time), end_time = COALESCE(?, end_time) WHERE id = ?");
            $assigneeStmt = $conn->prepare("SELECT id FROM users WHERE LOWER(name) = LOWER(?) LIMIT 1");
            $deactivateAssignmentsStmt = $conn->prepare("UPDATE task_assignments SET is_active = 0 WHERE task_id = ? AND is_active = 1");
            $insertAssignmentStmt = $conn->prepare("INSERT INTO task_assignments (task_id, user_id, is_active) VALUES (?, ?, 1)");

            $updated = 0;
            foreach ($items as $item) {
                $taskId = (int)($item['task_id'] ?? 0);
                $amount = (float)($item['amount'] ?? 0);
                if ($taskId <= 0 || $amount < 0) {
                    continue;
                }

                $selectTask->execute([$taskId]);
                $task = $selectTask->fetch(PDO::FETCH_ASSOC);
                if (!$task) {
                    continue;
                }

                if (strtolower((string)($task['invoice_status'] ?? 'pending')) === 'paid') {
                    continue;
                }

                $updateStmt->execute([$amount, $taskId]);
                $updated += $updateStmt->rowCount();

                $updatedFields = is_array($item['updated_fields'] ?? null) ? $item['updated_fields'] : [];
                if ($updatedFields) {
                    $statusId = null;
                    if (!empty($updatedFields['status'])) {
                        $statusIdStmt->execute([trim((string)$updatedFields['status'])]);
                        $resolvedStatusId = $statusIdStmt->fetchColumn();
                        $statusId = $resolvedStatusId ? (int)$resolvedStatusId : null;
                    }

                    $date = !empty($updatedFields['date']) ? (string)$updatedFields['date'] : null;
                    $timeRaw = trim((string)($updatedFields['time_in_out'] ?? ''));
                    $startTime = null;
                    $endTime = null;
                    if ($timeRaw !== '') {
                        $parts = array_map('trim', preg_split('/[\\/\\-]/', $timeRaw));
                        if (count($parts) >= 2) {
                            $startTime = $parts[0];
                            $endTime = $parts[1];
                        }
                    }

                    $updateTaskMetaStmt->execute([$statusId, $date, $startTime, $endTime, $taskId]);

                    if (!empty($updatedFields['assign_to'])) {
                        $assigneeStmt->execute([trim((string)$updatedFields['assign_to'])]);
                        $assigneeId = $assigneeStmt->fetchColumn();
                        if ($assigneeId) {
                            $deactivateAssignmentsStmt->execute([$taskId]);
                            $insertAssignmentStmt->execute([$taskId, (int)$assigneeId]);
                        }
                    }
                }
            }

            $conn->commit();
            echo json_encode(["success" => true, "message" => "Task prices updated.", "updated_count" => $updated]);
        } catch (Throwable $error) {
            if ($conn->inTransaction()) $conn->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $error->getMessage()]);
        }
    }

    public function reportTasks($user): void {
        $db = new Database();
        $conn = $db->connect();

        try {
            $this->ensureTaskTimingColumns($conn);
            $assignmentOrderColumn = in_array('created_at', $this->getTableColumns($conn, 'task_assignments'), true)
                ? 'created_at'
                : 'id';
            $query = "
                SELECT
                    t.id,
                    t.title,
                    DATE(t.created_at) AS created_at,
                    t.task_start_time,
                    t.task_end_time,
                    t.duration,
                    t.total_amount,
                    LOWER(COALESCE(ts.name, 'pending')) AS status,
                    COALESCE(cl.company_name, cl.name, '') AS company_name,
                    COALESCE(cand.name, '') AS candidate_name,
                    COALESCE(u.name, '') AS assigned_to_name
                FROM tasks t
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                LEFT JOIN clients cl ON cl.id = t.client_id
                LEFT JOIN candidates cand ON cand.id = t.candidate_id
                LEFT JOIN task_assignments ta ON ta.id = (
                    SELECT ta2.id
                    FROM task_assignments ta2
                    WHERE ta2.task_id = t.id
                    ORDER BY ta2.{$assignmentOrderColumn} DESC
                    LIMIT 1
                )
                LEFT JOIN users u ON u.id = ta.user_id
                WHERE 1=1
            ";
            $params = [];

            if (!empty($_GET['status'])) {
                $query .= " AND LOWER(COALESCE(ts.name, '')) = LOWER(?)";
                $params[] = (string)$_GET['status'];
            }
            if (!empty($_GET['from_date'])) {
                $query .= " AND DATE(t.created_at) >= ?";
                $params[] = (string)$_GET['from_date'];
            }
            if (!empty($_GET['to_date'])) {
                $query .= " AND DATE(t.created_at) <= ?";
                $params[] = (string)$_GET['to_date'];
            }
            if (!empty($_GET['client_id'])) {
                $query .= " AND t.client_id = ?";
                $params[] = (int)$_GET['client_id'];
            }
            if (!empty($_GET['candidate_id'])) {
                $query .= " AND t.candidate_id = ?";
                $params[] = (int)$_GET['candidate_id'];
            }
            if (!empty($_GET['assigned_user_id'])) {
                $query .= " AND EXISTS (SELECT 1 FROM task_assignments ta_filter WHERE ta_filter.task_id = t.id AND ta_filter.user_id = ?)";
                $params[] = (int)$_GET['assigned_user_id'];
            }

            $query .= " ORDER BY t.created_at DESC, t.id DESC";

            $stmt = $conn->prepare($query);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "data" => $rows]);
        } catch (Throwable $error) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $error->getMessage()]);
        }
    }

    public function reportTaskAssignments(): void {
        $db = new Database();
        $conn = $db->connect();

        try {
            $assignmentOrderColumn = in_array('created_at', $this->getTableColumns($conn, 'task_assignments'), true)
                ? 'created_at'
                : 'id';
            $query = "
                SELECT
                    t.id AS task_id,
                    COALESCE(u.name, '') AS assigned_to_name,
                    DATE(t.created_at) AS created_at,
                    LOWER(COALESCE(ts.name, 'pending')) AS status
                FROM tasks t
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                LEFT JOIN task_assignments ta ON ta.id = (
                    SELECT ta2.id
                    FROM task_assignments ta2
                    WHERE ta2.task_id = t.id
                    ORDER BY ta2.{$assignmentOrderColumn} DESC
                    LIMIT 1
                )
                LEFT JOIN users u ON u.id = ta.user_id
                WHERE 1=1
            ";
            $params = [];

            if (!empty($_GET['status'])) {
                $query .= " AND LOWER(COALESCE(ts.name, '')) = LOWER(?)";
                $params[] = (string)$_GET['status'];
            }
            if (!empty($_GET['from_date'])) {
                $query .= " AND DATE(t.created_at) >= ?";
                $params[] = (string)$_GET['from_date'];
            }
            if (!empty($_GET['to_date'])) {
                $query .= " AND DATE(t.created_at) <= ?";
                $params[] = (string)$_GET['to_date'];
            }

            $query .= " ORDER BY t.created_at DESC, t.id DESC";

            $stmt = $conn->prepare($query);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "data" => $rows]);
        } catch (Throwable $error) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $error->getMessage()]);
        }
    }

    public function checkUpdates($user_id = null) {
        $db = new Database();
        $conn = $db->connect();

        try {
            $sinceId = max(0, (int)($_GET['since_id'] ?? 0));
            $windowMinutes = (int)($_GET['window_minutes'] ?? 30);
            if ($windowMinutes <= 0) $windowMinutes = 30;
            if ($windowMinutes > 180) $windowMinutes = 180;

            $newSql = "
                SELECT t.id, t.title, t.due_date, t.start_time
                FROM tasks t
                LEFT JOIN task_status_master ts ON t.status_id = ts.id
                WHERE t.id > ?
                  AND LOWER(COALESCE(ts.name, 'pending')) <> 'cancelled'
                ORDER BY t.id DESC
                LIMIT 20
            ";

            $newParams = [$sinceId];

            $upcomingSql = "
                SELECT t.id, t.title, t.due_date, t.start_time
                FROM tasks t
                LEFT JOIN task_status_master ts ON t.status_id = ts.id
                WHERE LOWER(COALESCE(ts.name, 'pending')) IN ('pending', 'assigned', 'active')
                  AND TIMESTAMP(t.due_date, t.start_time) BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? MINUTE)
                ORDER BY t.due_date ASC, t.start_time ASC
                LIMIT 20
            ";

            $upcomingParams = [$windowMinutes];

            if ($user_id) {
                $assignmentFilter = " AND EXISTS (
                    SELECT 1
                    FROM task_assignments ta
                    WHERE ta.task_id = t.id
                      AND ta.user_id = ?
                      AND ta.is_active = 1
                )";
                $newSql = str_replace(" ORDER BY", $assignmentFilter . " ORDER BY", $newSql);
                $upcomingSql = str_replace(" ORDER BY", $assignmentFilter . " ORDER BY", $upcomingSql);
                $newParams[] = (int)$user_id;
                $upcomingParams[] = (int)$user_id;
            }

            $newStmt = $conn->prepare($newSql);
            $newStmt->execute($newParams);
            $newTasks = $newStmt->fetchAll(PDO::FETCH_ASSOC);

            $upcomingStmt = $conn->prepare($upcomingSql);
            $upcomingStmt->execute($upcomingParams);
            $upcomingTasks = $upcomingStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "new_tasks" => $newTasks,
                "upcoming_tasks" => $upcomingTasks,
            ]);
        } catch (Exception $e) {
            LoggerService::logError('Task check updates failed', [
                'user_id' => $user_id,
                'error' => $e->getMessage(),
            ]);
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Unable to check task updates right now.",
            ]);
        }
    }

    public function lastUpdate(): void {
        $db = new Database();
        $conn = $db->connect();

        try {
            $columns = $this->getTableColumns($conn, 'tasks');
            $updateColumn = in_array('updated_at', $columns, true) ? 'updated_at' : 'created_at';

            $stmt = $conn->query("SELECT COALESCE(MAX({$updateColumn}), MAX(created_at)) AS last_update FROM tasks");
            $lastUpdate = $stmt->fetchColumn();

            echo json_encode([
                'success' => true,
                'last_update' => $lastUpdate ?: null,
            ]);
        } catch (Throwable $error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $error->getMessage()]);
        }
    }


    // ================= UPDATE =================
    public function update($user_id) {

        $db = new Database();
        $conn = $db->connect();

        try {
            $rawInput = file_get_contents('php://input');
            $jsonInput = json_decode($rawInput ?: '', true);
            $payload = $_POST;

            if ((!is_array($payload) || count($payload) === 0) && is_array($jsonInput)) {
                $payload = $jsonInput;
            }

            LoggerService::logInfo('Task update request payload', [
                'task_id' => $payload['task_id'] ?? null,
                'has_description' => array_key_exists('description', $payload),
                'description_length' => strlen((string)($payload['description'] ?? '')),
                'keys' => array_keys($payload),
            ]);

            if (empty($payload['task_id'])) {
                throw new Exception("task_id required");
            }

            $start_time = trim((string)($payload['start_time'] ?? ''));
            $due_date = trim((string)($payload['due_date'] ?? ''));
            $duration = (int)($payload['duration'] ?? 0);

            if ($start_time === '') {
                throw new Exception("start_time required");
            }

            if ($due_date === '') {
                throw new Exception("due_date required");
            }

            if ($duration <= 0) {
                throw new Exception("duration required");
            }

            $dt = new DateTime($due_date . ' ' . $start_time);
            $dt->modify("+$duration minutes");
            $end_time = $dt->format("H:i:s");

            $conn->beginTransaction();

            // ✅ UPDATE TASK
            $stmt = $conn->prepare("
                UPDATE tasks SET
                    client_id=?,
                    candidate_id=?,
                    poc_id=?,
                    task_type_id=?,
                    title=?,
                    description=?,
                    due_date=?,
                    start_time=?,
                    end_time=?,
                    duration=?,
                    total_amount=?,
                    payment_mode=?
                WHERE id=?
            ");

            $stmt->execute([
                $payload['client_id'] ?? null,
                $payload['candidate_id'] ?? null,
                $payload['poc_id'] ?? null,
                $payload['task_type_id'] ?? null,
                $payload['title'] ?? null,
                $payload['description'] ?? null,
                $due_date,
                $start_time,
                $end_time,
                $duration,
                $payload['total_amount'] ?? 0,
                $payload['payment_mode'] ?? null,
                $payload['task_id']
            ]);

            // FILE
            $this->handleFileUpload($conn, $payload['task_id'], $user_id);

            $conn->commit();
            EmailService::sendTaskNotification((int)$payload['task_id'], 'updated', null, (int)$user_id);

            echo json_encode(["success" => true, "message" => "Task updated"]);

        } catch (Exception $e) {
            $failedTaskId = $_POST['task_id'] ?? ($payload['task_id'] ?? null);
            if ($conn->inTransaction()) {
                $conn->rollback();
            }
            LoggerService::logError('Task update failed', [
                'task_id' => $failedTaskId,
                'error' => $e->getMessage()
            ]);
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Something went wrong. Please try again."]);
        }
    }


    // ================= FILE HANDLER =================
    private function handleFileUpload($conn, $task_id, $user_id) {

        if (!isset($_FILES['files'])) return;

        $uploadDir = dirname(__DIR__) . "/supporting-document/";
        if (!file_exists($uploadDir)) mkdir($uploadDir, 0755, true);

        foreach ($_FILES['files']['tmp_name'] as $key => $tmp) {

            if ($_FILES['files']['size'][$key] == 0) continue;

            $name = $_FILES['files']['name'][$key];
            $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));

            if (!in_array($ext, ['pdf','doc','docx','png','jpg'])) {
                throw new Exception("Invalid file type");
            }

            $fileName = time() . "_" . uniqid() . "_" . preg_replace("/[^a-zA-Z0-9.]/", "_", $name);

            move_uploaded_file($tmp, $uploadDir . $fileName);

            $stmt = $conn->prepare("
                INSERT INTO task_files (task_id, file_url, uploaded_by)
                VALUES (?, ?, ?)
            ");

            $stmt->execute([$task_id, $fileName, $user_id]);
        }
    }


    // ================= ASSIGN =================
    public function assign($assignedByUserId = null) {

        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();
        try {
            $status_id = $conn->query("
                SELECT id FROM task_status_master WHERE name='Assigned'
            ")->fetchColumn();

            $taskId = (int)$data->task_id;
            $userId = (int)$data->user_id;

            $conn->beginTransaction();
            $taskLockStmt = $conn->prepare("
                SELECT id
                FROM tasks
                WHERE id = ?
                FOR UPDATE
            ");
            $taskLockStmt->execute([$taskId]);
            if ((int)$taskLockStmt->fetchColumn() <= 0) {
                $conn->rollBack();
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Task not found"]);
                return;
            }

            $conn->prepare("
                UPDATE task_assignments
                SET is_active = 0
                WHERE task_id = ? AND is_active = 1
            ")->execute([$taskId]);

            $assignmentColumns = $this->getTableColumns($conn, 'task_assignments');
            $insertColumns = ['task_id', 'user_id', 'is_active'];
            $insertValues = [$taskId, $userId, 1];

            if (in_array('assigned_by', $assignmentColumns, true)) {
                $insertColumns[] = 'assigned_by';
                $insertValues[] = $assignedByUserId;
            } elseif (in_array('assigned_by_id', $assignmentColumns, true)) {
                $insertColumns[] = 'assigned_by_id';
                $insertValues[] = $assignedByUserId;
            }

            if (in_array('assigned_at', $assignmentColumns, true)) {
                $insertColumns[] = 'assigned_at';
            }

            $columnList = implode(', ', $insertColumns);
            $placeholderList = implode(', ', array_fill(0, count($insertValues), '?'));
            if (in_array('assigned_at', $assignmentColumns, true)) {
                $placeholderList .= ', NOW()';
            }

            $conn->prepare("
                INSERT INTO task_assignments ({$columnList})
                VALUES ({$placeholderList})
            ")->execute($insertValues);

            $conn->prepare("
                UPDATE tasks SET status_id=? WHERE id=?
            ")->execute([$status_id, $taskId]);
            $conn->commit();

            $emailResult = EmailService::sendTaskNotification($taskId, 'assigned', null, $assignedByUserId);

            echo json_encode([
                "success" => true,
                "message" => "Task assigned",
                "email_status" => $emailResult['email_status'] ?? 'failed',
                "email_error" => $emailResult['email_error'] ?? null,
            ]);
        } catch (Exception $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            LoggerService::logError('Task assign failed', [
                'task_id' => $data->task_id ?? null,
                'user_id' => $data->user_id ?? null,
                'assigned_by' => $assignedByUserId,
                'error' => $e->getMessage()
            ]);
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Something went wrong. Please try again."]);
        }
    }

    public function checkActiveTask($user_id) {
        $db = new Database();
        $conn = $db->connect();

        $statusId = $this->getStatusIdByName($conn, 'In Progress');
        if (!$statusId) {
            echo json_encode([
                "success" => true,
                "has_active_task" => false
            ]);
            return;
        }

        $stmt = $conn->prepare("
            SELECT t.id
            FROM task_assignments ta
            INNER JOIN tasks t ON t.id = ta.task_id
            WHERE ta.user_id = ?
              AND ta.is_active = 1
              AND t.status_id = ?
            LIMIT 1
        ");
        $stmt->execute([(int)$user_id, (int)$statusId]);
        $activeTaskId = (int)$stmt->fetchColumn();

        echo json_encode([
            "success" => true,
            "has_active_task" => $activeTaskId > 0,
            "active_task_id" => $activeTaskId > 0 ? $activeTaskId : null
        ]);
    }

    public function startTask($user_id) {
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->task_id)) {
            http_response_code(400);
            echo json_encode(["error" => "task_id required"]);
            return;
        }

        $db = new Database();
        $conn = $db->connect();
        $this->ensureTaskTimingColumns($conn);

        $inProgressStatusId = $this->getStatusIdByName($conn, 'In Progress');
        if (!$inProgressStatusId) {
            http_response_code(422);
            echo json_encode(["error" => "In Progress status not configured"]);
            return;
        }

        try {
            $conn->beginTransaction();

            $activeStmt = $conn->prepare("
                SELECT t.id
                FROM task_assignments ta
                INNER JOIN tasks t ON t.id = ta.task_id
                WHERE ta.user_id = ?
                  AND ta.is_active = 1
                  AND t.status_id = ?
                  AND t.id <> ?
                LIMIT 1
            ");
            $activeStmt->execute([(int)$user_id, (int)$inProgressStatusId, (int)$data->task_id]);
            $otherActiveTaskId = (int)$activeStmt->fetchColumn();
            if ($otherActiveTaskId > 0) {
                $conn->rollBack();
                http_response_code(409);
                echo json_encode([
                    "error" => "Another task is already in progress",
                    "active_task_id" => $otherActiveTaskId
                ]);
                return;
            }

            $assignmentStmt = $conn->prepare("
                SELECT id
                FROM task_assignments
                WHERE task_id = ? AND user_id = ?
                ORDER BY id DESC
                LIMIT 1
            ");
            $assignmentStmt->execute([(int)$data->task_id, (int)$user_id]);
            $assignmentId = (int)$assignmentStmt->fetchColumn();
            if ($assignmentId <= 0) {
                $conn->rollBack();
                http_response_code(403);
                echo json_encode(["error" => "Task is not assigned to this expert"]);
                return;
            }

            $taskStateStmt = $conn->prepare("SELECT task_start_time FROM tasks WHERE id = ? LIMIT 1");
            $taskStateStmt->execute([(int)$data->task_id]);
            $taskState = $taskStateStmt->fetch(PDO::FETCH_ASSOC) ?: null;
            if (!$taskState) {
                $conn->rollBack();
                http_response_code(404);
                echo json_encode(["error" => "Task not found"]);
                return;
            }
            if (!empty($taskState['task_start_time'])) {
                $conn->rollBack();
                http_response_code(409);
                echo json_encode(["error" => "Task already started"]);
                return;
            }

            $conn->prepare("UPDATE tasks SET status_id = ?, task_start_time = CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'Asia/Kolkata') WHERE id = ?")
                ->execute([(int)$inProgressStatusId, (int)$data->task_id]);

            $conn->prepare("UPDATE task_assignments SET is_active = 1 WHERE id = ?")
                ->execute([$assignmentId]);

            $conn->commit();
            EmailService::sendTaskNotification((int)$data->task_id, 'status_update', 'Status moved to In Progress', (int)$user_id);
            echo json_encode(["success" => true, "message" => "Task started"]);
        } catch (Exception $e) {
            if ($conn->inTransaction()) $conn->rollBack();
            LoggerService::logError('Task start failed', [
                'task_id' => $data->task_id ?? null,
                'user_id' => $user_id,
                'error' => $e->getMessage()
            ]);
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Something went wrong. Please try again."]);
        }
    }

    public function endTask($user_id) {
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->task_id) || empty($data->status) || !isset($data->comment)) {
            http_response_code(400);
            echo json_encode(["error" => "task_id, status and comment are required"]);
            return;
        }

        $comment = trim((string)$data->comment);
        if ($comment === '') {
            http_response_code(422);
            echo json_encode(["error" => "Comment is required"]);
            return;
        }

        $allowedStatuses = ['Completed', 'Cancelled', 'No Show', 'Rescheduled'];
        if (!in_array((string)$data->status, $allowedStatuses, true)) {
            http_response_code(422);
            echo json_encode(["error" => "Invalid task end status"]);
            return;
        }

        $db = new Database();
        $conn = $db->connect();
        $this->ensureTaskTimingColumns($conn);

        $statusId = $this->getStatusIdByName($conn, (string)$data->status);
        if (!$statusId) {
            http_response_code(422);
            echo json_encode(["error" => "Status not configured"]);
            return;
        }

        try {
            $conn->beginTransaction();

            $assignmentStmt = $conn->prepare("
                SELECT id
                FROM task_assignments
                WHERE task_id = ? AND user_id = ?
                ORDER BY id DESC
                LIMIT 1
            ");
            $assignmentStmt->execute([(int)$data->task_id, (int)$user_id]);
            $assignmentId = (int)$assignmentStmt->fetchColumn();
            if ($assignmentId <= 0) {
                $conn->rollBack();
                http_response_code(403);
                echo json_encode(["error" => "Task is not assigned to this expert"]);
                return;
            }

            $taskStateStmt = $conn->prepare("SELECT task_start_time FROM tasks WHERE id = ? LIMIT 1");
            $taskStateStmt->execute([(int)$data->task_id]);
            $taskState = $taskStateStmt->fetch(PDO::FETCH_ASSOC) ?: null;
            if (!$taskState) {
                $conn->rollBack();
                http_response_code(404);
                echo json_encode(["error" => "Task not found"]);
                return;
            }
            if (empty($taskState['task_start_time'])) {
                $conn->rollBack();
                http_response_code(409);
                echo json_encode(["error" => "Task must be started before ending"]);
                return;
            }

            $conn->prepare("
                UPDATE tasks
                SET status_id = ?,
                    task_end_time = CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'Asia/Kolkata'),
                    duration = TIMESTAMPDIFF(MINUTE, task_start_time, CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'Asia/Kolkata'))
                WHERE id = ?
            ")->execute([(int)$statusId, (int)$data->task_id]);

            $conn->prepare("UPDATE task_assignments SET is_active = 0 WHERE id = ?")
                ->execute([$assignmentId]);

            $commentStmt = $conn->prepare("
                INSERT INTO task_comments (task_id, user_id, comment, created_at)
                VALUES (?, ?, ?, NOW())
            ");
            $commentStmt->execute([(int)$data->task_id, (int)$user_id, $comment]);

            $conn->commit();
            EmailService::sendTaskNotification((int)$data->task_id, 'status_update', $comment, (int)$user_id);
            echo json_encode(["success" => true, "message" => "Task updated"]);
        } catch (Exception $e) {
            if ($conn->inTransaction()) $conn->rollBack();
            LoggerService::logError('Task end failed', [
                'task_id' => $data->task_id ?? null,
                'user_id' => $user_id,
                'status' => $data->status ?? null,
                'error' => $e->getMessage()
            ]);
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Something went wrong. Please try again."]);
        }
    }

    public function comments() {
        $taskId = isset($_GET['task_id']) ? (int)$_GET['task_id'] : 0;
        if ($taskId <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "task_id required"]);
            return;
        }

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            SELECT
                tc.id,
                tc.task_id,
                tc.user_id,
                COALESCE(u.name, '') AS user_name,
                tc.comment,
                tc.created_at
            FROM task_comments tc
            LEFT JOIN users u ON u.id = tc.user_id
            WHERE tc.task_id = ?
            ORDER BY tc.created_at DESC, tc.id DESC
        ");
        $stmt->execute([$taskId]);

        echo json_encode([
            "success" => true,
            "comments" => $stmt->fetchAll(PDO::FETCH_ASSOC),
        ]);
    }

    public function sendDailyReport($user_id) {
        $result = EmailService::sendDailyReportForUser((int)$user_id, true);
        if (($result['email_status'] ?? '') === 'skipped' && ($result['email_error'] ?? '') === 'no_tasks_today') {
            http_response_code(422);
            echo json_encode([
                "success" => false,
                "message" => "No tasks found for today.",
            ]);
            return;
        }

        echo json_encode([
            "success" => true,
            "email_status" => $result['email_status'] ?? 'failed',
            "email_error" => $result['email_error'] ?? null,
            "message" => "Daily report processed",
        ]);
    }

    private function getStatusIdByName(PDO $conn, string $statusName) {
        $stmt = $conn->prepare("SELECT id FROM task_status_master WHERE name = ? LIMIT 1");
        $stmt->execute([$statusName]);
        return $stmt->fetchColumn();
    }
}
