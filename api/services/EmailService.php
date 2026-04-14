<?php

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/services/LoggerService.php';
require_once dirname(__DIR__) . '/libs/PHPMailer/PHPMailer.php';
require_once dirname(__DIR__) . '/libs/PHPMailer/SMTP.php';
require_once dirname(__DIR__) . '/libs/PHPMailer/Exception.php';

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

class EmailService
{
    public static function sendTaskNotification($taskId, $action, $comment = null, $actorUserId = null)
    {
        try {
            $db = new Database();
            $conn = $db->connect();

            self::ensureThreadColumnExists($conn);
            $task = self::fetchTaskSnapshot($conn, (int)$taskId);
            if (!$task) {
                return [
                    'success' => true,
                    'email_status' => 'failed',
                    'email_error' => 'Task not found for email notification',
                ];
            }

            $threadId = self::resolveThreadId($conn, $task, (string)$action);
            $mailConfig = self::loadMailConfig();
            if (!$mailConfig) {
                throw new RuntimeException('Mail configuration is missing');
            }

            $recipients = self::resolveRecipients($conn, $task, $actorUserId);
            if (empty($recipients['to']) && empty($recipients['cc'])) {
                return [
                    'success' => true,
                    'email_status' => 'failed',
                    'email_error' => 'No recipients found',
                ];
            }

            $subject = self::buildSubject($task);
            [$htmlBody, $plainBody] = self::buildBody($task, (string)$action, $comment, $actorUserId);

            self::dispatch(
                $mailConfig,
                $recipients,
                $subject,
                $htmlBody,
                $plainBody,
                $threadId,
                (string)$action
            );

            return [
                'success' => true,
                'email_status' => 'sent',
                'email_error' => null,
            ];
        } catch (Throwable $e) {
            self::logFailure((int)$taskId, (string)$action, $e->getMessage());
            return [
                'success' => true,
                'email_status' => 'failed',
                'email_error' => $e->getMessage(),
            ];
        }
    }

    private static function loadMailConfig()
    {
        $path = dirname(__DIR__) . '/config/mail.php';
        if (!file_exists($path)) {
            return null;
        }

        $config = require $path;
        return is_array($config) ? $config : null;
    }

    private static function ensureThreadColumnExists(PDO $conn)
    {
        $columns = $conn->query("SHOW COLUMNS FROM tasks LIKE 'email_thread_id'")->fetchAll(PDO::FETCH_ASSOC);
        if (!empty($columns)) {
            return;
        }

        $conn->exec('ALTER TABLE tasks ADD COLUMN email_thread_id VARCHAR(255) NULL');
    }

    private static function fetchTaskSnapshot(PDO $conn, int $taskId)
    {
        $stmt = $conn->prepare("\n            SELECT\n                t.id,\n                t.title,\n                t.due_date,\n                t.start_time,\n                t.email_thread_id,\n                COALESCE(cand.name, '') AS candidate_name,\n                COALESCE(tt.name, '') AS support_type,\n                COALESCE(ts.name, '') AS status_name,\n                ta.user_id AS assigned_to_id,\n                COALESCE(assigned_to.name, '') AS assigned_to_name,\n                COALESCE(assigned_to.email, '') AS assigned_to_email,\n                assigned_to.team_lead_id AS assigned_to_team_lead_id\n            FROM tasks t\n            LEFT JOIN candidates cand ON cand.id = t.candidate_id\n            LEFT JOIN task_types tt ON tt.id = t.task_type_id\n            LEFT JOIN task_status_master ts ON ts.id = t.status_id\n            LEFT JOIN task_assignments ta ON ta.id = (\n                SELECT id FROM task_assignments WHERE task_id = t.id ORDER BY id DESC LIMIT 1\n            )\n            LEFT JOIN users assigned_to ON assigned_to.id = ta.user_id\n            WHERE t.id = ?\n            LIMIT 1\n        ");
        $stmt->execute([$taskId]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private static function resolveThreadId(PDO $conn, array $task, string $action)
    {
        $threadId = trim((string)($task['email_thread_id'] ?? ''));
        if ($threadId !== '') {
            return $threadId;
        }

        $threadId = 'task-' . (int)$task['id'] . '@bsquareg';
        $update = $conn->prepare('UPDATE tasks SET email_thread_id = ? WHERE id = ?');
        $update->execute([$threadId, (int)$task['id']]);

        return $threadId;
    }

    private static function resolveRecipients(PDO $conn, array $task, $actorUserId)
    {
        $to = [];

        $assignedEmail = trim((string)($task['assigned_to_email'] ?? ''));
        if ($assignedEmail !== '') {
            $to[] = $assignedEmail;
        }

        if (!empty($actorUserId)) {
            $managerEmail = self::fetchUserEmail($conn, (int)$actorUserId);
            if ($managerEmail !== '') {
                $to[] = $managerEmail;
            }
        }

        $config = self::loadMailConfig();
        $cc = $config['always_cc'] ?? [];

        return [
            'to' => self::sanitizeEmails($to),
            'cc' => self::sanitizeEmails($cc),
        ];
    }

    private static function fetchUserEmail(PDO $conn, int $userId)
    {
        $stmt = $conn->prepare('SELECT email FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        return trim((string)$stmt->fetchColumn());
    }

    private static function sanitizeEmails(array $emails)
    {
        $unique = [];
        foreach ($emails as $email) {
            $normalized = strtolower(trim((string)$email));
            if ($normalized === '' || !filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
                continue;
            }
            $unique[$normalized] = $normalized;
        }
        return array_values($unique);
    }

    private static function buildSubject(array $task)
    {
        $ist = new DateTimeZone('Asia/Kolkata');
        $est = new DateTimeZone('America/New_York');

        $dtIst = new DateTime(($task['due_date'] ?? '') . ' ' . ($task['start_time'] ?? '00:00:00'), $ist);
        $dtEst = clone $dtIst;
        $dtEst->setTimezone($est);

        return sprintf(
            '%s - %s - %s - %s (%s EST)',
            trim((string)$task['support_type']) !== '' ? $task['support_type'] : 'Support',
            trim((string)$task['candidate_name']) !== '' ? $task['candidate_name'] : 'Candidate',
            $dtIst->format('d M Y'),
            $dtIst->format('h:i A'),
            $dtEst->format('h:i A')
        );
    }

    private static function buildBody(array $task, string $action, $comment, $actorUserId)
    {
        $isFirstMail = in_array(strtolower($action), ['assigned', 'assign', 'task_assigned'], true);
        $actorName = self::fetchActorName((int)$actorUserId);

        if ($isFirstMail) {
            $ist = new DateTimeZone('Asia/Kolkata');
            $est = new DateTimeZone('America/New_York');
            $dtIst = new DateTime(($task['due_date'] ?? '') . ' ' . ($task['start_time'] ?? '00:00:00'), $ist);
            $dtEst = clone $dtIst;
            $dtEst->setTimezone($est);

            $assignedBy = $actorName !== '' ? $actorName : 'System';
            $html = '<p>Hello,</p>'
                . '<p>A task has been assigned. Please find the details below:</p>'
                . '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">'
                . self::row('Task Title', $task['title'] ?? '-')
                . self::row('Candidate Name', $task['candidate_name'] ?? '-')
                . self::row('Support Type', $task['support_type'] ?? '-')
                . self::row('Status', $task['status_name'] ?? '-')
                . self::row('IST Date & Time', $dtIst->format('d M Y h:i A'))
                . self::row('EST Date & Time', $dtEst->format('d M Y h:i A'))
                . self::row('Assigned To', $task['assigned_to_name'] ?? '-')
                . self::row('Assigned By', $assignedBy)
                . '</table>'
                . '<p>Regards,<br>BsquareG Support</p>';

            $plain = 'Task assigned: ' . ($task['title'] ?? '-') . PHP_EOL
                . 'Assigned to: ' . ($task['assigned_to_name'] ?? '-') . PHP_EOL
                . 'Assigned by: ' . $assignedBy;

            return [$html, $plain];
        }

        if (in_array(strtolower($action), ['status_update', 'status_changed', 'started', 'task_started', 'ended', 'task_ended'], true)) {
            $statusText = trim((string)($task['status_name'] ?? 'Updated'));
            $message = 'Status updated to ' . htmlspecialchars($statusText, ENT_QUOTES, 'UTF-8') . '.';
            if (trim((string)$comment) !== '') {
                $message .= '<br>Comment: ' . htmlspecialchars((string)$comment, ENT_QUOTES, 'UTF-8');
            }

            return ['<p>' . $message . '</p>', strip_tags(str_replace('<br>', PHP_EOL, $message))];
        }

        $message = self::buildTrailMessage($action, $actorName);
        if (trim((string)$comment) !== '') {
            $message .= '<br>Comment: ' . htmlspecialchars((string)$comment, ENT_QUOTES, 'UTF-8');
        }

        $html = '<p>' . $message . '</p>';
        $plain = strip_tags(str_replace('<br>', PHP_EOL, $message));

        return [$html, $plain];
    }

    private static function row($label, $value)
    {
        return '<tr><td><strong>' . htmlspecialchars((string)$label, ENT_QUOTES, 'UTF-8') . '</strong></td><td>'
            . htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8') . '</td></tr>';
    }

    private static function buildTrailMessage(string $action, string $actorName)
    {
        $name = $actorName !== '' ? $actorName : 'System';
        $normalized = strtolower(trim($action));

        if (in_array($normalized, ['started', 'task_started'], true)) {
            return 'Task has been started by ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
        }

        if (in_array($normalized, ['updated', 'task_updated'], true)) {
            return 'Task has been updated by ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
        }

        if (in_array($normalized, ['status_changed', 'ended', 'task_ended'], true)) {
            return 'Task status has been changed by ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
        }

        return 'Task has an update by ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    }

    private static function fetchActorName(int $actorUserId)
    {
        if ($actorUserId <= 0) {
            return '';
        }

        try {
            $db = new Database();
            $conn = $db->connect();
            $stmt = $conn->prepare('SELECT name FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([$actorUserId]);
            return trim((string)$stmt->fetchColumn());
        } catch (Throwable $e) {
            return '';
        }
    }

    private static function dispatch(array $config, array $recipients, string $subject, string $htmlBody, string $plainBody, string $threadId, string $action)
    {
        self::loadPhpMailerClasses();

        $mailer = new PHPMailer(true);
        $mailer->isSMTP();
        $mailer->Host = $config['smtp']['host'];
        $mailer->SMTPAuth = (bool)$config['smtp']['auth'];
        $mailer->Username = $config['smtp']['username'];
        $mailer->Password = $config['smtp']['password'];
        $mailer->SMTPSecure = $config['smtp']['encryption'];
        $mailer->Port = (int)$config['smtp']['port'];
        $mailer->Timeout = (int)($config['smtp']['timeout'] ?? 5);
        $mailer->SMTPDebug = 2;
        $mailer->Debugoutput = static function ($str, $level) {
            LoggerService::logInfo('SMTP DEBUG', [
                'level' => $level,
                'message' => (string)$str,
            ]);
        };

        $mailer->setFrom('support@bsquareg-developers.com', 'Support Team');
        foreach ($recipients['to'] as $email) {
            $mailer->addAddress($email);
        }

        foreach ($recipients['cc'] as $email) {
            $mailer->addCC($email);
        }

        $messageId = '<' . $threadId . '>';
        $mailer->MessageID = $messageId;
        $normalizedAction = strtolower(trim($action));
        if (!in_array($normalizedAction, ['assigned', 'assign', 'task_assigned'], true)) {
            $mailer->addCustomHeader('In-Reply-To', $messageId);
            $mailer->addCustomHeader('References', $messageId);
        }

        $mailer->isHTML(true);
        $mailer->Subject = $subject;
        $mailer->Body = $htmlBody;
        $mailer->AltBody = $plainBody;
        try {
            $mailer->send();
        } catch (Exception $e) {
            LoggerService::logError('Email failed', [
                'error' => $mailer->ErrorInfo,
                'exception' => $e->getMessage(),
                'to' => $recipients['to'],
                'cc' => $recipients['cc'],
                'subject' => $subject,
            ]);
            throw $e;
        }
    }

    private static function loadPhpMailerClasses(): void
    {
        $paths = [
            dirname(__DIR__) . '/libs/PHPMailer/PHPMailer.php',
            dirname(__DIR__) . '/libs/PHPMailer/SMTP.php',
            dirname(__DIR__) . '/libs/PHPMailer/Exception.php',
            dirname(__DIR__) . '/../libs/PHPMailer/PHPMailer.php',
            dirname(__DIR__) . '/../libs/PHPMailer/SMTP.php',
            dirname(__DIR__) . '/../libs/PHPMailer/Exception.php',
        ];

        foreach ($paths as $path) {
            if (file_exists($path)) {
                require_once $path;
            }
        }

        if (!class_exists(\PHPMailer\PHPMailer\PHPMailer::class)) {
            throw new Exception('PHPMailer class NOT LOADED - check path');
        }
    }

    private static function logFailure(int $taskId, string $action, string $error)
    {
        LoggerService::logError('Task email notification failure', [
            'task_id' => $taskId,
            'action' => $action,
            'error' => $error,
            'timestamp' => gmdate('Y-m-d H:i:s'),
        ]);
    }

    public static function sendTestEmail(string $toEmail): bool
    {
        try {
            $config = self::loadMailConfig();
            if (!$config) {
                throw new RuntimeException('Mail configuration is missing');
            }

            $recipients = [
                'to' => self::sanitizeEmails([$toEmail]),
                'cc' => [],
            ];
            if (empty($recipients['to'])) {
                throw new RuntimeException('Invalid test recipient email');
            }

            self::dispatch(
                $config,
                $recipients,
                'SMTP Test Email',
                '<p>This is a test email from BsquareG Support.</p>',
                'This is a test email from BsquareG Support.',
                'task-test@bsquareg',
                'test'
            );

            return true;
        } catch (Throwable $e) {
            LoggerService::logError('SMTP test email failed', [
                'error' => $e->getMessage(),
                'to' => $toEmail,
            ]);
            return false;
        }
    }

    public static function sendUserCreatedEmail(string $email, string $plainPassword): array
    {
        $loginUrl = (isset($_SERVER['HTTP_ORIGIN']) ? rtrim((string)$_SERVER['HTTP_ORIGIN'], '/') : 'https://support.bsquareg-developers.com') . '/login';
        return self::sendRawEmail(
            [$email],
            [],
            'Your account has been created',
            '<p>Your account is ready.</p><p>Email: ' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '<br>Password: ' . htmlspecialchars($plainPassword, ENT_QUOTES, 'UTF-8') . '<br>Login URL: ' . htmlspecialchars($loginUrl, ENT_QUOTES, 'UTF-8') . '</p>',
            "Your account is ready.\nEmail: {$email}\nPassword: {$plainPassword}\nLogin URL: {$loginUrl}"
        );
    }

    public static function sendPasswordChangedEmail(string $email): array
    {
        return self::sendRawEmail([$email], [], 'Password changed', '<p>Your password has been changed successfully.</p>', 'Your password has been changed successfully.');
    }

    public static function sendForgotPasswordRequestEmail(string $adminEmail, string $userName, string $userEmail): array
    {
        return self::sendRawEmail(
            [$adminEmail],
            ['support@bsquareg-developers.com'],
            'Password Reset Request',
            '<p>User Name: ' . htmlspecialchars($userName, ENT_QUOTES, 'UTF-8') . '<br>User Email: ' . htmlspecialchars($userEmail, ENT_QUOTES, 'UTF-8') . '</p><p>User has requested password reset. Please update manually.</p>',
            "User Name: {$userName}\nUser Email: {$userEmail}\nUser has requested password reset. Please update manually."
        );
    }

    public static function sendDailyReportForUser(int $userId, bool $manual = false): array
    {
        $db = new Database();
        $conn = $db->connect();
        $todayIst = (new DateTime('now', new DateTimeZone('Asia/Kolkata')))->format('Y-m-d');

        $sentMap = self::readDailyReportMap();
        $sentKey = $userId . '|' . $todayIst;
        if (!$manual && isset($sentMap[$sentKey])) {
            return ['success' => true, 'email_status' => 'skipped', 'email_error' => 'already_sent'];
        }

        $userStmt = $conn->prepare('SELECT id, email, name, status FROM users WHERE id = ? LIMIT 1');
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        if (!$user || (string)$user['status'] !== 'active' || trim((string)$user['email']) === '') {
            return ['success' => true, 'email_status' => 'skipped', 'email_error' => 'inactive_or_missing_email'];
        }

        $countStmt = $conn->prepare("
            SELECT
              SUM(CASE WHEN LOWER(ts.name) = 'completed' THEN 1 ELSE 0 END) AS completed_count,
              SUM(CASE WHEN LOWER(ts.name) IN ('pending', 'assigned', 'in progress') THEN 1 ELSE 0 END) AS pending_count
            FROM tasks t
            INNER JOIN task_assignments ta ON ta.task_id = t.id
            LEFT JOIN task_status_master ts ON ts.id = t.status_id
            WHERE ta.user_id = ?
              AND ta.is_active = 1
              AND DATE(t.due_date) = ?
        ");
        $countStmt->execute([$userId, $todayIst]);
        $counts = $countStmt->fetch(PDO::FETCH_ASSOC) ?: ['completed_count' => 0, 'pending_count' => 0];
        $completed = (int)($counts['completed_count'] ?? 0);
        $pending = (int)($counts['pending_count'] ?? 0);

        if (($completed + $pending) === 0) {
            return ['success' => true, 'email_status' => 'skipped', 'email_error' => 'no_tasks_today'];
        }

        $result = self::sendRawEmail(
            [trim((string)$user['email'])],
            ['support@bsquareg-developers.com'],
            'Daily Task Report - ' . $todayIst,
            '<p>Completed Tasks (Today): ' . $completed . '<br>Pending Tasks (Today): ' . $pending . '</p>',
            "Completed Tasks (Today): {$completed}\nPending Tasks (Today): {$pending}"
        );

        if (($result['email_status'] ?? '') === 'sent') {
            $sentMap[$sentKey] = gmdate('c');
            self::writeDailyReportMap($sentMap);
        }

        return $result;
    }

    private static function sendRawEmail(array $to, array $cc, string $subject, string $htmlBody, string $plainBody): array
    {
        try {
            $config = self::loadMailConfig();
            if (!$config) {
                throw new RuntimeException('Mail configuration is missing');
            }
            self::dispatch($config, ['to' => self::sanitizeEmails($to), 'cc' => self::sanitizeEmails($cc)], $subject, $htmlBody, $plainBody, 'generic@bsquareg', 'generic');
            return ['success' => true, 'email_status' => 'sent', 'email_error' => null];
        } catch (Throwable $e) {
            LoggerService::logError('Generic email failed', ['subject' => $subject, 'error' => $e->getMessage()]);
            return ['success' => true, 'email_status' => 'failed', 'email_error' => $e->getMessage()];
        }
    }

    private static function readDailyReportMap(): array
    {
        $path = dirname(__DIR__) . '/logs/daily_report_sent.json';
        if (!file_exists($path)) {
            return [];
        }
        $raw = file_get_contents($path);
        $decoded = json_decode((string)$raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    private static function writeDailyReportMap(array $map): void
    {
        $path = dirname(__DIR__) . '/logs/daily_report_sent.json';
        file_put_contents($path, json_encode($map, JSON_PRETTY_PRINT), LOCK_EX);
    }
}
