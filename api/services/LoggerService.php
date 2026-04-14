<?php

class LoggerService
{
    public static function logError(string $message, array $context = []): void
    {
        self::write('ERROR', $message, $context);
    }

    public static function logInfo(string $message, array $context = []): void
    {
        self::write('INFO', $message, $context);
    }

    private static function write(string $level, string $message, array $context = []): void
    {
        $logDir = dirname(__DIR__) . '/logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }

        $payload = [
            'timestamp' => gmdate('Y-m-d H:i:s'),
            'level' => $level,
            'message' => $message,
            'context' => $context,
        ];

        $line = json_encode($payload, JSON_UNESCAPED_SLASHES) . PHP_EOL;
        file_put_contents($logDir . '/app.log', $line, FILE_APPEND | LOCK_EX);
    }
}
