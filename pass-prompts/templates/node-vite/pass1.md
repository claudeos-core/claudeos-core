Read claudeos-core/generated/project-analysis.json and
perform a deep analysis of the following domains only: {{DOMAIN_GROUP}}

For each domain, select one representative file per layer, read its code, and analyze it.
Prioritize files with the richest patterns.

Analysis items (per domain):

1. Page/Routing Patterns
   - Client-side routing (React Router, TanStack Router, custom)
   - Route definition approach (file-based, config-based, lazy loading)
   - Layout structure (nested layouts, outlet, wrapper components)
   - Dynamic routes and route parameters
   - Route guards and authentication redirects
   - Error/404 handling

2. Component Patterns
   - Component structure (functional, forwardRef, memo)
   - Props type definition (interface vs type, Generic usage)
   - State management (useState, useReducer, external libraries)
   - Styling approach and exact import paths (e.g., `import styles from './index.module.scss'`, `import { cn } from '@/lib/utils'`)
   - Styling utility functions: record the EXACT import path used in source code
   - UI library and exact package names (e.g., `@mui/material`, `antd`, `@shadcn/ui`)
   - Component classification (UI, Feature, Layout, Page)
   - Component entry file pattern: is the main file `index.tsx` or `ComponentName.tsx`? Record exactly.
   - Directory structure pattern: record exact convention
   - export pattern: default export vs named export in component files
   - Reuse patterns (composition, compound components, render props)
   - Accessibility (ARIA, semantic HTML, keyboard navigation)

3. Data Fetching Patterns
   - Client-side data fetching (TanStack Query, SWR, useEffect, axios)
   - API client configuration (base URL, interceptors, error handling)
   - Request/response typing
   - Caching strategy (query keys, stale time, refetch)
   - Error/loading state handling
   - Optimistic updates
   - Pagination/infinite scroll patterns

4. State Management Patterns
   - Global state (Zustand, Redux Toolkit, Jotai, Recoil, Context)
   - Server state (TanStack Query, SWR)
   - URL state (searchParams, useNavigate)
   - Form state (React Hook Form, Formik)
   - Local component state patterns

5. Configuration/Environment Patterns
   - Environment variable management (VITE_ prefix convention, .env separation)
   - vite.config settings (proxy, aliases, plugins)
   - Build optimization (chunk splitting, dynamic imports)
   - Path aliases (@/, src/)

6. Logging/Monitoring Patterns
   - Client error tracking (Sentry, DataDog RUM)
   - Performance monitoring
   - Analytics tools (Google Analytics, PostHog, Mixpanel)

7. Testing Patterns
   - Test framework (Vitest, Jest, Playwright, Cypress)
   - Component testing (React Testing Library, Storybook)
   - E2E testing strategy
   - Mocking strategy (MSW, vi.mock)
   - Test naming conventions

8. Domain-Specific Patterns
   - Authentication/authorization (session, token, OAuth)
   - Internationalization (i18next, react-intl)
   - File upload patterns
   - Real-time features (WebSocket, SSE)
   - API versioning strategy

9. Anti-patterns / Inconsistencies
   - Patterns inconsistent with other domains
   - Performance issues (unnecessary re-renders, bundle size)
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
        "page": "src/pages/dashboard/index.tsx",
        "component": "src/components/dashboard/StatsCard.tsx",
        "hook": "src/hooks/useDashboardData.ts",
        "api": "src/api/dashboard.ts"
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
