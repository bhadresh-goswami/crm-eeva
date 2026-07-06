<?php
class ExternalInterviewService {
    private const TASK_COLUMNS = [
        'client_id', 'candidate_id', 'poc_id', 'task_type_id', 'status_id',
        'title', 'description', 'due_date', 'start_time', 'end_time',
        'task_start_time', 'task_end_time', 'duration', 'total_amount',
        'payment_status_id', 'payment_mode', 'paid_at', 'reference_no',
        'payment_notes', 'email_thread_id', 'invoice_id', 'billing_status',
    ];

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

        $candidateColumns = $this->tableColumns('candidates');
        if (in_array('status', $candidateColumns, true) && !$this->isActiveValue($candidate['status'] ?? null)) {
            return ['status' => 422, 'error' => 'Candidate is inactive.', 'errors' => ['Candidate Active validation failed.']];
        }
        if (empty($candidate['client_id'])) {
            return ['status' => 422, 'error' => 'Candidate client is missing.', 'errors' => ['Client Exists validation failed.']];
        }

        $client = $this->fetchOne('SELECT * FROM clients WHERE id = ?', [(int)$candidate['client_id']]);
        if (!$client || !$this->isActiveValue($client['status'] ?? 'active')) {
            return ['status' => 422, 'error' => 'Client not found or inactive.', 'errors' => ['Client Exists validation failed.']];
        }

        $poc = $this->fetchOne(
            'SELECT * FROM client_pocs WHERE client_id = ? AND status = ? ORDER BY id ASC LIMIT 1',
            [(int)$candidate['client_id'], 'active']
        );
        if (!$poc) {
            return ['status' => 422, 'error' => 'Active Client POC not found.', 'errors' => ['Active Client POC Exists validation failed.']];
        }

        $taskType = $this->interviewTaskType();
        if (!$taskType) {
            return ['status' => 422, 'error' => 'Interview task type not found.', 'errors' => ['Interview Task Type Exists validation failed.']];
        }

        $status = $this->fetchOne("SELECT * FROM task_status_master WHERE status = 'active' AND LOWER(name) = 'pending' LIMIT 1", []);
        if (!$status) return ['status' => 422, 'error' => 'Pending status not found.', 'errors' => ['Pending Status Exists validation failed.']];

        $startTime = $this->normalizeTime($data['interview_time']);
        $title = $this->clean($data['interview_title']);
        $duplicate = $this->fetchOne(
            'SELECT id FROM tasks WHERE candidate_id = ? AND task_type_id = ? AND due_date = ? AND start_time = ? AND title = ? LIMIT 1',
            [(int)$candidate['id'], (int)$taskType['id'], $data['interview_date'], $startTime, $title]
        );
        if ($duplicate) return ['status' => 409, 'error' => 'Duplicate interview already exists.', 'errors' => ['Same candidate/task type/date/time/title already exists.']];

        $taskColumns = $this->tableColumns('tasks');
        $unknownColumns = array_values(array_diff(self::TASK_COLUMNS, $taskColumns));
        if ($unknownColumns) {
            return ['status' => 500, 'error' => 'Task schema is not compatible with External API.', 'errors' => []];
        }

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
            (int)$candidate['client_id'],
            (int)$candidate['id'],
            (int)$poc['id'],
            (int)$taskType['id'],
            (int)$status['id'],
            $title,
            $this->description($data),
            $data['interview_date'],
            $startTime,
            null,
            null,
            null,
            null,
            0.00,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            'completed',
        ]);

        $taskId = (int)$this->conn->lastInsertId();
        $comment = $this->conn->prepare('INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, NULL, ?)');
        $comment->execute([$taskId, 'Interview created through External API.']);
        $this->conn->commit();

        return ['status' => 201, 'data' => ['task_id' => $taskId, 'candidate_code' => $data['candidate_code'], 'status' => 'Pending']];
    }

    private function validateCreate(array $data): array {
        $errors = [];
        foreach (['candidate_code', 'interview_title', 'interview_date', 'interview_time'] as $field) {
            if (empty($data[$field])) $errors[] = $field . ' is required.';
        }
        if (!empty($data['candidate_code']) && !preg_match('/^[A-Z0-9-]{3,100}$/i', $data['candidate_code'])) $errors[] = 'candidate_code is invalid.';
        if (!empty($data['interview_date'])) {
            $date = DateTime::createFromFormat('Y-m-d', $data['interview_date']);
            if (!$date || $date->format('Y-m-d') !== $data['interview_date']) $errors[] = 'interview_date must be YYYY-MM-DD.';
        }
        if (!empty($data['interview_time']) && !$this->normalizeTime($data['interview_time'])) $errors[] = 'interview_time is invalid.';
        return $errors;
    }

    private function normalizeTime(string $time): ?string {
        foreach (['H:i:s', 'H:i', 'h:i A'] as $format) {
            $date = DateTime::createFromFormat($format, trim($time));
            if ($date) return $date->format('H:i:s');
        }
        return null;
    }

    private function clean($value): string { return trim(strip_tags((string)$value)); }

    private function description(array $data): string {
        return implode("\n", [
            'Source : External API',
            'Candidate Code : ' . $this->clean($data['candidate_code'] ?? ''),
            'Round : ' . $this->clean($data['round'] ?? ''),
            'Technology : ' . $this->clean($data['technology'] ?? ''),
            'Timezone : ' . $this->clean($data['timezone'] ?? ''),
            'Remarks : ' . $this->clean($data['remarks'] ?? ''),
        ]);
    }

    private function candidateByCode(string $code): ?array { return $this->fetchOne('SELECT * FROM candidates WHERE candidate_code = ? LIMIT 1', [$code]); }

    private function interviewTaskType(): ?array {
        $configuredName = trim((string)($this->config['external_interview_task_type_name'] ?? 'Interview Support - Google Doc'));
        if ($configuredName !== '') {
            $taskType = $this->fetchOne('SELECT * FROM task_types WHERE status = ? AND LOWER(name) = LOWER(?) LIMIT 1', ['active', $configuredName]);
            if ($taskType) return $taskType;
        }
        return $this->fetchOne("SELECT * FROM task_types WHERE status = 'active' AND LOWER(name) LIKE '%interview%' ORDER BY id ASC LIMIT 1", []);
    }

    private function fetchOne(string $sql, array $params): ?array {
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function isActiveValue($value): bool { return $value === null || $value === 1 || $value === '1' || strtolower((string)$value) === 'active'; }

    public function details(?int $taskId, ?string $code): array {
        if (!$taskId && !$code) return ['status' => 422, 'error' => 'task_id or candidate_code is required.', 'errors' => ['Missing query parameter.']];
        $where = $taskId ? 't.id = ?' : 'c.candidate_code = ?';
        $params = [$taskId ?: $code];
        $sql = "SELECT t.*, c.candidate_code, c.name candidate_name, c.email candidate_email, cl.name client_name, cl.company_name, cp.name poc_name, cp.email poc_email, ts.name status_name, tt.name task_type FROM tasks t LEFT JOIN candidates c ON c.id = t.candidate_id LEFT JOIN clients cl ON cl.id = t.client_id LEFT JOIN client_pocs cp ON cp.id = t.poc_id LEFT JOIN task_status_master ts ON ts.id = t.status_id LEFT JOIN task_types tt ON tt.id = t.task_type_id WHERE {$where} ORDER BY t.due_date DESC, t.start_time DESC, t.id DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$rows) return ['status' => 404, 'error' => 'Interview not found.', 'errors' => []];
        $items = array_map(fn($row) => $this->hydrate($row), $rows);
        return ['status' => 200, 'data' => $taskId ? $items[0] : $items];
    }

    public function latest(string $code): array {
        $result = $this->details(null, $code);
        if (($result['status'] ?? 0) !== 200) return $result;
        $data = $result['data'];
        return ['status' => 200, 'data' => $data[0] ?? null];
    }

    public function status(string $code): array {
        $result = $this->latest($code);
        if (($result['status'] ?? 0) !== 200) return $result;
        return ['status' => 200, 'data' => [
            'task_id' => $result['data']['task']['task_id'] ?? null,
            'current_status' => $result['data']['current_status'] ?? null,
            'updated_date' => $result['data']['task']['updated_date'] ?? null,
        ]];
    }

    private function hydrate(array $row): array {
        return [
            'candidate' => [
                'candidate_code' => $row['candidate_code'],
                'name' => $row['candidate_name'],
                'email' => $row['candidate_email'],
            ],
            'company' => ['name' => $row['company_name']],
            'client' => ['name' => $row['client_name']],
            'client_poc' => ['name' => $row['poc_name'], 'email' => $row['poc_email']],
            'interview' => [
                'title' => $row['title'],
                'date' => $row['due_date'],
                'time' => $row['start_time'],
                'details' => $row['description'],
            ],
            'task' => [
                'task_id' => (int)$row['id'],
                'task_type' => $row['task_type'],
                'created_date' => $row['created_at'],
                'updated_date' => $row['task_end_time'] ?? $row['created_at'],
                'completed_date' => $row['task_end_time'] ?? null,
            ],
            'current_status' => $row['status_name'],
            'comments' => $this->children('SELECT comment, created_at FROM task_comments WHERE task_id = ? ORDER BY id ASC', (int)$row['id']),
            'feedback' => $this->children('SELECT interview_round, company_name, interviewer_name, communication, technical, confidence, project_explanation, read_proper, area_of_improvements, recording_url, overall, created_at, updated_at FROM task_feedback WHERE task_id = ? ORDER BY id ASC', (int)$row['id']),
            'result' => $row['status_name'],
        ];
    }

    private function children(string $sql, int $id): array {
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
