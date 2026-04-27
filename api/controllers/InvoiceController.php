<?php

require_once dirname(__DIR__) . '/config/database.php';

class InvoiceController {
    private function getConnection(): PDO {
        $db = new Database();
        $conn = $db->connect();
        $this->ensureSchema($conn);
        return $conn;
    }

    private function hasColumn(PDO $conn, string $table, string $column): bool {
        $stmt = $conn->prepare("SHOW COLUMNS FROM {$table} LIKE ?");
        $stmt->execute([$column]);
        return (bool)$stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function ensureSchema(PDO $conn): void {
        $conn->exec("CREATE TABLE IF NOT EXISTS invoices (
            id INT(11) NOT NULL AUTO_INCREMENT,
            invoice_number VARCHAR(50) NULL,
            client_id INT(11) NOT NULL,
            from_date DATE NULL,
            to_date DATE NULL,
            currency VARCHAR(10) NULL DEFAULT 'INR',
            subtotal DECIMAL(10,2) NULL,
            tds_amount DECIMAL(10,2) NULL,
            total_amount DECIMAL(10,2) NULL,
            status ENUM('pending','partial','paid') NULL DEFAULT 'pending',
            created_by INT(11) NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_invoice_number (invoice_number),
            KEY idx_invoice_client (client_id),
            KEY idx_invoice_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $invoiceColumns = [
            'invoice_number' => "ALTER TABLE invoices ADD COLUMN invoice_number VARCHAR(50) NULL",
            'client_id' => "ALTER TABLE invoices ADD COLUMN client_id INT(11) NOT NULL",
            'from_date' => "ALTER TABLE invoices ADD COLUMN from_date DATE NULL",
            'to_date' => "ALTER TABLE invoices ADD COLUMN to_date DATE NULL",
            'currency' => "ALTER TABLE invoices ADD COLUMN currency VARCHAR(10) NULL DEFAULT 'INR'",
            'subtotal' => "ALTER TABLE invoices ADD COLUMN subtotal DECIMAL(10,2) NULL",
            'tds_amount' => "ALTER TABLE invoices ADD COLUMN tds_amount DECIMAL(10,2) NULL",
            'total_amount' => "ALTER TABLE invoices ADD COLUMN total_amount DECIMAL(10,2) NULL",
            'status' => "ALTER TABLE invoices ADD COLUMN status ENUM('pending','partial','paid') NULL DEFAULT 'pending'",
            'created_by' => "ALTER TABLE invoices ADD COLUMN created_by INT(11) NULL",
            'created_at' => "ALTER TABLE invoices ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP",
            'updated_at' => "ALTER TABLE invoices ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        ];
        foreach ($invoiceColumns as $column => $sql) {
            if (!$this->hasColumn($conn, 'invoices', $column)) {
                $conn->exec($sql);
            }
        }

        $conn->exec("CREATE TABLE IF NOT EXISTS invoice_items (
            id INT(11) NOT NULL AUTO_INCREMENT,
            invoice_id INT(11) NULL,
            task_id INT(11) NULL,
            support_type VARCHAR(100) NULL,
            amount DECIMAL(10,2) NULL,
            status ENUM('not_paid','paid','settled') NULL DEFAULT 'not_paid',
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_invoice_items_invoice (invoice_id),
            KEY idx_invoice_items_task (task_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $invoiceItemColumns = [
            'invoice_id' => "ALTER TABLE invoice_items ADD COLUMN invoice_id INT(11) NULL",
            'task_id' => "ALTER TABLE invoice_items ADD COLUMN task_id INT(11) NULL",
            'support_type' => "ALTER TABLE invoice_items ADD COLUMN support_type VARCHAR(100) NULL",
            'amount' => "ALTER TABLE invoice_items ADD COLUMN amount DECIMAL(10,2) NULL",
            'status' => "ALTER TABLE invoice_items ADD COLUMN status ENUM('not_paid','paid','settled') NULL DEFAULT 'not_paid'",
            'created_at' => "ALTER TABLE invoice_items ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP",
        ];
        foreach ($invoiceItemColumns as $column => $sql) {
            if (!$this->hasColumn($conn, 'invoice_items', $column)) {
                $conn->exec($sql);
            }
        }

        $taskInvoiceColumn = $conn->query("SHOW COLUMNS FROM tasks LIKE 'invoice_id'")->fetchAll(PDO::FETCH_ASSOC);
        if (!$taskInvoiceColumn) {
            $conn->exec('ALTER TABLE tasks ADD COLUMN invoice_id INT NULL');
        }

        $taskBillingColumn = $conn->query("SHOW COLUMNS FROM tasks LIKE 'billing_status'")->fetchAll(PDO::FETCH_ASSOC);
        if (!$taskBillingColumn) {
            $conn->exec("ALTER TABLE tasks ADD COLUMN billing_status VARCHAR(30) NOT NULL DEFAULT 'not_invoiced'");
        }
    }

    private function input(): array {
        $raw = json_decode(file_get_contents('php://input'), true);
        return is_array($raw) ? $raw : [];
    }

    private function paymentStatusId(PDO $conn, string $name): ?int {
        $stmt = $conn->prepare('SELECT id FROM payment_status_master WHERE LOWER(name) = LOWER(?) LIMIT 1');
        $stmt->execute([$name]);
        $id = $stmt->fetchColumn();
        return $id ? (int)$id : null;
    }

    public function nextInvoiceNumber(): void {
        try {
            $conn = $this->getConnection();
            $last = (string)$conn->query("SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1")->fetchColumn();
            $lastNumber = 0;
            if (preg_match('/INV-(\d+)/', $last, $matches)) {
                $lastNumber = (int)$matches[1];
            }
            $next = $lastNumber + 1;
            $invoiceNumber = 'INV-' . str_pad((string)$next, 9, '0', STR_PAD_LEFT);
            echo json_encode(['success' => true, 'data' => ['invoice_number' => $invoiceNumber, 'next_number' => $next]]);
        } catch (Throwable $error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $error->getMessage()]);
        }
    }

    public function completedTasks(): void {
        try {
            $conn = $this->getConnection();
            $clientId = $_GET['client_id'] ?? null;
            $fromDate = $_GET['from_date'] ?? null;
            $toDate = $_GET['to_date'] ?? null;
            $hasStatusColumn = $this->hasColumn($conn, 'tasks', 'status');
            $hasClientEmailColumn = $this->hasColumn($conn, 'clients', 'email');
            $hasClientMobileColumn = $this->hasColumn($conn, 'clients', 'mobile');

            $clientPhoneSelect = $hasClientMobileColumn ? 'c.mobile AS client_phone' : "'' AS client_phone";
            $clientEmailSelect = $hasClientEmailColumn ? 'c.email AS client_email' : "'' AS client_email";

            $query = "
                SELECT
                    t.id AS task_id,
                    t.id,
                    t.client_id,
                    c.name AS client_name,
                    c.company_name,
                    {$clientPhoneSelect},
                    {$clientEmailSelect},
                    COALESCE(tt.name, 'Support') AS support_type,
                    t.total_amount AS amount,
                    t.due_date
                FROM tasks t
                LEFT JOIN task_types tt ON tt.id = t.task_type_id
                LEFT JOIN clients c ON c.id = t.client_id
            ";

            if ($hasStatusColumn) {
                $query .= " WHERE LOWER(COALESCE(t.status, '')) = 'completed' ";
            } else {
                $query .= " INNER JOIN task_status_master tsm ON tsm.id = t.status_id WHERE LOWER(COALESCE(tsm.name, '')) = 'completed' ";
            }

            $query .= "
                AND t.invoice_id IS NULL
                AND NOT EXISTS (
                    SELECT 1 FROM invoice_items ii
                    INNER JOIN invoices i ON i.id = ii.invoice_id
                    WHERE ii.task_id = t.id
                      AND LOWER(i.status) IN ('pending', 'partial', 'paid')
                )
            ";

            $params = [];
            if (!empty($clientId)) {
                $query .= ' AND t.client_id = ?';
                $params[] = $clientId;
            }
            if (!empty($fromDate)) {
                $query .= ' AND t.due_date >= ?';
                $params[] = $fromDate;
            }
            if (!empty($toDate)) {
                $query .= ' AND t.due_date <= ?';
                $params[] = $toDate;
            }

            $query .= ' ORDER BY t.due_date ASC, t.id ASC';
            $stmt = $conn->prepare($query);
            $stmt->execute($params);

            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Throwable $error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $error->getMessage()]);
        }
    }

    public function createInvoice(): void {
        $payload = $this->input();

        if (empty($payload['client_id']) || empty($payload['from_date']) || empty($payload['to_date']) || empty($payload['items']) || !is_array($payload['items'])) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'client_id, from_date, to_date and items are required.']);
            return;
        }

        try {
            $conn = $this->getConnection();
            $conn->beginTransaction();

            $taskIds = array_values(array_unique(array_map(static fn($item) => (int)($item['task_id'] ?? 0), $payload['items'])));
            $taskIds = array_values(array_filter($taskIds, static fn($id) => $id > 0));
            if (!$taskIds) {
                throw new Exception('No valid tasks to invoice.');
            }

            $placeholders = implode(',', array_fill(0, count($taskIds), '?'));
            $dupTaskStmt = $conn->prepare("SELECT id FROM tasks WHERE id IN ($placeholders) AND invoice_id IS NOT NULL LIMIT 1");
            $dupTaskStmt->execute($taskIds);
            if ($dupTaskStmt->fetch(PDO::FETCH_ASSOC)) {
                throw new Exception('Some tasks are already invoiced. Please reload tasks.');
            }

            $dupItemStmt = $conn->prepare("SELECT task_id FROM invoice_items WHERE task_id IN ($placeholders) LIMIT 1");
            $dupItemStmt->execute($taskIds);
            if ($dupItemStmt->fetch(PDO::FETCH_ASSOC)) {
                throw new Exception('Some tasks are already linked in invoice items. Please reload tasks.');
            }

            $invoiceNumber = trim((string)($payload['invoice_number'] ?? ''));
            if ($invoiceNumber === '') {
                $last = (string)$conn->query("SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1")->fetchColumn();
                $lastNumber = 0;
                if (preg_match('/INV-(\d+)/', $last, $matches)) {
                    $lastNumber = (int)$matches[1];
                }
                $invoiceNumber = 'INV-' . str_pad((string)($lastNumber + 1), 9, '0', STR_PAD_LEFT);
            }

            $invoiceStmt = $conn->prepare('INSERT INTO invoices (invoice_number, client_id, from_date, to_date, currency, subtotal, tds_amount, total_amount, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $invoiceStmt->execute([
                $invoiceNumber,
                (int)$payload['client_id'],
                $payload['from_date'],
                $payload['to_date'],
                $payload['currency'] ?? 'INR',
                (float)($payload['subtotal'] ?? 0),
                (float)($payload['tds_amount'] ?? $payload['tds'] ?? 0),
                (float)($payload['total_amount'] ?? $payload['total'] ?? 0),
                'pending',
                isset($payload['created_by']) ? (int)$payload['created_by'] : null,
            ]);

            $invoiceId = (int)$conn->lastInsertId();
            $itemStmt = $conn->prepare("INSERT INTO invoice_items (invoice_id, task_id, support_type, amount, status) VALUES (?, ?, ?, ?, 'not_paid')");
            $taskUpdateStmt = $conn->prepare("UPDATE tasks SET billing_status = 'invoiced', invoice_id = ? WHERE id = ?");

            foreach ($payload['items'] as $item) {
                $taskId = (int)($item['task_id'] ?? 0);
                if ($taskId <= 0) continue;

                $itemStmt->execute([
                    $invoiceId,
                    $taskId,
                    $item['support_type'] ?? 'Support',
                    (float)($item['amount'] ?? 0),
                ]);

                $taskUpdateStmt->execute([$invoiceId, $taskId]);
            }

            $conn->commit();
            echo json_encode(['success' => true, 'message' => 'Invoice created successfully.', 'data' => ['invoice_id' => $invoiceId, 'invoice_number' => $invoiceNumber]]);
        } catch (Throwable $error) {
            if (isset($conn) && $conn->inTransaction()) {
                $conn->rollBack();
            }
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $error->getMessage()]);
        }
    }

    public function listInvoices(): void {
        try {
            $conn = $this->getConnection();
            $query = "
                SELECT i.*, c.name AS client_name, c.company_name,
                    (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) AS item_count
                FROM invoices i
                LEFT JOIN clients c ON c.id = i.client_id
                WHERE 1=1
            ";
            $params = [];

            if (!empty($_GET['client_id'])) { $query .= ' AND i.client_id = ?'; $params[] = $_GET['client_id']; }
            if (!empty($_GET['status'])) { $query .= ' AND LOWER(i.status) = LOWER(?)'; $params[] = $_GET['status']; }
            if (!empty($_GET['invoice_number'])) { $query .= ' AND i.invoice_number LIKE ?'; $params[] = '%' . $_GET['invoice_number'] . '%'; }
            if (!empty($_GET['from_date'])) { $query .= ' AND i.from_date >= ?'; $params[] = $_GET['from_date']; }
            if (!empty($_GET['to_date'])) { $query .= ' AND i.to_date <= ?'; $params[] = $_GET['to_date']; }

            $query .= ' ORDER BY i.id DESC';
            $stmt = $conn->prepare($query);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Throwable $error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $error->getMessage()]);
        }
    }

    public function getInvoiceById(int $id): void {
        try {
            $conn = $this->getConnection();
            $invoiceStmt = $conn->prepare('SELECT i.*, c.name AS client_name, c.company_name FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = ? LIMIT 1');
            $invoiceStmt->execute([$id]);
            $invoice = $invoiceStmt->fetch(PDO::FETCH_ASSOC);

            if (!$invoice) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Invoice not found']);
                return;
            }

            $itemsStmt = $conn->prepare('SELECT ii.*, t.title, t.due_date FROM invoice_items ii LEFT JOIN tasks t ON t.id = ii.task_id WHERE ii.invoice_id = ? ORDER BY ii.id ASC');
            $itemsStmt->execute([$id]);

            echo json_encode(['success' => true, 'data' => ['invoice' => $invoice, 'items' => $itemsStmt->fetchAll(PDO::FETCH_ASSOC)]]);
        } catch (Throwable $error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $error->getMessage()]);
        }
    }

    public function updateStatus(int $id): void {
        $payload = $this->input();
        $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];

        if (!$items) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'items are required']);
            return;
        }

        try {
            $conn = $this->getConnection();
            $conn->beginTransaction();

            $updateItemStmt = $conn->prepare('UPDATE invoice_items SET status = ? WHERE invoice_id = ? AND task_id = ?');
            $pendingPaymentId = $this->paymentStatusId($conn, 'Pending');
            $paidPaymentId = $this->paymentStatusId($conn, 'Paid');
            $updateTaskStmt = $conn->prepare('UPDATE tasks SET payment_status_id = ? WHERE id = ?');

            foreach ($items as $item) {
                $taskId = (int)($item['task_id'] ?? 0);
                $status = strtolower((string)($item['status'] ?? 'not_paid'));
                if ($taskId <= 0) continue;

                $itemStatus = in_array($status, ['paid', 'settled'], true) ? $status : 'not_paid';
                $updateItemStmt->execute([$itemStatus, $id, $taskId]);

                $paymentId = ($itemStatus === 'paid' || $itemStatus === 'settled') ? $paidPaymentId : $pendingPaymentId;
                if ($paymentId) {
                    $updateTaskStmt->execute([$paymentId, $taskId]);
                }
            }

            $statusStmt = $conn->prepare('SELECT status FROM invoice_items WHERE invoice_id = ?');
            $statusStmt->execute([$id]);
            $statuses = array_map('strtolower', $statusStmt->fetchAll(PDO::FETCH_COLUMN));

            $invoiceStatus = 'pending';
            $paidOrSettledCount = count(array_filter($statuses, static fn($status) => in_array($status, ['paid', 'settled'], true)));
            if ($statuses && $paidOrSettledCount === count($statuses)) {
                $invoiceStatus = 'paid';
            } elseif ($paidOrSettledCount > 0) {
                $invoiceStatus = 'partial';
            }

            $conn->prepare('UPDATE invoices SET status = ? WHERE id = ?')->execute([$invoiceStatus, $id]);
            $conn->commit();

            echo json_encode(['success' => true, 'message' => 'Invoice status updated', 'data' => ['status' => $invoiceStatus]]);
        } catch (Throwable $error) {
            if (isset($conn) && $conn->inTransaction()) {
                $conn->rollBack();
            }
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $error->getMessage()]);
        }
    }

    public function stats(): void {
        try {
            $conn = $this->getConnection();
            $totals = $conn->query("SELECT
                COALESCE(SUM(total_amount), 0) AS total_revenue,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) AS paid_amount,
                COALESCE(SUM(CASE WHEN status IN ('pending', 'partial') THEN total_amount ELSE 0 END), 0) AS pending_amount
            FROM invoices")->fetch(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => [
                'total_revenue' => (float)($totals['total_revenue'] ?? 0),
                'paid_amount' => (float)($totals['paid_amount'] ?? 0),
                'pending_amount' => (float)($totals['pending_amount'] ?? 0),
            ]]);
        } catch (Throwable $error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $error->getMessage()]);
        }
    }
}
