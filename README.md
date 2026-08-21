# Shopify Brain

**Store Brain** — a modular AI agent system that manages every major aspect of one or more Shopify stores.

## Vision
Build a shared per-store "Brain" with specialized agent teams (SEO & Content first). Agents use tools (Shopify Admin GraphQL + external APIs). High-stakes actions require human approval by default. After approval, agents execute (create draft Collections, etc.). Same codebase supports single-store today and multi-store tomorrow via `store_id`.

Success for Stage A: trigger SEO job for a keyword → research → draft → human approve → publish as draft Collection in Shopify. Everything scoped by `store_id`.

## Tech Stack (Limited & Explicit)
| Layer              | Choice                                      |
|--------------------|---------------------------------------------|
| Runtime            | Node.js 22+ + TypeScript                    |
| Durability         | Inngest (durable steps + wait-for-approval) |
| LLM / tools        | Vercel AI SDK (`ai`)                        |
| LLM provider       | xAI (`grok-build-0.1`) via OpenAI compat    |
| Embeddings         | OpenAI `text-embedding-3-small` (1536)      |
| Search (research)  | Tavily (direct fetch, no extra SDK)         |
| HTTP               | Hono                                        |
| Shopify            | `@shopify/shopify-api` (GraphQL Admin)      |
| Database + Vector  | Neon (Postgres + pgvector)                  |
| Validation         | Zod                                         |
| (Later)            | Next.js command center                      |

**Principles:** Reusable modules, no heavy agent frameworks, human-in-the-loop default, `store_id` everywhere.

## Architecture (High Level)
```
Shared Memory & State (vector + structured + events)
Domain Agent Teams (SEO first)
Orchestrator (later)
Tool Layer (Shopify + Tavily + internal)
```
Runtime: Inngest functions. See original plan for full diagram.

## Getting Started
### Prerequisites
- Node 22+
- Neon project (enable `vector` extension)
- Keys: XAI, OpenAI (embeddings), Tavily, Inngest, Shopify dev store Admin token (write_collections + read_products at minimum)

### Steps
```bash
# 1. Init (or clone the GitHub repo)
git init
git remote add origin https://github.com/tharrosmedia/Shopify-Brain.git

# 2. Install
npm install

# 3. Env
cp .env.example .env
# Edit .env with your keys + domain/token + APP_PASSWORD

# 4. Database
npm run db:migrate   # creates tables + vector extension

# 5. Run
npm run dev
# In another terminal for Inngest dev:
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

## Usage (UI on cerevex.store)
1. Visit http://localhost:3000 (login with APP_PASSWORD)
2. Use Dashboard to trigger SEO jobs by keyword.
3. Go to Review Queue to view/approve/edit drafts.
4. History shows all jobs.

Scripts still work for testing: npm run trigger:seo

On approval, draft Collection created in Shopify.

All operations are scoped by `storeId`. Audit events are written for everything.

## Project Structure
Follows the reusable blocks plan (see `src/lib/`, `src/inngest/`, `db/migrations/`, `scripts/`). No domain logic outside its folder.

## Implementation Plan & Roadmap
Full details (Stage A exit criteria, data model, agent steps, Inngest skeleton, etc.) are in the original `store-brain-implementation-plan.md` document.

- **Stage A**: Core + SEO (this repo now)
- **Stage B**: Minimal command center + second domain
- **Stage C**: Multi-domain + multi-store polish

## Contributing
- Keep functions small/pure, explicit `storeId` everywhere.
- Prompts live in `lib/prompts/`.
- Use Zod for all LLM structured outputs.
- Human-in-the-loop by default.

## License
MIT (placeholder — update as needed)

---

*Last updated: 2026-08-20. Built for Shopify stores.*
