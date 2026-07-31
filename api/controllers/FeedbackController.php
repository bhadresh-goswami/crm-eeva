<?php

require_once dirname(__DIR__) . "/config/database.php";
require_once dirname(__DIR__) . "/services/LoggerService.php";
require_once dirname(__DIR__) . "/models/FeedbackModel.php";
require_once dirname(__DIR__) . "/repositories/FeedbackRepository.php";
require_once dirname(__DIR__) . "/services/FeedbackService.php";

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
    public function create($createdByUserId = null, string $role = ''): void {
        $data = json_decode(file_get_contents("php://input"), true);
        $data = is_array($data) ? $data : [];
        $taskId = (int)($data['task_id'] ?? 0);

        if ($taskId <= 0) {
            http_response_code(422);
            echo json_encode([
                'success' => false,
                'message' => 'task_id is required'
            ]);
            return;
        }

        $db = new Database();
        $conn = $db->connect();

        try {
            $conn->beginTransaction();
            $repository = new FeedbackRepository($conn);
            $service = new FeedbackService($repository);
            $taskContext = $service->getTaskContext($taskId, true);
            if ($taskContext === null) {
                $conn->rollBack();
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Task not found'
                ]);
                return;
            }

            if (FeedbackRepository::isExpertRole($role) && (int)($taskContext['active_assignee_id'] ?? 0) !== (int)$createdByUserId) {
                $conn->rollBack();
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'You are not assigned to this task']);
                return;
            }

            if (strtolower(trim((string)$taskContext['status_name'])) !== 'completed') {
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

            $insertData = $service->prepareCreate($data, (string)$taskContext['task_type']);
            $insertData['task_id'] = $taskId;
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
                    'overall' => $insertData['overall'],
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

    public function viewByTaskId(int $taskId, $requestUserId = null, string $role = ''): void {
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
            $repository = new FeedbackRepository($conn);
            $service = new FeedbackService($repository);
            $feedback = $repository->getByTask($taskId, $requestUserId === null ? null : (int)$requestUserId, $role);

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
                'data' => $service->formatFeedback($feedback)
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
            $repository = new FeedbackRepository($conn);
            $service = new FeedbackService($repository);
            $rows = $repository->list(
                $requestUserId === null ? null : (int)$requestUserId,
                $role
            );
            $rows = array_map(static fn (array $row): array => $service->formatFeedback($row), $rows);

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
