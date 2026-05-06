-- Migration: add_quoted_post_relation
-- Quote posts use quotedPostId instead of parentId
-- This separates quote posts from replies

BEGIN;

-- Add quotedPostId column
ALTER TABLE "Post" ADD COLUMN "quotedPostId" TEXT;

-- Add self-referential relation
ALTER TABLE "Post" ADD CONSTRAINT "Post_quotedPostId_fkey"
  FOREIGN KEY ("quotedPostId") REFERENCES "Post"(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for efficient lookups
CREATE INDEX "Post_quotedPostId_idx" ON "Post"("quotedPostId");

COMMIT;
