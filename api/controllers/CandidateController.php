<?php

require_once dirname(__DIR__) . "/config/database.php";

class CandidateController {
public function getCandidatesByClient() {
    $client_id = $_GET['client_id'] ?? null;

    if (!$client_id) {
        echo json_encode(["error" => "client_id required"]);
        return;
    }

    $db = new Database();
    $conn = $db->connect();

    $stmt = $conn->prepare("
        SELECT id, name, email
        FROM candidates
        WHERE client_id = ? AND status = 'active'
        ORDER BY name ASC
    ");

    $stmt->execute([$client_id]);

    echo json_encode([
        "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ]);
}
    // ================= LIST =================
    public function list() {
        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            SELECT 
                c.*, 
                cl.name as client_name
            FROM candidates c
            LEFT JOIN clients cl ON c.client_id = cl.id
            ORDER BY c.id DESC
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
            empty($data->contact_number)
        ) {
            http_response_code(400);
            echo json_encode(["error" => "Name and Contact required"]);
            return;
        }

        $db = new Database();
        $conn = $db->connect();

        // 🔥 DUPLICATE CHECK (name + contact + client)
        $stmt = $conn->prepare("
            SELECT id FROM candidates
            WHERE name = ? AND contact_number = ? AND client_id = ?
        ");
        $stmt->execute([
            $data->name,
            $data->contact_number,
            $data->client_id ?? null
        ]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(["error" => "Candidate already exists"]);
            return;
        }

        // 🔥 INSERT
        $stmt = $conn->prepare("
            INSERT INTO candidates (client_id, name, contact_number, email)
            VALUES (?, ?, ?, ?)
        ");

        $stmt->execute([
            $data->client_id ?? null,
            $data->name,
            $data->contact_number,
            $data->email ?? null
        ]);

        echo json_encode(["message" => "Candidate created"]);
    }

    // ================= UPDATE =================
    public function update() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        // 🔥 DUPLICATE CHECK (exclude current id)
        $stmt = $conn->prepare("
            SELECT id FROM candidates
            WHERE name = ? AND contact_number = ? AND client_id = ?
            AND id != ?
        ");
        $stmt->execute([
            $data->name,
            $data->contact_number,
            $data->client_id ?? null,
            $data->id
        ]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(["error" => "Candidate already exists"]);
            return;
        }

        $stmt = $conn->prepare("
            UPDATE candidates
            SET client_id=?, name=?, contact_number=?, email=?
            WHERE id=?
        ");

        $stmt->execute([
            $data->client_id ?? null,
            $data->name,
            $data->contact_number,
            $data->email ?? null,
            $data->id
        ]);

        echo json_encode(["message" => "Candidate updated"]);
    }

    // ================= DELETE =================
    public function delete() {
        $data = json_decode(file_get_contents("php://input"));

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("DELETE FROM candidates WHERE id=?");
        $stmt->execute([$data->id]);

        echo json_encode(["message" => "Candidate deleted"]);
    }
}