-- Create AI configurations table
CREATE TABLE IF NOT EXISTS ai_configurations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  model VARCHAR(100) NOT NULL,
  temperature DECIMAL(3, 2) NOT NULL,
  max_tokens INTEGER NOT NULL,
  tools_web_search BOOLEAN DEFAULT FALSE,
  tools_code_execution BOOLEAN DEFAULT FALSE,
  tools_image_generation BOOLEAN DEFAULT FALSE,
  tools_data_analysis BOOLEAN DEFAULT FALSE,
  knowledge_base_files JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on wallet_address for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_configurations_wallet_address ON ai_configurations(wallet_address);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_configurations_user_id ON ai_configurations(user_id);
