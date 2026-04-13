<?php

require_once dirname(__DIR__) . "/config/database.php";

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

        echo json_encode($data);
    }


    // ==============================
    // ✅ TASKS BY STATUS (FIXED)
    // ==============================
    public function tasksByStatus() {
        $db = new Database();
        $conn = $db->connect();

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

                c.company_name as company_name,
                c.company_name as client_name,
                cand.name as candidate_name,

                ts.name as status,
                ta.user_id as assigned_to_id,
                u.name as assigned_to_name

            FROM tasks t

            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN candidates cand ON t.candidate_id = cand.id
            LEFT JOIN task_status_master ts ON t.status_id = ts.id

            LEFT JOIN task_assignments ta ON t.id = ta.task_id
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
        AND u.status = 1
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
    public function assignTask() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        // CHECK EXISTING
        $check = $conn->prepare("
            SELECT COUNT(*) FROM task_assignments WHERE task_id = ?
        ");
        $check->execute([$data->task_id]);

        if ($check->fetchColumn() > 0) {
            // REASSIGN
            $stmt = $conn->prepare("
                UPDATE task_assignments 
                SET user_id = ?
                WHERE task_id = ?
            ");
            $stmt->execute([$data->expert_id, $data->task_id]);
        } else {
            // NEW ASSIGN
            $stmt = $conn->prepare("
                INSERT INTO task_assignments (task_id, user_id)
                VALUES (?, ?)
            ");
            $stmt->execute([$data->task_id, $data->expert_id]);
        }

        // UPDATE STATUS → Assigned
        $status_id = $conn->query("
            SELECT id FROM task_status_master WHERE name='Assigned' LIMIT 1
        ")->fetchColumn();

        $stmt2 = $conn->prepare("
            UPDATE tasks
            SET status_id = ?
            WHERE id = ?
        ");

        $stmt2->execute([$status_id, $data->task_id]);

        echo json_encode([
            "message" => "Task assigned / reassigned successfully"
        ]);
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
