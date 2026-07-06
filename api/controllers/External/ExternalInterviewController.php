<?php
class ExternalInterviewController {
    public function __construct(private ExternalInterviewService $service) {}
    public function create(array $body): array {
        $result = $this->service->create($body);
        if (isset($result['error'])) return ExternalResponse::error($result['error'], $result['errors'] ?? [], $result['status']);
        return ExternalResponse::success('Interview task created successfully.', $result['data'], $result['status']);
    }
    public function details(): array {
        $taskId = isset($_GET['task_id']) ? (int)$_GET['task_id'] : null;
        $code = isset($_GET['candidate_code']) ? trim((string)$_GET['candidate_code']) : null;
        $result = $this->service->details($taskId, $code);
        if (isset($result['error'])) return ExternalResponse::error($result['error'], $result['errors'] ?? [], $result['status']);
        return ExternalResponse::success('Interview details fetched successfully.', $result['data'], 200);
    }
    public function latest(): array {
        $code = trim((string)($_GET['candidate_code'] ?? ''));
        if ($code === '') return ExternalResponse::error('candidate_code is required.', ['candidate_code is required.'], 422);
        $result = $this->service->latest($code);
        if (isset($result['error'])) return ExternalResponse::error($result['error'], $result['errors'] ?? [], $result['status']);
        return ExternalResponse::success('Latest interview fetched successfully.', $result['data'], 200);
    }
    public function history(): array { return $this->details(); }
    public function status(): array {
        $code = trim((string)($_GET['candidate_code'] ?? ''));
        if ($code === '') return ExternalResponse::error('candidate_code is required.', ['candidate_code is required.'], 422);
        $result = $this->service->status($code);
        if (isset($result['error'])) return ExternalResponse::error($result['error'], $result['errors'] ?? [], $result['status']);
        return ExternalResponse::success('Latest interview status fetched successfully.', $result['data'], 200);
    }
}
