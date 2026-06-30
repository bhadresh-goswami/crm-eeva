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
  "interview_time": "08:30 PM",
  "timezone": "IST",
  "round": "L1",
  "technology": "Java Full Stack",
  "meeting_link": "https://meet.google.com/abc",
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
    "task_number": "TSK-2026-845",
    "candidate_code": "BTC-APL-000001",
    "status": "Pending"
  }
}
```

Duplicate detection uses the same candidate, due date, start time, and interview round and returns HTTP `409`. Interview tasks are inserted with configured CRM defaults: `client_id = 5`, `poc_id = 5`, `task_type_id = 1` (`Interview Support - Google Doc`), pending task/payment status, 60-minute duration, zero total amount, `payment_mode = External API`, and `billing_status = completed`.

### Interview details

`GET /api/external/interviews?task_id=845`

Returns one interview with candidate, company, client, client POC, task, status, assignment history, comments, feedback, and result data.

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
    "candidate_code": "BTC-APL-000001",
    "task_id": 845,
    "status": "Pending",
    "updated_date": null
  }
}
```

## Database migration

Run `api/scripts/add_candidate_code.sql` once to add the nullable unique indexed `candidate_code` column to `candidates`.

## Task insert defaults

The external create API inserts all task table fields that are relevant for a new interview row. Auto-managed fields such as `id` and `created_at` are left to MySQL. Nullable payment/invoice/thread fields are explicitly inserted as `NULL` where no external value exists.

Defaults can be adjusted in `api/config/External/external_api.php` without touching the existing CRM routes or controllers.

## Logging

External API logs are written to `api/logs/external_api.log` and include request metadata, response, status, validation errors, IP, user agent, and execution time.
