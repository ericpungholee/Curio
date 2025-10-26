-- Create a function for semantic search on posts using pgvector
-- This function performs cosine similarity search and returns the most similar posts
CREATE OR REPLACE FUNCTION match_posts(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
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

