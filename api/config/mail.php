<?php

return [
    'smtp' => [
        'host' => 'smtp.hostinger.com',
        'port' => 587,
        'username' => 'support@bsquareg-developers.com',
        'password' => '4P@/K1w0s',
        'encryption' => 'tls',
        'auth' => true,
        'timeout' => 5,
        'debug' => true,
    ],
    'from' => [
        'email' => 'support@bsquareg-developers.com',
        'name' => 'Support Team',
    ],
    'always_cc' => [
        'bhadresh@bedgetechinc.com',
        'support@bsquareg-developers.com',
    ],
];
