<?php

$fixture = tempnam(sys_get_temp_dir(), 'crm-env-');
file_put_contents($fixture, "MAIL_HOST=smtp.example.com\nMAIL_USERNAME=mailer@example.com\nMAIL_PASSWORD=secret=value\nMAIL_FROM_NAME=\"Support Team\"\nINVALID LINE\n");

require_once dirname(__DIR__) . '/config/env.php';

putenv('MAIL_HOST=server.example.com');
putenv('MAIL_USERNAME');
putenv('MAIL_PASSWORD');
putenv('MAIL_FROM_NAME');
loadApplicationEnvironment([$fixture]);

if (getenv('MAIL_HOST') !== 'server.example.com') {
    throw new RuntimeException('Environment files must not override server variables.');
}
if (getenv('MAIL_USERNAME') !== 'mailer@example.com' || getenv('MAIL_PASSWORD') !== 'secret=value') {
    throw new RuntimeException('SMTP credentials were not loaded from the environment file.');
}
if (getenv('MAIL_FROM_NAME') !== 'Support Team') {
    throw new RuntimeException('Quoted environment values must be unwrapped.');
}

unlink($fixture);
echo "Environment config tests passed\n";
