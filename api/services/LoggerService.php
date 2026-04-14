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

    public static function logWarning(string $message, array $context = []): void
    {
        self::write('WARNING', $message, $context);
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

        $line = sprintf(
            "[%s]\n%s: %s\nCONTEXT:\n%s\n\n",
            gmdate('Y-m-d H:i:s'),
            $level,
            $message,
            json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        );

        $filePath = $logDir . '/error-' . gmdate('Y-m-d') . '.log';
        file_put_contents($filePath, $line, FILE_APPEND | LOCK_EX);
    }
}
