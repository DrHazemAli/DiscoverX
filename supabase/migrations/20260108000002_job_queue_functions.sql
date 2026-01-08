-- ============================================================================
-- DISCOVER: Job Queue Functions
-- Description: Functions for safe concurrent job dequeuing and management
-- Version: 1.0.0
-- Created: 2026-01-08
-- ============================================================================

-- ============================================================================
-- DEQUEUE JOBS FUNCTION
-- Description: Safely dequeue jobs for processing with SKIP LOCKED
-- Parameters:
--   p_batch_size: Number of jobs to dequeue (default 10)
--   p_worker_id: Identifier for the worker claiming the jobs
--   p_job_types: Optional array of job types to filter (NULL = all types)
-- Returns: Set of dequeued jobs
-- ============================================================================
CREATE OR REPLACE FUNCTION dequeue_jobs(
    p_batch_size INTEGER DEFAULT 10,
    p_worker_id TEXT DEFAULT 'worker-' || gen_random_uuid()::text,
    p_job_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    payload JSONB,
    attempt INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH locked_jobs AS (
        SELECT j.id
        FROM job_queue j
        WHERE j.status = 'queued'
          AND j.run_at <= NOW()
          AND (p_job_types IS NULL OR j.type = ANY(p_job_types))
        ORDER BY j.priority ASC, j.run_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE job_queue jq
    SET 
        status = 'running',
        locked_at = NOW(),
        locked_by = p_worker_id,
        started_at = NOW(),
        attempt = jq.attempt + 1
    FROM locked_jobs lj
    WHERE jq.id = lj.id
    RETURNING 
        jq.id,
        jq.type::TEXT,
        jq.payload,
        jq.attempt,
        jq.created_at;
END;
$$;

-- ============================================================================
-- COMPLETE JOB FUNCTION
-- Description: Mark a job as completed successfully
-- Parameters:
--   p_job_id: ID of the job to complete
--   p_result: Optional result data to store
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_job(
    p_job_id UUID,
    p_result JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE job_queue
    SET 
        status = 'done',
        result = p_result,
        completed_at = NOW(),
        locked_at = NULL,
        locked_by = NULL
    WHERE id = p_job_id
      AND status = 'running';
    
    RETURN FOUND;
END;
$$;

-- ============================================================================
-- FAIL JOB FUNCTION
-- Description: Mark a job as failed, with optional retry
-- Parameters:
--   p_job_id: ID of the job that failed
--   p_error: Error message to store
--   p_retry: Whether to retry the job (default true)
-- ============================================================================
CREATE OR REPLACE FUNCTION fail_job(
    p_job_id UUID,
    p_error TEXT,
    p_retry BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_attempt INTEGER;
    v_max_attempts INTEGER;
BEGIN
    -- Get current attempt count
    SELECT attempt, max_attempts 
    INTO v_attempt, v_max_attempts
    FROM job_queue 
    WHERE id = p_job_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if we should retry
    IF p_retry AND v_attempt < v_max_attempts THEN
        -- Requeue for retry with exponential backoff
        UPDATE job_queue
        SET 
            status = 'queued',
            last_error = p_error,
            locked_at = NULL,
            locked_by = NULL,
            run_at = NOW() + (POWER(2, v_attempt) || ' minutes')::INTERVAL
        WHERE id = p_job_id;
    ELSE
        -- Mark as permanently failed
        UPDATE job_queue
        SET 
            status = 'failed',
            last_error = p_error,
            completed_at = NOW(),
            locked_at = NULL,
            locked_by = NULL
        WHERE id = p_job_id;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- ============================================================================
-- ENQUEUE JOB FUNCTION
-- Description: Add a new job to the queue
-- Parameters:
--   p_type: Job type identifier
--   p_payload: Job payload data
--   p_priority: Job priority (1-5, lower = higher priority)
--   p_run_at: When to run the job (default NOW)
--   p_max_attempts: Maximum retry attempts
-- Returns: ID of the created job
-- ============================================================================
CREATE OR REPLACE FUNCTION enqueue_job(
    p_type TEXT,
    p_payload JSONB DEFAULT '{}',
    p_priority INTEGER DEFAULT 3,
    p_run_at TIMESTAMPTZ DEFAULT NOW(),
    p_max_attempts INTEGER DEFAULT 3
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_id UUID;
BEGIN
    INSERT INTO job_queue (type, payload, priority, run_at, max_attempts)
    VALUES (p_type, p_payload, p_priority, p_run_at, p_max_attempts)
    RETURNING id INTO v_job_id;
    
    RETURN v_job_id;
END;
$$;

-- ============================================================================
-- CLEANUP STALE JOBS FUNCTION
-- Description: Reset jobs that have been locked for too long (crashed workers)
-- Parameters:
--   p_stale_threshold: How long before a locked job is considered stale (default 30 min)
-- Returns: Number of jobs reset
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_stale_jobs(
    p_stale_threshold INTERVAL DEFAULT '30 minutes'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH stale_jobs AS (
        SELECT id
        FROM job_queue
        WHERE status = 'running'
          AND locked_at < NOW() - p_stale_threshold
    )
    UPDATE job_queue jq
    SET 
        status = 'queued',
        locked_at = NULL,
        locked_by = NULL,
        last_error = 'Job was stale and reset for retry'
    FROM stale_jobs sj
    WHERE jq.id = sj.id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- ============================================================================
-- GET JOB STATS FUNCTION
-- Description: Get statistics about the job queue
-- Returns: JSON object with queue statistics
-- ============================================================================
CREATE OR REPLACE FUNCTION get_job_stats()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'queued', COUNT(*) FILTER (WHERE status = 'queued'),
        'running', COUNT(*) FILTER (WHERE status = 'running'),
        'done', COUNT(*) FILTER (WHERE status = 'done'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'total', COUNT(*),
        'by_type', (
            SELECT jsonb_object_agg(type, cnt)
            FROM (
                SELECT type, COUNT(*) as cnt
                FROM job_queue
                WHERE status = 'queued'
                GROUP BY type
            ) t
        )
    ) INTO v_stats
    FROM job_queue;
    
    RETURN v_stats;
END;
$$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON FUNCTION dequeue_jobs IS 'Safely dequeue jobs for processing with SKIP LOCKED';
COMMENT ON FUNCTION complete_job IS 'Mark a job as completed successfully';
COMMENT ON FUNCTION fail_job IS 'Mark a job as failed, with optional retry';
COMMENT ON FUNCTION enqueue_job IS 'Add a new job to the queue';
COMMENT ON FUNCTION cleanup_stale_jobs IS 'Reset jobs that have been locked for too long';
COMMENT ON FUNCTION get_job_stats IS 'Get statistics about the job queue';
