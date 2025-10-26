-- Enable the pgvector extension for vector similarity search
-- This migration enables the pgvector extension which allows storing and querying vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

