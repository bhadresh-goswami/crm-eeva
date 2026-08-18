<?php

$index = file_get_contents(dirname(__DIR__) . '/index.php');
$controller = file_get_contents(dirname(__DIR__) . '/controllers/TaskController.php');

if ($index === false || $controller === false) {
    fwrite(STDERR, "Unable to read task route sources\n");
    exit(1);
}

foreach (['/tasks/summary', '/candidates/search'] as $route) {
    if (!str_contains($index, $route)) {
        fwrite(STDERR, "Missing task workspace route: {$route}\n");
        exit(1);
    }
}

if (str_contains($index, 'authorizeRoles(')) {
    fwrite(STDERR, "Task routes call undefined authorizeRoles middleware\n");
    exit(1);
}

foreach (['summary', 'searchCandidates', 'detail'] as $method) {
    if (!preg_match('/public function ' . preg_quote($method, '/') . '\s*\(/', $controller)) {
        fwrite(STDERR, "Missing TaskController::{$method}\n");
        exit(1);
    }
}

if (str_contains($controller, "LOWER(ts.name) = 'assigned' OR ta.user_id IS NOT NULL")) {
    fwrite(STDERR, "Assigned section incorrectly includes every actively assigned status\n");
    exit(1);
}

echo "Task workspace route tests passed\n";
