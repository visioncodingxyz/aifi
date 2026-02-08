-- Create tokens table to store launched token data
CREATE TABLE IF NOT EXISTS tokens (
  id SERIAL PRIMARY KEY,
  
  -- Token Identity
  mint_address VARCHAR(255) UNIQUE, -- Contract address (populated after launch)
  request_id VARCHAR(255) UNIQUE NOT NULL, -- RevShare SDK request ID
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Creator Information
  creator_wallet VARCHAR(255) NOT NULL,
  developer_wallet VARCHAR(255),
  
  -- Social Links
  website VARCHAR(500),
  twitter VARCHAR(255),
  telegram VARCHAR(255),
  
  -- Token Configuration
  decimals INTEGER DEFAULT 9,
  initial_supply BIGINT,
  initial_buy_amount DECIMAL(20, 9), -- Initial buy in SOL
  tax_tier INTEGER, -- 6 or 10 (percentage)
  
  -- RevShare Configuration
  mode INTEGER DEFAULT 0, -- 0=Rewards, 1=Jackpot, 2=Lottery, 3=No Rewards
  distribution_mode VARCHAR(50),
  reward_ca VARCHAR(255), -- Reward token contract address
  dev_fee_percentage DECIMAL(5, 2),
  
  -- Bonding Curve
  bonding_curve_type INTEGER, -- 1=20 SOL threshold, 2=60 SOL threshold
  bonding_curve_active BOOLEAN DEFAULT true,
  base_reserve VARCHAR(255),
  quote_reserve VARCHAR(255),
  sqrt_price VARCHAR(255),
  pool_id VARCHAR(255),
  
  -- Market Data (updated periodically)
  current_price DECIMAL(30, 18),
  price_change_24h DECIMAL(10, 2), -- Percentage
  volume_24h DECIMAL(20, 9),
  market_cap DECIMAL(20, 9),
  
  -- Visibility & Status
  visible INTEGER DEFAULT 0, -- 0=visible, 1=hidden
  verified BOOLEAN DEFAULT false,
  launch_status VARCHAR(50) DEFAULT 'pending', -- pending, funded, launched, failed
  
  -- Referral
  referral_wallet VARCHAR(255),
  
  -- Metadata
  dexscreener_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  launched_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes for common queries
  CONSTRAINT fk_creator FOREIGN KEY (creator_wallet) REFERENCES users(wallet_address) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tokens_creator_wallet ON tokens(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_tokens_mint_address ON tokens(mint_address);
CREATE INDEX IF NOT EXISTS idx_tokens_launch_status ON tokens(launch_status);
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_visible ON tokens(visible);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tokens_timestamp
BEFORE UPDATE ON tokens
FOR EACH ROW
EXECUTE FUNCTION update_tokens_updated_at();
