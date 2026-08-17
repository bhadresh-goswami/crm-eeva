<?php

require_once dirname(__DIR__) . "/config/database.php";
require_once dirname(__DIR__) . "/services/FeedbackEligibility.php";

class ExpertReportsController {
    public function daily($authUser): void {
        try {
            $userId = is_array($authUser) ? (int)($authUser['id'] ?? 0) : (int)($authUser->id ?? 0);
            $date = trim((string)($_GET['report_date'] ?? ''));
            $parsed = DateTime::createFromFormat('!Y-m-d', $date ?: (new DateTime('now', new DateTimeZone('Asia/Kolkata')))->format('Y-m-d'));
            if (!$parsed || ($date !== '' && $parsed->format('Y-m-d') !== $date)) { throw new InvalidArgumentException('report_date must use YYYY-MM-DD format'); }
            $date = $parsed->format('Y-m-d');
            $conn = (new Database())->connect();
            $stmt = $conn->prepare("SELECT t.id, t.title, t.description, DATE(t.due_date) task_date, COALESCE(c.name,'') candidate_name, COALESCE(tt.name,'Unspecified') task_type, COALESCE(ts.name,'Pending') status_name, t.start_time, t.end_time, t.task_start_time, t.task_end_time, COALESCE(t.duration,0) duration, COALESCE(tf.area_of_improvements,'') feedback, COALESCE(tf.overall,0) feedback_score FROM tasks t INNER JOIN task_assignments ta ON ta.task_id=t.id AND ta.user_id=? LEFT JOIN candidates c ON c.id=t.candidate_id LEFT JOIN task_types tt ON tt.id=t.task_type_id LEFT JOIN task_status_master ts ON ts.id=t.status_id LEFT JOIN task_feedback tf ON tf.task_id=t.id WHERE DATE(t.due_date)=? GROUP BY t.id ORDER BY t.start_time,t.id");
            $stmt->execute([$userId, $date]); $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $summary = ['assigned'=>count($tasks),'completed'=>0,'pending'=>0,'cancelled'=>0,'scheduled_minutes'=>0,'actual_minutes'=>0]; $types=[]; $positive=[]; $negative=[]; $eligible=0; $successful=0;
            foreach ($tasks as &$task) {
                $status=strtolower(trim((string)$task['status_name']));
                if (in_array($status,['completed','success'],true)) $summary['completed']++; elseif (str_contains($status,'cancel') || str_contains($status,'reschedul')) $summary['cancelled']++; else $summary['pending']++;
                $type=(string)$task['task_type']; $types[$type]=($types[$type]??0)+1;
                $minutes=function($a,$b){ if(!$a||!$b)return 0; try{return max(0,(int)round(((new DateTime($b))->getTimestamp()-(new DateTime($a))->getTimestamp())/60));}catch(Throwable $e){return 0;} };
                $task['planned_minutes']=$minutes($task['start_time'],$task['end_time']); $actual=$minutes($task['task_start_time'],$task['task_end_time']); $task['actual_minutes']=$actual ?: max(0,(int)$task['duration']);
                $summary['scheduled_minutes']+=$task['planned_minutes']; $summary['actual_minutes']+=$task['actual_minutes'];
                if (in_array($status,['success','rejected'],true)) { $eligible++; if($status==='success')$successful++; }
                $feedback=trim(strip_tags((string)$task['feedback'])); if($feedback!=='') { $item=['text'=>$feedback,'task_type'=>$type,'candidate_name'=>$task['candidate_name']]; if((float)$task['feedback_score']>=3.5)$positive[]=$item; else $negative[]=$item; }
            } unset($task); ksort($types);
            $breakStmt=$conn->prepare("SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE,break_in_time,CASE WHEN break_out_time IS NOT NULL THEN break_out_time WHEN status='break' AND created_date=CURDATE() THEN NOW() ELSE break_in_time END)),0) FROM user_sessions WHERE user_id=? AND created_date=?"); $breakStmt->execute([$userId,$date]);
            $delivery=$conn->prepare("SELECT status,sent_at FROM technical_expert_daily_report_deliveries WHERE user_id=? AND report_date=? LIMIT 1"); $delivery->execute([$userId,$date]); $sent=$delivery->fetch(PDO::FETCH_ASSOC) ?: null;
            $userStmt=$conn->prepare('SELECT name,email FROM users WHERE id=?'); $userStmt->execute([$userId]); $expert=$userStmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success'=>true,'data'=>['report_date'=>$date,'expert'=>$expert,'summary'=>$summary,'task_types'=>$types,'tasks'=>$tasks,'break_minutes'=>(int)$breakStmt->fetchColumn(),'success_ratio'=>['eligible'=>$eligible,'successful'=>$successful,'other'=>$eligible-$successful,'percentage'=>$eligible?round($successful/$eligible*100):null],'positive_feedback'=>array_slice($positive,0,3),'negative_feedback'=>array_slice($negative,0,3),'delivery'=>$sent]]);
        } catch (Throwable $e) { http_response_code(500); echo json_encode(['success'=>false,'message'=>$e->getMessage()]); }
    }
    private function getStatusIdByName(PDO $conn, string $name): ?int {
        $stmt = $conn->prepare("SELECT id FROM task_status_master WHERE LOWER(name) = LOWER(?) LIMIT 1");
        $stmt->execute([$name]);
        $id = (int)$stmt->fetchColumn();

        return $id > 0 ? $id : null;
    }

    private function repairFeedbackCompletedTasks(PDO $conn, int $expertUserId): void {
        $completedStatusId = $this->getStatusIdByName($conn, 'Completed');
        $inProgressStatusId = $this->getStatusIdByName($conn, 'In Progress');

        if ($completedStatusId === null || $inProgressStatusId === null) {
            return;
        }

        $selectStmt = $conn->prepare("
            SELECT t.id, COALESCE(tf.created_at, NOW()) AS completed_at
            FROM tasks t
            INNER JOIN task_assignments ta ON ta.id = (
                SELECT ta2.id FROM task_assignments ta2
                WHERE ta2.task_id = t.id
                  AND ta2.is_active = 1
                ORDER BY ta2.id DESC LIMIT 1
            )
            INNER JOIN task_feedback tf ON tf.task_id = t.id
            WHERE ta.user_id = ?
              AND t.status_id = ?
        ");
        $selectStmt->execute([$expertUserId, $inProgressStatusId]);
        $rows = $selectStmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$rows) {
            return;
        }

        $updateStmt = $conn->prepare("
            UPDATE tasks
            SET status_id = ?,
                task_end_time = COALESCE(task_end_time, ?),
                duration = CASE
                    WHEN task_start_time IS NOT NULL THEN GREATEST(TIMESTAMPDIFF(MINUTE, task_start_time, COALESCE(task_end_time, ?)), 0)
                    ELSE duration
                END
            WHERE id = ?
        ");

        foreach ($rows as $row) {
            $completedAt = (string)($row['completed_at'] ?? '');
            $updateStmt->execute([$completedStatusId, $completedAt, $completedAt, (int)$row['id']]);
        }
    }

    public function index($authUser): void {
        try {
            $db = new Database();
            $conn = $db->connect();

            $expertUserId = is_array($authUser) ? (int)($authUser['id'] ?? 0) : (int)($authUser->id ?? 0);
            if ($expertUserId <= 0) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'Unauthorized']);
                return;
            }

            $this->repairFeedbackCompletedTasks($conn, $expertUserId);

            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(1, min(500, (int)($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;
            $candidateName = trim((string)($_GET['candidate_name'] ?? ''));
            $taskType = trim((string)($_GET['task_type'] ?? ''));
            $statusName = trim((string)($_GET['status_name'] ?? ''));
            $dateFrom = trim((string)($_GET['date_from'] ?? ''));
            $dateTo = trim((string)($_GET['date_to'] ?? ''));
            $search = trim((string)($_GET['search'] ?? ''));
            $feedbackStatus = strtolower(trim((string)($_GET['feedback_status'] ?? '')));
            $feedbackGroup = strtolower(trim((string)($_GET['feedback_group'] ?? '')));

            $where = ["ta.user_id = ?"];
            $params = [$expertUserId];
            if ($candidateName !== '') { $where[] = "LOWER(COALESCE(c.name, '')) = LOWER(?)"; $params[] = $candidateName; }
            if ($taskType !== '') { $where[] = "LOWER(COALESCE(tt.name, '')) = LOWER(?)"; $params[] = $taskType; }
            if ($statusName !== '') { $where[] = "LOWER(COALESCE(ts.name, '')) = LOWER(?)"; $params[] = $statusName; }
            if ($dateFrom !== '') { $where[] = 'DATE(CASE WHEN tf.id IS NULL THEN t.due_date ELSE tf.created_at END) >= ?'; $params[] = $dateFrom; }
            if ($dateTo !== '') { $where[] = 'DATE(CASE WHEN tf.id IS NULL THEN t.due_date ELSE tf.created_at END) <= ?'; $params[] = $dateTo; }
            if ($search !== '') {
                $where[] = "(LOWER(COALESCE(c.name, '')) LIKE LOWER(?) OR LOWER(COALESCE(tt.name, '')) LIKE LOWER(?) OR LOWER(COALESCE(ex.name, '')) LIKE LOWER(?) OR CAST(t.id AS CHAR) LIKE ?)";
                $term = '%' . $search . '%';
                array_push($params, $term, $term, $term, $term);
            }
            $eligibleSql = FeedbackEligibility::sql('tt.name', 'ts.name');
            if ($feedbackStatus === 'pending') { $where[] = "({$eligibleSql}) AND tf.id IS NULL"; }
            if ($feedbackStatus === 'submitted') { $where[] = 'tf.id IS NOT NULL'; }
            if ($feedbackGroup === 'pending') {
                $where[] = "({$eligibleSql}) AND tf.id IS NULL";
            } elseif ($feedbackGroup === 'week') {
                $where[] = "tf.id IS NOT NULL AND YEARWEEK(tf.created_at, 1) = YEARWEEK(CURDATE(), 1)";
            } elseif ($feedbackGroup === 'month') {
                $where[] = "tf.id IS NOT NULL AND YEAR(tf.created_at) = YEAR(CURDATE()) AND MONTH(tf.created_at) = MONTH(CURDATE()) AND YEARWEEK(tf.created_at, 1) <> YEARWEEK(CURDATE(), 1)";
            } elseif ($feedbackGroup === 'earlier') {
                $where[] = "tf.id IS NOT NULL AND (YEAR(tf.created_at) <> YEAR(CURDATE()) OR MONTH(tf.created_at) <> MONTH(CURDATE()))";
            }
            $whereClause = implode(' AND ', $where);

            $baseFrom = "
                FROM tasks t
                LEFT JOIN task_assignments ta ON ta.id = (
                    SELECT ta2.id FROM task_assignments ta2
                    WHERE ta2.task_id = t.id
                      AND ta2.is_active = 1
                    ORDER BY ta2.id DESC LIMIT 1
                )
                LEFT JOIN users ex ON ex.id = ta.user_id
                LEFT JOIN candidates c ON c.id = t.candidate_id
                LEFT JOIN task_status_master ts ON ts.id = t.status_id
                LEFT JOIN task_types tt ON tt.id = t.task_type_id
                LEFT JOIN task_feedback tf ON tf.task_id = t.id
                WHERE {$whereClause}
            ";

            $countStmt = $conn->prepare("SELECT COUNT(DISTINCT t.id) {$baseFrom}");
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();
            $pages = max(1, (int)ceil($total / $limit));
            $limitClause = $feedbackGroup === 'pending' ? '' : "LIMIT {$limit} OFFSET {$offset}";

            $listSql = "
                SELECT
                    t.id AS task_id,
                    DATE(t.due_date) AS task_date,
                    COALESCE(c.name, '') AS candidate_name,
                    COALESCE(ex.name, '') AS expert_name,
                    COALESCE(tt.name, '') AS task_type,
                    COALESCE(ts.name, '') AS status_name,
                    COALESCE(t.start_time, '') AS ist_start_time,
                    COALESCE(t.end_time, '') AS ist_end_time,
                    COALESCE(t.duration, 0) AS duration,
                    CASE
                        WHEN tf.id IS NOT NULL THEN 'Submitted'
                        WHEN {$eligibleSql} THEN 'Pending'
                        ELSE 'Not Available'
                    END AS feedback_status,
                    DATE_FORMAT(tf.created_at, '%Y-%m-%d %H:%i') AS feedback_submitted_at,
                    t.created_at,
                    tf.id AS feedback_id
                {$baseFrom}
                ORDER BY COALESCE(tf.created_at, t.due_date) DESC, t.created_at DESC
                {$limitClause}
            ";
            $stmt = $conn->prepare($listSql);
            $stmt->execute($params);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $badgeStmt = $conn->prepare("SELECT COALESCE(tt.name,'Unknown') AS task_type, COUNT(*) AS total {$baseFrom} GROUP BY COALESCE(tt.name,'Unknown') ORDER BY task_type ASC");
            $badgeStmt->execute($params);
            $badges = $badgeStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => ['items' => $items, 'task_type_counts' => $badges, 'pagination' => ['current_page' => $page, 'total_pages' => $pages, 'total_records' => $total, 'per_page' => $limit]]]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}
