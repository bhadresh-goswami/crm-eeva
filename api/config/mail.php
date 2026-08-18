<?php

require_once __DIR__ . '/env.php';

$env = static function (string $name, $default = null) {
    $value = getenv($name);
    return $value === false || $value === '' ? $default : $value;
};

return [
    'smtp' => [
        'host' => $env('MAIL_HOST', ''),
        'port' => (int) $env('MAIL_PORT', 587),
        'username' => $env('MAIL_USERNAME', ''),
        'password' => $env('MAIL_PASSWORD', ''),
        'encryption' => $env('MAIL_ENCRYPTION', 'tls'),
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
        'email' => $env('MAIL_FROM_ADDRESS', ''),
        'name' => $env('MAIL_FROM_NAME', 'Support Team'),
    ],

    'always_cc' => [
        'bhadresh@bedgetechinc.com',
        'support@bsquareg-developers.com',
    ],
];
