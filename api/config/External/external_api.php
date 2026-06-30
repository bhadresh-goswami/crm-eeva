<?php
return [
    'api_key_hash' => getenv('EXTERNAL_API_KEY_HASH') ?: '6bf189cfa0d0e8b660dd4f0e1f87e0a0177611704a7602194d5cac35ec4a48ab',
    'max_request_bytes' => 1048576,
    'log_file' => dirname(__DIR__, 2) . '/logs/external_api.log',
];
