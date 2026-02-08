# AI-Fi: AI Agent Finance Platform

A comprehensive web platform for creating, managing, and monetizing AI agents with blockchain integration. Users can design custom AI agents, launch tokens, and earn rewards through a sophisticated revenue-sharing ecosystem.

## 🌟 Features

### AI Studio
- **Custom AI Agent Creation**: Design and configure AI agents with tailored system prompts and behaviors
- **Multi-Model Support**: Integrate with OpenAI (GPT-4), Google (Gemini), and Anthropic (Claude) AI models
- **Advanced Configuration**: Fine-tune agent parameters including model selection, tools, and capabilities
- **Agent Publishing**: Make agents public for community use or keep them private

### Token Ecosystem
- **Token Creation & Launching**: Create and launch tokens on Solana blockchain via Pump.fun and Raydium
- **Bonding Curve Integration**: Support for automated market maker (AMM) liquidity management
- **Token Management**: Track token metadata, supply, decimals, and contract details
- **Multi-DEX Support**: Deploy tokens across multiple decentralized exchanges

### Marketplace & Exploration
- **AI Agent Explorer**: Browse and discover public AI agents created by the community
- **Token Explorer**: View available tokens with real-time data and metrics
- **Agent Showcase**: Featured agents with creator information and social links

### User Dashboard
- **Wallet Integration**: Seamless Solana wallet connectivity (Phantom, Solflare, Genesis)
- **Profile Management**: Customizable user profiles with avatars and usernames
- **Performance Tracking**: Monitor AI agent usage statistics and metrics
- **Reward System**: Track earned rewards and revenue shares from deployed tokens

### Monetization
- **Revenue Sharing (RevShare)**: Sophisticated reward distribution system for token creators
- **Performance Metrics**: Real-time tracking of agent interactions and engagement
- **Reward Distribution**: Automated distribution of earnings across token holders

### Developer Tools
- **Prompt Enhancement**: AI-powered prompt optimization for better agent performance
- **Chat Interface**: Interactive chat with deployed AI agents
- **API Integration**: REST API endpoints for agent interaction and data retrieval

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 14.2 with React 19
- **UI Components**: Radix UI with shadcn/ui integration
- **Styling**: Tailwind CSS with custom theming support
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React and React Icons

### Backend & Infrastructure
- **Runtime**: Node.js with Next.js API Routes
- **Database**: Neon PostgreSQL (serverless)
- **AI/LLM Integration**:
  - OpenAI API (GPT-4)
  - Google Generative AI
  - Anthropic Claude SDK
- **File Storage**: Vercel Blob (image uploads)
- **Blockchain**: Solana Web3.js

### Blockchain Integration
- **Wallet Adapters**: @solana/wallet-adapter-react
- **Dex Integration**: Pump.fun, Raydium protocols
- **Token Standards**: SPL tokens on Solana
- **RevShare SDK**: Community reward distribution

## 📋 Prerequisites

- Node.js 18+ (compatible with package.json configuration)
- pnpm package manager
- Solana wallet (Phantom, Solflare, or Genesis)
- API Keys:
  - OpenAI API key
  - Google Generative AI key (optional)
  - Anthropic API key (optional)
- Database: Neon PostgreSQL connection string

## 🔧 Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd ai-fi
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Configuration**
   Create a `.env.local` file with required variables:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host/database

   # AI Model APIs
   OPENAI_API_KEY=sk_...
   GOOGLE_API_KEY=...
   ANTHROPIC_API_KEY=sk-ant-...

   # Blockchain
   NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.mainnet-beta.solana.com
   
   # File Storage
   BLOB_READ_WRITE_TOKEN=vercel_blob_token...

   # Application
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Database Setup**
   Run migration scripts from the `scripts/` directory:
   ```bash
   # Initialize users table
   # Initialize AI configurations
   # Create tokens table
   # etc.
   ```

## 🏃 Getting Started

### Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production
```bash
pnpm build
pnpm start
```

### Linting
```bash
pnpm lint
```

## 📁 Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── ai-configurations/  # AI agent management
│   │   ├── chat/               # Chat interactions
│   │   ├── tokens/             # Token creation & management
│   │   ├── users/              # User profile management
│   │   ├── rewards/            # Revenue sharing & rewards
│   │   ├── upload/             # File uploads
│   │   ├── proxy/              # External API proxies
│   │   └── ...
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   └── globals.css             # Global styles
├── components/
│   ├── ui/                     # Reusable UI components
│   ├── dashboard.tsx           # Main dashboard component
│   ├── token-creation-form.tsx # Token creation interface
│   ├── scrolling-ai-agents.tsx # Agent showcase
│   └── ...
├── lib/
│   ├── revshare.ts            # Revenue sharing utilities
│   ├── pumpfun.ts             # Pump.fun integration
│   ├── raydium.ts             # Raydium integration
│   └── utils.ts               # Helper utilities
├── hooks/
│   └── use-mobile.tsx         # Mobile detection hook
├── scripts/
│   └── *.sql                  # Database migrations
├── public/                     # Static assets
├── types/
│   └── wallet.d.ts            # Wallet type definitions
└── styles/                     # Additional stylesheets
```

## 🔗 API Endpoints

### Users
- `GET /api/users` - Fetch user profile
- `PUT /api/users/update` - Update user profile
- `GET /api/users/check-username` - Validate username availability

### AI Configurations
- `GET /api/ai-configurations` - List AI agents
- `POST /api/ai-configurations` - Create new AI agent
- `GET /api/ai-configurations/[id]` - Get agent details
- `GET /api/ai-configurations/by-name/[slug]` - Get agent by slug
- `GET /api/ai-configurations/user/[walletAddress]` - Get user's agents
- `GET /api/ai-configurations/latest` - Get latest agents
- `GET /api/ai-configurations/list` - List all public agents

### Chat
- `POST /api/chat` - Send message to AI agent

### Tokens
- `POST /api/tokens` - Create new token
- `GET /api/tokens` - Fetch token information
- `POST /api/pumpfun-ipfs` - Upload to Pump.fun IPFS

### Rewards & Distribution
- `GET /api/rewards` - Get reward information
- `GET /api/distributions` - Get distribution history

### Utilities
- `POST /api/enhance-prompt` - AI-powered prompt enhancement
- `POST /api/generate-from-agent` - Generate content from agent
- `GET /api/overview` - Get application overview
- `GET /api/proxy/solscan` - Proxy Solscan API requests
- `POST /api/upload` - Upload images to Vercel Blob

## 💼 Database Schema

### Users Table
- `id` (primary key)
- `wallet_address` (unique)
- `username` (unique)
- `profile_picture_url`
- `created_at` / `updated_at`

### AI Configurations Table
- `id` (primary key)
- `user_id` (foreign key)
- `name`
- `description`
- `model` (gpt-4, gemini, claude, etc.)
- `system_prompt`
- `is_public`
- `tools_web_search`, `tools_code_execution`, etc.
- `created_at` / `updated_at`

### Tokens Table
- `id` (primary key)
- `mint_address` (Solana token mint)
- `name` / `symbol`
- `description`
- `creator_wallet`
- `image_url`
- `metadata` (JSON)
- `created_at` / `updated_at`

See `scripts/` directory for complete schema definitions.

## 🔐 Security Considerations

- Wallet authentication via message signing
- API route protection with wallet verification
- Database connection pooling with Neon
- File upload validation and virus scanning
- Environment variable protection for sensitive keys
- XSS protection via React/Next.js built-in features

## 🌐 Deployment

### Vercel (Recommended)
1. Push to GitHub repository
2. Import in Vercel dashboard
3. Configure environment variables
4. Deploy automatically on push

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build
CMD ["pnpm", "start"]
```

## 📚 Key Libraries & Integrations

| Library | Purpose | Version |
|---------|---------|---------|
| Next.js | React framework | 14.2.25 |
| React | UI library | 19 |
| Tailwind CSS | Styling | 3.4.17 |
| Radix UI | Component primitives | Latest |
| AI SDK | LLM integration | 5.0.57 |
| Solana Web3.js | Blockchain interaction | 1.98.4 |
| Neon | PostgreSQL database | 1.0.1 |
| Zod | Schema validation | 3.24.1 |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is private. Usage and distribution rights are determined by the project maintainers.

## 💬 Support & Community

- **Documentation**: Visit `/docs` in the application
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join community discussions for feature requests
- **Twitter**: Follow for updates and announcements

## 🎯 Roadmap

- [ ] Advanced analytics dashboard
- [ ] Multi-chain token deployment
- [ ] Agent marketplace rating system
- [ ] Advanced token economics
- [ ] Mobile application
- [ ] Community governance
- [ ] Plugin ecosystem for agents

## 🙏 Acknowledgments

Built with:
- Solana ecosystem tools and standards
- Vercel for deployment and infrastructure
- The thriving Solana and AI agent communities

---

**Version**: 0.1.0  
**Last Updated**: February 2025  
**Status**: Active Development
