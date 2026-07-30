<?php

require_once dirname(__DIR__) . '/models/FeedbackModel.php';

class FeedbackRepository {
    private ?array $columns = null;

    public function __construct(private PDO $conn) {}

    public function findIdByTaskForUpdate(int $taskId): ?array {
        $stmt = $this->conn->prepare('SELECT id, created_at FROM task_feedback WHERE task_id = ? LIMIT 1 FOR UPDATE');
        $stmt->execute([$taskId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function getTaskContext(int $taskId, bool $forUpdate = false): ?array {
        $sql = "
            SELECT t.id AS task_id, COALESCE(ts.name, '') AS status_name, COALESCE(tt.name, '') AS task_type
            FROM tasks t
            LEFT JOIN task_status_master ts ON ts.id = t.status_id
            LEFT JOIN task_types tt ON tt.id = t.task_type_id
            WHERE t.id = ?
            LIMIT 1
        ";
        if ($forUpdate) {
            $sql .= ' FOR UPDATE';
        }
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$taskId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function create(array $data): int {
        $data = $this->filterKnownColumns($data);
        $columns = array_keys($data);
        $placeholders = array_fill(0, count($columns), '?');
        $values = array_values($data);

        if (in_array('created_at', $this->columns(), true)) {
            $columns[] = 'created_at';
            $placeholders[] = 'NOW()';
        }

        if ($columns === []) {
            throw new RuntimeException('No compatible columns found in task_feedback table');
        }

        $sql = sprintf(
            'INSERT INTO task_feedback (%s) VALUES (%s)',
            implode(', ', $columns),
            implode(', ', $placeholders)
        );
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($values);

        return (int)$this->conn->lastInsertId();
    }

    public function update(int $id, array $data): bool {
        $data = $this->filterKnownColumns($data);
        unset($data['id'], $data['task_id'], $data['created_at']);

        if ($data === []) {
            return false;
        }

        $assignments = array_map(static fn (string $column): string => "{$column} = ?", array_keys($data));
        $values = array_values($data);
        $values[] = $id;
        $stmt = $this->conn->prepare(
            'UPDATE task_feedback SET ' . implode(', ', $assignments) . ' WHERE id = ?'
        );

        return $stmt->execute($values);
    }

    public function getCreatedAt(int $id): ?string {
        $stmt = $this->conn->prepare('SELECT created_at FROM task_feedback WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $value = $stmt->fetchColumn();

        return $value === false ? null : (string)$value;
    }

    public function getByTask(int $taskId): ?array {
        $stmt = $this->conn->prepare("
            SELECT tf.*, COALESCE(tt.name, '') AS task_type
            FROM task_feedback tf
            LEFT JOIN tasks t ON t.id = tf.task_id
            LEFT JOIN task_types tt ON tt.id = t.task_type_id
            WHERE tf.task_id = ?
            LIMIT 1
        ");
        $stmt->execute([$taskId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return FeedbackModel::map($row ?: null);
    }

    public function getDetail(int $id): ?array {
        $stmt = $this->conn->prepare("
            SELECT tf.*, COALESCE(tt.name, '') AS task_type
            FROM task_feedback tf
            LEFT JOIN tasks t ON t.id = tf.task_id
            LEFT JOIN task_types tt ON tt.id = t.task_type_id
            WHERE tf.id = ?
            LIMIT 1
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return FeedbackModel::map($row ?: null);
    }

    public function list(?int $requestUserId, string $role): array {
        $sql = "
            SELECT
                tf.*,
                t.due_date,
                COALESCE(cand.name, '') AS candidate_name,
                COALESCE(tt.name, '') AS task_type,
                COALESCE(ts.name, '') AS task_status,
                COALESCE(u.name, '') AS assigned_to_name
            FROM task_feedback tf
            LEFT JOIN tasks t ON t.id = tf.task_id
            LEFT JOIN candidates cand ON cand.id = t.candidate_id
            LEFT JOIN task_types tt ON tt.id = t.task_type_id
            LEFT JOIN task_status_master ts ON ts.id = t.status_id
            LEFT JOIN task_assignments ta ON ta.task_id = t.id AND ta.is_active = 1
            LEFT JOIN users u ON u.id = ta.user_id
            WHERE LOWER(COALESCE(ts.name, '')) = 'completed'
        ";
        $params = [];
        if (in_array(strtolower($role), ['expert', 'technical expert', 'expertlead', 'technical lead'], true)) {
            $sql .= ' AND ta.user_id = ?';
            $params[] = (int)$requestUserId;
        }
        $sql .= ' ORDER BY tf.id DESC';

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return array_map(static fn (array $row): array => FeedbackModel::map($row), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function filterKnownColumns(array $data): array {
        return array_filter(
            $data,
            fn ($value, string $column): bool => in_array($column, $this->columns(), true),
            ARRAY_FILTER_USE_BOTH
        );
    }

    private function columns(): array {
        if ($this->columns !== null) {
            return $this->columns;
        }

        $stmt = $this->conn->query('SHOW COLUMNS FROM task_feedback');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->columns = array_map(static fn (array $row): string => (string)$row['Field'], $rows);

        return $this->columns;
    }
}
