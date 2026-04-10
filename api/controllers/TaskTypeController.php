<?php

require_once dirname(__DIR__) . "/config/database.php";

class TaskTypeController {

    private function validate($data) {
        if (!isset($data->name) || trim($data->name) === "") {
            echo json_encode(["error" => "Name is required"]);
            exit;
        }
    }

    public function create() {

        $data = json_decode(file_get_contents("php://input"));
        $this->validate($data);

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("INSERT INTO task_types (name) VALUES (?)");
        $stmt->execute([$data->name]);

        echo json_encode(["success" => true, "message" => "Task Type created"]);
    }

    public function list() {

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->query("SELECT * FROM task_types ORDER BY id DESC");

        echo json_encode([
            "success" => true,
            "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    public function update() {

        $data = json_decode(file_get_contents("php://input"));
        $this->validate($data);

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("UPDATE task_types SET name=? WHERE id=?");
        $stmt->execute([$data->name, $data->id]);

        echo json_encode(["success" => true, "message" => "Updated"]);
    }

    public function delete() {

        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        // SOFT DELETE (IMPORTANT)
        $stmt = $conn->prepare("UPDATE task_types SET status='inactive' WHERE id=?");
        $stmt->execute([$data->id]);

        echo json_encode(["success" => true, "message" => "Deleted (soft)"]);
    }

    public function toggle() {

        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            UPDATE task_types 
            SET status = IF(status='active','inactive','active')
            WHERE id=?
        ");

        $stmt->execute([$data->id]);

        echo json_encode(["success" => true, "message" => "Status toggled"]);
    }
}