Read claudeos-core/generated/project-analysis.json and
perform a deep analysis of the following domains only: {{DOMAIN_GROUP}}

For each domain, select one representative file per layer, read its code, and analyze it.
Prioritize files with the richest patterns.

Analysis items (per domain):

1. Page/Routing Patterns
   - Routing approach (App Router vs Pages Router)
   - Layout structure (layout.tsx, template.tsx)
   - Dynamic routes ([slug], [...catchAll], [[...optional]])
   - Server Components vs Client Components separation
   - Metadata management (generateMetadata, head.tsx)
   - Loading/error UI (loading.tsx, error.tsx, not-found.tsx)
   - middleware.ts usage (auth, redirects, i18n)

2. Component Patterns
   - Component structure (functional, forwardRef, memo)
   - Props type definition (interface vs type, Generic usage)
   - State management (useState, useReducer, external libraries)
   - Styling approach and exact import paths (e.g., `import styles from './index.module.scss'`, `import { cn } from '@/lib/utils'`)
   - Styling utility functions: record the EXACT import path used in source code (e.g., `from '@company/utils'` NOT `from '@app/shared/lib/classNames'`)
   - UI library and exact package names (e.g., `@company/ui`, `@shadcn/ui`, `@mui/material`)
   - Component classification (UI, Feature, Layout, Page)
   - Component entry file pattern: is the main file `index.tsx` or `ComponentName.tsx`? Record exactly which pattern the project uses.
   - Directory structure pattern: record exact convention (e.g., `ComponentName/index.tsx` vs `ComponentName/ComponentName.tsx`)
   - export pattern: default export vs named export in component files
   - Reuse patterns (composition, compound components, render props)
   - Accessibility (ARIA, semantic HTML, keyboard navigation)

3. Data Fetching Patterns
   - Server-side (fetch in RSC, getServerSideProps, getStaticProps)
   - Client-side (SWR, React Query/TanStack Query, useEffect)
   - API Routes / Route Handlers (app/api/)
   - Server Actions (use server)
   - Caching strategy (revalidate, cache tags, ISR)
   - Error/loading state handling
   - Streaming (Suspense, streaming SSR)

4. State Management Patterns
   - Global state (Zustand, Redux Toolkit, Jotai, Recoil, Context)
   - Server state (TanStack Query, SWR)
   - URL state (searchParams, useRouter, nuqs)
   - Form state (React Hook Form, Formik, useActionState)
   - Optimistic updates (useOptimistic)

5. Configuration/Environment Patterns
   - Environment variable management (NEXT_PUBLIC_ convention, .env separation)
   - next.config settings (image domains, redirects, headers)
   - Build optimization (bundle analysis, tree shaking)

6. Logging/Monitoring Patterns
   - Client error tracking (Sentry, DataDog RUM)
   - Server logging (pino, winston)
   - Performance monitoring (Web Vitals, Lighthouse)
   - Analytics tools (Google Analytics, PostHog, Mixpanel)

7. Testing Patterns
   - Test framework (Jest, Vitest, Playwright, Cypress)
   - Component testing (React Testing Library, Storybook)
   - E2E testing strategy
   - Mocking strategy (MSW, jest.mock)
   - Test naming conventions
   - Snapshot testing usage

8. Domain-Specific Patterns
   - Authentication/authorization (NextAuth/Auth.js, middleware protection, session management)
   - Internationalization (next-intl, i18next, route-based)
   - File upload (presigned URL, client direct upload)
   - Real-time features (WebSocket, SSE, Pusher)
   - SEO optimization (meta tags, structured data, sitemap)
   - Image/font optimization (next/image, next/font)
   - API versioning strategy
   - PWA support

9. Anti-patterns / Inconsistencies
   - Server/Client Component boundary confusion
   - Unnecessary 'use client'
   - Patterns inconsistent with other domains
   - Performance issues (unnecessary re-renders, bundle size, layout shift)
   - Type safety issues
   - Accessibility issues
   - Security issues (XSS, CSRF)

Do not create or modify source files. Analysis only.
Save results to claudeos-core/generated/pass1-{{PASS_NUM}}.json in the following format:

{
  "analyzedAt": "ISO timestamp",
  "passNum": {{PASS_NUM}},
  "domains": ["auth", "dashboard", "settings", "shared"],
  "analysisPerDomain": {
    "dashboard": {
      "representativeFiles": {
        "page": "app/dashboard/page.tsx",
        "layout": "app/dashboard/layout.tsx",
        "component": "components/dashboard/StatsCard.tsx",
        "hook": "hooks/useDashboardData.ts",
        "api": "app/api/dashboard/route.ts"
      },
      "patterns": {
        "page": { ... },
        "component": {
          "entryFilePattern": "index.tsx or ComponentName.tsx",
          "exportPattern": "default export or named export",
          "stylingImport": "exact import statement used for styling utility",
          "uiLibraryImport": "exact import statement for UI components",
          ...
        },
        "dataFetching": { ... },
        "stateManagement": { ... },
        "config": { ... },
        "logging": { ... },
        "testing": { ... }
      },
      "specialPatterns": [],
      "antiPatterns": []
    }
  },
  "crossDomainCommon": {
    "description": "Patterns commonly used across domains in this group",
    "patterns": []
  }
}
