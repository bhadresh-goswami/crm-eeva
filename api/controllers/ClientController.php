<?php

require_once dirname(__DIR__) . "/config/database.php";

class ClientController {

public function getPocsByClient() {
    $client_id = $_GET['client_id'] ?? null;

    if (!$client_id) {
        echo json_encode(["error" => "client_id required"]);
        return;
    }

    $db = new Database();
    $conn = $db->connect();

    $stmt = $conn->prepare("
        SELECT id, name, email, mobile
        FROM client_pocs
        WHERE client_id = ? AND status = 'active'
        ORDER BY name ASC
    ");

    $stmt->execute([$client_id]);

    echo json_encode([
        "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ]);
}
    public function create() {

        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            INSERT INTO clients 
            (name, company_name, mobile, address, gst, billing_type, created_by)
            VALUES (?,?,?,?,?,?,?)
        ");

        $stmt->execute([
            $data->name,
            $data->company_name,
            $data->mobile,
            $data->address,
            $data->gst,
            $data->billing_type,
            1
        ]);

        echo json_encode(["message" => "Client created"]);
    }

    public function list() {

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->query("SELECT * FROM clients ORDER BY id DESC");

        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function update() {

        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            UPDATE clients 
            SET name=?, company_name=?, mobile=?, address=?, gst=?, billing_type=?
            WHERE id=?
        ");

        $stmt->execute([
            $data->name,
            $data->company_name,
            $data->mobile,
            $data->address,
            $data->gst,
            $data->billing_type,
            $data->id
        ]);

        echo json_encode(["message" => "Client updated"]);
    }

    public function delete() {

        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("DELETE FROM clients WHERE id=?");
        $stmt->execute([$data->id]);

        echo json_encode(["message" => "Client deleted"]);
    }

    public function toggleStatus() {

        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            UPDATE clients 
            SET status = IF(status='active','inactive','active')
            WHERE id=?
        ");

        $stmt->execute([$data->id]);

        echo json_encode(["message" => "Status updated"]);
    }
}
