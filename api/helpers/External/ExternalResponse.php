<?php
class ExternalResponse {
    public static function success(string $message = '', $data = [], int $status = 200): array {
        http_response_code($status);
        $payload = ['success' => true, 'message' => $message, 'data' => $data];
        echo json_encode($payload);
        return $payload;
    }
    public static function error(string $message, array $errors = [], int $status = 400): array {
        http_response_code($status);
        $payload = ['success' => false, 'message' => $message, 'errors' => $errors];
        echo json_encode($payload);
        return $payload;
    }
}
