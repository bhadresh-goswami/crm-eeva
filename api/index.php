<?php

ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
date_default_timezone_set('Asia/Kolkata');

// ---------------- HEADERS ----------------
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json");

// OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ---------------- LOAD CORE ----------------
require_once "config/database.php";
require_once "middleware/auth.php";
require_once "middleware/role.php";

// ---------------- LOAD CONTROLLERS ----------------
require_once "controllers/AuthController.php";
require_once "controllers/PasswordController.php";
require_once "controllers/ClientController.php";
require_once "controllers/PocController.php";
require_once "controllers/CandidateController.php";

require_once "controllers/TaskController.php";
require_once "controllers/DashboardController.php";
require_once "controllers/ExpertDashboardAnalyticsController.php";
require_once "controllers/ExpertReportsController.php";

require_once "controllers/UserController.php";
require_once "controllers/RoleController.php";

require_once "controllers/TaskTypeController.php";
require_once "controllers/TaskStatusController.php";
require_once "controllers/PaymentStatusController.php";
require_once "controllers/InvoiceController.php";
require_once "controllers/FeedbackController.php";
require_once "controllers/ManagerReportsController.php";
require_once "controllers/CandidatePerformanceReportController.php";
require_once "services/EmailService.php";
require_once "services/LoggerService.php";

set_error_handler(function ($severity, $message, $file, $line) {
    LoggerService::logError('PHP runtime error', [
        'severity' => $severity,
        'message' => $message,
        'file' => $file,
        'line' => $line,
    ]);

    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function ($exception) {
    LoggerService::logError('Unhandled exception', [
        'message' => $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
    ]);

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Something went wrong. Please try again."
    ]);
});

// ---------------- ROUTE PARSER ----------------
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// BASE PATH
$basePath = "/api";
$uri = str_replace($basePath, "", $uri);
$uri = str_replace('/index.php', '', $uri);

// 🔥 FIX: normalize URI
$uri = rtrim($uri, '/');
if ($uri === '') $uri = '/';


// ===================================================
// 🔓 PUBLIC ROUTES
// ===================================================

if ($uri === "/login" && $method === "POST") {
    (new AuthController())->login();
    exit;
}
elseif ($uri === "/forgot-password" && $method === "POST") {
    (new PasswordController())->forgotPassword();
    exit;
}

elseif ($uri === "/logout" && $method === "POST") {
    (new AuthController())->logout();
    exit;
}

elseif ($uri === "/break-in" && $method === "POST") {
    (new AuthController())->breakIn();
    exit;
}

elseif ($uri === "/break-out" && $method === "POST") {
    (new AuthController())->breakOut();
    exit;
}


// ===================================================
// 🔐 PROTECTED ROUTES
// ===================================================

$user = authenticate();


// ===================================================
// 👥 USERS
// ===================================================

if ($uri === "/users/list" && $method === "GET") {
    (new UserController())->list();
}
elseif ($uri === "/change-password" && $method === "POST") {
    $userId = null;
    if (is_object($user) && isset($user->id)) {
        $userId = $user->id;
    } elseif (is_array($user) && isset($user['id'])) {
        $userId = $user['id'];
    }

    (new PasswordController())->changePassword($userId);
}
elseif ($uri === "/users/create" && $method === "POST") {
    (new UserController())->create();
}
elseif ($uri === "/users/update" && $method === "POST") {
    (new UserController())->update();
}
elseif ($uri === "/users/delete" && $method === "POST") {
    (new UserController())->delete();
}
elseif ($uri === "/users/toggle" && $method === "POST") {
    (new UserController())->toggle();
}


// ===================================================
// 🏢 CLIENTS
// ===================================================

elseif ($uri === "/clients/list" && $method === "GET") {
    authorize($user,['admin','manager','coordinator']);
    (new ClientController())->list();
}
elseif ($uri === "/clients/create" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new ClientController())->create();
}
elseif ($uri === "/clients/update" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new ClientController())->update();
}
elseif ($uri === "/clients/delete" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new ClientController())->delete();
}
elseif ($uri === "/clients/toggle" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new ClientController())->toggleStatus();
}


// ===================================================
// 👤 POC
// ===================================================

elseif ($uri === "/pocs/list" && $method === "GET") {
    authorize($user,['admin','manager','coordinator']);
    (new PocController())->list();
}
elseif ($uri === "/pocs/create" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new PocController())->create();
}
elseif ($uri === "/pocs/update" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new PocController())->update();
}
elseif ($uri === "/pocs/delete" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new PocController())->delete();
}
elseif ($uri === "/pocs/toggle" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new PocController())->toggle();
}
elseif ($uri === "/pocs" && $method === "GET") {
    (new ClientController())->getPocsByClient();
}


// ===================================================
// 👤 CANDIDATES
// ===================================================

elseif ($uri === "/candidates/list" && $method === "GET") {
    authorize($user,['admin','manager','coordinator']);
    (new CandidateController())->list();
}
elseif ($uri === "/candidates/create" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new CandidateController())->create();
}
elseif ($uri === "/candidates/update" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new CandidateController())->update();
}
elseif ($uri === "/candidates/delete" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new CandidateController())->delete();
}
elseif ($uri === "/candidates" && $method === "GET") {
    (new CandidateController())->getCandidatesByClient();
}


// ===================================================
// 📊 MASTER
// ===================================================

elseif ($uri === "/task-types/list") (new TaskTypeController())->list();
elseif ($uri === "/task-status/list") (new TaskStatusController())->list();
elseif ($uri === "/payment-status/list") (new PaymentStatusController())->list();
elseif ($uri === "/roles/list") (new RoleController())->list();

// ===================================================
// 📊 DASHBOARD
// ===================================================

elseif ($uri === "/dashboard/summary") {
    authorize($user,['admin','manager','coordinator','expert','expertlead']);
    (new DashboardController())->summary();
}

elseif ($uri === "/dashboard/tasks") {
    authorize($user,['admin','manager','coordinator']);
    (new DashboardController())->tasks();
}

elseif ($uri === "/dashboard/tasks-by-status") {
    authorize($user,['admin','manager','coordinator','expert','expertlead']);
    (new DashboardController())->tasksByStatus();
}
elseif ($uri === "/tasks/filter-options" && $method === "GET") {
    authorize($user,['admin','manager','coordinator','expert','technical expert','expertlead','technical lead']);
    (new TaskController())->loadFilterOptions();
}

elseif ($uri === "/dashboard/team-tasks") {
    authorize($user,['expertlead']);
    (new DashboardController())->teamTasks($user->id);
}

elseif ($uri === "/dashboard/my-tasks") {
    authorize($user,['expert']);
    (new DashboardController())->myTasks($user->id);
}

elseif ($uri === "/dashboard/experts") {
    authorize($user,['admin','manager','coordinator']);
    (new DashboardController())->experts();
}

elseif ($uri === "/dashboard/available-experts") {
    authorize($user,['admin','manager','coordinator']);
    (new DashboardController())->availableExperts();
}

elseif ($uri === "/dashboard/assign-task") {
    authorize($user,['admin','manager','coordinator']);
    $actorUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    (new DashboardController())->assignTask($actorUserId);
}


elseif ($uri === "/expert/dashboard-analytics" && $method === "GET") {
    authorize($user,['expert','technical expert','expertlead','technical lead']);
    (new ExpertDashboardAnalyticsController())->index($user);
}

elseif ($uri === "/expert/recalculate-task-duration" && $method === "POST") {
    authorize($user,['expert','technical expert','expertlead','technical lead']);
    (new ExpertDashboardAnalyticsController())->recalculateDurations($user);
}

// ===================================================
// 📋 TASKS
// ===================================================

elseif ($uri === "/tasks/list") {
    authorize($user,['admin','manager','coordinator','expert','expertlead']);
    (new TaskController())->list();
}
elseif ($uri === "/tasks/comments" && $method === "GET") {
    authorize($user,['admin','manager','coordinator','expert','expertlead','technical expert','technical lead']);
    (new TaskController())->comments();
}
elseif ($uri === "/tasks/check-updates" && $method === "GET") {
    authorize($user,['admin','manager','coordinator','expert','expertlead','technical expert','technical lead']);
    $actorUserId = null;
    $role = is_array($user) ? ($user['role'] ?? null) : ($user->role ?? null);
    if (in_array($role, ['expert', 'expertlead', 'technical expert', 'technical lead'], true)) {
        $actorUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    }
    (new TaskController())->checkUpdates($actorUserId);
}

elseif ($uri === "/reports/expert-tasks" && $method === "GET") {
    authorize($user,['expert','technical expert','expertlead','technical lead']);
    (new ExpertReportsController())->index($user);
}
elseif ($uri === "/tasks/load-task-for-feedback" && $method === "POST") {
    authorize($user,['admin','manager','coordinator','expert','technical expert','expertlead','technical lead']);
    (new TaskController())->LoadTaskForFeedback();
}
elseif ($uri === "/expert/tasks" && $method === "GET") {
    authorize($user,['expert','technical expert','expertlead','technical lead']);
    $expertUserId = null;
    if (is_array($user) && isset($user['id'])) {
        $expertUserId = $user['id'];
    } elseif (is_object($user) && isset($user->id)) {
        $expertUserId = $user->id;
    }

    (new TaskController())->expertTasks($expertUserId);
}
elseif ($uri === "/expert/tasks/active-check" && $method === "GET") {
    authorize($user,['expert','technical expert','expertlead','technical lead']);
    $expertUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    (new TaskController())->checkActiveTask($expertUserId);
}
elseif (($uri === "/expert/tasks/start" || $uri === "/expert/start-task") && $method === "POST") {
    authorize($user,['expert','technical expert','expertlead','technical lead']);
    $expertUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    (new TaskController())->startTask($expertUserId);
}
elseif ($uri === "/expert/tasks/end" && $method === "POST") {
    authorize($user,['expert','technical expert','expertlead','technical lead']);
    $expertUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    (new TaskController())->endTask($expertUserId);
}
elseif ($uri === "/feedback" && $method === "POST") {
    authorize($user,['admin','manager','coordinator','expert','technical expert','expertlead','technical lead']);
    $actorUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    (new FeedbackController())->create($actorUserId);
}
elseif ($uri === "/feedback" && $method === "GET") {
    authorize($user,['admin','manager','coordinator','expert','technical expert','expertlead','technical lead']);
    $actorUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    $actorRole = is_array($user) ? (string)($user['role'] ?? '') : (string)($user->role ?? '');
    (new FeedbackController())->listAll($actorUserId, $actorRole);
}
elseif (preg_match('#^/feedback/(\d+)$#', $uri, $matches) === 1 && $method === "GET") {
    authorize($user,['admin','manager','coordinator','expert','technical expert','expertlead','technical lead']);
    (new FeedbackController())->viewByTaskId((int)$matches[1]);
}
elseif ($uri === "/expert/send-daily-report" && $method === "POST") {
    authorize($user,['expert','technical expert','expertlead','technical lead']);
    $expertUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    (new TaskController())->sendDailyReport($expertUserId);
}
elseif ($uri === "/tasks/create" && $method === "POST") {
    authorize($user,['admin','manager','coordinator','expert','expertlead','technical expert']);
    $actorUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    $actorRole = is_array($user) ? (string)($user['role'] ?? '') : (string)($user->role ?? '');
    (new TaskController())->create($actorUserId, $actorRole);
}
elseif ($uri === "/tasks/update" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    $actorUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    (new TaskController())->update($actorUserId);
}
elseif ($uri === "/tasks/assign" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    $actorUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    (new TaskController())->assign($actorUserId);
}
elseif ($uri === "/tasks/upload" && $method === "POST") {
    authorize($user,['admin','manager','coordinator','expert']);
    $actorUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    (new TaskController())->uploadFile($actorUserId);
}
elseif ($uri === "/tasks/file" && $method === "GET") {
    (new TaskController())->downloadFile();
}
elseif ($uri === "/tasks/last-update" && $method === "GET") {
    authorize($user,['admin','manager','coordinator','expert','expertlead','technical expert']);
    (new TaskController())->lastUpdate();
}
elseif ($uri === "/tasks/bulk-status" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new TaskController())->bulkUpdateStatus();
}
elseif ($uri === "/tasks/bulk-assign" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    $actorUserId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
    (new TaskController())->bulkAssign($actorUserId);
}
elseif ($uri === "/tasks/bulk-price" && $method === "GET") {
    authorize($user,['admin','manager']);
    (new TaskController())->bulkPriceList();
}
elseif ($uri === "/reports/tasks" && $method === "GET") {
    authorize($user,['admin','manager','coordinator','expert','expertlead','technical expert']);
    (new TaskController())->reportTasks($user);
}
elseif ($uri === "/reports/task-assignments" && $method === "GET") {
    authorize($user,['admin','manager','coordinator','expert','expertlead','technical expert']);
    (new TaskController())->reportTaskAssignments();
}

elseif ($uri === "/reports/candidate-performance" && $method === "GET") {
    authorize($user,['admin','manager']);
    (new CandidatePerformanceReportController())->list();
}
elseif ($uri === "/reports/candidate-performance-details" && $method === "GET") {
    authorize($user,['admin','manager']);
    (new CandidatePerformanceReportController())->details();
}
elseif ($uri === "/reports/candidate-performance-feedback" && $method === "GET") {
    authorize($user,['admin','manager']);
    (new CandidatePerformanceReportController())->feedback();
}
elseif ($uri === "/reports/recalculate-task-duration" && $method === "POST") {
    authorize($user,['admin']);
    (new ManagerReportsController())->recalculateTaskDuration();
}
elseif ($uri === "/manager/reports/feedback-pending" && $method === "GET") {
    authorize($user,['admin','manager']);
    (new ManagerReportsController())->feedbackPending();
}
elseif ($uri === "/manager/reports/tech-vs-tasks" && $method === "GET") {
    authorize($user,['admin','manager']);
    (new ManagerReportsController())->techVsTasks();
}
elseif ($uri === "/manager/reports/tech-vs-task-details" && ($method === "GET" || $method === "POST")) {
    authorize($user,['admin','manager']);
    (new ManagerReportsController())->techVsTaskDetails();
}
elseif ($uri === "/manager/reports/tasks-summary" && $method === "GET") {
    authorize($user,['admin','manager']);
    (new ManagerReportsController())->tasksSummary();
}
elseif ($uri === "/manager/reports/feedback-report" && $method === "GET") {
    authorize($user,['admin','manager']);
    (new ManagerReportsController())->feedbackReport();
}
elseif ($uri === "/manager/reports/expert-availability-matrix" && $method === "GET") {
    authorize($user,['admin','manager','coordinator']);
    (new ManagerReportsController())->expertAvailabilityMatrix();
}
elseif (preg_match('#^/manager/reports/task-details/(\d+)$#', $uri, $matches) && $method === "GET") {
    authorize($user,['admin','manager']);
    (new ManagerReportsController())->taskDetails((int)$matches[1]);
}
elseif ($uri === "/tasks/update-prices" && $method === "POST") {
    authorize($user,['admin','manager']);
    (new TaskController())->updatePrices();
}
elseif ($uri === "/tasks/bulk-price/update" && $method === "POST") {
    authorize($user,['admin','manager']);
    (new TaskController())->updatePrices();
}
elseif ($uri === "/tasks/cancel" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new TaskController())->cancelTask();
}
elseif ($uri === "/test-email" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    $data = json_decode(file_get_contents("php://input"));
    $to = is_object($data) && isset($data->to) ? (string)$data->to : 'support@bsquareg-developers.com';
    $sent = EmailService::sendTestEmail($to);
    echo json_encode([
        "success" => $sent,
        "message" => $sent ? "Test email sent" : "Failed to send test email",
    ]);
}


// ===================================================
// ❌ DEFAULT
// ===================================================


elseif ($uri === "/tasks/completed" && $method === "GET") {
    authorize($user,['admin','manager']);
    (new InvoiceController())->completedTasks();
}
elseif ($uri === "/invoices" && $method === "POST") {
    authorize($user,['admin','manager']);
    (new InvoiceController())->createInvoice();
}
elseif ($uri === "/invoices" && $method === "GET") {
    authorize($user,['admin','manager']);
    (new InvoiceController())->listInvoices();
}
elseif ($uri === "/invoices/stats" && $method === "GET") {
    authorize($user,['admin','manager']);
    (new InvoiceController())->stats();
}
elseif ($uri === "/invoices/next-number" && $method === "GET") {
    authorize($user,['admin','manager']);
    (new InvoiceController())->nextInvoiceNumber();
}
elseif (preg_match('#^/invoices/(\d+)/update-status$#', $uri, $matches) && $method === "PUT") {
    authorize($user,['admin','manager']);
    (new InvoiceController())->updateStatus((int)$matches[1]);
}
elseif (preg_match('#^/invoices/(\d+)/recalculate$#', $uri, $matches) && $method === "POST") {
    authorize($user,['admin','manager']);
    (new InvoiceController())->recalculate((int)$matches[1]);
}
elseif (preg_match('#^/invoices/(\d+)$#', $uri, $matches) && $method === "GET") {
    authorize($user,['admin','manager']);
    (new InvoiceController())->getInvoiceById((int)$matches[1]);
}
else {
    http_response_code(404);
    echo json_encode([
        "error" => "Route not found",
        "uri" => $uri
    ]);
}
