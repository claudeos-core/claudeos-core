Read claudeos-core/generated/project-analysis.json and
perform a deep analysis of the following domains only: {{DOMAIN_GROUP}}

For each domain, select one representative file per layer, read its code, and analyze it.
Prioritize files with the richest patterns.

Analysis items (per domain):

1. Page/Routing Patterns
   - Routing approach (Nuxt file-based routing vs Vue Router manual config)
   - Layout structure (layouts/, default.vue, custom layouts)
   - Dynamic routes ([id].vue, [...slug].vue)
   - Page directory conventions (pages/ structure)
   - Middleware usage (defineNuxtRouteMiddleware, navigation guards)
   - Route meta and page meta (definePageMeta)
   - Loading/error handling (error.vue, NuxtErrorBoundary)

2. Component Patterns
   - Component structure (SFC <script setup>, Options API, Composition API)
   - Props definition (defineProps, withDefaults, runtime vs type-only)
   - Emits definition (defineEmits)
   - Slots usage (named slots, scoped slots)
   - Styling approach (<style scoped>, CSS Modules, Tailwind, UnoCSS)
   - UI library (Vuetify, PrimeVue, Radix Vue, Naive UI, Element Plus)
   - Component classification (UI, Feature, Layout, Page)
   - Component entry file pattern: index.vue vs ComponentName.vue
   - Directory structure pattern: record exact convention
   - Auto-imports (Nuxt auto-import, unplugin-auto-import)
   - Reuse patterns (composables, provide/inject, renderless components)
   - Accessibility (ARIA, semantic HTML, keyboard navigation)

3. Data Fetching Patterns
   - Nuxt: useFetch, useAsyncData, $fetch, server routes (server/api/)
   - Vue: Axios, fetch, TanStack Query/Vue Query
   - SSR data fetching (Nuxt server-side, useRequestHeaders)
   - Client-side data fetching (onMounted, watch)
   - Caching strategy (Nuxt payload, SWR, stale-while-revalidate)
   - Error/loading state handling (pending, error, refresh)
   - Streaming/Suspense

4. State Management Patterns
   - Pinia stores (defineStore, setup stores vs option stores)
   - Composables for shared state (useState in Nuxt)
   - URL state (useRoute, useRouter, query params)
   - Form state (VeeValidate, FormKit, vuelidate)
   - Provide/Inject patterns

5. Configuration/Environment Patterns
   - Environment variable management (NUXT_PUBLIC_, VITE_, .env separation)
   - nuxt.config.ts / vite.config.ts settings
   - Runtime config (useRuntimeConfig)
   - Build optimization (Nitro presets, SSR/SSG/SPA modes)
   - Module system (Nuxt modules, Vite plugins)

6. Logging/Monitoring Patterns
   - Client error tracking (Sentry, DataDog RUM)
   - Server logging (consola, pino, h3 logger)
   - Performance monitoring (Web Vitals, Lighthouse)
   - Analytics tools (Google Analytics, PostHog, Plausible)

7. Testing Patterns
   - Test framework (Vitest, Jest, Playwright, Cypress)
   - Component testing (@vue/test-utils, @testing-library/vue)
   - E2E testing strategy
   - Mocking strategy (MSW, vi.mock)
   - Test naming conventions
   - Nuxt testing (@nuxt/test-utils)

8. Domain-Specific Patterns
   - Authentication (Nuxt Auth, @sidebase/nuxt-auth, custom)
   - Internationalization (@nuxtjs/i18n, vue-i18n)
   - File upload (presigned URL, client direct upload)
   - Real-time features (WebSocket, SSE, Socket.io)
   - SEO optimization (useSeoMeta, useHead, OG tags)
   - Image optimization (nuxt/image, @nuxt/image)
   - API versioning strategy

9. Anti-patterns / Inconsistencies
   - Mixing Options API and Composition API
   - Unnecessary reactivity (ref vs reactive misuse)
   - Patterns inconsistent with other domains
   - Performance issues (unnecessary watchers, large bundle, layout shift)
   - Type safety issues
   - Accessibility issues

Do not create or modify source files. Analysis only.
Save results to claudeos-core/generated/pass1-{{PASS_NUM}}.json in the following format:

{
  "analyzedAt": "ISO timestamp",
  "passNum": {{PASS_NUM}},
  "domains": ["auth", "dashboard", "settings", "shared"],
  "analysisPerDomain": {
    "dashboard": {
      "representativeFiles": {
        "page": "pages/dashboard/index.vue",
        "layout": "layouts/dashboard.vue",
        "component": "components/dashboard/StatsCard.vue",
        "composable": "composables/useDashboard.ts",
        "store": "stores/dashboard.ts"
      },
      "patterns": {
        "page": { ... },
        "component": { ... },
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
