UPDATE task_assignments
SET is_active = 0
WHERE id NOT IN (
  SELECT latest_id FROM (
    SELECT MAX(id) AS latest_id
    FROM task_assignments
    GROUP BY task_id
  ) temp
);

UPDATE task_assignments ta
JOIN (
  SELECT MAX(id) AS latest_id
  FROM task_assignments
  GROUP BY task_id
) latest ON latest.latest_id = ta.id
SET ta.is_active = 1;
