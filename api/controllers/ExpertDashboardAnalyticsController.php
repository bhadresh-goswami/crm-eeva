<?php

require_once dirname(__DIR__) . "/services/ExpertDashboardAnalyticsService.php";
require_once dirname(__DIR__) . "/services/LoggerService.php";

class ExpertDashboardAnalyticsController {
    private ExpertDashboardAnalyticsService $analyticsService;

    public function __construct() {
        $this->analyticsService = new ExpertDashboardAnalyticsService();
    }

    public function index($user): void {
        try {
            $userId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
            if ($userId === null) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Unauthorized user',
                    'data' => [
                        'cards' => [],
                        'working_hours_trend' => [],
                        'task_status_ratio' => [],
                        'today_distribution' => [],
                        'daily_working_analytics' => ['summary' => [], 'rows' => []],
                    ],
                ]);
                return;
            }

            $analytics = $this->analyticsService->getDashboardAnalytics((int)$userId);

            echo json_encode([
                'success' => true,
                'message' => 'Dashboard analytics loaded successfully',
                'data' => [
                    'cards' => $analytics['cards'] ?? [],
                    'working_hours_trend' => [],
                    'task_status_ratio' => [],
                    'today_distribution' => [],
                    'daily_working_analytics' => $analytics['daily_working_analytics'] ?? ['summary' => [], 'rows' => []],
                ],
            ]);
        } catch (Throwable $e) {
            LoggerService::logError('ExpertDashboardAnalyticsController::index failed', [
                'error' => $e->getMessage(),
            ]);

            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to load dashboard analytics',
                'data' => [
                    'cards' => [],
                    'working_hours_trend' => [],
                    'task_status_ratio' => [],
                    'today_distribution' => [],
                    'daily_working_analytics' => ['summary' => [], 'rows' => []],
                ],
            ]);
        }
    }
    public function recalculateDurations($user): void {
        try {
            $userId = is_array($user) ? ($user['id'] ?? null) : ($user->id ?? null);
            if ($userId === null) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Unauthorized user',
                    'updated' => 0,
                    'skipped' => 0,
                ]);
                return;
            }

            $result = $this->analyticsService->recalculateCompletedTaskDurations((int)$userId);

            echo json_encode([
                'success' => true,
                'message' => 'Duration recalculation completed successfully',
                'updated' => (int)($result['updated'] ?? 0),
                'skipped' => (int)($result['skipped'] ?? 0),
            ]);
        } catch (Throwable $e) {
            LoggerService::logError('ExpertDashboardAnalyticsController::recalculateDurations failed', [
                'error' => $e->getMessage(),
            ]);

            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to recalculate task durations',
                'updated' => 0,
                'skipped' => 0,
            ]);
        }
    }

}
