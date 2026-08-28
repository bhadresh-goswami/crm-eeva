<?php

require_once __DIR__ . '/env.php';

$env = static function (string $name, $default = null) {
    $value = getenv($name);
    if (($value === false || $value === '') && isset($_ENV[$name])) {
        $value = $_ENV[$name];
    }
    if (($value === false || $value === '') && isset($_SERVER[$name])) {
        $value = $_SERVER[$name];
    }
    return $value === false || $value === '' ? $default : $value;
};

return [
    'smtp' => [
        'host' => $env('MAIL_HOST', 'smtp.hostinger.com'),
        'port' => (int) $env('MAIL_PORT', 465),
        'username' => $env('MAIL_USERNAME', 'no-reply@bedgetech-inc.com'),
        'password' => $env('MAIL_PASSWORD', 'bEdgeTech@2026'),
        'encryption' => $env('MAIL_ENCRYPTION', 'ssl'),
        'auth' => filter_var(
            $env('MAIL_AUTH', 'true'),
            FILTER_VALIDATE_BOOLEAN
        ),
        'timeout' => (int) $env('MAIL_TIMEOUT', 5),
        'debug' => filter_var(
            $env('MAIL_DEBUG', 'false'),
            FILTER_VALIDATE_BOOLEAN
        ),
    ],

    'from' => [
        'email' => $env('MAIL_FROM_ADDRESS', 'no-reply@bedgetech-inc.com'),
        'name' => $env('MAIL_FROM_NAME', 'bEdge Tech Services'),
    ],

    'always_cc' => [
        'bhadresh@bedgetechinc.com',
        'support@bsquareg-developers.com',
    ],
];
