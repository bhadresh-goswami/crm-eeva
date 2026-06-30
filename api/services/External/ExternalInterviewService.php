<?php
class ExternalInterviewService {
    public function __construct(private PDO $conn, private array $config = []) {}

    private function tableColumns(string $table): array {
        try {
            return $this->conn->query("SHOW COLUMNS FROM `{$table}`")->fetchAll(PDO::FETCH_COLUMN);
        } catch (Throwable $e) {
            return [];
        }
    }

    public function create(array $data): array {
        $errors = $this->validateCreate($data);
        if ($errors) return ['status' => 422, 'error' => 'Validation failed.', 'errors' => $errors];

        $candidate = $this->candidateByCode($data['candidate_code']);
        if (!$candidate) return ['status' => 404, 'error' => 'Candidate not found.', 'errors' => ['Invalid candidate_code.']];

        $candidateCols = $this->tableColumns('candidates');
        if (in_array('status', $candidateCols, true) && !$this->isActiveValue($candidate['status'] ?? null)) {
            return ['status' => 422, 'error' => 'Candidate is inactive.', 'errors' => ['Candidate Active validation failed.']];
        }

        $clientId = (int)($this->config['external_interview_client_id'] ?? 5);
        $pocId = (int)($this->config['external_interview_poc_id'] ?? 5);
        $taskTypeId = (int)($this->config['external_interview_task_type_id'] ?? 1);

        $client = $this->fetchOne('SELECT * FROM clients WHERE id = ?', [$clientId]);
        if (!$client || !$this->isActiveValue($client['status'] ?? 'active')) {
            return ['status' => 422, 'error' => 'Configured client not found or inactive.', 'errors' => ['Client Exists validation failed for client_id ' . $clientId . '.']];
        }

        $poc = $this->fetchOne('SELECT * FROM client_pocs WHERE id = ? AND client_id = ? AND status = ?', [$pocId, $clientId, 'active']);
        if (!$poc) {
            return ['status' => 422, 'error' => 'Configured active Client POC not found.', 'errors' => ['Active Client POC Exists validation failed for poc_id ' . $pocId . '.']];
        }

        $taskType = $this->fetchOne('SELECT * FROM task_types WHERE id = ? AND status = ?', [$taskTypeId, 'active']);
        if (!$taskType) {
            return ['status' => 422, 'error' => 'Configured interview task type not found.', 'errors' => ['Task Type Exists validation failed for task_type_id ' . $taskTypeId . '.']];
        }

        $status = $this->fetchOne("SELECT * FROM task_status_master WHERE status = 'active' AND LOWER(name) = 'pending' LIMIT 1", []);
        if (!$status) return ['status' => 422, 'error' => 'Pending status not found.', 'errors' => ['Status Exists validation failed.']];

        $paymentStatus = $this->fetchOne("SELECT * FROM payment_status_master WHERE LOWER(name) = 'pending' LIMIT 1", []);
        if (!$paymentStatus) return ['status' => 422, 'error' => 'Pending payment status not found.', 'errors' => ['Payment Status Exists validation failed.']];

        $startTime = $this->normalizeTime($data['interview_time']);
        $round = $this->clean($data['round'] ?? '');
        $duplicate = $this->fetchOne(
            'SELECT id FROM tasks WHERE candidate_id = ? AND due_date = ? AND start_time = ? AND description LIKE ? LIMIT 1',
            [(int)$candidate['id'], $data['interview_date'], $startTime, '%Round: ' . $round . '%']
        );
        if ($duplicate) return ['status' => 409, 'error' => 'Duplicate interview already exists.', 'errors' => ['Same candidate/date/time/round already exists.']];

        $duration = (int)($this->config['external_interview_duration_minutes'] ?? 60);
        $startDateTime = (new DateTime($data['interview_date'] . ' ' . $startTime))->format('Y-m-d H:i:s');
        $endDateTime = (new DateTime($startDateTime))->modify('+' . $duration . ' minutes')->format('Y-m-d H:i:s');
        $endTime = (new DateTime($endDateTime))->format('H:i:s');
        $description = $this->description($data);

        $this->conn->beginTransaction();
        $stmt = $this->conn->prepare('
            INSERT INTO tasks (
                client_id, candidate_id, poc_id, task_type_id, status_id,
                title, description, due_date, start_time, end_time,
                task_start_time, task_end_time, duration, total_amount,
                payment_status_id, payment_mode, paid_at, reference_no,
                payment_notes, email_thread_id, invoice_id, billing_status
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?
            )
        ');
        $stmt->execute([
            $clientId,
            (int)$candidate['id'],
            $pocId,
            $taskTypeId,
            (int)$status['id'],
            $this->clean($data['interview_title']),
            $description,
            $data['interview_date'],
            $startTime,
            $endTime,
            $startDateTime,
            $endDateTime,
            $duration,
            0.00,
            (int)$paymentStatus['id'],
            'External API',
            null,
            null,
            'Created from External API for candidate_code ' . $this->clean($data['candidate_code']),
            null,
            null,
            'completed',
        ]);

        $taskId = (int)$this->conn->lastInsertId();
        $assigneeId = $this->defaultAssigneeId();
        if ($assigneeId) $this->insertAssignment($taskId, $assigneeId);

        $comment = $this->conn->prepare('INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, NULL, ?)');
        $comment->execute([$taskId, 'Interview created through External API.']);
        $this->conn->commit();

        return ['status' => 201, 'data' => ['task_id' => $taskId, 'task_number' => 'TSK-' . date('Y') . '-' . $taskId, 'candidate_code' => $data['candidate_code'], 'status' => 'Pending']];
    }

    private function validateCreate(array $d): array {
        $errors = [];
        foreach (['candidate_code', 'interview_title', 'interview_date', 'interview_time'] as $field) {
            if (empty($d[$field])) $errors[] = $field . ' is required.';
        }
        if (!empty($d['candidate_code']) && !preg_match('/^[A-Z0-9-]{3,100}$/i', $d['candidate_code'])) $errors[] = 'candidate_code is invalid.';
        if (!empty($d['interview_date'])) {
            $date = DateTime::createFromFormat('Y-m-d', $d['interview_date']);
            if (!$date || $date->format('Y-m-d') !== $d['interview_date']) $errors[] = 'interview_date must be YYYY-MM-DD.';
        }
        if (!empty($d['interview_time']) && !$this->normalizeTime($d['interview_time'])) $errors[] = 'interview_time is invalid.';
        return $errors;
    }

    private function normalizeTime(string $time): ?string {
        foreach (['h:i A', 'H:i', 'H:i:s'] as $format) {
            $date = DateTime::createFromFormat($format, trim($time));
            if ($date) return $date->format('H:i:s');
        }
        return null;
    }

    private function clean($value): string { return trim(strip_tags((string)$value)); }

    private function description(array $data): string {
        return implode("\n", [
            'Source: External API',
            'Round: ' . $this->clean($data['round'] ?? ''),
            'Technology: ' . $this->clean($data['technology'] ?? ''),
            'Timezone: ' . $this->clean($data['timezone'] ?? ''),
            'Meeting Link: ' . $this->clean($data['meeting_link'] ?? ''),
            'Remarks: ' . $this->clean($data['remarks'] ?? ''),
        ]);
    }

    private function candidateByCode(string $code): ?array { return $this->fetchOne('SELECT * FROM candidates WHERE candidate_code = ? LIMIT 1', [$code]); }
    private function fetchOne(string $sql, array $params): ?array { $stmt = $this->conn->prepare($sql); $stmt->execute($params); $row = $stmt->fetch(PDO::FETCH_ASSOC); return $row ?: null; }
    private function isActiveValue($value): bool { return $value === null || $value === 1 || $value === '1' || strtolower((string)$value) === 'active'; }
    private function defaultAssigneeId(): ?int { $row = $this->fetchOne("SELECT id FROM users WHERE status = 'active' ORDER BY CASE WHEN id = 1 THEN 0 ELSE 1 END, id ASC LIMIT 1", []); return $row ? (int)$row['id'] : null; }
    private function insertAssignment(int $taskId, int $userId): void { $this->conn->prepare('INSERT INTO task_assignments (task_id, user_id, is_active, assigned_by) VALUES (?, ?, 1, NULL)')->execute([$taskId, $userId]); }

    public function details(?int $taskId, ?string $code): array {
        if (!$taskId && !$code) return ['status' => 422, 'error' => 'task_id or candidate_code is required.', 'errors' => ['Missing query parameter.']];
        $where = $taskId ? 't.id = ?' : 'c.candidate_code = ?';
        $params = [$taskId ?: $code];
        $sql = "SELECT t.*, c.candidate_code, c.name candidate_name, c.email candidate_email, cl.name client_name, cl.company_name, cp.name poc_name, cp.email poc_email, ts.name status_name, tt.name task_type FROM tasks t LEFT JOIN candidates c ON c.id=t.candidate_id LEFT JOIN clients cl ON cl.id=t.client_id LEFT JOIN client_pocs cp ON cp.id=t.poc_id LEFT JOIN task_status_master ts ON ts.id=t.status_id LEFT JOIN task_types tt ON tt.id=t.task_type_id WHERE {$where} ORDER BY t.due_date DESC,t.start_time DESC,t.id DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$rows) return ['status' => 404, 'error' => 'Interview not found.', 'errors' => []];
        $items = array_map(fn($row) => $this->hydrate($row), $rows);
        return ['status' => 200, 'data' => $taskId ? $items[0] : $items];
    }

    public function latest(string $code): array { $result = $this->details(null, $code); if (($result['status'] ?? 0) !== 200) return $result; $data = $result['data']; return ['status' => 200, 'data' => $data[0] ?? null]; }
    public function status(string $code): array { $result = $this->latest($code); if (($result['status'] ?? 0) !== 200) return $result; return ['status' => 200, 'data' => ['candidate_code' => $code, 'task_id' => $result['data']['task']['id'] ?? null, 'status' => $result['data']['current_status'] ?? null, 'updated_date' => $result['data']['task']['updated_at'] ?? null]]; }

    private function hydrate(array $row): array {
        $id = (int)$row['id'];
        return [
            'candidate' => ['code' => $row['candidate_code'], 'name' => $row['candidate_name'], 'email' => $row['candidate_email']],
            'company' => ['name' => $row['company_name']],
            'client' => ['id' => $row['client_id'], 'name' => $row['client_name']],
            'client_poc' => ['id' => $row['poc_id'], 'name' => $row['poc_name'], 'email' => $row['poc_email']],
            'interview' => ['title' => $row['title'], 'date' => $row['due_date'], 'time' => $row['start_time'], 'details' => $row['description']],
            'task' => [
                'id' => $id,
                'task_number' => 'TSK-' . date('Y', strtotime($row['created_at'] ?? 'now')) . '-' . $id,
                'type' => $row['task_type'],
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at'] ?? null,
                'completed_at' => $row['task_end_time'] ?? null,
                'payment_status_id' => $row['payment_status_id'] ?? null,
                'billing_status' => $row['billing_status'] ?? null,
            ],
            'current_status' => $row['status_name'],
            'status_history' => [],
            'assignment_history' => $this->children('SELECT ta.*, u.name user_name FROM task_assignments ta LEFT JOIN users u ON u.id=ta.user_id WHERE ta.task_id=? ORDER BY ta.id ASC', $id),
            'comments' => $this->children('SELECT * FROM task_comments WHERE task_id=? ORDER BY id ASC', $id),
            'feedback' => $this->children('SELECT * FROM task_feedback WHERE task_id=? ORDER BY id ASC', $id),
            'result' => $row['status_name'],
        ];
    }

    private function children(string $sql, int $id): array { $stmt = $this->conn->prepare($sql); $stmt->execute([$id]); return $stmt->fetchAll(PDO::FETCH_ASSOC); }
}
