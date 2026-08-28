<?php

date_default_timezone_set('Asia/Kolkata');

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/services/EmailService.php';
require_once dirname(__DIR__) . '/services/LoggerService.php';

try {
    $db = new Database();
    $conn = $db->connect();
    $stmt = $conn->prepare("\n        SELECT u.id FROM users u\n        INNER JOIN roles r ON r.id = u.role_id\n        WHERE u.status = 'active' AND LOWER(r.name) = 'technical expert'\n    ");
    $stmt->execute();
    $userIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

    $reportDate = (new DateTime('yesterday', new DateTimeZone('Asia/Kolkata')))->format('Y-m-d');
    foreach ($userIds as $userId) {
        EmailService::sendDailyReportForUser($userId, $reportDate);
    }

    echo json_encode(['success' => true, 'processed_users' => count($userIds), 'report_date' => $reportDate]);
} catch (Throwable $e) {
    LoggerService::logError('Daily report cron failed', ['error' => $e->getMessage()]);
    echo json_encode(['success' => false]);
}
