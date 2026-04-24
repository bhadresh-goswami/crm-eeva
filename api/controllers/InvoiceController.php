<?php

require_once dirname(__DIR__) . '/config/database.php';

class InvoiceController {
    private function getConnection(): PDO {
        $db = new Database();
        $conn = $db->connect();
        $this->ensureSchema($conn);
        return $conn;
    }

    private function ensureSchema(PDO $conn): void {
        $conn->exec("CREATE TABLE IF NOT EXISTS invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_number VARCHAR(100) NOT NULL UNIQUE,
            client_id INT NOT NULL,
            from_date DATE NOT NULL,
            to_date DATE NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'INR',
            subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
            tds_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            invoice_date DATE NULL,
            payment_due_date DATE NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_invoice_client (client_id),
            INDEX idx_invoice_status (status),
            INDEX idx_invoice_date (invoice_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $conn->exec("CREATE TABLE IF NOT EXISTS invoice_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_id INT NOT NULL,
            task_id INT NOT NULL,
            qty INT NOT NULL DEFAULT 1,
            support_type VARCHAR(255) NOT NULL,
            amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_invoice_task (invoice_id, task_id),
            INDEX idx_invoice_items_status (status),
            CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

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

    public function completedTasks(): void {
        try {
            $conn = $this->getConnection();

            $clientId = $_GET['client_id'] ?? null;
            $fromDate = $_GET['from_date'] ?? null;
            $toDate = $_GET['to_date'] ?? null;

            $query = "
                SELECT
                    t.id,
                    t.client_id,
                    c.name AS client_name,
                    t.task_type_id,
                    COALESCE(tt.name, 'Support') AS support_type,
                    t.total_amount AS amount,
                    t.due_date,
                    t.billing_status,
                    t.invoice_id
                FROM tasks t
                INNER JOIN task_status_master tsm ON tsm.id = t.status_id
                LEFT JOIN task_types tt ON tt.id = t.task_type_id
                LEFT JOIN clients c ON c.id = t.client_id
                WHERE LOWER(tsm.name) = 'completed'
                  AND t.invoice_id IS NULL
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

            echo json_encode([
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            ]);
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

            $subtotal = (float)($payload['subtotal'] ?? 0);
            $tdsAmount = (float)($payload['tds_amount'] ?? 0);
            $totalAmount = (float)($payload['total_amount'] ?? ($subtotal - $tdsAmount));

            $invoiceNumber = trim((string)($payload['invoice_number'] ?? ''));
            if ($invoiceNumber === '') {
                $invoiceNumber = 'INV-' . date('YmdHis');
            }

            $invoiceStmt = $conn->prepare('INSERT INTO invoices (invoice_number, client_id, from_date, to_date, currency, subtotal, tds_amount, total_amount, status, invoice_date, payment_due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $invoiceStmt->execute([
                $invoiceNumber,
                (int)$payload['client_id'],
                $payload['from_date'],
                $payload['to_date'],
                $payload['currency'] ?? 'INR',
                $subtotal,
                $tdsAmount,
                $totalAmount,
                'pending',
                $payload['invoice_date'] ?? null,
                $payload['payment_due_date'] ?? null,
                $payload['notes'] ?? null,
            ]);

            $invoiceId = (int)$conn->lastInsertId();

            $itemStmt = $conn->prepare('INSERT INTO invoice_items (invoice_id, task_id, qty, support_type, amount, status) VALUES (?, ?, ?, ?, ?, ?)');
            $taskUpdateStmt = $conn->prepare("UPDATE tasks SET billing_status = 'invoiced', invoice_id = ? WHERE id = ?");

            foreach ($payload['items'] as $item) {
                $taskId = (int)($item['task_id'] ?? 0);
                if ($taskId <= 0) {
                    continue;
                }

                $itemStmt->execute([
                    $invoiceId,
                    $taskId,
                    (int)($item['qty'] ?? 1),
                    $item['support_type'] ?? 'Support',
                    (float)($item['amount'] ?? 0),
                    strtolower((string)($item['status'] ?? 'pending')),
                ]);

                $taskUpdateStmt->execute([$invoiceId, $taskId]);
            }

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Invoice created successfully.',
                'data' => [
                    'invoice_id' => $invoiceId,
                    'invoice_number' => $invoiceNumber,
                ],
            ]);
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
                SELECT
                    i.*,
                    c.name AS client_name,
                    (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) AS item_count
                FROM invoices i
                LEFT JOIN clients c ON c.id = i.client_id
                WHERE 1 = 1
            ";
            $params = [];

            if (!empty($_GET['client_id'])) {
                $query .= ' AND i.client_id = ?';
                $params[] = $_GET['client_id'];
            }
            if (!empty($_GET['status'])) {
                $query .= ' AND LOWER(i.status) = LOWER(?)';
                $params[] = $_GET['status'];
            }
            if (!empty($_GET['invoice_number'])) {
                $query .= ' AND i.invoice_number LIKE ?';
                $params[] = '%' . $_GET['invoice_number'] . '%';
            }
            if (!empty($_GET['from_date'])) {
                $query .= ' AND i.from_date >= ?';
                $params[] = $_GET['from_date'];
            }
            if (!empty($_GET['to_date'])) {
                $query .= ' AND i.to_date <= ?';
                $params[] = $_GET['to_date'];
            }

            $query .= ' ORDER BY i.id DESC';

            $stmt = $conn->prepare($query);
            $stmt->execute($params);

            echo json_encode([
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            ]);
        } catch (Throwable $error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $error->getMessage()]);
        }
    }

    public function getInvoiceById(int $id): void {
        try {
            $conn = $this->getConnection();

            $invoiceStmt = $conn->prepare('SELECT i.*, c.name AS client_name FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = ? LIMIT 1');
            $invoiceStmt->execute([$id]);
            $invoice = $invoiceStmt->fetch(PDO::FETCH_ASSOC);

            if (!$invoice) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Invoice not found']);
                return;
            }

            $itemsStmt = $conn->prepare('SELECT ii.*, t.title, t.due_date FROM invoice_items ii LEFT JOIN tasks t ON t.id = ii.task_id WHERE ii.invoice_id = ? ORDER BY ii.id ASC');
            $itemsStmt->execute([$id]);

            echo json_encode([
                'success' => true,
                'data' => [
                    'invoice' => $invoice,
                    'items' => $itemsStmt->fetchAll(PDO::FETCH_ASSOC),
                ],
            ]);
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
            $updateTaskPaymentStmt = $conn->prepare('UPDATE tasks SET payment_status_id = ? WHERE id = ?');

            foreach ($items as $item) {
                $taskId = (int)($item['task_id'] ?? 0);
                $status = strtolower((string)($item['status'] ?? 'pending'));
                if ($taskId <= 0 || !in_array($status, ['pending', 'paid'], true)) {
                    continue;
                }

                $updateItemStmt->execute([$status, $id, $taskId]);

                $paymentId = $status === 'paid' ? $paidPaymentId : $pendingPaymentId;
                if ($paymentId) {
                    $updateTaskPaymentStmt->execute([$paymentId, $taskId]);
                }
            }

            $statusStmt = $conn->prepare('SELECT status FROM invoice_items WHERE invoice_id = ?');
            $statusStmt->execute([$id]);
            $statuses = $statusStmt->fetchAll(PDO::FETCH_COLUMN);

            $normalized = array_map(static fn($value) => strtolower((string)$value), $statuses);
            $invoiceStatus = 'pending';

            if ($normalized && count(array_filter($normalized, static fn($status) => $status === 'paid')) === count($normalized)) {
                $invoiceStatus = 'paid';
            } elseif (in_array('paid', $normalized, true)) {
                $invoiceStatus = 'partial';
            }

            $invoiceUpdate = $conn->prepare('UPDATE invoices SET status = ? WHERE id = ?');
            $invoiceUpdate->execute([$invoiceStatus, $id]);

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Invoice status updated',
                'data' => ['status' => $invoiceStatus],
            ]);
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

            echo json_encode([
                'success' => true,
                'data' => [
                    'total_revenue' => (float)($totals['total_revenue'] ?? 0),
                    'paid_amount' => (float)($totals['paid_amount'] ?? 0),
                    'pending_amount' => (float)($totals['pending_amount'] ?? 0),
                ],
            ]);
        } catch (Throwable $error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $error->getMessage()]);
        }
    }
}
