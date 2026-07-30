<?php

require_once dirname(__DIR__) . "/config/database.php";
require_once dirname(__DIR__) . "/services/LoggerService.php";
require_once dirname(__DIR__) . "/models/FeedbackModel.php";
require_once dirname(__DIR__) . "/repositories/FeedbackRepository.php";

class FeedbackController {

    private function getStatusIdByName(PDO $conn, string $name): ?int {
        $stmt = $conn->prepare("SELECT id FROM task_status_master WHERE LOWER(name) = LOWER(?) LIMIT 1");
        $stmt->execute([$name]);
        $id = (int)$stmt->fetchColumn();

        return $id > 0 ? $id : null;
    }

    private function markInProgressTaskCompleted(PDO $conn, int $taskId, ?string $completedAt = null): void {
        $completedStatusId = $this->getStatusIdByName($conn, 'Completed');
        $inProgressStatusId = $this->getStatusIdByName($conn, 'In Progress');

        if ($completedStatusId === null || $inProgressStatusId === null) {
            return;
        }

        $taskStmt = $conn->prepare("SELECT status_id FROM tasks WHERE id = ? LIMIT 1 FOR UPDATE");
        $taskStmt->execute([$taskId]);
        $task = $taskStmt->fetch(PDO::FETCH_ASSOC);

        if (!$task || (int)($task['status_id'] ?? 0) !== $inProgressStatusId) {
            return;
        }

        $completionTime = trim((string)$completedAt) !== '' ? $completedAt : null;
        $updateStmt = $conn->prepare("
            UPDATE tasks
            SET status_id = ?,
                task_end_time = COALESCE(task_end_time, COALESCE(?, NOW())),
                duration = CASE
                    WHEN task_start_time IS NOT NULL THEN GREATEST(TIMESTAMPDIFF(MINUTE, task_start_time, COALESCE(task_end_time, COALESCE(?, NOW()))), 0)
                    ELSE duration
                END
            WHERE id = ?
        ");
        $updateStmt->execute([$completedStatusId, $completionTime, $completionTime, $taskId]);
    }
    public function create($createdByUserId = null): void {
        $data = json_decode(file_get_contents("php://input"));

        $taskId = (int)($data->task_id ?? 0);
        $companyName = trim((string)($data->company_name ?? ''));
        $interviewerName = trim((string)($data->interviewer_name ?? ''));

        if ($taskId <= 0 || $companyName === '' || $interviewerName === '') {
            http_response_code(422);
            echo json_encode([
                'success' => false,
                'message' => 'task_id, company_name and interviewer_name are required'
            ]);
            return;
        }

        $communication = isset($data->communication) ? (float)$data->communication : null;
        $technical = isset($data->technical) ? (float)$data->technical : null;
        $confidence = isset($data->confidence) ? (float)$data->confidence : null;
        $projectExplanation = isset($data->project_explanation) ? (float)$data->project_explanation : null;

        if ($communication === null || $technical === null || $confidence === null || $projectExplanation === null) {
            http_response_code(422);
            echo json_encode([
                'success' => false,
                'message' => 'communication, technical, confidence, and project_explanation are required'
            ]);
            return;
        }

        $overall = round(($communication + $technical + $confidence + $projectExplanation) / 4, 2);

        $db = new Database();
        $conn = $db->connect();

        try {
            $conn->beginTransaction();
            $repository = new FeedbackRepository($conn);

            $taskStatusStmt = $conn->prepare("
                SELECT COALESCE(ts.name, '') AS status_name
                FROM tasks t
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                WHERE t.id = ?
                LIMIT 1
                FOR UPDATE
            ");
            $taskStatusStmt->execute([$taskId]);
            $taskStatus = trim((string)$taskStatusStmt->fetchColumn());
            if ($taskStatus === '') {
                $conn->rollBack();
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Task not found'
                ]);
                return;
            }

            if (strtolower($taskStatus) !== 'completed') {
                $conn->rollBack();
                http_response_code(422);
                echo json_encode([
                    'success' => false,
                    'message' => 'Feedback can only be submitted for completed tasks.'
                ]);
                return;
            }

            $existingFeedback = $repository->findIdByTaskForUpdate($taskId);
            if ($existingFeedback) {
                $this->markInProgressTaskCompleted($conn, $taskId, (string)($existingFeedback['created_at'] ?? ''));
                $conn->commit();
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Feedback already submitted for this task'
                ]);
                return;
            }

            $insertData = [
                'task_id' => $taskId,
                'company_name' => $companyName,
                'interviewer_name' => $interviewerName,
                'interview_round' => trim((string)($data->interview_round ?? '')),
                'communication' => $communication,
                'technical' => $technical,
                'confidence' => $confidence,
                'project_explanation' => $projectExplanation,
                'read_proper' => trim((string)($data->read_proper ?? '')),
                'area_of_improvements' => trim((string)($data->area_of_improvements ?? '')),
                'strengths' => trim((string)($data->strengths ?? '')),
                'recommendations' => trim((string)($data->recommendations ?? '')),
                'next_action' => trim((string)($data->next_action ?? '')),
                'additional_feedback' => trim((string)($data->additional_feedback ?? '')),
                'custom_fields' => FeedbackModel::customFieldsForStorage($data->custom_fields ?? null),
                'recording_url' => trim((string)($data->recording_url ?? '')),
                'overall' => $overall,
            ];

            $insertData['created_by'] = $createdByUserId;
            $insertData['created_by_id'] = $createdByUserId;
            $feedbackId = $repository->create($insertData);
            $feedbackCreatedAt = $repository->getCreatedAt($feedbackId);

            $this->markInProgressTaskCompleted($conn, $taskId, $feedbackCreatedAt);

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Feedback added successfully',
                'data' => [
                    'task_id' => $taskId,
                    'overall' => $overall,
                ]
            ]);
        } catch (InvalidArgumentException $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }

            http_response_code(422);
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        } catch (Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }

            LoggerService::logError('Feedback create failed', [
                'task_id' => $taskId,
                'user_id' => $createdByUserId,
                'error' => $e->getMessage(),
            ]);

            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Something went wrong. Please try again.'
            ]);
        }
    }

    public function viewByTaskId(int $taskId): void {
        if ($taskId <= 0) {
            http_response_code(422);
            echo json_encode([
                'success' => false,
                'message' => 'Valid task_id is required'
            ]);
            return;
        }

        $db = new Database();
        $conn = $db->connect();

        try {
            $feedback = (new FeedbackRepository($conn))->getByTask($taskId);

            if (!$feedback) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Feedback not found'
                ]);
                return;
            }

            echo json_encode([
                'success' => true,
                'data' => $feedback
            ]);
        } catch (Throwable $e) {
            LoggerService::logError('Feedback fetch failed', [
                'task_id' => $taskId,
                'error' => $e->getMessage(),
            ]);

            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Something went wrong. Please try again.'
            ]);
        }
    }

    public function listAll($requestUserId = null, string $role = ''): void {
        $db = new Database();
        $conn = $db->connect();

        try {
            $rows = (new FeedbackRepository($conn))->list(
                $requestUserId === null ? null : (int)$requestUserId,
                $role
            );

            echo json_encode([
                'success' => true,
                'data' => $rows,
            ]);
        } catch (Throwable $e) {
            LoggerService::logError('Feedback list failed', [
                'user_id' => $requestUserId,
                'role' => $role,
                'error' => $e->getMessage(),
            ]);
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Something went wrong. Please try again.'
            ]);
        }
    }
}
