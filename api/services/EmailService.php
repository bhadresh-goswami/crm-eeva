<?php

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/services/LoggerService.php';
require_once dirname(__DIR__) . '/services/FeedbackEligibility.php';
require_once dirname(__DIR__) . '/libs/PHPMailer/PHPMailer.php';
require_once dirname(__DIR__) . '/libs/PHPMailer/SMTP.php';
require_once dirname(__DIR__) . '/libs/PHPMailer/Exception.php';

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

class EmailService
{
    public static function sendTaskNotification($taskId, $action, $comment = null, $actorUserId = null, $assignedUserId = null)
    {
        try {
            $db = new Database();
            $conn = $db->connect();

            self::ensureThreadColumnExists($conn);
            $task = self::fetchTaskSnapshot($conn, (int)$taskId, $assignedUserId !== null ? (int)$assignedUserId : null);
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
                LoggerService::logError('Task email notification has no recipients', [
                    'task_id' => (int)$taskId,
                    'action' => (string)$action,
                    'assigned_user_id' => $assignedUserId,
                    'assigned_to_id' => $task['assigned_to_id'] ?? null,
                ]);
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

    private static function fetchTaskSnapshot(PDO $conn, int $taskId, ?int $assignedUserId = null)
    {
        $assignmentWhere = "task_id = t.id AND is_active = 1";
        $params = [$taskId];
        if ($assignedUserId !== null && $assignedUserId > 0) {
            $assignmentWhere .= " AND user_id = ?";
            $params = [$assignedUserId, $taskId];
        }

        $stmt = $conn->prepare("\n            SELECT\n                t.id,\n                t.title,\n                t.due_date,\n                t.start_time,\n                t.email_thread_id,\n                COALESCE(cand.name, '') AS candidate_name,\n                COALESCE(tt.name, '') AS support_type,\n                COALESCE(ts.name, '') AS status_name,\n                ta.user_id AS assigned_to_id,\n                COALESCE(assigned_to.name, '') AS assigned_to_name,\n                COALESCE(assigned_to.email, '') AS assigned_to_email,\n                assigned_to.team_lead_id AS assigned_to_team_lead_id\n            FROM tasks t\n            LEFT JOIN candidates cand ON cand.id = t.candidate_id\n            LEFT JOIN task_types tt ON tt.id = t.task_type_id\n            LEFT JOIN task_status_master ts ON ts.id = t.status_id\n            LEFT JOIN task_assignments ta ON ta.id = (\n                SELECT id FROM task_assignments WHERE {$assignmentWhere} ORDER BY id DESC LIMIT 1\n            )\n            LEFT JOIN users assigned_to ON assigned_to.id = ta.user_id\n            WHERE t.id = ?\n            LIMIT 1\n        ");
        $stmt->execute($params);

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

    private static function resolveLoginUrl(): string
    {
        if (!empty($_SERVER['HTTP_ORIGIN'])) {
            return rtrim((string)$_SERVER['HTTP_ORIGIN'], '/') . '/login';
        }

        if (!empty($_SERVER['HTTP_HOST'])) {
            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            return $scheme . '://' . $_SERVER['HTTP_HOST'] . '/login';
        }

        return 'https://support.bsquareg-developers.com/login';
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
            $loginUrl = self::resolveLoginUrl();
            $html = '<p>Hello,</p>'
                . '<p>A task has been assigned. Please find the details below:</p>'
                . '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">'
                . self::row('Task ID', $task['id'] ?? '-')
                . self::row('Task Title', $task['title'] ?? '-')
                . self::row('Candidate Name', $task['candidate_name'] ?? '-')
                . self::row('Task Type', $task['support_type'] ?? '-')
                . self::row('Due Date', $dtIst->format('d M Y'))
                . self::row('Scheduled Time', $dtIst->format('h:i A') . ' IST / ' . $dtEst->format('h:i A') . ' EST')
                . self::row('Assigned To', $task['assigned_to_name'] ?? '-')
                . self::row('Assigned By', $assignedBy)
                . self::row('Login URL', $loginUrl)
                . '</table>'
                . '<p>Regards,<br>BsquareG Support</p>';

            $plain = 'Task assigned: ' . ($task['title'] ?? '-') . PHP_EOL
                . 'Task ID: ' . ($task['id'] ?? '-') . PHP_EOL
                . 'Candidate: ' . ($task['candidate_name'] ?? '-') . PHP_EOL
                . 'Task Type: ' . ($task['support_type'] ?? '-') . PHP_EOL
                . 'Due Date: ' . $dtIst->format('d M Y') . PHP_EOL
                . 'Scheduled Time: ' . $dtIst->format('h:i A') . ' IST / ' . $dtEst->format('h:i A') . ' EST' . PHP_EOL
                . 'Assigned to: ' . ($task['assigned_to_name'] ?? '-') . PHP_EOL
                . 'Assigned by: ' . $assignedBy . PHP_EOL
                . 'Login URL: ' . $loginUrl;

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

        $to = self::sanitizeEmails($recipients['to'] ?? []);
        $cc = self::sanitizeEmails($recipients['cc'] ?? []);
        $toLookup = array_fill_keys($to, true);
        $cc = array_values(array_filter($cc, static function (string $email) use ($toLookup): bool {
            return !isset($toLookup[$email]);
        }));
        if (empty($to)) {
            throw new RuntimeException('Email has no valid TO recipients');
        }

        $smtp = $config['smtp'] ?? [];
        $from = $config['from'] ?? [];
        foreach (['host', 'port'] as $required) {
            if (empty($smtp[$required])) {
                throw new RuntimeException('Mail configuration is missing SMTP ' . $required);
            }
        }
        if (!empty($smtp['auth']) && (empty($smtp['username']) || empty($smtp['password']))) {
            throw new RuntimeException('Authenticated SMTP credentials are missing');
        }
        if (empty($from['email']) || !filter_var($from['email'], FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Mail sender address is missing or invalid');
        }

        $mailer = new PHPMailer(true);
        $mailer->isSMTP();
        $mailer->Host = (string)$smtp['host'];
        $mailer->SMTPAuth = (bool)($smtp['auth'] ?? true);
        $mailer->Username = (string)($smtp['username'] ?? '');
        $mailer->Password = (string)($smtp['password'] ?? '');
        $mailer->SMTPSecure = (string)($smtp['encryption'] ?? 'tls');
        $mailer->Port = (int)$smtp['port'];
        $mailer->Timeout = (int)($smtp['timeout'] ?? 5);
        $mailer->CharSet = PHPMailer::CHARSET_UTF8;
        $mailer->SMTPDebug = !empty($smtp['debug']) ? 2 : 0;
        $mailer->Debugoutput = static function ($str, $level) {
            LoggerService::logInfo('SMTP DEBUG', [
                'level' => $level,
                'message' => (string)$str,
            ]);
        };

        $mailer->setFrom((string)$from['email'], (string)($from['name'] ?? ''));
        foreach ($to as $email) {
            $mailer->addAddress($email);
        }

        foreach ($cc as $email) {
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
                'recipient_count' => count($to) + count($cc),
                'email_type' => $action,
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

    public static function sendDailyReportForUser(int $userId, ?string $reportDate = null): array
    {
        $timezone = new DateTimeZone('Asia/Kolkata');
        $date = self::normalizeReportDate($reportDate, $timezone);
        $db = new Database();
        $conn = $db->connect();

        $userStmt = $conn->prepare("
            SELECT u.id, u.email, u.name, u.status, LOWER(r.name) AS role
            FROM users u
            INNER JOIN roles r ON r.id = u.role_id
            WHERE u.id = ? LIMIT 1
        ");
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        if (!$user || $user['status'] !== 'active' || $user['role'] !== 'technical expert') {
            return ['success' => true, 'email_status' => 'skipped', 'email_error' => 'not_active_technical_expert'];
        }
        if (!filter_var(trim((string)$user['email']), FILTER_VALIDATE_EMAIL)) {
            return ['success' => true, 'email_status' => 'skipped', 'email_error' => 'missing_or_invalid_expert_email'];
        }

        if (!self::reserveDailyReportDelivery($conn, $userId, $date)) {
            return ['success' => true, 'email_status' => 'skipped', 'email_error' => 'already_sent_or_sending'];
        }

        try {
            $tasks = self::fetchDailyReportTasks($conn, $userId, $date);
            $report = self::calculateDailyReport($tasks);
            $report['pending_feedback'] = self::fetchPendingFeedbackTasks($conn, $userId, $date);
            [$htmlBody, $plainBody] = self::buildDailyReportBody((string)$user['name'], $date, $report);
            $displayDate = DateTime::createFromFormat('!Y-m-d', $date, $timezone)->format('d M Y');
            $result = self::sendRawEmail(
                ['dipesh.sharma@bedgetechinc.com', trim((string)$user['email'])],
                ['bhadresh@bedgetechinc.com'],
                'Technical Expert Daily Report — ' . trim((string)$user['name']) . ' — ' . $displayDate,
                $htmlBody,
                $plainBody,
                ['email_type' => 'technical_expert_daily_report', 'user_id' => $userId, 'report_date' => $date]
            );

            if (($result['email_status'] ?? '') === 'sent') {
                $stmt = $conn->prepare("UPDATE technical_expert_daily_report_deliveries SET status = 'sent', sent_at = NOW() WHERE user_id = ? AND report_date = ?");
                $stmt->execute([$userId, $date]);
            } else {
                self::releaseDailyReportDelivery($conn, $userId, $date);
            }
            return $result;
        } catch (Throwable $e) {
            self::releaseDailyReportDelivery($conn, $userId, $date);
            LoggerService::logError('Technical expert daily report failed', [
                'timestamp' => gmdate('c'), 'email_type' => 'technical_expert_daily_report',
                'recipient_count' => 3, 'user_id' => $userId, 'report_date' => $date, 'error' => $e->getMessage(),
            ]);
            return ['success' => true, 'email_status' => 'failed', 'email_error' => $e->getMessage()];
        }
    }

    private static function normalizeReportDate(?string $reportDate, DateTimeZone $timezone): string
    {
        if ($reportDate === null || trim($reportDate) === '') {
            return (new DateTime('now', $timezone))->format('Y-m-d');
        }
        $date = DateTime::createFromFormat('!Y-m-d', $reportDate, $timezone);
        if (!$date || $date->format('Y-m-d') !== $reportDate) {
            throw new InvalidArgumentException('report_date must use YYYY-MM-DD format');
        }
        return $date->format('Y-m-d');
    }

    private static function reserveDailyReportDelivery(PDO $conn, int $userId, string $date): bool
    {
        // A crashed worker must not suppress retries forever; successful rows are never removed.
        $cleanup = $conn->prepare("DELETE FROM technical_expert_daily_report_deliveries WHERE user_id = ? AND report_date = ? AND status = 'sending' AND updated_at < (NOW() - INTERVAL 15 MINUTE)");
        $cleanup->execute([$userId, $date]);
        try {
            $stmt = $conn->prepare("INSERT INTO technical_expert_daily_report_deliveries (user_id, report_date, status) VALUES (?, ?, 'sending')");
            return $stmt->execute([$userId, $date]);
        } catch (PDOException $e) {
            if ((string)$e->getCode() === '23000') {
                return false;
            }
            throw $e;
        }
    }

    private static function releaseDailyReportDelivery(PDO $conn, int $userId, string $date): void
    {
        $stmt = $conn->prepare("DELETE FROM technical_expert_daily_report_deliveries WHERE user_id = ? AND report_date = ? AND status = 'sending'");
        $stmt->execute([$userId, $date]);
    }

    private static function fetchDailyReportTasks(PDO $conn, int $userId, string $date): array
    {
        $stmt = $conn->prepare("
            SELECT t.id, t.title, COALESCE(c.name, '') AS candidate_name, COALESCE(tt.name, 'Unspecified') AS task_type,
                   COALESCE(ts.name, 'Pending') AS status_name, t.start_time, t.end_time,
                   t.task_start_time, t.task_end_time, COALESCE(t.duration, 0) AS duration,
                   MAX(tf.id) AS feedback_id
            FROM tasks t
            INNER JOIN task_assignments ta ON ta.task_id = t.id AND ta.user_id = ?
            LEFT JOIN task_types tt ON tt.id = t.task_type_id
            LEFT JOIN task_status_master ts ON ts.id = t.status_id
            LEFT JOIN candidates c ON c.id = t.candidate_id
            LEFT JOIN task_feedback tf ON tf.task_id = t.id
            WHERE DATE(t.due_date) = ?
            GROUP BY t.id, t.title, c.name, tt.name, ts.name, t.start_time, t.end_time, t.task_start_time, t.task_end_time, t.duration
            ORDER BY t.start_time, t.id
        ");
        $stmt->execute([$userId, $date]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function calculateDailyReport(array $tasks): array
    {
        $report = ['assigned' => count($tasks), 'completed' => 0, 'pending' => 0, 'cancelled' => 0, 'scheduled_minutes' => 0, 'actual_minutes' => 0, 'pending_feedback' => [], 'types' => [], 'tasks' => $tasks];
        foreach ($tasks as $task) {
            $status = strtolower(trim((string)$task['status_name']));
            if ($status === 'completed') $report['completed']++;
            elseif (strpos($status, 'cancel') !== false || strpos($status, 'reschedul') !== false) $report['cancelled']++;
            else $report['pending']++;
            $type = trim((string)$task['task_type']) ?: 'Unspecified';
            $report['types'][$type] = ($report['types'][$type] ?? 0) + 1;
            $report['scheduled_minutes'] += self::minutesBetween($task['start_time'] ?? null, $task['end_time'] ?? null);
            $actual = self::minutesBetween($task['task_start_time'] ?? null, $task['task_end_time'] ?? null);
            $report['actual_minutes'] += $actual > 0 ? $actual : max(0, (int)($task['duration'] ?? 0));
        }
        ksort($report['types']);
        return $report;
    }

    /** Pending feedback is an operational backlog, so it includes every eligible task through the report date. */
    private static function fetchPendingFeedbackTasks(PDO $conn, int $userId, string $date): array
    {
        $eligibleSql = FeedbackEligibility::sql('tt.name', 'ts.name');
        $stmt = $conn->prepare("
            SELECT t.id, t.title, DATE(t.due_date) AS task_date,
                   COALESCE(c.name, '') AS candidate_name,
                   COALESCE(tt.name, 'Unspecified') AS task_type
            FROM tasks t
            INNER JOIN task_assignments ta ON ta.task_id = t.id AND ta.user_id = ?
            LEFT JOIN candidates c ON c.id = t.candidate_id
            LEFT JOIN task_types tt ON tt.id = t.task_type_id
            LEFT JOIN task_status_master ts ON ts.id = t.status_id
            LEFT JOIN task_feedback tf ON tf.task_id = t.id
            WHERE DATE(t.due_date) <= ? AND tf.id IS NULL AND ({$eligibleSql})
            GROUP BY t.id, t.title, t.due_date, c.name, tt.name
            ORDER BY t.due_date DESC, t.id DESC
        ");
        $stmt->execute([$userId, $date]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function minutesBetween($start, $end): int
    {
        if (empty($start) || empty($end)) return 0;
        try {
            $seconds = (new DateTime((string)$end))->getTimestamp() - (new DateTime((string)$start))->getTimestamp();
            return max(0, (int)round($seconds / 60));
        } catch (Throwable $e) { return 0; }
    }

    private static function formatMinutes(int $minutes): string
    {
        return sprintf('%dh %02dm', intdiv(max(0, $minutes), 60), max(0, $minutes) % 60);
    }

    private static function buildDailyReportBody(string $expertName, string $date, array $report): array
    {
        $e = static function ($value): string { return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'); };
        $displayDate = (new DateTime($date))->format('d M Y');
        $metrics = [
            'Assigned Tasks' => $report['assigned'], 'Completed Tasks' => $report['completed'],
            'Pending Tasks' => $report['pending'], 'Cancelled / Rescheduled' => $report['cancelled'],
            'Scheduled Duration' => self::formatMinutes($report['scheduled_minutes']),
            'Actual Duration' => self::formatMinutes($report['actual_minutes']),
            'Pending Task Feedback' => count($report['pending_feedback']),
        ];
        $rows = '';
        foreach ($metrics as $label => $value) $rows .= self::row($label, $value);
        $types = empty($report['types']) ? '<p>No task types recorded.</p>' : '<ul>';
        foreach ($report['types'] as $type => $count) $types .= '<li>' . $e($type) . ': ' . (int)$count . '</li>';
        if (!empty($report['types'])) $types .= '</ul>';
        $activity = empty($report['tasks']) ? '<p><strong>No tasks were recorded for this reporting date.</strong></p>' : '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse"><tr><th>Task</th><th>Type</th><th>Status</th><th>Scheduled</th><th>Actual</th></tr>';
        foreach ($report['tasks'] as $task) {
            $activity .= '<tr><td>' . $e($task['title']) . '</td><td>' . $e($task['task_type']) . '</td><td>' . $e($task['status_name']) . '</td><td>'
                . $e(self::formatMinutes(self::minutesBetween($task['start_time'], $task['end_time']))) . '</td><td>'
                . $e(self::formatMinutes(($actual = self::minutesBetween($task['task_start_time'], $task['task_end_time'])) > 0 ? $actual : (int)$task['duration'])) . '</td></tr>';
        }
        if (!empty($report['tasks'])) $activity .= '</table>';
        $pendingFeedbackCounts = [];
        foreach ($report['pending_feedback'] as $task) {
            $pendingFeedbackCounts[$task['task_type']] = ($pendingFeedbackCounts[$task['task_type']] ?? 0) + 1;
        }
        ksort($pendingFeedbackCounts);
        $pendingFeedback = empty($report['pending_feedback']) ? '<p>No task feedback pending through the report date.</p>' : '<p><strong>Counts by task type:</strong> ';
        foreach ($pendingFeedbackCounts as $type => $count) {
            $pendingFeedback .= $e($type) . ': ' . (int)$count . '; ';
        }
        if (!empty($report['pending_feedback'])) $pendingFeedback .= '</p><ul>';
        foreach ($report['pending_feedback'] as $task) {
            $pendingFeedback .= '<li><strong>TAS-' . (int)$task['id'] . '</strong> — ' . $e($task['task_type']) . ' · ' . $e($task['candidate_name'] ?: 'No candidate') . ' · ' . $e($task['task_date']) . '</li>';
        }
        if (!empty($report['pending_feedback'])) $pendingFeedback .= '</ul>';
        $rate = $report['assigned'] > 0 ? round(($report['completed'] / $report['assigned']) * 100, 1) : 0;
        $html = '<div style="font-family:Arial,sans-serif"><h1>Technical Expert Daily Work Report</h1><p><strong>Expert Name:</strong> ' . $e($expertName) . '<br><strong>Report Date:</strong> ' . $e($displayDate) . '</p><h2>Daily Summary</h2><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse">' . $rows . '</table><h2>Task Type Breakdown</h2>' . $types . '<h2>Today\'s Task Activity</h2>' . $activity . '<h2>Pending Task Feedback</h2>' . $pendingFeedback . '<h2>Performance Summary</h2><p>Completion Rate: ' . $rate . '%</p></div>';
        $plain = "Technical Expert Daily Work Report\nExpert Name: {$expertName}\nReport Date: {$displayDate}\n\nDaily Summary";
        foreach ($metrics as $label => $value) $plain .= "\n{$label}: {$value}";
        $plain .= "\n\nTask Type Breakdown";
        foreach ($report['types'] as $type => $count) $plain .= "\n{$type}: {$count}";
        $plain .= empty($report['tasks']) ? "\n\nNo tasks were recorded for this reporting date." : "\n\nToday's Task Activity";
        foreach ($report['tasks'] as $task) $plain .= "\n#{$task['id']} {$task['title']} | {$task['task_type']} | {$task['status_name']}";
        $plain .= "\n\nPending Task Feedback";
        if (empty($report['pending_feedback'])) $plain .= "\nNo task feedback pending through the report date.";
        foreach ($pendingFeedbackCounts as $type => $count) $plain .= "\n{$type}: {$count}";
        foreach ($report['pending_feedback'] as $task) $plain .= "\nTAS-{$task['id']} | {$task['task_type']} | " . ($task['candidate_name'] ?: 'No candidate') . " | {$task['task_date']}";
        $plain .= "\n\nPerformance Summary\nCompletion Rate: {$rate}%";
        return [$html, $plain];
    }

    private static function sendRawEmail(array $to, array $cc, string $subject, string $htmlBody, string $plainBody, array $context = []): array
    {
        try {
            $config = self::loadMailConfig();
            if (!$config) {
                throw new RuntimeException('Mail configuration is missing');
            }
            self::dispatch($config, ['to' => self::sanitizeEmails($to), 'cc' => self::sanitizeEmails($cc)], $subject, $htmlBody, $plainBody, 'generic@bsquareg', 'generic');
            return ['success' => true, 'email_status' => 'sent', 'email_error' => null];
        } catch (Throwable $e) {
            LoggerService::logError('Email delivery failed', array_merge([
                'timestamp' => gmdate('c'), 'email_type' => 'generic',
                'recipient_count' => count(self::sanitizeEmails(array_merge($to, $cc))), 'error' => $e->getMessage(),
            ], $context));
            return ['success' => true, 'email_status' => 'failed', 'email_error' => $e->getMessage()];
        }
    }
}
