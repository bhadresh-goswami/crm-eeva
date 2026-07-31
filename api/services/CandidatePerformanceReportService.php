<?php

require_once dirname(__DIR__) . '/models/FeedbackModel.php';
require_once dirname(__DIR__) . '/repositories/FeedbackRepository.php';
require_once dirname(__DIR__) . '/services/FeedbackService.php';

class CandidatePerformanceReportService {
    public function __construct(private PDO $conn) {}

    public function getSummary(array $query): array {
        $page = max(1, (int)($query['page'] ?? 1));
        $limit = max(1, min(200, (int)($query['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $search = trim((string)($query['search'] ?? ''));

        $params = [];
        $where = $this->buildFilters($query, $params);
        if ($search !== '') {
            $where[] = '(c.name LIKE :search OR cl.company_name LIKE :search)';
            $params[':search'] = '%' . $search . '%';
        }

        $whereSql = implode(' AND ', $where);

        $base = "FROM tasks t
            LEFT JOIN candidates c ON c.id = t.candidate_id
            LEFT JOIN clients cl ON cl.id = t.client_id
            LEFT JOIN task_status_master tsm ON tsm.id = t.status_id
            LEFT JOIN task_feedback tf ON tf.task_id = t.id
            WHERE {$whereSql}";

        $countSql = "SELECT COUNT(*) FROM (
            SELECT c.id, cl.company_name {$base} GROUP BY c.id, c.name, cl.company_name
        ) x";
        $countStmt = $this->conn->prepare($countSql);
        foreach ($params as $k => $v) $countStmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();

        $sql = "SELECT
            c.id AS candidate_id,
            COALESCE(c.name, '-') AS candidate_name,
            COALESCE(cl.company_name, '-') AS company_name,
            COUNT(DISTINCT t.id) AS total_interviews,
            COUNT(DISTINCT CASE WHEN LOWER(tsm.name) = 'completed' THEN t.id END) AS completed_count,
            COUNT(DISTINCT CASE WHEN LOWER(tsm.name) = 'success' THEN t.id END) AS success_count,
            COUNT(DISTINCT CASE WHEN LOWER(tsm.name) = 'rejected' THEN t.id END) AS rejected_count,
            ROUND(AVG(CASE WHEN tf.overall IS NOT NULL THEN tf.overall END), 2) AS overall_score,
            COALESCE(ROUND((COUNT(DISTINCT CASE WHEN LOWER(tsm.name) = 'success' THEN t.id END) / NULLIF(COUNT(DISTINCT t.id), 0)) * 100, 0), 0) AS success_percentage
            {$base}
            GROUP BY c.id, c.name, cl.company_name
            ORDER BY total_interviews DESC
            LIMIT :offset, :limit";

        $stmt = $this->conn->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'rows' => $rows,
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total],
            'summary' => ['total_candidates' => $total],
        ];
    }

    public function getDetails(int $candidateId): array {
        $sql = "SELECT
            t.id AS task_id,
            cl.company_name,
            u.name AS technical_expert,
            tt.name AS task_type,
            tsm.name AS task_status,
            DATE(t.due_date) AS interview_date,
            DATE_FORMAT(CONVERT_TZ(t.task_start_time, '+00:00', '-05:00'), '%m-%d-%Y %h:%i %p') AS est_time,
            CASE WHEN t.task_start_time IS NOT NULL AND t.task_end_time IS NOT NULL THEN ROUND(TIMESTAMPDIFF(MINUTE, t.task_start_time, t.task_end_time) / 60, 2) ELSE 0 END AS duration,
            CASE WHEN tf.id IS NULL THEN 'Pending' ELSE 'Submitted' END AS feedback_status,
            COALESCE(tf.overall, 0) AS overall_score,
            tf.id AS feedback_id
        FROM tasks t
        LEFT JOIN task_assignments ta ON ta.task_id = t.id AND ta.is_active = 1
        LEFT JOIN users u ON u.id = ta.user_id
        LEFT JOIN clients cl ON cl.id = t.client_id
        LEFT JOIN task_types tt ON tt.id = t.task_type_id
        LEFT JOIN task_status_master tsm ON tsm.id = t.status_id
        LEFT JOIN task_feedback tf ON tf.task_id = t.id
        WHERE t.candidate_id = :candidate_id
        ORDER BY t.created_at DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindValue(':candidate_id', $candidateId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getFeedback(int $feedbackId): ?array {
        $repository = new FeedbackRepository($this->conn);
        $feedback = $repository->getDetail($feedbackId);

        return $feedback === null ? null : (new FeedbackService($repository))->formatFeedback($feedback);
    }

    private function buildFilters(array $query, array &$params): array {
        $where = ['1=1'];
        $hasCandidate = !empty($query['candidate_id']);
        $hasClient = !empty($query['client_id']);
        $hasFromDate = !empty($query['from_date']);
        $hasToDate = !empty($query['to_date']);

        if ($hasCandidate) {
            $where[] = 't.candidate_id = :candidate_id';
            $params[':candidate_id'] = (int)$query['candidate_id'];
        }

        if ($hasClient) {
            $where[] = 't.client_id = :client_id';
            $params[':client_id'] = (int)$query['client_id'];
        }

        if ($hasFromDate && $hasToDate) {
            $where[] = 'DATE(t.created_at) BETWEEN :from_date AND :to_date';
            $params[':from_date'] = (string)$query['from_date'];
            $params[':to_date'] = (string)$query['to_date'];
        } elseif ($hasFromDate) {
            $where[] = 'DATE(t.created_at) >= :from_date';
            $params[':from_date'] = (string)$query['from_date'];
        } elseif ($hasToDate) {
            $where[] = 'DATE(t.created_at) <= :to_date';
            $params[':to_date'] = (string)$query['to_date'];
        }

        $hasAnyFilter = $hasCandidate || $hasClient || $hasFromDate || $hasToDate;
        if (!$hasAnyFilter) {
            $where[] = 'DATE(t.created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 10 DAY)';
        }

        return $where;
    }
}
