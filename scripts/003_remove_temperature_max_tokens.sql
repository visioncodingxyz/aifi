-- Remove temperature and max_tokens columns from ai_configurations table
ALTER TABLE ai_configurations 
DROP COLUMN IF EXISTS temperature,
DROP COLUMN IF EXISTS max_tokens;
