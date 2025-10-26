-- Add embedding column to posts table
-- This column will store OpenAI embeddings (1536 dimensions for text-embedding-3-small)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create an index for vector similarity search
-- This uses HNSW (Hierarchical Navigable Small World) algorithm for fast similarity search
CREATE INDEX IF NOT EXISTS posts_embedding_idx ON posts USING hnsw (embedding vector_cosine_ops);

