<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/config/External/external_api.php';
require_once dirname(__DIR__) . '/helpers/External/ExternalResponse.php';
require_once dirname(__DIR__) . '/middleware/External/ExternalApiAuth.php';
require_once dirname(__DIR__) . '/services/External/ExternalApiLogger.php';
require_once dirname(__DIR__) . '/services/External/ExternalInterviewService.php';
require_once dirname(__DIR__) . '/controllers/External/ExternalInterviewController.php';

$config = require dirname(__DIR__) . '/config/External/external_api.php';
$started = microtime(true);
$apiName = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '';
$raw = file_get_contents('php://input') ?: '';
$response = null;
$body = [];

try {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Content-Type, X-API-KEY');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
    if (strlen($raw) > (int)$config['max_request_bytes']) {
        $response = ExternalResponse::error('Request body too large.', [], 413); return;
    }
    $authErrors = (new ExternalApiAuth($config))->validate();
    if ($authErrors) { $response = ExternalResponse::error('Unauthorized.', $authErrors, 401); return; }
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $base = '/api/external';
    $route = rtrim(str_replace($base, '', $path), '/') ?: '/';
    if ($method === 'POST') {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (stripos($contentType, 'application/json') === false) { $response = ExternalResponse::error('Unsupported content type.', ['Content-Type must be application/json.'], 415); return; }
        $body = json_decode($raw, true);
        if (!is_array($body) || json_last_error() !== JSON_ERROR_NONE) { $response = ExternalResponse::error('Invalid JSON payload.', [json_last_error_msg()], 400); return; }
    }
    $conn = (new Database())->connect();
    if (!$conn) { $response = ExternalResponse::error('Service unavailable.', [], 503); return; }
    $controller = new ExternalInterviewController(new ExternalInterviewService($conn));
    if ($route === '/interviews' && $method === 'POST') $response = $controller->create($body);
    elseif ($route === '/interviews' && $method === 'GET') $response = $controller->details();
    elseif ($route === '/interviews/history' && $method === 'GET') $response = $controller->history();
    elseif ($route === '/interviews/latest' && $method === 'GET') $response = $controller->latest();
    elseif ($route === '/interviews/status' && $method === 'GET') $response = $controller->status();
    elseif (str_starts_with($route, '/interviews')) $response = ExternalResponse::error('Method not allowed.', [], 405);
    else $response = ExternalResponse::error('External API endpoint not found.', [], 404);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof PDO && $conn->inTransaction()) $conn->rollBack();
    $response = ExternalResponse::error('Something went wrong. Please try again.', [], 500);
} finally {
    (new ExternalApiLogger($config))->log([
        'api_name'=>$apiName,
        'candidate_code'=>$body['candidate_code'] ?? ($_GET['candidate_code'] ?? null),
        'request_body'=>$body ?: null,
        'response'=>$response,
        'http_status'=>http_response_code(),
        'ip_address'=>$_SERVER['REMOTE_ADDR'] ?? '',
        'user_agent'=>$_SERVER['HTTP_USER_AGENT'] ?? '',
        'execution_time_ms'=>round((microtime(true)-$started)*1000,2),
        'validation_errors'=>$response['errors'] ?? [],
    ]);
}
