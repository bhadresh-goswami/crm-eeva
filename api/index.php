<?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

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

require_once "controllers/UserController.php";
require_once "controllers/RoleController.php";

require_once "controllers/TaskTypeController.php";
require_once "controllers/TaskStatusController.php";
require_once "controllers/PaymentStatusController.php";

// ---------------- ROUTE PARSER ----------------
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// BASE PATH
$basePath = "/api";
$uri = str_replace($basePath, "", $uri);

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
    (new DashboardController())->assignTask();
}


// ===================================================
// 📋 TASKS
// ===================================================

elseif ($uri === "/tasks/list") {
    authorize($user,['admin','manager','coordinator','expert','expertlead']);
    (new TaskController())->list();
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
elseif ($uri === "/expert/tasks/status" && $method === "POST") {
    authorize($user,['expert','technical expert','expertlead','technical lead']);
    $expertUserId = null;
    if (is_array($user) && isset($user['id'])) {
        $expertUserId = $user['id'];
    } elseif (is_object($user) && isset($user->id)) {
        $expertUserId = $user->id;
    }

    (new TaskController())->updateExpertTaskStatus($expertUserId);
}
elseif ($uri === "/tasks/create" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new TaskController())->create();
}
elseif ($uri === "/tasks/update" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new TaskController())->update($user->id);
}
elseif ($uri === "/tasks/assign" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new TaskController())->assign();
}
elseif ($uri === "/tasks/upload" && $method === "POST") {
    authorize($user,['admin','manager','coordinator','expert']);
    (new TaskController())->uploadFile($user->id);
}
elseif ($uri === "/tasks/file" && $method === "GET") {
    (new TaskController())->downloadFile();
}
elseif ($uri === "/tasks/bulk-status" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new TaskController())->bulkUpdateStatus();
}
elseif ($uri === "/tasks/bulk-assign" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new TaskController())->bulkAssign();
}
elseif ($uri === "/tasks/cancel" && $method === "POST") {
    authorize($user,['admin','manager','coordinator']);
    (new TaskController())->cancelTask();
}


// ===================================================
// ❌ DEFAULT
// ===================================================

else {
    http_response_code(404);
    echo json_encode([
        "error" => "Route not found",
        "uri" => $uri
    ]);
}
