CREATE TABLE goal_cycles (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analysis_run_id VARCHAR(36) NOT NULL REFERENCES analysis_runs(id),
    opportunity_id VARCHAR(36) NOT NULL,
    category_id BIGINT NOT NULL,
    lifecycle VARCHAR(20) NOT NULL CHECK (lifecycle IN ('OPEN', 'REVIEWED', 'STOPPED')),
    open_owner_id BIGINT UNIQUE,
    previous_cycle_id VARCHAR(36) REFERENCES goal_cycles(id),
    idempotency_key VARCHAR(36) NOT NULL,
    cycle_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_goal_cycles_request UNIQUE(user_id, idempotency_key),
    CONSTRAINT chk_goal_cycles_open_owner CHECK (
        (lifecycle = 'OPEN' AND open_owner_id IS NOT NULL AND open_owner_id = user_id)
        OR (lifecycle <> 'OPEN' AND open_owner_id IS NULL)
    )
);
CREATE TABLE goal_evaluations (
    id VARCHAR(36) PRIMARY KEY,
    goal_id VARCHAR(36) NOT NULL REFERENCES goal_cycles(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_revision VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(36) NOT NULL,
    evaluation_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_goal_evaluations_request UNIQUE(user_id, idempotency_key)
);
CREATE INDEX idx_goal_cycles_owner_created ON goal_cycles(user_id, created_at DESC);
CREATE INDEX idx_goal_evaluations_goal_created ON goal_evaluations(goal_id, created_at DESC);
COMMENT ON TABLE goal_cycles IS '기준 소비와 사용자 선택 목표를 고정한 변화 Cycle';
COMMENT ON TABLE goal_evaluations IS '확인한 카드 내역의 관측 결과. 이전 결과를 덮어쓰지 않음';
