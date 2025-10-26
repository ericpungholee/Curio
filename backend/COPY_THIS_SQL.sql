-- COPY AND PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR
-- Then click "Run" button

-- Step 1: Drop the old index
DROP INDEX IF EXISTS posts_embedding_idx;

-- Step 2: Drop the old 1536-dimensional embedding column
ALTER TABLE posts DROP COLUMN IF EXISTS embedding;

-- Step 3: Create new 3072-dimensional embedding column
ALTER TABLE posts ADD COLUMN embedding vector(3072);

-- Step 4: Create IVFFlat index (supports dimensions up to 65535)
CREATE INDEX posts_embedding_idx ON posts USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 5: Update the match_posts function to use 3072 dimensions
CREATE OR REPLACE FUNCTION match_posts(
    query_embedding vector(3072),
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

-- DONE! Now regenerate embeddings by running:
-- python regenerate_embeddings_for_upgrade.py

