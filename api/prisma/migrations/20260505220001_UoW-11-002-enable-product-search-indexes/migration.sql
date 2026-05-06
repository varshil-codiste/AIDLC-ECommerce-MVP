-- UoW-11 Migration 2: enable pgvector and tsvector search indexes
-- Idempotent (IF NOT EXISTS); safe to re-run

CREATE INDEX IF NOT EXISTS "product_search_index_embedding_ivfflat"
  ON "app"."product_search_index"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS "product_search_index_tsv_gin"
  ON "app"."product_search_index"
  USING gin ("tsv");
