<?php

require_once dirname(__DIR__) . "/config/database.php";
require_once dirname(__DIR__) . "/services/EmailService.php";

class UserController {

    // ================= LIST =================
    public function list() {
        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            SELECT u.id, u.name, u.email, u.status,
                   r.name as role,
                   tl.name as team_lead
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN users tl ON u.team_lead_id = tl.id
            ORDER BY u.id DESC
        ");
        $stmt->execute();

        echo json_encode([
            "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    // ================= CREATE =================
    public function create() {
        $data = json_decode(file_get_contents("php://input"));

        // 🔥 VALIDATION
        if (
            empty($data->name) ||
            empty($data->email) ||
            empty($data->password) ||
            empty($data->role_id)
        ) {
            http_response_code(400);
            echo json_encode(["error" => "All required fields missing"]);
            return;
        }

        if (!filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(["error" => "Invalid email"]);
            return;
        }

        $db = new Database();
        $conn = $db->connect();

        // 🔥 CHECK EMAIL UNIQUE
        $check = $conn->prepare("SELECT id FROM users WHERE email=?");
        $check->execute([$data->email]);

        if ($check->rowCount() > 0) {
            echo json_encode(["error" => "Email already exists"]);
            return;
        }

        $password = password_hash($data->password, PASSWORD_BCRYPT);

        $stmt = $conn->prepare("
            INSERT INTO users (name,email,password,role_id,team_lead_id)
            VALUES (?,?,?,?,?)
        ");

        $stmt->execute([
            $data->name,
            $data->email,
            $password,
            $data->role_id,
            $data->team_lead_id ?? null
        ]);

        $emailResult = EmailService::sendUserCreatedEmail((string)$data->email, (string)$data->password);

        echo json_encode([
            "success" => true,
            "message" => "User created",
            "email_status" => $emailResult['email_status'] ?? 'failed',
            "email_error" => $emailResult['email_error'] ?? null,
        ]);
    }

    // ================= UPDATE =================
    public function update() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            UPDATE users
            SET name=?, email=?, role_id=?, team_lead_id=?
            WHERE id=?
        ");

        $stmt->execute([
            $data->name,
            $data->email,
            $data->role_id,
            $data->team_lead_id ?? null,
            $data->id
        ]);

        echo json_encode(["message" => "User updated"]);
    }

    // ================= DELETE =================
    public function delete() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("DELETE FROM users WHERE id=?");
        $stmt->execute([$data->id]);

        echo json_encode(["message" => "User deleted"]);
    }

    // ================= TOGGLE =================
    public function toggle() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            UPDATE users
            SET status = IF(status='active','inactive','active')
            WHERE id=?
        ");
        $stmt->execute([$data->id]);

        echo json_encode(["message" => "Status updated"]);
    }
}
