<?php

class Database
{
    public ?PDO $conn = null;

    public function connect(): PDO
    {
        $host = self::environment('DB_HOST', '127.0.0.1');
        $port = self::environment('DB_PORT', '3306');
        $database = self::environment('DB_NAME');
        $username = self::environment('DB_USER');
        $password = self::environment('DB_PASSWORD');

        if ($database === '' || $username === '') {
            throw new RuntimeException('Database configuration is incomplete: DB_NAME and DB_USER are required');
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $host,
            $port,
            $database
        );

        // Do not swallow connection exceptions or print them into JSON responses.
        // Callers and the API exception handler need the original SQLSTATE to
        // diagnose infrastructure failures accurately.
        $this->conn = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        return $this->conn;
    }

    private static function environment(string $name, string $default = ''): string
    {
        $value = getenv($name);

        return $value === false ? $default : trim((string)$value);
    }
}
