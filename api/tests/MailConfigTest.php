<?php

foreach (['MAIL_HOST', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_ENCRYPTION', 'MAIL_FROM_ADDRESS'] as $name) {
    putenv($name);
    unset($_ENV[$name], $_SERVER[$name]);
}

$config = require dirname(__DIR__) . '/config/mail.php';

if ($config['smtp']['host'] !== 'smtp.hostinger.com' || $config['smtp']['port'] !== 465) {
    throw new RuntimeException('The default Hostinger SMTP endpoint is incorrect.');
}
if ($config['smtp']['username'] === '' || $config['smtp']['password'] === '') {
    throw new RuntimeException('The default authenticated SMTP credentials are missing.');
}
if ($config['smtp']['encryption'] !== 'ssl' || $config['from']['email'] !== $config['smtp']['username']) {
    throw new RuntimeException('The default SMTP encryption or sender is incorrect.');
}

echo "Mail config tests passed\n";
