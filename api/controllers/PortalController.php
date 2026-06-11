<?php

require_once dirname(__DIR__) . "/config/database.php";
require_once dirname(__DIR__) . "/services/LoggerService.php";

class PortalController {
    private function getUserId($user): int {
        if (is_array($user)) {
            return (int)($user['id'] ?? 0);
        }
        if (is_object($user)) {
            return (int)($user->id ?? 0);
        }
        return 0;
    }

    private function getTableColumns(PDO $conn, string $table): array {
        try {
            $stmt = $conn->query("SHOW COLUMNS FROM {$table}");
            return array_map(fn($row) => $row['Field'], $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Throwable $e) {
            return [];
        }
    }

    private function tableExists(PDO $conn, string $table): bool {
        try {
            $stmt = $conn->prepare("SHOW TABLES LIKE ?");
            $stmt->execute([$table]);
            return (bool)$stmt->fetchColumn();
        } catch (Throwable $e) {
            return false;
        }
    }

    private function currentUser(PDO $conn, int $userId): ?array {
        $stmt = $conn->prepare("SELECT id, name, email FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function getPortalClientIds(PDO $conn, int $userId): array {
        $user = $this->currentUser($conn, $userId);
        if (!$user) return [];

        $email = strtolower(trim((string)($user['email'] ?? '')));
        $clientIds = [];

        if ($this->tableExists($conn, 'client_users')) {
            $columns = $this->getTableColumns($conn, 'client_users');
            if (in_array('user_id', $columns, true) && in_array('client_id', $columns, true)) {
                $stmt = $conn->prepare("SELECT DISTINCT client_id FROM client_users WHERE user_id = ?");
                $stmt->execute([$userId]);
                $clientIds = array_merge($clientIds, $stmt->fetchAll(PDO::FETCH_COLUMN));
            }
        }

        $clientColumns = $this->getTableColumns($conn, 'clients');
        if (in_array('user_id', $clientColumns, true)) {
            $stmt = $conn->prepare("SELECT DISTINCT id FROM clients WHERE user_id = ?");
            $stmt->execute([$userId]);
            $clientIds = array_merge($clientIds, $stmt->fetchAll(PDO::FETCH_COLUMN));
        }
        if ($email !== '' && in_array('email', $clientColumns, true)) {
            $stmt = $conn->prepare("SELECT DISTINCT id FROM clients WHERE LOWER(email) = ?");
            $stmt->execute([$email]);
            $clientIds = array_merge($clientIds, $stmt->fetchAll(PDO::FETCH_COLUMN));
        }

        $pocColumns = $this->getTableColumns($conn, 'client_pocs');
        if (in_array('user_id', $pocColumns, true)) {
            $stmt = $conn->prepare("SELECT DISTINCT client_id FROM client_pocs WHERE user_id = ?");
            $stmt->execute([$userId]);
            $clientIds = array_merge($clientIds, $stmt->fetchAll(PDO::FETCH_COLUMN));
        }
        if ($email !== '' && in_array('email', $pocColumns, true)) {
            $stmt = $conn->prepare("SELECT DISTINCT client_id FROM client_pocs WHERE LOWER(email) = ?");
            $stmt->execute([$email]);
            $clientIds = array_merge($clientIds, $stmt->fetchAll(PDO::FETCH_COLUMN));
        }

        return array_values(array_unique(array_filter(array_map('intval', $clientIds), fn($id) => $id > 0)));
    }

    private function clientScopeSql(array $clientIds, array &$params, string $alias = 't'): string {
        if (count($clientIds) === 0) {
            return ' AND 1 = 0';
        }
        $placeholders = [];
        foreach ($clientIds as $idx => $clientId) {
            $key = ":portal_client_{$idx}";
            $placeholders[] = $key;
            $params[$key] = $clientId;
        }
        return " AND {$alias}.client_id IN (" . implode(',', $placeholders) . ")";
    }

    public function summary($user) {
        try {
            $db = new Database();
            $conn = $db->connect();
            $clientIds = $this->getPortalClientIds($conn, $this->getUserId($user));

            $params = [];
            $scope = $this->clientScopeSql($clientIds, $params);

            $stmt = $conn->prepare("
                SELECT
                    COUNT(*) AS total_tasks,
                    SUM(CASE WHEN LOWER(COALESCE(ts.name, '')) LIKE '%complete%' THEN 1 ELSE 0 END) AS completed_tasks,
                    SUM(CASE WHEN LOWER(COALESCE(ts.name, '')) NOT LIKE '%complete%' THEN 1 ELSE 0 END) AS open_tasks,
                    COALESCE(SUM(t.total_amount), 0) AS total_amount
                FROM tasks t
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                WHERE 1=1 {$scope}
            ");
            $stmt->execute($params);
            $summary = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

            $clientParams = [];
            $clientScope = $this->clientScopeSql($clientIds, $clientParams, 't');
            $recentStmt = $conn->prepare("
                SELECT t.id, t.title, t.due_date, t.created_at, ts.name AS status_name, tt.name AS task_type, c.name AS client_name, cd.name AS candidate_name
                FROM tasks t
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                LEFT JOIN task_types tt ON tt.id = t.task_type_id
                LEFT JOIN clients c ON c.id = t.client_id
                LEFT JOIN candidates cd ON cd.id = t.candidate_id
                WHERE 1=1 {$clientScope}
                ORDER BY COALESCE(t.due_date, DATE(t.created_at)) DESC, t.id DESC
                LIMIT 5
            ");
            $recentStmt->execute($clientParams);

            echo json_encode(['success' => true, 'data' => [
                'summary' => [
                    'total_tasks' => (int)($summary['total_tasks'] ?? 0),
                    'completed_tasks' => (int)($summary['completed_tasks'] ?? 0),
                    'open_tasks' => (int)($summary['open_tasks'] ?? 0),
                    'total_amount' => (float)($summary['total_amount'] ?? 0),
                ],
                'recent_tasks' => $recentStmt->fetchAll(PDO::FETCH_ASSOC),
            ]]);
        } catch (Throwable $e) {
            LoggerService::logError('Portal summary failed', ['error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Unable to load portal summary.']);
        }
    }

    public function filterOptions($user) {
        try {
            $db = new Database();
            $conn = $db->connect();
            $clientIds = $this->getPortalClientIds($conn, $this->getUserId($user));
            $params = [];
            $scope = $this->clientScopeSql($clientIds, $params);

            $stmt = $conn->prepare("
                SELECT DISTINCT COALESCE(ts.name, '') AS status_name, COALESCE(tt.name, '') AS task_type
                FROM tasks t
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                LEFT JOIN task_types tt ON tt.id = t.task_type_id
                WHERE 1=1 {$scope}
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $statuses = [];
            $types = [];
            foreach ($rows as $row) {
                if (trim((string)$row['status_name']) !== '') $statuses[] = $row['status_name'];
                if (trim((string)$row['task_type']) !== '') $types[] = $row['task_type'];
            }

            echo json_encode(['success' => true, 'data' => [
                'statuses' => array_values(array_unique($statuses)),
                'task_types' => array_values(array_unique($types)),
            ]]);
        } catch (Throwable $e) {
            LoggerService::logError('Portal filters failed', ['error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Unable to load portal filters.']);
        }
    }

    public function tasks($user) {
        try {
            $db = new Database();
            $conn = $db->connect();
            $clientIds = $this->getPortalClientIds($conn, $this->getUserId($user));

            $page = max(1, (int)($_GET['page'] ?? 1));
            $perPage = min(100, max(10, (int)($_GET['per_page'] ?? 20)));
            $offset = ($page - 1) * $perPage;
            $params = [];
            $where = ' WHERE 1=1 ' . $this->clientScopeSql($clientIds, $params);

            $search = trim((string)($_GET['search'] ?? ''));
            if ($search !== '') {
                $where .= " AND (t.title LIKE :search OR cd.name LIKE :search OR c.name LIKE :search OR tt.name LIKE :search)";
                $params[':search'] = "%{$search}%";
            }
            if (!empty($_GET['status'])) {
                $where .= " AND ts.name = :status";
                $params[':status'] = $_GET['status'];
            }
            if (!empty($_GET['task_type'])) {
                $where .= " AND tt.name = :task_type";
                $params[':task_type'] = $_GET['task_type'];
            }
            if (!empty($_GET['date_from'])) {
                $where .= " AND DATE(COALESCE(t.due_date, t.created_at)) >= :date_from";
                $params[':date_from'] = $_GET['date_from'];
            }
            if (!empty($_GET['date_to'])) {
                $where .= " AND DATE(COALESCE(t.due_date, t.created_at)) <= :date_to";
                $params[':date_to'] = $_GET['date_to'];
            }

            $countStmt = $conn->prepare("SELECT COUNT(*) FROM tasks t LEFT JOIN task_status_master ts ON ts.id = t.status_id LEFT JOIN task_types tt ON tt.id = t.task_type_id LEFT JOIN clients c ON c.id = t.client_id LEFT JOIN candidates cd ON cd.id = t.candidate_id {$where}");
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            $stmt = $conn->prepare("
                SELECT t.id, t.title, t.description, t.due_date, t.start_time, t.end_time, t.created_at, t.total_amount,
                       ts.name AS status_name, tt.name AS task_type, c.name AS client_name, c.company_name, cd.name AS candidate_name, cp.name AS poc_name
                FROM tasks t
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                LEFT JOIN task_types tt ON tt.id = t.task_type_id
                LEFT JOIN clients c ON c.id = t.client_id
                LEFT JOIN candidates cd ON cd.id = t.candidate_id
                LEFT JOIN client_pocs cp ON cp.id = t.poc_id
                {$where}
                ORDER BY COALESCE(t.due_date, DATE(t.created_at)) DESC, t.id DESC
                LIMIT :limit OFFSET :offset
            ");
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => (int)ceil($total / $perPage),
            ]]);
        } catch (Throwable $e) {
            LoggerService::logError('Portal tasks failed', ['error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Unable to load portal tasks.']);
        }
    }

    public function detail($user) {
        try {
            $taskId = (int)($_GET['id'] ?? 0);
            if ($taskId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Task id is required.']);
                return;
            }

            $db = new Database();
            $conn = $db->connect();
            $clientIds = $this->getPortalClientIds($conn, $this->getUserId($user));
            $params = [':id' => $taskId];
            $scope = $this->clientScopeSql($clientIds, $params);

            $stmt = $conn->prepare("
                SELECT t.*, ts.name AS status_name, tt.name AS task_type, c.name AS client_name, c.company_name, cd.name AS candidate_name, cp.name AS poc_name, cp.email AS poc_email
                FROM tasks t
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                LEFT JOIN task_types tt ON tt.id = t.task_type_id
                LEFT JOIN clients c ON c.id = t.client_id
                LEFT JOIN candidates cd ON cd.id = t.candidate_id
                LEFT JOIN client_pocs cp ON cp.id = t.poc_id
                WHERE t.id = :id {$scope}
                LIMIT 1
            ");
            $stmt->execute($params);
            $task = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$task) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Task not found.']);
                return;
            }

            $commentsStmt = $conn->prepare("SELECT tc.id, tc.comment, tc.created_at, u.name AS user_name FROM task_comments tc LEFT JOIN users u ON u.id = tc.user_id WHERE tc.task_id = ? ORDER BY tc.created_at ASC, tc.id ASC");
            $commentsStmt->execute([$taskId]);

            $files = [];
            if ($this->tableExists($conn, 'task_files')) {
                $fileColumns = $this->getTableColumns($conn, 'task_files');
                if (in_array('file_url', $fileColumns, true)) {
                    $filesStmt = $conn->prepare("SELECT id, file_url, uploaded_by, created_at FROM task_files WHERE task_id = ? ORDER BY id DESC");
                    $filesStmt->execute([$taskId]);
                    $files = $filesStmt->fetchAll(PDO::FETCH_ASSOC);
                }
            }

            echo json_encode(['success' => true, 'data' => ['task' => $task, 'comments' => $commentsStmt->fetchAll(PDO::FETCH_ASSOC), 'files' => $files]]);
        } catch (Throwable $e) {
            LoggerService::logError('Portal detail failed', ['error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Unable to load task details.']);
        }
    }

    public function addComment($user) {
        try {
            $payload = json_decode(file_get_contents('php://input'), true) ?: [];
            $taskId = (int)($payload['task_id'] ?? 0);
            $comment = trim((string)($payload['comment'] ?? ''));
            if ($taskId <= 0 || $comment === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Task and comment are required.']);
                return;
            }

            $db = new Database();
            $conn = $db->connect();
            $userId = $this->getUserId($user);
            $clientIds = $this->getPortalClientIds($conn, $userId);
            $params = [':id' => $taskId];
            $scope = $this->clientScopeSql($clientIds, $params);
            $scopeStmt = $conn->prepare("SELECT id FROM tasks t WHERE t.id = :id {$scope} LIMIT 1");
            $scopeStmt->execute($params);
            if (!$scopeStmt->fetchColumn()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Task not found.']);
                return;
            }

            $stmt = $conn->prepare("INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)");
            $stmt->execute([$taskId, $userId, $comment]);
            echo json_encode(['success' => true, 'message' => 'Comment added successfully.']);
        } catch (Throwable $e) {
            LoggerService::logError('Portal comment failed', ['error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Unable to add comment.']);
        }
    }
}
