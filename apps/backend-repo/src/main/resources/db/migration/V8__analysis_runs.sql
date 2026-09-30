CREATE TABLE analysis_runs (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_revision VARCHAR(64) NOT NULL,
    basis_version VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL,
    run_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_analysis_runs_owner_created ON analysis_runs(user_id, created_at DESC, id);
COMMENT ON TABLE analysis_runs IS '서버 소비 Snapshot과 검증된 Evidence 해석 및 Opportunity';
