<?php
class ExternalInterviewService {
    public function __construct(private PDO $conn) {}
    private function tableColumns(string $table): array {
        try { return $this->conn->query("SHOW COLUMNS FROM `{$table}`")->fetchAll(PDO::FETCH_COLUMN); } catch (Throwable $e) { return []; }
    }
    private function activeSql(string $alias): string { return "({$alias}.status = 'active' OR {$alias}.status = 1 OR {$alias}.status = '1')"; }
    public function create(array $data): array {
        $errors = $this->validateCreate($data);
        if ($errors) return ['status'=>422,'error'=>'Validation failed.','errors'=>$errors];
        $candidate = $this->candidateByCode($data['candidate_code']);
        if (!$candidate) return ['status'=>404,'error'=>'Candidate not found.','errors'=>['Invalid candidate_code.']];
        $candidateCols = $this->tableColumns('candidates');
        if (in_array('status',$candidateCols,true) && !$this->isActiveValue($candidate['status'] ?? null)) return ['status'=>422,'error'=>'Candidate is inactive.','errors'=>['Candidate Active validation failed.']];
        if (empty($candidate['client_id'])) return ['status'=>422,'error'=>'Candidate client is missing.','errors'=>['Client Exists validation failed.']];
        $client = $this->fetchOne('SELECT * FROM clients WHERE id = ?', [$candidate['client_id']]);
        if (!$client || !$this->isActiveValue($client['status'] ?? 'active')) return ['status'=>422,'error'=>'Client not found or inactive.','errors'=>['Client Exists validation failed.']];
        $poc = $this->fetchOne('SELECT * FROM client_pocs WHERE client_id = ? AND status = ? ORDER BY id ASC LIMIT 1', [$candidate['client_id'], 'active']);
        if (!$poc) return ['status'=>422,'error'=>'Active Client POC not found.','errors'=>['Active Client POC Exists validation failed.']];
        $taskType = $this->fetchOne("SELECT * FROM task_types WHERE status = 'active' AND LOWER(name) LIKE '%interview%' ORDER BY id ASC LIMIT 1", []);
        if (!$taskType) return ['status'=>422,'error'=>'Interview task type not found.','errors'=>['Task Type Exists validation failed.']];
        $status = $this->fetchOne("SELECT * FROM task_status_master WHERE status = 'active' AND LOWER(name) = 'pending' LIMIT 1", []);
        if (!$status) return ['status'=>422,'error'=>'Pending status not found.','errors'=>['Status Exists validation failed.']];
        $time = $this->normalizeTime($data['interview_time']);
        $round = $this->clean($data['round']);
        $dup = $this->fetchOne('SELECT id FROM tasks WHERE candidate_id = ? AND due_date = ? AND start_time = ? AND description LIKE ? LIMIT 1', [(int)$candidate['id'], $data['interview_date'], $time, '%Round: '.$round.'%']);
        if ($dup) return ['status'=>409,'error'=>'Duplicate interview already exists.','errors'=>['Same candidate/date/time/round already exists.']];
        $duration = 60;
        $end = (new DateTime($data['interview_date'].' '.$time))->modify("+{$duration} minutes")->format('H:i:s');
        $desc = $this->description($data);
        $this->conn->beginTransaction();
        $stmt = $this->conn->prepare('INSERT INTO tasks (client_id, candidate_id, poc_id, task_type_id, status_id, title, description, due_date, start_time, end_time, duration, total_amount, payment_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)');
        $stmt->execute([(int)$candidate['client_id'], (int)$candidate['id'], (int)$poc['id'], (int)$taskType['id'], (int)$status['id'], $this->clean($data['interview_title']), $desc, $data['interview_date'], $time, $end, $duration, 'External API']);
        $taskId = (int)$this->conn->lastInsertId();
        $assigneeId = $this->defaultAssigneeId();
        if ($assigneeId) $this->insertAssignment($taskId, $assigneeId);
        $comment = $this->conn->prepare('INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, NULL, ?)');
        $comment->execute([$taskId, 'Interview created through External API.']);
        $this->conn->commit();
        return ['status'=>201,'data'=>['task_id'=>$taskId,'task_number'=>'TSK-'.date('Y').'-'.$taskId,'candidate_code'=>$data['candidate_code'],'status'=>'Pending']];
    }
    private function validateCreate(array $d): array {
        $e=[]; foreach(['candidate_code','interview_title','interview_date','interview_time'] as $f) if (empty($d[$f])) $e[]="$f is required.";
        if (!empty($d['candidate_code']) && !preg_match('/^[A-Z0-9-]{3,100}$/i',$d['candidate_code'])) $e[]='candidate_code is invalid.';
        if (!empty($d['interview_date'])) { $dt=DateTime::createFromFormat('Y-m-d',$d['interview_date']); if(!$dt||$dt->format('Y-m-d')!==$d['interview_date']) $e[]='interview_date must be YYYY-MM-DD.'; }
        if (!empty($d['interview_time']) && !$this->normalizeTime($d['interview_time'])) $e[]='interview_time is invalid.';
        return $e;
    }
    private function normalizeTime(string $t): ?string { foreach(['h:i A','H:i','H:i:s'] as $f){ $d=DateTime::createFromFormat($f,trim($t)); if($d) return $d->format('H:i:s'); } return null; }
    private function clean($v): string { return trim(strip_tags((string)$v)); }
    private function description(array $d): string { return implode("\n", ['Source: External API','Round: '.$this->clean($d['round']??''),'Technology: '.$this->clean($d['technology']??''),'Timezone: '.$this->clean($d['timezone']??''),'Meeting Link: '.$this->clean($d['meeting_link']??''),'Remarks: '.$this->clean($d['remarks']??'')]); }
    private function candidateByCode(string $code): ?array { return $this->fetchOne('SELECT * FROM candidates WHERE candidate_code = ? LIMIT 1', [$code]); }
    private function fetchOne(string $sql, array $p): ?array { $s=$this->conn->prepare($sql); $s->execute($p); $r=$s->fetch(PDO::FETCH_ASSOC); return $r?:null; }
    private function isActiveValue($v): bool { return $v === null || $v === 1 || $v === '1' || strtolower((string)$v)==='active'; }
    private function defaultAssigneeId(): ?int { $r=$this->fetchOne("SELECT id FROM users WHERE status = 'active' ORDER BY CASE WHEN id = 1 THEN 0 ELSE 1 END, id ASC LIMIT 1",[]); return $r?(int)$r['id']:null; }
    private function insertAssignment(int $taskId, int $userId): void { $this->conn->prepare('INSERT INTO task_assignments (task_id, user_id, is_active, assigned_by) VALUES (?, ?, 1, NULL)')->execute([$taskId,$userId]); }
    public function details(?int $taskId, ?string $code): array {
        if (!$taskId && !$code) return ['status'=>422,'error'=>'task_id or candidate_code is required.','errors'=>['Missing query parameter.']];
        $where=$taskId?'t.id = ?':'c.candidate_code = ?'; $params=[$taskId ?: $code];
        $sql="SELECT t.*, c.candidate_code, c.name candidate_name, c.email candidate_email, cl.name client_name, cl.company_name, cp.name poc_name, cp.email poc_email, ts.name status_name, tt.name task_type FROM tasks t LEFT JOIN candidates c ON c.id=t.candidate_id LEFT JOIN clients cl ON cl.id=t.client_id LEFT JOIN client_pocs cp ON cp.id=t.poc_id LEFT JOIN task_status_master ts ON ts.id=t.status_id LEFT JOIN task_types tt ON tt.id=t.task_type_id WHERE {$where} ORDER BY t.due_date DESC,t.start_time DESC,t.id DESC";
        $s=$this->conn->prepare($sql); $s->execute($params); $rows=$s->fetchAll(PDO::FETCH_ASSOC);
        if (!$rows) return ['status'=>404,'error'=>'Interview not found.','errors'=>[]];
        $items=array_map(fn($r)=>$this->hydrate($r),$rows);
        return ['status'=>200,'data'=>$taskId?$items[0]:$items];
    }
    public function latest(string $code): array { $r=$this->details(null,$code); if(($r['status']??0)!==200) return $r; $d=$r['data']; return ['status'=>200,'data'=>$d[0]??null]; }
    public function status(string $code): array { $r=$this->latest($code); if(($r['status']??0)!==200) return $r; return ['status'=>200,'data'=>['candidate_code'=>$code,'task_id'=>$r['data']['task']['id']??null,'status'=>$r['data']['current_status']??null,'updated_date'=>$r['data']['task']['updated_at']??null]]; }
    private function hydrate(array $r): array { $id=(int)$r['id']; return ['candidate'=>['code'=>$r['candidate_code'],'name'=>$r['candidate_name'],'email'=>$r['candidate_email']], 'company'=>['name'=>$r['company_name']], 'client'=>['id'=>$r['client_id'],'name'=>$r['client_name']], 'client_poc'=>['id'=>$r['poc_id'],'name'=>$r['poc_name'],'email'=>$r['poc_email']], 'interview'=>['title'=>$r['title'],'date'=>$r['due_date'],'time'=>$r['start_time'],'details'=>$r['description']], 'task'=>['id'=>$id,'task_number'=>'TSK-'.date('Y',strtotime($r['created_at']??'now')).'-'.$id,'type'=>$r['task_type'],'created_at'=>$r['created_at'],'updated_at'=>$r['updated_at']??null,'completed_at'=>$r['task_end_time']??null], 'current_status'=>$r['status_name'], 'status_history'=>[], 'assignment_history'=>$this->children('SELECT ta.*, u.name user_name FROM task_assignments ta LEFT JOIN users u ON u.id=ta.user_id WHERE ta.task_id=? ORDER BY ta.id ASC',$id), 'comments'=>$this->children('SELECT * FROM task_comments WHERE task_id=? ORDER BY id ASC',$id), 'feedback'=>$this->children('SELECT * FROM task_feedback WHERE task_id=? ORDER BY id ASC',$id), 'result'=>$r['status_name']]; }
    private function children(string $sql,int $id): array { $s=$this->conn->prepare($sql); $s->execute([$id]); return $s->fetchAll(PDO::FETCH_ASSOC); }
}
