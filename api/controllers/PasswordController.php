<?php

require_once dirname(__DIR__) . "/config/database.php";
require_once dirname(__DIR__) . "/services/LoggerService.php";
require_once dirname(__DIR__) . "/services/EmailService.php";

class PasswordController {

    // ================= CHANGE PASSWORD (PROTECTED) =================
    public function changePassword($userId) {
        $data = json_decode(file_get_contents("php://input"));

        if (empty($userId)) {
            http_response_code(401);
            echo json_encode([
                "success" => false,
                "message" => "Invalid token payload"
            ]);
            return;
        }

        if (
            !isset($data->current_password) ||
            !isset($data->new_password) ||
            !isset($data->confirm_password)
        ) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "current_password, new_password and confirm_password are required"
            ]);
            return;
        }

        $currentPassword = trim((string)$data->current_password);
        $newPassword = trim((string)$data->new_password);
        $confirmPassword = trim((string)$data->confirm_password);

        if ($newPassword === "") {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "New password should not be empty"
            ]);
            return;
        }

        if ($newPassword !== $confirmPassword) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "New password and confirm password do not match"
            ]);
            return;
        }

        try {
            $db = new Database();
            $conn = $db->connect();

            $stmt = $conn->prepare("SELECT id, password FROM users WHERE id = ? LIMIT 1");
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                http_response_code(404);
                echo json_encode([
                    "success" => false,
                    "message" => "User not found"
                ]);
                return;
            }

            if (!password_verify($currentPassword, $user['password'])) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid current password"
                ]);
                return;
            }

            $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

            $update = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
            $update->execute([$hashedPassword, $userId]);
            $emailResult = EmailService::sendPasswordChangedEmail((string)($user['email'] ?? ''));

            echo json_encode([
                "success" => true,
                "message" => "Password updated successfully",
                "email_status" => $emailResult['email_status'] ?? 'failed',
                "email_error" => $emailResult['email_error'] ?? null,
            ]);

        } catch (Exception $e) {
            LoggerService::logError('Change password failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Something went wrong. Please try again."
            ]);
        }
    }

    // ================= FORGOT PASSWORD (PUBLIC) =================
    public function forgotPassword() {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->email) || trim((string)$data->email) === "") {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Email is required"
            ]);
            return;
        }

        $email = trim((string)$data->email);

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Invalid email"
            ]);
            return;
        }

        try {
            $db = new Database();
            $conn = $db->connect();

            $stmt = $conn->prepare("SELECT id, name, email FROM users WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                http_response_code(404);
                echo json_encode([
                    "success" => false,
                    "message" => "User not found"
                ]);
                return;
            }

            $adminEmail = $this->resolveAdminEmail($conn);

            if (!$adminEmail) {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "message" => "Admin email is not configured"
                ]);
                return;
            }

            $emailResult = EmailService::sendForgotPasswordRequestEmail((string)$adminEmail, (string)$user['name'], (string)$user['email']);

            echo json_encode([
                "success" => true,
                "message" => "Request sent to admin",
                "email_status" => $emailResult['email_status'] ?? 'failed',
                "email_error" => $emailResult['email_error'] ?? null,
            ]);

        } catch (Exception $e) {
            LoggerService::logError('Forgot password failed', [
                'email' => $email ?? null,
                'error' => $e->getMessage(),
            ]);
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Something went wrong. Please try again."
            ]);
        }
    }

    private function resolveAdminEmail($conn) {
        $configuredAdminEmail = getenv('ADMIN_EMAIL');

        if ($configuredAdminEmail && filter_var($configuredAdminEmail, FILTER_VALIDATE_EMAIL)) {
            return $configuredAdminEmail;
        }

        $stmt = $conn->prepare("\n            SELECT u.email\n            FROM users u\n            JOIN roles r ON u.role_id = r.id\n            WHERE r.name = 'admin' AND u.status = 'active'\n            ORDER BY u.id ASC\n            LIMIT 1\n        ");
        $stmt->execute();
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        return $admin['email'] ?? null;
    }
}
