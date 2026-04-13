<?php

require_once dirname(__DIR__) . "/config/database.php";

class PocController {
    
    
    // ✅ GET SINGLE POC
public function getById() {
    $data = json_decode(file_get_contents("php://input"));

    if (empty($data->id)) {
        http_response_code(400);
        echo json_encode(["error" => "POC ID required"]);
        return;
    }

    $db = new Database();
    $conn = $db->connect();

    $stmt = $conn->prepare("
        SELECT 
            p.*, 
            c.name as client_name,
            c.company_name
        FROM client_pocs p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.id = ?
    ");

    $stmt->execute([$data->id]);

    $poc = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$poc) {
        echo json_encode(["error" => "POC not found"]);
        return;
    }

    echo json_encode($poc);
}

    // ✅ CREATE
    public function create() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            INSERT INTO client_pocs (client_id, name, email, mobile, status)
            VALUES (?, ?, ?, ?, 'active')
        ");

        $stmt->execute([
            $data->client_id,
            $data->name,
            $data->email,
            $data->mobile
        ]);

        echo json_encode(["message" => "POC created"]);
    }

    // ✅ LIST (WITH CLIENT NAME JOIN)
    public function list() {
        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            SELECT 
                p.*, 
                c.name as client_name
            FROM client_pocs p
            LEFT JOIN clients c ON p.client_id = c.id
            ORDER BY p.id DESC
        ");

        $stmt->execute();

        echo json_encode([
            "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    // ✅ UPDATE
    public function update() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            UPDATE client_pocs
            SET client_id=?, name=?, email=?, mobile=?
            WHERE id=?
        ");

        $stmt->execute([
            $data->client_id,
            $data->name,
            $data->email,
            $data->mobile,
            $data->id
        ]);

        echo json_encode(["message" => "POC updated"]);
    }

    // ✅ DELETE
    public function delete() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("DELETE FROM client_pocs WHERE id=?");
        $stmt->execute([$data->id]);

        echo json_encode(["message" => "POC deleted"]);
    }

    // ✅ TOGGLE STATUS
    public function toggle() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            UPDATE client_pocs
            SET status = IF(status='active','inactive','active')
            WHERE id=?
        ");

        $stmt->execute([$data->id]);

        echo json_encode(["message" => "Status updated"]);
    }
}