# Dynamic Task Feedback Engine

## Architecture

The engine keeps task type ownership in the task module and never duplicates it in
`task_feedback`:

```text
task_feedback.task_id -> tasks.task_type_id -> task_types.name
```

`FeedbackController` retains the existing `/feedback` endpoints and transaction
boundaries. `FeedbackRepository` owns prepared SQL and task-type lookup.
`FeedbackService` applies the centralized configuration, filters hidden fields,
validates visible fields, calculates `overall`, and formats responses.
`FeedbackModel` serializes and maps the JSON field.

The React module uses the existing `feedbackApi.ts`, `FeedbackModal`, and
`FeedbackDetailModal`. API-provided `visible_fields` metadata drives view output;
the selected task type drives create output. Reports reuse the same detail content
rather than maintaining another feedback renderer.

## Database fields

The existing `task_feedback` table includes these nullable additions:

- `strengths` (`TEXT`)
- `recommendations` (`TEXT`)
- `next_action` (`VARCHAR(255)`)
- `additional_feedback` (`TEXT`)
- `custom_fields` (`JSON`)

Task-specific values live inside `custom_fields`. No task type or template is
stored on the feedback row.

## Existing API contract

No endpoint was added or renamed:

- `POST /feedback` creates feedback for the task identified by `task_id`.
- `GET /feedback/{task_id}` returns feedback and visible-field metadata.
- `GET /feedback` returns the authorized feedback list.

Interview Support retains its legacy flat fields and success response. Experts
are restricted to their active task assignments for create, view, and list
operations; the existing broader roles retain their prior access.

## Configuration

`api/config/feedback.php` is the source of truth for backend validation and score
calculation. Each task type specifies:

- canonical display name;
- visible fields and labels;
- field type and required state;
- column or custom JSON storage;
- rating bounds;
- fields included in `overall`.

Known database labels are normalized by `FeedbackService`, including
`Interview Support - Google Doc`, `Free Counseling Call`, and `Training`.

## Adding a task type

1. Add one entry to `api/config/feedback.php`.
2. Mark task-specific fields with `storage => custom`; do not add database
   columns for them.
3. List only rating fields that contribute to `overall` in `overall_fields`.
4. Add any production database label alias to `FeedbackService::normalizeTaskType`.
5. Mirror create-form section presentation in `feedbackApi.ts` until create
   configuration is supplied by an existing API response. View rendering already
   consumes API metadata and arbitrary custom fields.
6. Add create, update-preparation, formatting, hidden-field, and overall assertions
   to `api/tests/FeedbackServiceTest.php`.

Core controller, repository, model, routes, and database schema do not need to
change for an additional JSON-backed task type.

## Production verification

Before release:

1. Run `php api/tests/FeedbackServiceTest.php`.
2. Lint all PHP files.
3. Install UI dependencies using `npm ci` on a supported Node environment.
4. Run `npm run lint` and `npm run build` from `ui/`.
5. Smoke-test create and view with every configured task type.
6. Confirm a submitted feedback row disappears from the pending report and that
   manager, expert, candidate, and feedback reports show the same `overall`.
