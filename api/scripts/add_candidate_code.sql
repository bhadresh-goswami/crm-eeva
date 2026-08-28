ALTER TABLE candidates
    ADD COLUMN candidate_code VARCHAR(100) NULL,
    ADD UNIQUE KEY uq_candidates_candidate_code (candidate_code),
    ADD INDEX idx_candidates_candidate_code (candidate_code);
