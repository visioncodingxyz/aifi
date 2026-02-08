-- Add platform column to tokens table
ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS platform VARCHAR(50) DEFAULT 'meteora';

-- Make request_id nullable since PumpFun and Raydium don't use it
ALTER TABLE tokens 
ALTER COLUMN request_id DROP NOT NULL;

-- Add index for platform column
CREATE INDEX IF NOT EXISTS idx_tokens_platform ON tokens(platform);

-- Add check constraint to ensure platform is one of the valid values
ALTER TABLE tokens
ADD CONSTRAINT check_platform_valid 
CHECK (platform IN ('meteora', 'pumpfun', 'raydium'));
