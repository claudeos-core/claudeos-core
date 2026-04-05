Read claudeos-core/generated/project-analysis.json and
perform a deep analysis of the following domains only: {{DOMAIN_GROUP}}

For each domain, select one representative file per layer, read its code, and analyze it.
Prioritize files with the richest patterns.

Analysis items (per domain):

1. Module/Component Patterns
   - Module structure (NgModule, standalone components, feature modules)
   - Component type (@Component decorator, inline vs external templates)
   - Component lifecycle hooks (OnInit, OnDestroy, OnChanges, AfterViewInit)
   - Change detection strategy (Default vs OnPush, markForCheck, detectChanges)
   - Signals usage (signal, computed, effect — Angular 16+)
   - Input/Output decorators (@Input, @Output, input(), output() — signal-based)
   - ViewChild/ContentChild usage
   - Component communication patterns (parent-child, shared service, EventEmitter)

2. Routing Patterns
   - Route configuration (RouterModule.forRoot/forChild, standalone routes)
   - Lazy loading (loadChildren, loadComponent)
   - Route Guards (canActivate, canDeactivate, canLoad, resolve, functional guards)
   - Route resolvers
   - Nested routes and auxiliary routes
   - URL parameter handling (ActivatedRoute, paramMap, queryParamMap)
   - Navigation (Router.navigate, routerLink)

3. Service/DI Patterns
   - Service structure (@Injectable, providedIn: 'root' vs module-level)
   - Injection tokens (InjectionToken, custom tokens)
   - Factory providers (useFactory, useClass, useValue, useExisting)
   - Hierarchical injection (component-level providers)
   - inject() function (Angular 14+) vs constructor injection

4. RxJS/Reactive Patterns
   - Observable usage (HttpClient, Subject, BehaviorSubject, ReplaySubject)
   - Operators (map, switchMap, mergeMap, catchError, tap, takeUntil, shareReplay)
   - Subscription management (takeUntil, async pipe, DestroyRef, takeUntilDestroyed)
   - Error handling in streams
   - Custom operators
   - Signals vs Observables migration status

5. Template Patterns
   - Structural directives (*ngIf, *ngFor, @if/@for — control flow Angular 17+)
   - Attribute directives (ngClass, ngStyle, custom directives)
   - Template reference variables (#ref)
   - ng-content (content projection, multi-slot projection)
   - ng-template and ngTemplateOutlet

6. Form Patterns
   - Reactive Forms (FormGroup, FormControl, FormBuilder, FormArray)
   - Template-driven Forms (ngModel, NgForm)
   - Validators (built-in, custom sync/async validators)
   - Error display patterns
   - Dynamic forms
   - Form submission handling

7. State Management Patterns
   - NgRx (Store, Actions, Reducers, Effects, Selectors)
   - NGXS (State, Action, Selector)
   - Akita (Store, Query)
   - Component Store (@ngrx/component-store)
   - Signal Store (@ngrx/signals)
   - Plain service-based state (BehaviorSubject)

8. HTTP/API Patterns
   - HttpClient usage (get, post, put, delete)
   - Interceptors (HttpInterceptor, functional interceptors)
   - Error handling (catchError, retry, HttpErrorResponse)
   - Request/response transformation
   - API service abstraction patterns
   - Caching strategies (shareReplay, custom cache interceptor)
   - Import paths: record EXACT path aliases and import patterns (e.g., `@app/`, `@core/`, `@shared/`)

9. Testing Patterns
   - Test framework (Jasmine/Karma, Jest, Web Test Runner)
   - TestBed configuration (configureTestingModule, component harness)
   - Component testing (ComponentFixture, DebugElement)
   - Service testing (inject, HttpClientTestingModule)
   - Mocking (spyOn, jasmine.createSpy, jest.mock)
   - E2E testing (Protractor, Cypress, Playwright)
   - Test naming conventions

10. Styling Patterns
    - ViewEncapsulation (Emulated, None, ShadowDom)
    - CSS methodology (BEM, SCSS modules, Tailwind, Angular Material theming)
    - :host, ::ng-deep usage
    - Global vs component styles
    - CSS/SCSS variables and theming

11. Domain-Specific Patterns
    - File upload
    - WebSocket (RxJS WebSocket, Socket.io)
    - Internationalization (@ngx-translate, Angular i18n)
    - SSR/SSG (Angular Universal, @angular/ssr)
    - PWA (@angular/pwa)
    - Angular Material / CDK usage
    - Animation (@angular/animations)

12. Anti-patterns / Inconsistencies
    - Memory leaks (unsubscribed Observables, missing takeUntil/DestroyRef)
    - Excessive change detection (not using OnPush)
    - Large modules (not lazy loaded)
    - Subscribe inside subscribe (nested subscriptions)
    - Direct DOM manipulation (instead of renderer)
    - Type safety issues (any abuse)
    - Inconsistent patterns across feature modules

Do not create or modify source files. Analysis only.
Save results to claudeos-core/generated/pass1-{{PASS_NUM}}.json in the following format:

{
  "analyzedAt": "ISO timestamp",
  "passNum": {{PASS_NUM}},
  "domains": ["dashboard", "auth", "settings", "profile"],
  "analysisPerDomain": {
    "dashboard": {
      "representativeFiles": {
        "module": "dashboard/dashboard.module.ts",
        "component": "dashboard/dashboard.component.ts",
        "service": "dashboard/dashboard.service.ts",
        "routing": "dashboard/dashboard-routing.module.ts",
        "template": "dashboard/dashboard.component.html"
      },
      "patterns": {
        "module": { ... },
        "component": { ... },
        "routing": { ... },
        "service": { ... },
        "rxjs": { ... },
        "template": { ... },
        "form": { ... },
        "stateManagement": { ... },
        "http": { ... },
        "testing": { ... },
        "styling": { ... }
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
