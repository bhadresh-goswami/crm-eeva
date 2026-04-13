<?php

require_once dirname(__DIR__) . "/config/database.php";

class RoleController {

    public function list() {
        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("SELECT * FROM roles ORDER BY id DESC");
        $stmt->execute();

        echo json_encode([
            "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->name)) {
            http_response_code(400);
            echo json_encode(["error" => "Role name required"]);
            return;
        }

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("INSERT INTO roles (name) VALUES (?)");
        $stmt->execute([$data->name]);

        echo json_encode(["message" => "Role created"]);
    }

    public function update() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("UPDATE roles SET name=? WHERE id=?");
        $stmt->execute([$data->name, $data->id]);

        echo json_encode(["message" => "Role updated"]);
    }

    public function delete() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("DELETE FROM roles WHERE id=?");
        $stmt->execute([$data->id]);

        echo json_encode(["message" => "Role deleted"]);
    }

    public function toggle() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            UPDATE roles
            SET status = IF(status='active','inactive','active')
            WHERE id=?
        ");
        $stmt->execute([$data->id]);

        echo json_encode(["message" => "Status updated"]);
    }
}