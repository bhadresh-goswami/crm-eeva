# External Integration API

Isolated module for third-party CRM integrations. It is mounted under `/api/external/*` and uses only `X-API-KEY` authentication.

## Authentication

Send the plain shared key in the `X-API-KEY` header. Source stores only the SHA-256 hash in `api/config/External/external_api.php`, or in `EXTERNAL_API_KEY_HASH` when provided by the environment.

## Response format

Success:

```json
{ "success": true, "message": "", "data": {} }
```

Error:

```json
{ "success": false, "message": "", "errors": [] }
```

## Endpoints

### Create interview

`POST /api/external/interviews`

Headers:

```http
Content-Type: application/json
X-API-KEY: <shared-key>
```

Request:

```json
{
  "candidate_code": "BTC-APL-000001",
  "interview_title": "Java Technical Round",
  "interview_date": "2026-07-08",
  "interview_time": "20:30:00",
  "timezone": "IST",
  "round": "L1",
  "technology": "Java Full Stack",
  "remarks": "Interview scheduled from external application"
}
```

Response:

```json
{
  "success": true,
  "message": "Interview task created successfully.",
  "data": {
    "task_id": 845,
    "candidate_code": "BTC-APL-000001",
    "status": "Pending"
  }
}
```

Duplicate detection uses the same candidate, task type, due date, start time, and title and returns HTTP `409`.

### Task insert mapping

The create API uses only existing `tasks` columns. It maps candidate/client/POC/task type/status to CRM records and stores external interview metadata in `tasks.description` as structured text.

Inserted task values:

- `client_id`: candidate's `client_id`
- `candidate_id`: CRM candidate id found by `candidate_code`
- `poc_id`: first active Client POC for the candidate's client
- `task_type_id`: active `Interview Support - Google Doc` task type, falling back to first active interview task type
- `status_id`: active `Pending` status
- `title`: `interview_title`
- `description`: source, candidate code, round, technology, timezone, and remarks
- `due_date`: `interview_date`
- `start_time`: `interview_time`
- `end_time`, `task_start_time`, `task_end_time`, `duration`, payment/invoice/thread fields: `NULL`
- `total_amount`: `0.00`
- `billing_status`: `completed`
- `created_at`: database default timestamp

### Interview details

`GET /api/external/interviews?task_id=845`

Returns one interview with useful business data for candidate, company, client, client POC, interview, task, current status, comments, feedback, and result.

`GET /api/external/interviews?candidate_code=BTC-APL-000001`

Returns complete interview history for the candidate code.

### Latest interview

`GET /api/external/interviews/latest?candidate_code=BTC-APL-000001`

Returns the newest interview for the candidate.

### Interview history

`GET /api/external/interviews/history?candidate_code=BTC-APL-000001`

Returns complete interview history for the candidate.

### Latest interview status

`GET /api/external/interviews/status?candidate_code=BTC-APL-000001`

Response:

```json
{
  "success": true,
  "message": "Latest interview status fetched successfully.",
  "data": {
    "task_id": 845,
    "current_status": "Pending",
    "updated_date": "2026-07-08 20:30:00"
  }
}
```

## Database migration

Run `api/scripts/add_candidate_code.sql` once to add the nullable unique indexed `candidate_code` column to `candidates`.

## Logging

External API logs are written to `api/logs/external_api.log` and include timestamp, API, IP address, candidate code, HTTP method, request body, response, execution time, HTTP status, and validation errors.
