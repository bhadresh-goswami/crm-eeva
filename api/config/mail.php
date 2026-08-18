<?php

/**
 * Mail Configuration
 *
 * Loads SMTP settings from the project root .env file.
 *
 * Expected structure:
 *
 * project-root/
 * ├── .env
 * └── api/
 *     └── config/
 *         └── mail.php
 */


/*
|--------------------------------------------------------------------------
| Load .env File
|--------------------------------------------------------------------------
*/

$envFile = dirname(__DIR__, 2) . '/.env';

if (is_file($envFile) && is_readable($envFile)) {

    $lines = file(
        $envFile,
        FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES
    );

    if ($lines !== false) {

        foreach ($lines as $line) {

            $line = trim($line);

            // Ignore empty lines
            if ($line === '') {
                continue;
            }

            // Ignore comments
            if (str_starts_with($line, '#')) {
                continue;
            }

            // Ignore invalid lines
            if (!str_contains($line, '=')) {
                continue;
            }

            [$name, $value] = explode('=', $line, 2);

            $name = trim($name);
            $value = trim($value);

            if ($name === '') {
                continue;
            }

            /*
             * Remove surrounding quotes.
             *
             * Example:
             * MAIL_FROM_NAME="bEdge Tech Services"
             *
             * becomes:
             * bEdge Tech Services
             */
            if (strlen($value) >= 2) {

                $firstCharacter = $value[0];
                $lastCharacter = $value[strlen($value) - 1];

                if (
                    ($firstCharacter === '"' && $lastCharacter === '"') ||
                    ($firstCharacter === "'" && $lastCharacter === "'")
                ) {
                    $value = substr($value, 1, -1);
                }
            }

            /*
             * Do not overwrite an environment variable already
             * configured directly on the server.
             */
            if (getenv($name) === false) {

                putenv($name . '=' . $value);

                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}


/*
|--------------------------------------------------------------------------
| Environment Helper
|--------------------------------------------------------------------------
*/

$env = static function (string $name, $default = null) {

    $value = getenv($name);

    if ($value === false || $value === '') {
        return $default;
    }

    return $value;
};


/*
|--------------------------------------------------------------------------
| Mail Configuration
|--------------------------------------------------------------------------
*/

return [

    /*
    |--------------------------------------------------------------------------
    | SMTP
    |--------------------------------------------------------------------------
    */

    'smtp' => [

        'host' => $env(
            'MAIL_HOST',
            'smtp.hostinger.com'
        ),

        'port' => (int) $env(
            'MAIL_PORT',
            465
        ),

        'username' => $env(
            'MAIL_USERNAME',
            ''
        ),

        'password' => $env(
            'MAIL_PASSWORD',
            ''
        ),

        'encryption' => $env(
            'MAIL_ENCRYPTION',
            'ssl'
        ),

        'auth' => filter_var(
            $env('MAIL_AUTH', 'true'),
            FILTER_VALIDATE_BOOLEAN
        ),

        'timeout' => (int) $env(
            'MAIL_TIMEOUT',
            10
        ),

        'debug' => filter_var(
            $env('MAIL_DEBUG', 'false'),
            FILTER_VALIDATE_BOOLEAN
        ),
    ],


    /*
    |--------------------------------------------------------------------------
    | FROM
    |--------------------------------------------------------------------------
    */

    'from' => [

        'email' => $env(
            'MAIL_FROM_ADDRESS',
            ''
        ),

        'name' => $env(
            'MAIL_FROM_NAME',
            'bEdge Tech Services'
        ),
    ],


    /*
    |--------------------------------------------------------------------------
    | Default CC
    |--------------------------------------------------------------------------
    */

    'always_cc' => [

        'bhadresh@bedgetechinc.com',

        'support@bsquareg-developers.com',
    ],
];
/*
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
];*/