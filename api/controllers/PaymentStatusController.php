<?php

require_once dirname(__DIR__) . "/config/database.php";

class PaymentStatusController {

    private function validate($data) {
        if (!isset($data->name) || trim($data->name) === "") {
            echo json_encode(["error" => "Name is required"]);
            exit;
        }
    }

    // CREATE
    public function create() {

        $data = json_decode(file_get_contents("php://input"));
        $this->validate($data);

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("INSERT INTO payment_status_master (name) VALUES (?)");
        $stmt->execute([$data->name]);

        echo json_encode([
            "success" => true,
            "message" => "Payment Status created"
        ]);
    }

    // LIST
    public function list() {

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->query("SELECT * FROM payment_status_master ORDER BY id DESC");

        echo json_encode([
            "success" => true,
            "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    // UPDATE
    public function update() {

        $data = json_decode(file_get_contents("php://input"));
        $this->validate($data);

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("UPDATE payment_status_master SET name=? WHERE id=?");
        $stmt->execute([$data->name, $data->id]);

        echo json_encode([
            "success" => true,
            "message" => "Updated"
        ]);
    }

    // DELETE (SOFT DELETE)
    public function delete() {

        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("UPDATE payment_status_master SET status='inactive' WHERE id=?");
        $stmt->execute([$data->id]);

        echo json_encode([
            "success" => true,
            "message" => "Deleted (soft)"
        ]);
    }

    // TOGGLE ACTIVE/INACTIVE
    public function toggle() {

        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            UPDATE payment_status_master 
            SET status = IF(status='active','inactive','active')
            WHERE id=?
        ");

        $stmt->execute([$data->id]);

        echo json_encode([
            "success" => true,
            "message" => "Status toggled"
        ]);
    }
}