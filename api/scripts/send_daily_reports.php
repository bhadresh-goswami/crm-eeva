<?php

date_default_timezone_set('Asia/Kolkata');

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/services/EmailService.php';
require_once dirname(__DIR__) . '/services/LoggerService.php';

try {
    $db = new Database();
    $conn = $db->connect();
    $stmt = $conn->prepare("\n        SELECT id FROM users WHERE status = 'active'\n    ");
    $stmt->execute();
    $userIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

    foreach ($userIds as $userId) {
        EmailService::sendDailyReportForUser($userId, false);
    }

    echo json_encode(['success' => true, 'processed_users' => count($userIds)]);
} catch (Throwable $e) {
    LoggerService::logError('Daily report cron failed', ['error' => $e->getMessage()]);
    echo json_encode(['success' => false]);
}
