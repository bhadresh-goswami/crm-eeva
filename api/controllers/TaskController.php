<?php

require_once dirname(__DIR__) . "/config/database.php";
require_once dirname(__DIR__) . "/services/EmailService.php";
require_once dirname(__DIR__) . "/services/LoggerService.php";

class TaskController {
    public function expertTasks($user_id) {
        $db = new Database();
        $conn = $db->connect();
        $activeOnly = isset($_GET['active_only']) && (string)$_GET['active_only'] === '1';

        $visibleUserIds = $this->getHierarchyUserIds($conn, (int)$user_id);
        if (empty($visibleUserIds)) {
            $visibleUserIds = [(int)$user_id];
        }

        $assignmentColumns = $this->getTableColumns($conn, 'task_assignments');
        $assignedByColumn = null;
        foreach (['assigned_by', 'assigned_by_id'] as $columnName) {
            if (in_array($columnName, $assignmentColumns, true)) {
                $assignedByColumn = $columnName;
                break;
            }
        }

        $placeholders = implode(',', array_fill(0, count($visibleUserIds), '?'));
        $assignedByJoin = $assignedByColumn
            ? "LEFT JOIN users assigned_by_user ON assigned_by_user.id = ta.{$assignedByColumn}"
            : "";
        $assignedBySelect = $assignedByColumn
            ? "COALESCE(assigned_by_user.name, '') AS assigned_by_name,"
            : "'' AS assigned_by_name,";

        $query = "
            SELECT
                t.id AS task_id,
                cand.name AS candidate_name,
                c.name AS company_name,
                t.title,
                t.description,
                t.due_date,
                t.start_time,
                t.end_time,
                COALESCE(tt.name, '') AS support_type,
                t.status_id,
                COALESCE(ts.name, '') AS status_name,
                ta.user_id AS assigned_to_id,
                COALESCE(assigned_to_user.name, '') AS assigned_to_name,
                CASE WHEN ta.user_id = ? THEN 1 ELSE 0 END AS is_own_task,
                {$assignedBySelect}
                tf.file_url
            FROM task_assignments ta
            INNER JOIN tasks t ON t.id = ta.task_id
            LEFT JOIN candidates cand ON cand.id = t.candidate_id
            LEFT JOIN clients c ON c.id = t.client_id
            LEFT JOIN task_status_master ts ON ts.id = t.status_id
            LEFT JOIN task_types tt ON tt.id = t.task_type_id
            LEFT JOIN users assigned_to_user ON assigned_to_user.id = ta.user_id
            {$assignedByJoin}
            LEFT JOIN task_files tf
              ON tf.id = (
                  SELECT id FROM task_files
                  WHERE task_id = t.id
                  ORDER BY id DESC LIMIT 1
              )
            WHERE ta.user_id IN ({$placeholders})
              AND ta.is_active = 1
        ";

        $params = array_merge([(int)$user_id], $visibleUserIds);
        if ($activeOnly) {
            $query .= " AND ta.is_active = 1";
        }

        $query .= "
            ORDER BY t.due_date ASC, t.start_time ASC, t.id DESC
        ";

        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => $tasks
        ]);
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
    public function create($user_id = 1) {

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
                $_POST['total_amount'] ?? 0,
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

        $query .= " ORDER BY t.id DESC";

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


    // ================= UPDATE =================
    public function update($user_id) {

        $db = new Database();
        $conn = $db->connect();

        try {

            if (empty($_POST['task_id'])) {
                throw new Exception("task_id required");
            }

            $start_time = $_POST['start_time'];
            $duration = (int)$_POST['duration'];

            $dt = new DateTime($_POST['due_date'] . ' ' . $start_time);
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
                $_POST['client_id'],
                $_POST['candidate_id'] ?? null,
                $_POST['poc_id'] ?? null,
                $_POST['task_type_id'],
                $_POST['title'],
                $_POST['description'] ?? null,
                $_POST['due_date'],
                $start_time,
                $end_time,
                $duration,
                $_POST['total_amount'] ?? 0,
                $_POST['payment_mode'] ?? null,
                $_POST['task_id']
            ]);

            // FILE
            $this->handleFileUpload($conn, $_POST['task_id'], $user_id);

            $conn->commit();

            echo json_encode(["message" => "Task updated"]);

        } catch (Exception $e) {
            $conn->rollback();
            LoggerService::logError('Task update failed', [
                'task_id' => $_POST['task_id'] ?? null,
                'error' => $e->getMessage()
            ]);
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

            $conn->prepare("UPDATE tasks SET status_id = ? WHERE id = ?")
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

            $conn->prepare("UPDATE tasks SET status_id = ? WHERE id = ?")
                ->execute([(int)$statusId, (int)$data->task_id]);

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
