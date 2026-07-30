<?php
class ExternalApiAuth {
    public function __construct(private array $config) {}
    public function validate(): ?array {
        $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
        if (!is_string($key) || trim($key) === '') {
            return ['X-API-KEY header is required.'];
        }
        $incomingHash = hash('sha256', trim($key));
        $storedHash = (string)($this->config['api_key_hash'] ?? '');
        if ($storedHash === '' || !hash_equals($storedHash, $incomingHash)) {
            return ['Invalid API key.'];
        }
        return null;
    }
}
