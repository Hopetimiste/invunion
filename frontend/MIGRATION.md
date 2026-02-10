# Code Architecture for Migration

This codebase has been organized for easy migration to any stack. Below is the structure and migration guidelines.

## Folder Structure

```
src/
├── components/
│   ├── shared/           # Reusable UI components (portable)
│   │   ├── PageHeader.tsx
│   │   ├── Pagination.tsx
│   │   ├── ActionButton.tsx
│   │   ├── StatusBadge.tsx
│   │   └── EmptyState.tsx
│   ├── ui/               # shadcn/ui primitives (replace with your UI lib)
│   ├── dashboard/        # Dashboard-specific components
│   └── settings/         # Settings-specific components
├── services/             # API layer (framework-agnostic)
│   ├── api/
│   │   └── client.ts     # Core HTTP client (swap fetch for axios, etc.)
│   ├── transactions.ts   # Transaction CRUD operations
│   ├── invoices.ts       # Invoice CRUD operations
│   ├── suppliers.ts      # Supplier CRUD operations
│   ├── matches.ts        # Matching operations
│   ├── alerts.ts         # Alert/notification operations
│   ├── admin.ts          # Admin operations
│   ├── banking.ts        # Bank connection operations
│   ├── reports.ts        # Reporting operations
│   ├── auth.ts           # Authentication operations
│   └── index.ts          # Central exports
├── hooks/                # React hooks (replace with your state solution)
│   ├── useTransactions.ts
│   ├── useInvoices.ts
│   └── index.ts
├── types/                # TypeScript types (portable)
│   ├── api.ts            # Core API types
│   ├── transaction.ts    # Transaction domain types
│   ├── invoice.ts        # Invoice domain types
│   └── index.ts          # Central exports
├── contexts/             # React contexts (replace with your state solution)
│   ├── AuthContext.tsx
│   └── LanguageContext.tsx
├── lib/                  # Utilities
│   ├── firebase.ts       # Firebase config (swap for your auth provider)
│   ├── runtimeConfig.ts  # Environment configuration
│   ├── translations.ts   # i18n translations (portable)
│   └── utils.ts          # Utility functions
└── pages/                # Page components (route handlers)
```

## Migration Steps

### 1. Replace UI Framework (shadcn → your choice)
- Components in `src/components/ui/` use shadcn/radix
- Replace with Material UI, Chakra, Ant Design, or vanilla CSS
- Shared components in `src/components/shared/` are easy to adapt

### 2. Replace State Management (React Context → your choice)
- Hooks in `src/hooks/` use React hooks
- Replace with Redux, Zustand, MobX, or Vuex/Pinia
- Types remain the same

### 3. Replace Auth Provider (Firebase → your choice)
- Update `src/services/api/client.ts` - getAuthHeaders()
- Update `src/lib/firebase.ts` or replace entirely
- Update `src/contexts/AuthContext.tsx`

### 4. Replace HTTP Client (fetch → your choice)
- Edit `src/services/api/client.ts`
- Keep the same interface, change implementation

### 5. Move to Different Framework (React → Vue/Angular/Svelte)
- Types in `src/types/` are framework-agnostic
- Services in `src/services/` are framework-agnostic
- Only hooks and components need rewriting

## Key Files for Migration

| File | Purpose | Migration Effort |
|------|---------|-----------------|
| `src/services/api/client.ts` | HTTP client | Low - swap fetch |
| `src/types/*.ts` | Type definitions | None - copy as-is |
| `src/services/*.ts` | API operations | Low - adjust client import |
| `src/lib/translations.ts` | i18n strings | None - copy as-is |
| `src/hooks/*.ts` | State logic | Medium - rewrite for framework |
| `src/components/shared/*` | UI components | Medium - adapt to UI lib |
| `src/contexts/*` | Global state | Medium - use framework's solution |

## Type Exports

All types can be imported from:
```typescript
import type { Transaction, Invoice, PaymentMethod } from '@/types';
```

## Service Exports

All API functions can be imported from:
```typescript
import { getTransactions, createInvoice } from '@/services';
```

## Backward Compatibility

The old `@/lib/api` import still works and re-exports from `@/services`:
```typescript
// Old (still works)
import { getTransactions } from '@/lib/api';

// New (preferred)
import { getTransactions } from '@/services';
```
