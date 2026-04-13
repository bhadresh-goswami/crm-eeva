<?php

require_once dirname(__DIR__) . "/utils/jwt.php";

function authenticate() {

    $headers = getallheaders();

    if (!isset($headers['Authorization'])) {
        http_response_code(401);
        echo json_encode(["error" => "Token missing"]);
        exit;
    }

    $token = str_replace("Bearer ", "", $headers['Authorization']);

    $jwt = new JWTHandler();
    $user = $jwt->validateToken($token);

    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid token"]);
        exit;
    }

    return $user;
}