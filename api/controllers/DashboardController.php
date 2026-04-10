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

        $stmt = $conn->prepare("
            SELECT 
                t.id,
                t.title,
                t.description,
                t.due_date,
                t.start_time,
                t.end_time,

                c.name as client_name,
                cand.name as candidate_name,

                ts.name as status,
                u.name as assigned_to_name

            FROM tasks t

            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN candidates cand ON t.candidate_id = cand.id
            LEFT JOIN task_status_master ts ON t.status_id = ts.id

            LEFT JOIN task_assignments ta ON t.id = ta.task_id
            LEFT JOIN users u ON ta.user_id = u.id

            WHERE ts.name = ?
            ORDER BY t.id DESC
        ");

        $stmt->execute([$status]);

        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($tasks as &$task) {
            $task['short_description'] = substr(strip_tags($task['description']), 0, 80) . '...';
        }

        echo json_encode([
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
        SELECT u.id, u.name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.name = 'technical expert'
        AND u.status = 1
        AND u.id NOT IN (
            SELECT ta.user_id
            FROM task_assignments ta
            JOIN tasks t ON ta.task_id = t.id
            WHERE t.due_date = ?
            AND NOT (
                t.end_time <= ? 
                OR t.start_time >= ?
            )
        )
    ");

    // NOTE order changed
    $stmt->execute([$date, $start, $end]);

    echo json_encode([
        "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
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
