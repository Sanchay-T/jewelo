# SHARED CONTRACT — Single Source of Truth

> Every agent MUST read this file before writing any code.
> All names, types, and conventions here are FINAL. Do not deviate.

---

## 1. Convex Table Names (exact)

| Table | Purpose |
|-------|---------|
| `designs` | Every design attempt |
| `goldPrices` | Cached gold prices (cron every 5 min) |
| `orders` | Placed orders |
| `inspirationImages` | Curated gallery images |
| `rateLimits` | Generation rate tracking |

**No `users` table for MVP.** Auth is disabled. No userId fields required.

---

## 2. Convex Function Names (exact)

### Queries (real-time subscriptions via `useQuery`)
| Function | File | Args | Returns |
|----------|------|------|---------|
| `api.gallery.getFeatured` | `convex/gallery.ts` | none | `Design[]` (up to 4 featured) |
| `api.gallery.byCategory` | `convex/gallery.ts` | `{ category: string }` | `InspirationImage[]` |
| `api.prices.getCurrent` | `convex/prices.ts` | none | `GoldPrice \| null` |
| `api.designs.get` | `convex/designs.ts` | `{ designId: Id<"designs"> }` | `Design \| null` |
| `api.designs.getInternal` | `convex/designs.ts` | `{ designId: Id<"designs"> }` | `Design` (internal only) |
| `api.designs.getWithImages` | `convex/designs.ts` | `{ designId: Id<"designs"> }` | `Design & { imageUrls: string[] }` |
| `api.designs.getBeforeAfter` | `convex/designs.ts` | `{ designId: Id<"designs"> }` | `{ referenceUrl, resultUrl, design }` |
| `api.orders.get` | `convex/orders.ts` | `{ orderId: Id<"orders"> }` | `Order \| null` |

### Mutations (write operations via `useMutation`)
| Function | File | Args |
|----------|------|------|
| `api.designs.create` | `convex/designs.ts` | `{ name, language, font, size, karat, style, referenceType?, referenceUrl?, referenceStorageId?, jewelryType?, designStyle? }` |
| `api.designs.updateStatus` | `convex/designs.ts` | `{ designId, status, analysisStep?, analysisData?, error? }` |
| `api.designs.completeGeneration` | `convex/designs.ts` | `{ designId, imageStorageId, status }` |
| `api.designs.selectVariation` | `convex/designs.ts` | `{ designId, index: number }` |
| `api.designs.regenerate` | `convex/designs.ts` | `{ designId }` |
| `api.orders.create` | `convex/orders.ts` | `{ designId, customerName, customerPhone, customerEmail? }` |
| `api.uploads.generateUploadUrl` | `convex/uploads.ts` | none |
| `api.uploads.saveReference` | `convex/uploads.ts` | `{ storageId: Id<"_storage"> }` |

### Actions (external API calls)
| Function | File | Purpose |
|----------|------|---------|
| `api.search.execute` | `convex/search.ts` | Pexels image search |
| `api.generation.generate` | `convex/generation.ts` | Vertex AI Gemini image generation |
| `api.prices.fetch` | `convex/prices.ts` | MetalPriceAPI gold price fetch |

### Cron Jobs
| Job | Schedule | Function |
|-----|----------|----------|
| Gold price update | Every 5 minutes | `prices.fetch` |
| Failed gen cleanup | Daily 3 AM UTC | `cleanup.failedGenerations` |

---

## 3. TypeScript Types (exact names)

```typescript
// These types are derived from Convex schema. Use Doc<"tableName"> from convex.
// For client-side use, define these in lib/types.ts:

type Design = {
  _id: Id<"designs">;
  name: string;
  language: "en" | "ar" | "zh";
  font: string;
  size: "small" | "medium" | "large";
  karat: "18K" | "21K" | "22K";
  style: "gold_only" | "gold_with_stones" | "gold_with_diamonds";
  status: "generating" | "analyzing" | "engraving" | "completed" | "failed";
  referenceType?: "search" | "gallery" | "upload";
  referenceUrl?: string;
  referenceStorageId?: Id<"_storage">;
  jewelryType?: string;
  designStyle?: string;
  imageStorageIds?: Id<"_storage">[];
  selectedImageIndex?: number;
  regenerationsRemaining: number;
  analysisStep?: string;
  analysisData?: {
    jewelryType?: string;
    metal?: string;
    bestSpot?: string;
  };
  error?: string;
  createdAt: number;
};

type GoldPrice = {
  _id: Id<"goldPrices">;
  metalType: string;       // "XAU"
  currency: string;        // "AED"
  pricePerOzTroy: number;
  pricePerGram: number;
  price24k?: number;
  price22k?: number;
  price21k?: number;
  price18k?: number;
  fetchedAt: number;
  source: string;
};

type Order = {
  _id: Id<"orders">;
  designId: Id<"designs">;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  status: "confirmed" | "in_production" | "ready" | "delivered" | "cancelled";
  priceBreakdown: PriceBreakdown;
  totalPrice: number;
  currency: string;
  goldPriceAtOrder: number;
  createdAt: number;
};

type InspirationImage = {
  _id: Id<"inspirationImages">;
  imageUrl: string;
  thumbnail: string;
  title: string;
  category: string;
};

type PriceBreakdown = {
  weight: number;
  materialCost: number;
  laborCost: number;
  stoneCost: number;
  markup: number;
  total: number;
  currency: "AED";
  goldPricePerGram: number;
  updatedAt: number;
};
```

---

## 4. Component File Names (exact)

### `/src/components/design/` (Design wizard components)
| File | Component | Screen |
|------|-----------|--------|
| `SearchBar.tsx` | `SearchBar` | 3 (Inspiration) |
| `CategoryPills.tsx` | `CategoryPills` | 3 (Inspiration) |
| `InspirationGrid.tsx` | `InspirationGrid` | 3 (Inspiration) |
| `UploadZone.tsx` | `UploadZone` | 3 (Inspiration) |
| `JewelryTypePicker.tsx` | `JewelryTypePicker` | 3-alt (From Scratch) |
| `StylePicker.tsx` | `StylePicker` | 3-alt (From Scratch) |
| `NameInput.tsx` | `NameInput` | 4 (Configurator) |
| `FontStylePicker.tsx` | `FontStylePicker` | 4 (Configurator) |
| `SizeSelector.tsx` | `SizeSelector` | 4 (Configurator) |
| `MetalSelector.tsx` | `MetalSelector` | 4 (Configurator) |
| `StyleSelector.tsx` | `StyleSelector` | 4 (Configurator) |
| `LivePriceDisplay.tsx` | `LivePriceDisplay` | 4 (Configurator), 8 (Review) |
| `GenerateButton.tsx` | `GenerateButton` | 4 (Configurator) |
| `AnalysisProgress.tsx` | `AnalysisProgress` | 5 (Crafting) |
| `DesignGrid.tsx` | `DesignGrid` | 6 (Results) |
| `DesignCard.tsx` | `DesignCard` | 6 (Results) |
| `BeforeAfterComparison.tsx` | `BeforeAfterComparison` | 7 (Engraving) |
| `PriceBreakdownCard.tsx` | `PriceBreakdownCard` | 8 (Review) |
| `OrderForm.tsx` | `OrderForm` | 8 (Review) |
| `OrderConfirmation.tsx` | `OrderConfirmation` | 9 (Confirmed) |

### `/src/components/layout/`
| File | Component |
|------|-----------|
| `BottomNav.tsx` | `BottomNav` |
| `StepIndicator.tsx` | `StepIndicator` |
| `PageTransition.tsx` | `PageTransition` |
| `AppShell.tsx` | `AppShell` |

### `/src/components/shared/`
| File | Component |
|------|-----------|
| `GoldDot.tsx` | `GoldDot` (live price indicator) |
| `Shimmer.tsx` | `Shimmer` (loading placeholder) |
| `CurrencyDisplay.tsx` | `CurrencyDisplay` |
| `EmptyState.tsx` | `EmptyState` |
| `ErrorState.tsx` | `ErrorState` |

---

## 5. Page Route Files (exact)

All pages live under `/src/app/[locale]/`:

| File | URL | Screen |
|------|-----|--------|
| `page.tsx` | `/` | 1: Landing |
| `design/language/page.tsx` | `/design/language` | 2: Language |
| `design/inspiration/page.tsx` | `/design/inspiration` | 3: Inspiration |
| `design/from-scratch/page.tsx` | `/design/from-scratch` | 3-alt: From Scratch |
| `design/customize/page.tsx` | `/design/customize` | 4: Configurator |
| `design/crafting/page.tsx` | `/design/crafting` | 5: Crafting |
| `design/results/[id]/page.tsx` | `/design/results/{id}` | 6: Results |
| `design/engraving/[id]/page.tsx` | `/design/engraving/{id}` | 7: Engraving |
| `design/order/[id]/page.tsx` | `/design/order/{id}` | 8: Review |
| `design/confirmed/[id]/page.tsx` | `/design/confirmed/{id}` | 9: Confirmed |
| `gallery/page.tsx` | `/gallery` | Gallery |
| `orders/page.tsx` | `/orders` | Orders |
| `profile/page.tsx` | `/profile` | Profile |

---

## 6. CSS / Tailwind Convention

### Naming
- **Tailwind utilities ONLY.** No custom class names except animations defined in `globals.css`.
- No CSS modules. No styled-components. No inline `style={{}}` except for dynamic values.

### Color Tokens (use these Tailwind classes)
| Token | Tailwind Class | Hex |
|-------|---------------|-----|
| Background | `bg-cream` | #FAF7F2 |
| Surface | `bg-sand` | #F5F0E8 |
| Border | `border-warm` | #EDE6D8 |
| Card | `bg-white border-warm` | #FFFFFF |
| Primary CTA | `bg-brown text-cream` | #8B7355 |
| CTA hover | `hover:bg-brown-dark` | #5C4A35 |
| CTA disabled | `bg-brown-light` | #C4B49A |
| Gold accent | `text-gold` | #D4A853 |
| Rose gold | `text-rose` | #B76E79 |
| Text primary | `text-text-primary` | #2D2418 |
| Text secondary | `text-text-secondary` | #6B5D4F |
| Text tertiary | `text-text-tertiary` | #9A8E80 |

### Font Classes
| Token | Tailwind Class | Font |
|-------|---------------|------|
| Headings | `font-display` | Playfair Display |
| Body | `font-body` | Inter |
| Prices/Numbers | `font-mono` | JetBrains Mono |
| Arabic | `font-arabic` | Noto Naskh Arabic |

### Shadows
| Token | Tailwind Class |
|-------|---------------|
| Card | `shadow-card` |
| Modal | `shadow-modal` |
| Gold glow | `shadow-gold-glow` |

---

## 7. Variable Naming

| Context | Convention | Example |
|---------|-----------|---------|
| TypeScript | camelCase | `goldPricePerGram`, `designId` |
| CSS | kebab-case (Tailwind) | `bg-cream`, `text-text-primary` |
| Env vars | SCREAMING_SNAKE | `PEXELS_API_KEY`, `GCP_PROJECT_ID` |
| Convex tables | camelCase | `goldPrices`, `inspirationImages` |
| Convex functions | camelCase | `getCurrent`, `generateUploadUrl` |
| Components | PascalCase | `LivePriceDisplay`, `DesignCard` |
| File names | PascalCase for components | `LivePriceDisplay.tsx` |
| Page files | `page.tsx` (Next.js convention) | `design/language/page.tsx` |

---

## 8. Convex Hook Pattern (every frontend component)

```tsx
"use client";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

// Queries (real-time, auto-update)
const goldPrice = useQuery(api.prices.getCurrent);
const design = useQuery(api.designs.get, { designId });

// Mutations (write, returns promise)
const createDesign = useMutation(api.designs.create);
const selectVariation = useMutation(api.designs.selectVariation);

// Actions (external API calls)
const searchImages = useAction(api.search.execute);
```

---

## 9. Auth: NONE FOR MVP

- No Clerk. No Convex Auth. No auth wrapper.
- `ConvexProvider` only (NOT `ConvexProviderWithClerk`).
- No `userId` fields are required. Designs and orders are anonymous.
- All screens are publicly accessible.

---

## 10. Key Business Constants

```typescript
// lib/constants.ts
export const NAME_LIMITS = {
  en: { min: 1, max: 15 },
  ar: { min: 1, max: 12 },
  zh: { min: 1, max: 8 },
} as const;

export const SIZE_MAP = {
  small: { label: "S", dimension: "12mm", weightGoldOnly: 2.5, weightWithStones: 3.0 },
  medium: { label: "M", dimension: "18mm", weightGoldOnly: 4.0, weightWithStones: 5.0 },
  large: { label: "L", dimension: "25mm", weightGoldOnly: 6.5, weightWithStones: 8.0 },
} as const;

export const KARAT_FACTOR = {
  "18K": 0.750,
  "21K": 0.875,
  "22K": 0.916,
} as const;

export const LABOR_COST = { small: 150, medium: 250, large: 400 } as const; // AED

export const MARKUP_PERCENT = {
  gold_only: 80,
  gold_with_stones: 100,
  gold_with_diamonds: 120,
} as const;

export const AED_USD_PEG = 3.6725; // Fixed since 1997

export const MAX_REGENERATIONS = 3;
export const MAX_GENERATIONS_PER_HOUR = 10;
```

---

## 11. Image Generation

- **Model:** `gemini-3-pro-image-preview` (production), `gemini-2.5-flash-image` (preview)
- **SDK:** `@google/genai` (NEW unified SDK)
- **Project:** `cyphersol-prod`
- **Location:** `global`
- **Config:** `{ responseModalities: ["TEXT", "IMAGE"] }`
- **Prompt:** Copy exactly from `docs/PRODUCTION_PROMPT.md`
- **Generate at:** 1024x1024, store as JPEG in Convex file storage
- **Serve as:** WebP via Convex storage URLs

---

## 12. Import Aliases

```typescript
// tsconfig.json paths:
"@/*": ["./src/*"]
"@/convex/*": ["../convex/*"]  // Convex is OUTSIDE src/

// Usage:
import { api } from "@/convex/_generated/api";  // This doesn't work — use relative
// CORRECT: Convex auto-generates. Import from "convex/_generated/api" directly
// The convex/ folder is at project root, NOT inside src/
```

---

## 13. Provider Setup (layout.tsx)

```tsx
// src/app/layout.tsx
"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ConvexProvider client={convex}>
          {children}
        </ConvexProvider>
      </body>
    </html>
  );
}
```

**NO auth provider. NO Clerk. Just ConvexProvider.**
