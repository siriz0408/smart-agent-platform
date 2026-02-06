# Smart Agent - AI Real Estate Assistant Platform

Smart Agent is an AI-powered SaaS application designed for real estate professionals. It provides intelligent document analysis, CRM features, and multi-document chat capabilities to streamline real estate workflows.

## Features

- **AI-Powered Document Analysis**: Upload contracts, disclosures, and inspection reports. Get instant AI summaries and structured data extraction.
- **Multi-Document Chat**: Ask questions across all your documents simultaneously using advanced RAG (Retrieval-Augmented Generation).
- **Real Estate CRM**: Manage contacts, properties, and deals in one unified platform.
- **Pipeline Management**: Track deals through stages with milestone reminders.
- **Stripe Billing**: Integrated subscription management with multiple pricing tiers.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + pgvector + Edge Functions)
- **Payments**: Stripe
- **Deployment**: Vercel
- **AI**: Anthropic Claude API (Sonnet 4)

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Supabase account
- Stripe account (for billing features)

### Installation

```bash
# Clone the repository
git clone https://github.com/<username>/smart-agent-platform.git
cd smart-agent-platform

# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at http://localhost:8080

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-id>
```

Get these values from your Supabase project dashboard (Settings → API).

## Development

```bash
# Start dev server with hot reload
npm run dev

# Run linter
npm run lint

# Run type checking
npm run typecheck

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Preview production build
npm run preview
```

## Database Setup

This project uses Supabase with 32 database migrations. To set up the database:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-id>

# Push migrations
supabase db push

# Verify migrations
supabase migration list
```

## Edge Functions

The project includes 22 Supabase Edge Functions for backend operations:

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy ai-chat

# View function logs
supabase functions logs ai-chat --tail
```

### Required Secrets

Configure these secrets in your Supabase project:

```bash
# Required for AI features
supabase secrets set ANTHROPIC_API_KEY=<your-anthropic-api-key>

# Required for payments
supabase secrets set STRIPE_SECRET_KEY=<your-stripe-secret-key>
supabase secrets set STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>

# Optional - for additional features
supabase secrets set RESEND_API_KEY=<your-resend-api-key>
supabase secrets set RAPIDAPI_KEY=<your-rapidapi-key>
supabase secrets set APP_URL=https://your-app.vercel.app
```

## Deployment to Vercel

This project is optimized for deployment on Vercel:

1. **Push code to GitHub**
2. **Import project to Vercel**: https://vercel.com/new
3. **Configure environment variables** in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
4. **Deploy**

Vercel will automatically detect the Vite framework and configure the build settings.

### Automatic Deployments

- **Production**: Pushes to `main` branch automatically deploy to production
- **Preview**: Pull requests get preview deployments with unique URLs

## Project Structure

```
smart-agent-platform/
├── src/
│   ├── components/     # React components (organized by feature)
│   ├── pages/          # Route components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and configurations
│   ├── integrations/   # External service integrations (Supabase)
│   └── main.tsx        # Application entry point
├── supabase/
│   ├── functions/      # 22 Edge Functions (Deno runtime)
│   ├── migrations/     # 32 database migrations
│   └── config.toml     # Supabase configuration
├── public/             # Static assets
└── docs/               # Documentation and plans
```

## Documentation

- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation
- **PRD**: See [Smart_Agent_Platform_PRD_v3.md](./Smart_Agent_Platform_PRD_v3.md) for product requirements
- **Developer Guide**: See [CLAUDE.md](./CLAUDE.md) for developer context and quickstart
- **Task Board**: See [TASK_BOARD.md](./TASK_BOARD.md) for development progress

## Contributing

This is a private project. If you have access and want to contribute:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test thoroughly
3. Run linter and type checks: `npm run lint && npm run typecheck`
4. Commit with clear messages
5. Push and create a pull request

## License

Proprietary - All rights reserved

## Support

For questions or issues, please contact the development team.

---

Built with [Supabase](https://supabase.com) and [Vercel](https://vercel.com)
