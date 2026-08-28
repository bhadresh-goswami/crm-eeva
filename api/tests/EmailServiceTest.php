<?php

require_once dirname(__DIR__) . '/services/EmailService.php';

function invokeEmailService(string $method, array $arguments = [])
{
    $reflection = new ReflectionMethod(EmailService::class, $method);
    $reflection->setAccessible(true);
    return $reflection->invokeArgs(null, $arguments);
}

function assertEmailService($condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$emails = invokeEmailService('sanitizeEmails', [[null, '', 'EXPERT@example.com', 'expert@example.com', 'invalid']]);
assertEmailService($emails === ['expert@example.com'], 'Recipients must be valid, normalized, and unique.');

$empty = invokeEmailService('calculateDailyReport', [[]]);
assertEmailService($empty['assigned'] === 0 && $empty['completed'] === 0 && $empty['pending'] === 0, 'Zero-task metrics must remain zero.');
[$emptyHtml, $emptyText] = invokeEmailService('buildDailyReportBody', ['Test Expert', '2026-08-18', $empty]);
assertEmailService(strpos($emptyHtml, 'No tasks were recorded for this reporting date.') !== false, 'Zero-task HTML message is required.');
assertEmailService(strpos($emptyText, 'Assigned Tasks: 0') !== false, 'Zero-task plain-text metrics are required.');

$tasks = [[
    'id' => 1, 'title' => '<Task>', 'task_type' => 'Interview', 'status_name' => 'Completed',
    'start_time' => '09:00:00', 'end_time' => '10:30:00',
    'task_start_time' => '2026-08-18 09:05:00', 'task_end_time' => '2026-08-18 10:20:00', 'duration' => 0,
]];
$report = invokeEmailService('calculateDailyReport', [$tasks]);
assertEmailService($report['assigned'] === 1 && $report['completed'] === 1, 'Completed task metrics are incorrect.');
assertEmailService($report['scheduled_minutes'] === 90 && $report['actual_minutes'] === 75, 'Duration metrics are incorrect.');
[$html] = invokeEmailService('buildDailyReportBody', ['Test Expert', '2026-08-18', $report]);
assertEmailService(strpos($html, '&lt;Task&gt;') !== false && strpos($html, '<Task>') === false, 'Task content must be HTML escaped.');

try {
    invokeEmailService('normalizeReportDate', ['18-08-2026', new DateTimeZone('Asia/Kolkata')]);
    throw new RuntimeException('Invalid report dates must be rejected.');
} catch (InvalidArgumentException $expected) {
}

echo "EmailService tests passed\n";
