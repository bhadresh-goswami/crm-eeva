<?php

class JWTHandler {

    private $secret = "your_secret_key_here";

    public function generateToken($user) {
        $payload = [
            "id" => $user['id'],
            "role" => $user['role'],
            "exp" => time() + (60 * 60 * 8)
        ];

        return base64_encode(json_encode($payload));
    }

    public function validateToken($token) {
        $data = json_decode(base64_decode($token), true);

        if (!$data || $data['exp'] < time()) {
            return false;
        }

        return $data;
    }
}