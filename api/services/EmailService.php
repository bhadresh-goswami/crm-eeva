<?php

require_once __DIR__ . '/../libs/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../libs/PHPMailer/SMTP.php';
require_once __DIR__ . '/../libs/PHPMailer/Exception.php';

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/services/LoggerService.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

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
                return false;
            }

            $threadId = self::resolveThreadId($conn, $task);

            $mailConfig = self::loadMailConfig();
            if (!$mailConfig) {
                throw new RuntimeException('Mail config missing');
            }

            if (empty($mailConfig['smtp']['host']) || empty($mailConfig['smtp']['username'])) {
                throw new RuntimeException('Invalid SMTP configuration');
            }

            $recipients = self::resolveRecipients($conn, $task, $actorUserId);

            if (empty($recipients['to'])) {
                throw new RuntimeException('No recipients found');
            }

            $subject = self::buildSubject($task);
            [$html, $plain] = self::buildBody($task, $action, $comment, $actorUserId);

            self::dispatch($mailConfig, $recipients, $subject, $html, $plain, $threadId, $action);

            return true;
        } catch (Throwable $e) {
            self::logFailure((int)$taskId, $action, $e->getMessage());

            return [
                'success' => false,
                'message' => 'Email failed',
                'error' => $e->getMessage()
            ];
        }
    }

    private static function loadMailConfig()
    {
        $path = dirname(__DIR__) . '/config/mail.php';
        if (!file_exists($path)) return null;
        return require $path;
    }

    private static function ensureThreadColumnExists(PDO $conn)
    {
        $check = $conn->query("SHOW COLUMNS FROM tasks LIKE 'email_thread_id'")->fetch();
        if (!$check) {
            $conn->exec("ALTER TABLE tasks ADD email_thread_id VARCHAR(255) NULL");
        }
    }

    private static function fetchTaskSnapshot(PDO $conn, int $taskId)
    {
        $stmt = $conn->prepare("
            SELECT
                t.*,
                cand.name AS candidate_name,
                cl.name AS company_name,
                tt.name AS support_type,
                ts.name AS status_name,
                ta.user_id,
                u.name AS assigned_to_name,
                u.email AS assigned_to_email,
                u.team_lead_id
            FROM tasks t
            LEFT JOIN candidates cand ON cand.id = t.candidate_id
            LEFT JOIN clients cl ON cl.id = t.client_id
            LEFT JOIN task_types tt ON tt.id = t.task_type_id
            LEFT JOIN task_status_master ts ON ts.id = t.status_id
            LEFT JOIN task_assignments ta ON ta.id = (
                SELECT id FROM task_assignments 
                WHERE task_id = t.id AND is_active = 1
                ORDER BY id DESC LIMIT 1
            )
            LEFT JOIN users u ON u.id = ta.user_id
            WHERE t.id = ?
        ");
        $stmt->execute([$taskId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private static function resolveThreadId(PDO $conn, $task)
    {
        if (!empty($task['email_thread_id'])) {
            return $task['email_thread_id'];
        }

        $threadId = "task-{$task['id']}@bsquareg";
        $stmt = $conn->prepare("UPDATE tasks SET email_thread_id=? WHERE id=?");
        $stmt->execute([$threadId, $task['id']]);

        return $threadId;
    }

    private static function resolveRecipients(PDO $conn, $task, $actorUserId)
    {
        $to = [];

        if (!empty($task['assigned_to_email'])) {
            $to[] = $task['assigned_to_email'];
        }

        if ($actorUserId) {
            $stmt = $conn->prepare("SELECT email FROM users WHERE id=?");
            $stmt->execute([$actorUserId]);
            $email = $stmt->fetchColumn();
            if ($email) $to[] = $email;
        }

        if (!empty($task['team_lead_id'])) {
            $stmt = $conn->prepare("SELECT email FROM users WHERE id=?");
            $stmt->execute([$task['team_lead_id']]);
            $leadEmail = $stmt->fetchColumn();
            if ($leadEmail) $to[] = $leadEmail;
        }

        $config = self::loadMailConfig();

        return [
            'to' => array_unique($to),
            'cc' => $config['always_cc'] ?? []
        ];
    }

    private static function buildSubject($task)
    {
        $ist = new DateTimeZone('Asia/Kolkata');
        $est = new DateTimeZone('America/New_York');

        $dtIst = new DateTime($task['due_date'] . ' ' . $task['start_time'], $ist);
        $dtEst = clone $dtIst;
        $dtEst->setTimezone($est);

        return "{$task['support_type']} - {$task['candidate_name']} - "
            . $dtIst->format('d M Y - h:i A')
            . " (" . $dtEst->format('h:i A') . " EST)";
    }

    private static function buildBody($task, $action, $comment, $actorUserId)
    {
        $actor = self::getUserName($actorUserId);

        if ($action === 'assigned') {
            $html = "
                <h3>Task Assigned</h3>
                <p><b>Candidate:</b> {$task['candidate_name']}</p>
                <p><b>Task:</b> {$task['title']}</p>
                <p><b>Assigned To:</b> {$task['assigned_to_name']}</p>
                <p><b>Assigned By:</b> {$actor}</p>
            ";

            return [$html, strip_tags($html)];
        }

        $msg = "Task updated by {$actor}";
        if ($comment) $msg .= "<br>Comment: $comment";

        return ["<p>$msg</p>", strip_tags($msg)];
    }

    private static function getUserName($id)
    {
        if (!$id) return 'System';

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare("SELECT name FROM users WHERE id=?");
        $stmt->execute([$id]);

        return $stmt->fetchColumn() ?: 'System';
    }

    private static function dispatch($config, $recipients, $subject, $html, $plain, $threadId, $action)
    {
        $mail = new PHPMailer(true);

        $mail->isSMTP();
        $mail->Host = $config['smtp']['host'];
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtp']['username'];
        $mail->Password = $config['smtp']['password'];
        $mail->SMTPSecure = $config['smtp']['encryption'];
        $mail->Port = $config['smtp']['port'];

        $mail->setFrom($config['smtp']['username'], 'Support Team');

        foreach ($recipients['to'] as $to) {
            $mail->addAddress($to);
        }

        foreach ($recipients['cc'] as $cc) {
            $mail->addCC($cc);
        }

        $mail->Subject = $subject;
        $mail->Body = $html;
        $mail->AltBody = $plain;
        $mail->isHTML(true);

        try {
            $mail->send();
        } catch (Exception $e) {
            LoggerService::logError('Email failed', [
                'error' => $mail->ErrorInfo
            ]);
            throw $e;
        }
    }

    private static function logFailure($taskId, $action, $error)
    {
        LoggerService::logError('Email error', [
            'task_id' => $taskId,
            'action' => $action,
            'error' => $error
        ]);
    }
}