# store-brain-implementation-plan.md (Updated)

## Vision
Build a shared per-store "Brain" with specialized agent teams (SEO & Content first). Agents use tools (Shopify Admin GraphQL + external APIs). High-stakes actions require human approval by default. After approval, agents execute (create + publish live content, etc.). Same codebase supports single-store today and multi-store tomorrow via `store_id`.

Success for Stage A: trigger SEO job for a keyword → research → draft → human approve → create + publish live Collection/Page/Blog in Shopify. Everything scoped by `store_id`.

(Full original details preserved below; progress noted.)

## Current State (as of 2026-08)
- Core Inngest SEO pipeline fully working: research (Tavily) → brief → write → edit → optimize → evaluate → save draft → await approval (with edit payload) → publish live on approve using finalDraft/editedPayload.
- Multi-type support (collection/page/blog).
- Platform and (now) brandVoice/autonomy threaded.
- Prompts extracted to src/lib/prompts/seo/ using messages format.
- Encryption fallback for tokens.
- Stores management with config jsonb.
- UI: dashboard, review queue, history, jobs, stores, settings (Inngest + now brand/config status).
- **Item 1 complete**: Per-store content placement config (data model + read path; publisher uses config for write target + full metafield support). Fallback preserves old behavior.
- Brand voice agent added: infers from Shopify samples + Tavily, user-editable in /settings, used by SEO agents.
- Basic autonomy in config: allowedTypes + requireApproval (type enforcement active; full auto-approve path deferred to keep flow safe).
- Config status surfaced in /settings.

## Non-Negotiables for Stage A
- SEO approval → live publish flow must remain unbroken at all times.
- `store_id` everywhere.
- Human-in-the-loop default.
- Read relevant files before editing.

## Data Model
- stores table + config jsonb (flexible).
- Extended for placement, brandVoice (structured {text, inferredAt, samplesUsed}), autonomy ({allowedTypes, requireApproval}).
- Drafts support rich fields (metafields, schemaJsonLd).
- Knowledge/events for audit/memory.

## Agent Teams (SEO first)
- research, brief, writer, editor, optimize, evaluate, publisher.
- New: brand/voice infer.
- Thread store config values (platform, brandVoice, autonomy) like existing platform.

## Inngest Orchestration
- seo/job.requested → ensure → research → brief → write → edit → optimize → evaluate → save → await approval (or auto if !require) → publish.
- Wrappers thread data.

## Priority Backlog (updated)
1. Per-store content placement config — DONE (config jsonb + full support in publisher).
2. Basic policy / autonomy fields (per-store) — DONE (shape + type enforcement + storage + settings UI).
3. Brand Voice agent (new, user-requested) — DONE (generate from site+web, edit in settings only, thread to SEO prompts/agents).
4. Drafts table + richer UI for editing (metafields etc.).
5. More autonomy enforcement (full auto-approve).
6. ...

## Stage B/C
- Command center polish.
- Multi-domain.
- Additional agent teams.

## Implementation Notes (from original + updates)
- Use config jsonb for placement, brandVoice, autonomy.
- Fetch store samples via Shopify GraphQL for brand (products, pages, collections, shop, articles).
- Combine with Tavily for context.
- UI for brand/config status only in settings per decision.
- Update all prompt builders to use brandVoice.
- Preserve publish flow.

(End of updates. Original full text from initial plan would be appended here for completeness in repo.)

## Progress Tracking
- See git log and code for completed items.
- Alpha sprint: DEV fallbacks cleaned (central getActiveStoreId, triggers require store).
- Richer drafts: data flow updated for metafields/schemaJsonLd; UI supports full JSON edit + dynamic defs display (fetched comprehensive across types, filtered); editedPayload carries rich.
- Edit existing: handle-based update attempted for pages (overwrite OK); added updatePage.
- Links: blog handle resolved (getFirstBlog returns handle); job output shows basic links (storefront/admin).
- Next: full links polish, autonomy auto, update plan.

Alpha now supports editing rich drafts (metafields from site), updating existing pages, better visibility.
