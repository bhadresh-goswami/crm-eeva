<?php

require_once dirname(__DIR__) . "/config/database.php";
require_once dirname(__DIR__) . "/utils/jwt.php";
require_once dirname(__DIR__) . "/middleware/auth.php";
require_once dirname(__DIR__) . "/services/LoggerService.php";
require_once dirname(__DIR__) . "/services/EmailService.php";

class AuthController {

    // ================= LOGIN =================
    public function login() {

        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->email) || !isset($data->password)) {
            http_response_code(400);
            echo json_encode(["error" => "Email and Password required"]);
            return;
        }

        try {
            $db = new Database();
            $conn = $db->connect();

            // 🔥 JOIN ROLE TABLE
            $stmt = $conn->prepare("
                SELECT u.*, r.name as role
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.email = ? AND u.status = 'active'
            ");
            $stmt->execute([$data->email]);

            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                http_response_code(401);
                echo json_encode(["error" => "User not found"]);
                return;
            }

            if (!password_verify($data->password, $user['password'])) {
                http_response_code(401);
                echo json_encode(["error" => "Invalid password"]);
                return;
            }

            $user_id = $user['id'];

            // 🔥 CHECK EXISTING SESSION (TODAY)
            $stmt = $conn->prepare("
                SELECT * FROM user_sessions 
                WHERE user_id=? AND created_date=CURDATE()
            ");
            $stmt->execute([$user_id]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$session) {
                // 🔥 CREATE SESSION ONLY ONCE PER DAY
                $stmt = $conn->prepare("
                    INSERT INTO user_sessions (user_id, login_time, status, created_date)
                    VALUES (?, NOW(), 'logged_in', CURDATE())
                ");
                $stmt->execute([$user_id]);
            }

            // 🔐 TOKEN
            $jwt = new JWTHandler();
            $token = $jwt->generateToken($user);

            // Authentication and session creation are complete. This best-effort
            // delivery must never change the successful login response.
            if (strtolower((string)$user['role']) === 'technical expert') {
                try {
                    $yesterday = (new DateTime('yesterday', new DateTimeZone('Asia/Kolkata')))->format('Y-m-d');
                    EmailService::sendDailyReportForUser((int)$user['id'], $yesterday);
                } catch (Throwable $reportError) {
                    LoggerService::logError('Post-login daily report attempt failed', [
                        'timestamp' => gmdate('c'),
                        'email_type' => 'technical_expert_daily_report',
                        'recipient_count' => 3,
                        'user_id' => (int)$user['id'],
                        'report_date' => $yesterday,
                        'error' => $reportError->getMessage(),
                    ]);
                }
            }

            echo json_encode([
                "status" => "success",
                "token" => $token,
                "user" => [
                    "id" => $user['id'],
                    "name" => $user['name'],
                    "email" => $user['email'],
                    "role" => $user['role']
                ]
            ]);

        } catch (Exception $e) {
            LoggerService::logError('Auth login failed', [
                'email' => isset($data->email) ? (string)$data->email : null,
                'error' => $e->getMessage(),
            ]);
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Something went wrong. Please try again."
            ]);
        }
    }


    // ================= BREAK IN =================
    public function breakIn() {
        $user = authenticate();

        $db = new Database();
        $conn = $db->connect();

        // 🔥 CHECK CURRENT STATUS
        $stmt = $conn->prepare("
            SELECT status FROM user_sessions 
            WHERE user_id=? AND created_date=CURDATE()
        ");
        $stmt->execute([$user->id]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($session && $session['status'] === 'break') {
            echo json_encode(["message" => "Already on break"]);
            return;
        }

        $stmt = $conn->prepare("
            UPDATE user_sessions
            SET break_in_time = NOW(), status='break'
            WHERE user_id=? AND created_date=CURDATE()
        ");

        $stmt->execute([$user->id]);

        echo json_encode(["message" => "Break In"]);
    }


    // ================= BREAK OUT =================
    public function breakOut() {
        $user = authenticate();

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("
            SELECT status FROM user_sessions 
            WHERE user_id=? AND created_date=CURDATE()
        ");
        $stmt->execute([$user->id]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($session && $session['status'] !== 'break') {
            echo json_encode(["message" => "Not in break"]);
            return;
        }

        $stmt = $conn->prepare("
            UPDATE user_sessions
            SET break_out_time = NOW(), status='logged_in'
            WHERE user_id=? AND created_date=CURDATE()
        ");

        $stmt->execute([$user->id]);

        echo json_encode(["message" => "Break Out"]);
    }


    // ================= LOGOUT =================
    public function logout() {
        try {
            $user = authenticate();

            $db = new Database();
            $conn = $db->connect();

            $stmt = $conn->prepare("
                UPDATE user_sessions
                SET logout_time = NOW(), status='logged_out'
                WHERE user_id=? AND created_date=CURDATE()
            ");

            $stmt->execute([$user->id]);
        } catch (Throwable $e) {
            LoggerService::logWarning('Logout operation fallback', [
                'error' => $e->getMessage(),
            ]);
        }

        echo json_encode([
            "success" => true,
            "message" => "Logged out successfully"
        ]);
    }
}
