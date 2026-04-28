<?php

require_once dirname(__DIR__) . "/config/database.php";
require_once dirname(__DIR__) . "/services/EmailService.php";
require_once dirname(__DIR__) . "/services/LoggerService.php";

class DashboardController {

    // ==============================
    // ✅ SUMMARY
    // ==============================
    public function summary() {
        $db = new Database();
        $conn = $db->connect();

        $data = [];

        $data['total_tasks'] = $conn->query("SELECT COUNT(*) FROM tasks")->fetchColumn();

        $data['pending_tasks'] = $conn->query("
            SELECT COUNT(*) FROM tasks t
            JOIN task_status_master ts ON t.status_id = ts.id
            WHERE ts.name = 'Pending'
        ")->fetchColumn();

        $data['assigned_tasks'] = $conn->query("
            SELECT COUNT(*) FROM tasks t
            JOIN task_status_master ts ON t.status_id = ts.id
            WHERE ts.name = 'Assigned'
        ")->fetchColumn();

        $data['cancelled_tasks'] = $conn->query("
            SELECT COUNT(*) FROM tasks t
            JOIN task_status_master ts ON t.status_id = ts.id
            WHERE ts.name = 'Cancelled'
        ")->fetchColumn();

        $data['total_clients'] = $conn->query("SELECT COUNT(*) FROM clients")->fetchColumn();

        $data['experts_total'] = $conn->query("
            SELECT COUNT(*) FROM users WHERE role_id = 5
        ")->fetchColumn();

        $data['experts_present'] = $conn->query("
            SELECT COUNT(DISTINCT user_id)
            FROM user_sessions
            WHERE logout_time IS NULL
        ")->fetchColumn();

        $data['pending_payment_updates'] = $conn->query("
            SELECT COUNT(*)
            FROM tasks t
            JOIN task_status_master ts ON ts.id = t.status_id
            WHERE LOWER(ts.name) = 'completed'
              AND COALESCE(t.total_amount, 0) = 0
        ")->fetchColumn();

        echo json_encode($data);
    }

    // ==============================
    // ✅ TASKS SUMMARY (SAFE)
    // ==============================
    public function tasks() {
        try {
            $db = new Database();
            $conn = $db->connect();

            $stmt = $conn->prepare("
                SELECT
                    COUNT(*) as total_tasks,
                    SUM(CASE WHEN status_id = 1 THEN 1 ELSE 0 END) as pending_tasks,
                    SUM(CASE WHEN status_id = 2 THEN 1 ELSE 0 END) as assigned_tasks
                FROM tasks
            ");
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                echo json_encode([
                    "success" => true,
                    "data" => [
                        "total_tasks" => 0,
                        "pending_tasks" => 0,
                        "assigned_tasks" => 0,
                    ],
                ]);
                return;
            }

            echo json_encode([
                "success" => true,
                "data" => [
                    "total_tasks" => (int)($result['total_tasks'] ?? 0),
                    "pending_tasks" => (int)($result['pending_tasks'] ?? 0),
                    "assigned_tasks" => (int)($result['assigned_tasks'] ?? 0),
                ],
            ]);
        } catch (Exception $e) {
            LoggerService::logError('Dashboard API failed', [
                'error' => $e->getMessage(),
            ]);
            http_response_code(200);
            echo json_encode([
                "success" => false,
                "message" => "Dashboard data failed",
                "error" => $e->getMessage(),
            ]);
            return;
        }
    }


    // ==============================
    // ✅ TASKS BY STATUS (FIXED)
    // ==============================
    public function tasksByStatus() {
        $db = new Database();
        $conn = $db->connect();
        $assignmentOrderColumn = in_array('created_at', $this->getTableColumns($conn, 'task_assignments'), true)
            ? 'created_at'
            : 'id';

        $status = $_GET['status'] ?? 'Pending';
        $date = $_GET['date'] ?? null;

        $query = "
            SELECT 
                t.id,
                t.title,
                t.description,
                t.due_date,
                t.start_time,
                t.end_time,
                COALESCE(tt.name, '') as support_type,

                COALESCE(cl.company_name, cl.name, '') as company_name,
                COALESCE(cl.company_name, cl.name, '') as client_name,
                cand.name as candidate_name,

                ts.name as status,
                ta.user_id as assigned_to_id,
                u.name as assigned_to_name

            FROM tasks t

            LEFT JOIN clients cl ON t.client_id = cl.id
            LEFT JOIN candidates cand ON t.candidate_id = cand.id
            LEFT JOIN task_types tt ON tt.id = t.task_type_id
            LEFT JOIN task_status_master ts ON t.status_id = ts.id

            LEFT JOIN task_assignments ta ON ta.id = (
                SELECT ta2.id
                FROM task_assignments ta2
                WHERE ta2.task_id = t.id
                ORDER BY ta2.{$assignmentOrderColumn} DESC
                LIMIT 1
            )
            LEFT JOIN users u ON ta.user_id = u.id

            WHERE LOWER(ts.name) = LOWER(?)
        ";

        $params = [$status];
        if ($date) {
            $query .= " AND DATE(t.due_date) = ?";
            $params[] = $date;
        }

        $query .= "
            ORDER BY t.id DESC
        ";

        $stmt = $conn->prepare($query);

        $stmt->execute($params);

        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($tasks as &$task) {
            $task['short_description'] = substr(strip_tags($task['description']), 0, 80) . '...';
        }

        error_log("[DashboardController::tasksByStatus] input_status={$status}; input_date={$date}; rows=" . count($tasks));
        error_log("[DashboardController::tasksByStatus] sql=" . preg_replace('/\s+/', ' ', trim($query)));

        echo json_encode([
            "success" => true,
            "data" => $tasks
        ]);
    }


    // ==============================
    // ✅ AVAILABLE EXPERTS (FIXED)
    // ==============================
    public function availableExperts() {
    $db = new Database();
    $conn = $db->connect();

    $date = $_GET['date'];
    $start = $_GET['start_time'];
    $end = $_GET['end_time'];

    $stmt = $conn->prepare("
        SELECT 
            u.id,
            u.name,
            CASE
                WHEN overlap.task_id IS NULL THEN 'available'
                ELSE 'not_available'
            END AS status
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN (
            SELECT ta.user_id, ta.task_id
            FROM task_assignments ta
            JOIN tasks t ON ta.task_id = t.id
            LEFT JOIN task_status_master ts ON t.status_id = ts.id
            WHERE DATE(t.due_date) = ?
              AND NOT (
                  t.end_time <= ? 
                  OR t.start_time >= ?
              )
              AND (
                  ts.id IS NULL
                  OR LOWER(ts.name) <> 'cancelled'
              )
        ) overlap ON overlap.user_id = u.id
        WHERE r.name = 'technical expert'
        AND LOWER(COALESCE(u.status, 'inactive')) = 'active'
        ORDER BY u.name ASC
    ");

    $stmt->execute([$date, $start, $end]);

    $experts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($experts as &$expert) {
        $expert['is_available'] = $expert['status'] === 'available';
    }

    echo json_encode([
        "data" => $experts
    ]);
}


    // ==============================
    // ✅ ASSIGN / REASSIGN TASK
    // ==============================
    public function assignTask($actorUserId = null) {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        try {
            $taskId = (int)$data->task_id;
            $expertId = (int)$data->expert_id;

            $conn->beginTransaction();
            $conn->prepare("
                UPDATE task_assignments
                SET is_active = 0
                WHERE task_id = ? AND is_active = 1
            ")->execute([$taskId]);

            $assignmentColumns = $this->getTableColumns($conn, 'task_assignments');
            $insertColumns = ['task_id', 'user_id', 'is_active'];
            $insertValues = [$taskId, $expertId, 1];

            if (in_array('assigned_by', $assignmentColumns, true)) {
                $insertColumns[] = 'assigned_by';
                $insertValues[] = $actorUserId;
            } elseif (in_array('assigned_by_id', $assignmentColumns, true)) {
                $insertColumns[] = 'assigned_by_id';
                $insertValues[] = $actorUserId;
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

            // UPDATE STATUS → Assigned
            $status_id = $conn->query("
                SELECT id FROM task_status_master WHERE name='Assigned' LIMIT 1
            ")->fetchColumn();

            $stmt2 = $conn->prepare("
                UPDATE tasks
                SET status_id = ?
                WHERE id = ?
            ");

            $stmt2->execute([$status_id, $taskId]);
            $conn->commit();

            $emailResult = EmailService::sendTaskNotification($taskId, 'assigned', null, $actorUserId);

            echo json_encode([
                "success" => true,
                "message" => "Task assigned / reassigned successfully",
                "email_status" => $emailResult['email_status'] ?? 'failed',
                "email_error" => $emailResult['email_error'] ?? null,
            ]);
        } catch (Exception $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            LoggerService::logError('Dashboard task assign failed', [
                'task_id' => $data->task_id ?? null,
                'expert_id' => $data->expert_id ?? null,
                'assigned_by' => $actorUserId,
                'error' => $e->getMessage()
            ]);
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Something went wrong. Please try again."
            ]);
        }
    }

    private function getTableColumns(PDO $conn, string $tableName): array {
        $stmt = $conn->prepare("SHOW COLUMNS FROM {$tableName}");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(static fn ($row) => (string)$row['Field'], $rows);
    }


    // ==============================
    // ✅ EXPERT LIST
    // ==============================
    public function experts() {
        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            SELECT u.id, u.name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE r.name = 'technical expert'
        ");

        $stmt->execute();

        echo json_encode([
            "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }
}
?>
