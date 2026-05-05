<?php

require_once dirname(__DIR__) . "/config/database.php";
require_once dirname(__DIR__) . "/services/LoggerService.php";

class FeedbackController {
    private function getTableColumns(PDO $conn, string $tableName): array {
        $stmt = $conn->prepare("SHOW COLUMNS FROM {$tableName}");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(static fn ($row) => (string)$row['Field'], $rows);
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

            $duplicateStmt = $conn->prepare("SELECT id FROM task_feedback WHERE task_id = ? LIMIT 1 FOR UPDATE");
            $duplicateStmt->execute([$taskId]);
            if ((int)$duplicateStmt->fetchColumn() > 0) {
                $conn->rollBack();
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Feedback already submitted for this task'
                ]);
                return;
            }

            $tableColumns = $this->getTableColumns($conn, 'task_feedback');
            $insertData = [
                'task_id' => $taskId,
                'company_name' => $companyName,
                'interviewer_name' => $interviewerName,
                'communication' => $communication,
                'technical' => $technical,
                'confidence' => $confidence,
                'project_explanation' => $projectExplanation,
                'overall' => $overall,
            ];

            if (in_array('created_by', $tableColumns, true)) {
                $insertData['created_by'] = $createdByUserId;
            }

            if (in_array('created_by_id', $tableColumns, true)) {
                $insertData['created_by_id'] = $createdByUserId;
            }

            $columns = [];
            $placeholders = [];
            $values = [];
            foreach ($insertData as $column => $value) {
                if (!in_array($column, $tableColumns, true)) {
                    continue;
                }
                $columns[] = $column;
                $placeholders[] = '?';
                $values[] = $value;
            }

            if (in_array('created_at', $tableColumns, true)) {
                $columns[] = 'created_at';
                $placeholders[] = 'NOW()';
            }

            if (count($columns) === 0) {
                throw new RuntimeException('No compatible columns found in task_feedback table');
            }

            $insertSql = sprintf(
                'INSERT INTO task_feedback (%s) VALUES (%s)',
                implode(', ', $columns),
                implode(', ', $placeholders)
            );

            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->execute($values);

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Feedback added successfully',
                'data' => [
                    'task_id' => $taskId,
                    'overall' => $overall,
                ]
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
            $stmt = $conn->prepare("SELECT * FROM task_feedback WHERE task_id = ? LIMIT 1");
            $stmt->execute([$taskId]);
            $feedback = $stmt->fetch(PDO::FETCH_ASSOC);

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
}
