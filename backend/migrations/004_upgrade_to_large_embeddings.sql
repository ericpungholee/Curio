-- CURRENT CONFIGURATION: text-embedding-3-small (1536 dimensions)
-- This is the production-ready configuration with best practices
--
-- Notes:
-- - text-embedding-3-large (3072 dims) exceeds HNSW 2000-dim limit
-- - Using text-embedding-3-small with L2 normalization and strict thresholds
-- - Match threshold: 0.85+ for quality results
-- - This file standardizes to 1536 dimensions
DROP INDEX IF EXISTS posts_embedding_idx;

ALTER TABLE posts DROP COLUMN IF EXISTS embedding;

ALTER TABLE posts ADD COLUMN embedding vector(1536);

-- Recreate HNSW index for new dimension
CREATE INDEX posts_embedding_idx ON posts USING hnsw (embedding vector_cosine_ops);

-- Recreate match_posts function with best practice thresholds
CREATE OR REPLACE FUNCTION match_posts(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.87,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    image_url text,
    created_at timestamp with time zone,
    author_id uuid,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        posts.id,
        posts.title,
        posts.content,
        posts.image_url,
        posts.created_at,
        posts.author_id,
        1 - (posts.embedding <=> query_embedding) as similarity
    FROM posts
    WHERE posts.embedding IS NOT NULL
    AND 1 - (posts.embedding <=> query_embedding) > match_threshold
    ORDER BY posts.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

