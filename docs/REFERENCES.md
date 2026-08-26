# Architecture references

Accessed 26 August 2026.

## Application and deployment

- Next.js 16.2 release: https://nextjs.org/blog/next-16-2
- Next.js deployment: https://nextjs.org/docs/app/getting-started/deploying
- Vercel MCP: https://vercel.com/docs/mcp/vercel-mcp

## Supabase

- Regions: https://supabase.com/docs/guides/platform/regions
- Branching: https://supabase.com/docs/guides/deployment/branching
- MCP: https://supabase.com/docs/guides/ai-tools/mcp
- Anonymous Auth: https://supabase.com/docs/guides/auth/auth-anonymous
- Realtime: https://supabase.com/docs/guides/realtime/postgres-changes
- Storage access: https://supabase.com/docs/guides/storage/security/access-control
- Pricing: https://supabase.com/pricing

## Trigger.dev

- Product: https://trigger.dev/product
- Triggering and batch fan-out: https://trigger.dev/docs/triggering
- Queue concurrency: https://trigger.dev/docs/queue-concurrency
- Idempotency: https://trigger.dev/docs/idempotency
- Preview branches: https://trigger.dev/docs/deployment/preview-branches
- MCP: https://trigger.dev/docs/mcp-introduction
- Skills: https://trigger.dev/docs/skills
- Pricing: https://trigger.dev/pricing

## OpenAI image and verification

- GPT Image 2: https://developers.openai.com/api/docs/models/gpt-image-2
- Image generation guide: https://developers.openai.com/api/docs/guides/image-generation
- GPT-5.6 Luna: https://developers.openai.com/api/docs/models/gpt-5.6-luna

## fal.ai and Seedance

- fal Model APIs: https://fal.ai/docs/documentation/model-apis
- fal Queue API: https://fal.ai/docs/model-apis/model-endpoints/queue
- fal concurrency/retention FAQ: https://fal.ai/docs/documentation/model-apis/faq
- fal Run MCP: https://fal.ai/docs/documentation/setting-up/mcp
- fal JavaScript client: https://docs.fal.ai/clients/javascript
- Seedance 2.0: https://fal.ai/seedance-2.0
- Seedance 2.0 Fast image-to-video API: https://fal.ai/models/bytedance/seedance-2.0/fast/image-to-video/api
- Seedance 2.0 Standard image-to-video: https://fal.ai/models/bytedance/seedance-2.0/image-to-video
- fal GPT Image 2 contingency endpoint: https://fal.ai/models/openai/gpt-image-2

## UI libraries

- Motion: https://github.com/motiondivision/motion
- Embla Carousel: https://github.com/davidjerleke/embla-carousel
- react-zoom-pan-pinch: https://github.com/BetterTyped/react-zoom-pan-pinch
- react-dropzone: https://github.com/react-dropzone/react-dropzone

## Open-source media-pipeline review

- Genblaze: https://github.com/backblaze-labs/genblaze

Genblaze was reviewed for provider/provenance ideas and rejected as the production execution core because it would add Python and overlap with Trigger.dev.
