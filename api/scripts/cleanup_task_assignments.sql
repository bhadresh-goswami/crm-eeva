-- Audit duplicate active assignment history rows before cleanup.
SELECT
    task_id,
    COUNT(*) AS active_assignment_count,
    GROUP_CONCAT(user_id ORDER BY id ASC) AS active_user_ids
FROM task_assignments
WHERE is_active = 1
GROUP BY task_id
HAVING COUNT(*) > 1;

-- One-time cleanup: keep only the latest assignment history row active per task.
UPDATE task_assignments ta
INNER JOIN (
    SELECT
        task_id,
        MAX(id) AS latest_assignment_id
    FROM task_assignments
    GROUP BY task_id
) latest
    ON latest.task_id = ta.task_id
SET ta.is_active =
    CASE
        WHEN ta.id = latest.latest_assignment_id THEN 1
        ELSE 0
    END;
