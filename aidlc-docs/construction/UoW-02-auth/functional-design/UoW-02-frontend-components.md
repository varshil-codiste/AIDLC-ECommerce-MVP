# Frontend Components — UoW-02 Auth + Role Gate

**Generated**: 2026-05-04T00:33:00Z
**Stage**: 8 — Functional Design
**UoW**: UoW-02 — Auth + role gate
**FE scope**: Login page (`/login`), auth token storage, protected-route redirect helper

---

## Component Tree

```
app/login/page.tsx            ← Next.js App Router page (Server Component wrapper)
└── LoginPage                 ← Client Component ('use client')
    ├── BrandHeader           ← Static header with app name + logo placeholder
    └── LoginForm             ← Controlled form (React state)
        ├── EmailField        ← input[type=email]
        ├── PasswordField     ← input[type=password] + show/hide toggle
        ├── ErrorBanner       ← renders when serverError != null
        └── SubmitButton      ← disabled while submitting
```

---

## Components

| Component | Type | File path | Props | State | Notes |
|-----------|------|-----------|-------|-------|-------|
| `LoginPage` | Client Component | `web/app/login/page.tsx` | — | `serverError: string\|null` | Top-level layout for the login page |
| `BrandHeader` | Client Component | `web/components/auth/BrandHeader.tsx` | — | — | Shows app name; no nav links |
| `LoginForm` | Client Component | `web/components/auth/LoginForm.tsx` | `onSuccess(user, tokens): void` | `email`, `password`, `showPassword`, `submitting`, `fieldErrors` | Owns form state; calls `authService.login()` |
| `EmailField` | Client Component | `web/components/auth/EmailField.tsx` | `value`, `onChange`, `error: string\|null`, `disabled` | — | `type="email"`, `autocomplete="username"` |
| `PasswordField` | Client Component | `web/components/auth/PasswordField.tsx` | `value`, `onChange`, `error: string\|null`, `disabled`, `showPassword`, `onToggleShow` | — | Toggle show/hide; `autocomplete="current-password"` |
| `ErrorBanner` | Client Component | `web/components/auth/ErrorBanner.tsx` | `message: string` | — | Renders when `serverError` is set; ARIA `role="alert"` |
| `SubmitButton` | Client Component | `web/components/auth/SubmitButton.tsx` | `loading: boolean`, `label: string` | — | `aria-busy` when loading; `disabled` when loading |

---

## Test IDs (data-testid convention)

Every interactive element carries a `data-testid` in format `<component>-<element-role>`:

| Element | `data-testid` |
|---------|--------------|
| Email input | `login-form-email` |
| Password input | `login-form-password` |
| Show/hide password toggle | `login-form-password-toggle` |
| Submit button | `login-form-submit` |
| Error banner | `login-form-error-banner` |
| Email field error | `login-form-error-email` |
| Password field error | `login-form-error-password` |

---

## State Management

- **Form state**: `useState` hooks in `LoginForm` (email, password, showPassword, submitting, fieldErrors, serverError)
- **Token storage**: `authService` (a thin module in `web/lib/auth-service.ts`) handles:
  - Storing `accessToken` in memory (closure / module-level variable — NOT localStorage; mitigates XSS)
  - Storing `refreshToken` + `tokenFamily` + `userId` in an `HttpOnly` cookie (set via a `POST /api/auth/set-cookie` Next.js Route Handler that proxies the tokens to HttpOnly cookie — keeps tokens out of JS access)
- **Auth state propagation**: Next.js App Router server components read the HttpOnly cookie for SSR; client components read from `authService.getAccessToken()` in memory
- **Route protection**: `middleware.ts` at root reads the HttpOnly cookie; redirects unauthenticated users from protected routes to `/login`

---

## Routing

| Route | Component | Auth required | Notes |
|-------|-----------|---------------|-------|
| `/login` | `LoginPage` | No (redirect to `/chat` if already authenticated) | Entry point for all roles |
| `/chat` | (UoW-05) | Yes (any role) | Redirect target after successful login; 404 until UoW-05 ships |

**Login flow**:
1. User submits `LoginForm`
2. `LoginForm` calls `authService.login(email, password)`
3. `authService` calls `POST /api/v1/auth/login` on the NestJS API
4. On success: calls `POST /api/auth/set-cookie` (Next.js Route Handler) to store refresh tokens in HttpOnly cookie
5. Sets `accessToken` in memory
6. `onSuccess(user, tokens)` fires → `router.push('/chat')`

---

## Accessibility (Level A — NFR-A11Y-08)

| Rule | Implementation |
|------|---------------|
| Meaningful `<title>` per page | `export const metadata = { title: 'Sign in — Chat-Native E-Commerce' }` in `app/login/page.tsx` |
| `<html lang="en-IN">` | Already set in `app/layout.tsx` (UoW-01) |
| Form labels | Each input has an associated `<label>` linked via `htmlFor`/`id` pair; no placeholder-only labeling |
| Error messages associated with inputs | `aria-describedby` on each input pointing to its error element |
| Error banner | `role="alert"` so screen readers announce it immediately |
| Button loading state | `aria-busy="true"` on `SubmitButton` while submitting |
| Focus management | On form error, focus moves to `ErrorBanner` |
| Keyboard navigation | Standard; no custom focus traps needed (single-form page) |

---

## Token Storage Architecture (security rationale)

```
Browser memory (JS variable)          HttpOnly cookie
─────────────────────────────         ───────────────────────
accessToken (15-min TTL)              refreshToken
                                      tokenFamily
                                      userId
                                      (SameSite=Strict, Secure, HttpOnly)
```

- **accessToken in memory**: Never persisted to localStorage or sessionStorage. Lost on page refresh intentionally — the refresh flow silently obtains a new one via the stored HttpOnly cookie.
- **refreshToken in HttpOnly cookie**: Inaccessible to JavaScript. Set by a Next.js Route Handler (`app/api/auth/set-cookie/route.ts`) that acts as a BFF (Backend For Frontend). Cookie attributes: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=2592000`.
- **Silent re-auth on page load**: `web/lib/auth-provider.tsx` (UoW-05) will call `POST /api/v1/auth/refresh` on mount if no in-memory access token exists. In UoW-02 this is stubbed; implemented in UoW-05.

---

## Auth Service module (`web/lib/auth-service.ts`)

Thin client-side module with:
- `login(email, password): Promise<LoginResult>` — calls NestJS `POST /api/v1/auth/login`, stores tokens
- `logout(): Promise<void>` — calls NestJS `POST /api/v1/auth/logout` + clears cookie
- `refreshToken(): Promise<string>` — calls NestJS `POST /api/v1/auth/refresh`, returns new access token
- `getAccessToken(): string | null` — returns in-memory access token
- `getUser(): { id, role, name } | null` — returns decoded user from last login

---

## Next.js Middleware (`middleware.ts`)

```
protected paths: /chat/**, /api/v1/** (except /auth/*)
unauthenticated → redirect to /login?returnTo=<original-path>
already authenticated on /login → redirect to /chat
```

Middleware reads the HttpOnly cookie (`refreshToken` presence only — does NOT validate the JWT in middleware, avoids importing crypto in edge runtime). Full validation happens at the NestJS API layer.
