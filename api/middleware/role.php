<?php

function authorize($user, $allowedRoles) {

    if (!in_array($user['role'], $allowedRoles)) {
        http_response_code(403);
        echo json_encode(["error" => "Access denied"]);
        exit;
    }
}