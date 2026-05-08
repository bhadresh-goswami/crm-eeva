<?php
require_once __DIR__ . '/../services/CandidatePerformanceReportService.php';

class CandidatePerformanceReportController {
    private CandidatePerformanceReportService $service;

    public function __construct() {
        $db = new Database();
        $this->service = new CandidatePerformanceReportService($db->connect());
    }

    public function list(): void {
        try {
            $data = $this->service->getSummary($_GET);
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function details(): void {
        $candidateId = (int)($_GET['candidate_id'] ?? 0);
        if ($candidateId <= 0) { http_response_code(422); echo json_encode(['success'=>false,'message'=>'candidate_id is required']); return; }
        try {
            echo json_encode(['success' => true, 'data' => ['rows' => $this->service->getDetails($candidateId)]]);
        } catch (Throwable $e) {
            http_response_code(500); echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
        }
    }

    public function feedback(): void {
        $feedbackId = (int)($_GET['feedback_id'] ?? 0);
        if ($feedbackId <= 0) { http_response_code(422); echo json_encode(['success'=>false,'message'=>'feedback_id is required']); return; }
        try {
            echo json_encode(['success' => true, 'data' => $this->service->getFeedback($feedbackId)]);
        } catch (Throwable $e) {
            http_response_code(500); echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
        }
    }
}
