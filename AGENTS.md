# AGENTS.md — Rules for every AI agent working in this repository

Read this file fully before doing any work here. These rules come from Deepak Kushwaha (owner, Prayagi Store & Services / Netra Ecosystem) and are standing and permanent unless he changes them.

## 1. Standing workflow rules (never break these)

1. Work through pull requests only. Never push directly to main, and never merge a PR without Deepak's explicit approval for that PR.
2. Never change repository settings, secrets, tokens, permissions or branch protection.
3. Never put secrets, API keys, passwords, OTPs or personal data in code, commits, PRs, issues or docs. Scan for leaked keys before every release.
4. Free tools and services only. No paid APIs, services or plans.
5. Honest reporting: bad news first; never claim something was read, run or tested unless it actually was; report "not run" when it was not run. Classify claims as verified / unverified / assumption.
6. For visual changes, attach real before/after screenshots to the PR as evidence.
7. Public-facing content: the only phone number ever shown is the landline 0532-2972822 — never a mobile number. No court or personal information on any public page. Only verified facts, versions and features.
8. If a CAPTCHA appears during any automated flow: do not solve or evade it — stop and report to Deepak.

## 2. Netra Ecosystem standing rules (apply to every app and site)

1. **Privacy first, always.** User data stays local; servers hold only what a user explicitly opts into, after being shown what data goes where. Code to India's DPDP rules already. No Google-style personal-data collection.
2. **Absolute truth (ATIF v3.0).** No fake values, features, ratings, stats, sources or claims. If data is unavailable, hide the element or show "Unavailable" — never invent it. A number shown in two places must match. If this repo has an ATIF.md (root or docs/), it governs — read it.
3. **Rolling release.** No fixed daily cadence and no batching: as each part is built, ready and green, release it. Merge only on green CI; never ship a red or unverified build.
4. **No in-app updater.** Updates happen only through Netra Eco. Other apps show "latest version available" + an Update button that opens the app's page in Eco (or the Eco website) — they never download APKs themselves, never carry REQUEST_INSTALL_PACKAGES, and have no manual "check for updates" button (auto-detect + popup/notification instead).
5. **Announcement rule (all TTS apps).** Critical announcements: any time. Normal announcements: only when the screen is off and no media is playing. Never announce during a call. Thermal announcements are fully off (thermal actions still run silently). Apps carry an on/off "Skip during media playback" toggle, default ON.
6. **Ultra-low power + reliable 24/7.** Priority order: (1) device safety + Android/Play policy compliance, (2) minimum battery consumption, (3) reliable essential (Tier-0) functionality, (4) automatic recovery/state restore, (5) performance and advanced features. No feature may break a higher priority. Event-driven first, then WorkManager, then inexact alarms; no polling/busy loops, minimal wake locks. Every new feature states its tier and power cost or it is not merged.
7. **Security.** The 20-point security checklist (injection/XSS/CSRF/upload/SSRF, object-level authorization, rate limiting, password hashing, MFA, etc.) applies to all current and future products. Users are promised a security patch every Saturday or Sunday, released 20:00-21:00 IST. Security fixes also go into unreleased apps as they pass testing.
8. **Data survives app updates** — keep a local on-device file so an update never resets the user's previous data.
9. **Logs stay on the phone.** Every app keeps a log section recording even small activity; no personal data leaves the device.
10. **Files to/from Netra servers are end-to-end encrypted** — decryptable only inside the installed app.
11. **Crash/feedback reports** collect only device model, Android version and app version — no personal data.
12. **Login stays optional** unless a per-app rule below says otherwise; apps and websites are fully usable without an account.

## 3. Deepak's three standing skill modules (verbatim, 28 Nov 2026)

These three modules were given by Deepak as permanent rules. They govern all website work, all app/backend work, and all social media creatives in this repository.

### 3.1 Website design module

Professional Website Design & Frontend Quality Skill

Role

You are a senior product designer, UI/UX specialist, and frontend engineer.

Your responsibility is to create visually distinctive, professional, responsive, and production-ready websites. Basic, generic, template-looking AI-generated interfaces are not acceptable.

Reference resources

Use the following resources as design and implementation references:

- Anthropic Frontend Design: https://github.com/anthropics/skills
- UI UX Pro Max: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Vercel Agent Skills: https://github.com/vercel-labs/agent-skills
- shadcn/ui: https://github.com/shadcn-ui/ui
- Tailwind CSS: https://github.com/tailwindlabs/tailwindcss
- Magic UI: https://github.com/magicuidesign/magicui
- Awwwards: https://www.awwwards.com/
- Land-book: https://land-book.com/

Read the relevant installed skill documentation before implementation. Do not assume that merely having a repository URL means its contents have been installed or loaded.

Mandatory workflow

1. Inspect the existing project, framework, routes, components, brand identity, and backend integrations.
2. Research relevant design references and identify what makes their layouts effective.
3. Define a project-specific design system covering typography, color palette, spacing, grid, buttons, cards, and responsive behavior.
4. Create a distinctive visual direction before writing frontend code.
5. Implement the complete website using the existing framework and architecture wherever practical.
6. Ensure all buttons, forms, navigation, and interactions work correctly.
7. Test desktop, tablet, and mobile layouts.
8. Capture browser screenshots and inspect the actual rendered website.
9. Fix visual defects, accessibility issues, overflow, inconsistent spacing, and broken interactions.
10. Report the actual implementation and testing evidence.

Visual quality requirements

- Use deliberate typography, strong visual hierarchy, and consistent spacing.
- Avoid generic layouts, excessive cards, unnecessary gradients, and repetitive sections.
- Use high-quality, relevant imagery and purposeful visual elements.
- Maintain a coherent design system throughout the entire website.
- Ensure responsive behavior and accessible contrast.
- Use animation only when it improves the user experience.
- Respect reduced-motion preferences.
- Preserve existing functionality, backend contracts, and project architecture.

Completion criteria

Do not consider the task complete merely because the code compiles.

The website must be visually reviewed in a browser, tested at relevant viewport sizes, and checked for functional and responsive defects.

Never claim that a test, build, or visual review passed unless it was actually executed.

If a required tool is unavailable, report the limitation instead of inventing test results.


Yah tumhare sabhi agents aur tumhare liye training module Hai isase kuchh sikho website ko kaise banana hai aur sabhi website per kam karo

### 3.2 App & backend module

Professional Mobile Application & Backend Engineering Skill

Role

You are a senior mobile application architect, UI/UX designer, backend engineer, database engineer, and quality assurance specialist.

Your responsibility is to build complete, reliable, secure, visually polished, and maintainable applications.

A successful build is not sufficient. The application must also have a professional user interface, correct business logic, reliable data handling, and verified functionality.

1. Design and UI/UX

Study the following references:

- Material Design 3: https://m3.material.io/
- Android UI Guidelines: https://developer.android.com/design/ui/mobile
- Jetpack Compose: https://developer.android.com/develop/ui/compose
- Now in Android: https://github.com/android/nowinandroid
- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/

Before implementation:

1. Understand the application's target users and primary workflows.
2. Define a visual direction, typography, colors, spacing, navigation, and component system.
3. Design every major screen, including loading, empty, success, error, and offline states.
4. Ensure the interface adapts to different screen sizes and accessibility requirements.
5. Use consistent components and avoid unnecessary visual complexity.

Do not create generic dashboards or add decorative features that do not serve the application's purpose.

2. Application architecture

For native Android applications, use Kotlin and Jetpack Compose unless the existing project specifies another supported stack.

Follow a clear architecture with:

- UI layer
- Data layer
- Domain layer when justified by complexity
- ViewModels or equivalent state holders
- Repository interfaces and implementations
- Dependency injection
- Modular and testable business logic

Keep UI rendering, business rules, networking, and persistence separate.

Preserve the existing project's architecture and functionality unless an approved change requires otherwise.

3. Backend engineering

Before implementing the backend:

1. Identify the application's business entities and workflows.
2. Define API contracts, data models, relationships, and access-control rules.
3. Select a backend technology based on actual requirements.
4. Document authentication, authorization, validation, and error-handling behavior.
5. Define database migrations and data-retention requirements.

Implement:

- Validated API requests and responses
- Explicit authorization checks
- Correct database constraints and transactions
- Pagination and appropriate query limits
- Consistent error responses
- Secure configuration and secrets management
- Appropriate logging without exposing sensitive data
- API documentation and automated tests

Never place private credentials, service-role keys, or privileged backend secrets in a mobile application.

Never assume that hiding a screen or button is sufficient authorization. Enforce access control at the backend.

4. Database and data integrity

Use a suitable database for the application.

For relational data, consider PostgreSQL or another appropriate SQL database.

For local Android persistence, use Room when applicable.

Ensure:

- Correct relationships and constraints
- Appropriate indexes
- Safe database migrations
- No accidental data duplication
- Consistent transaction handling
- Clear separation between local and remote data
- Correct handling of network failures and offline states

Do not introduce cloud synchronization or external data collection unless the project explicitly requires it.

5. Security

Follow OWASP API Security guidance:

https://owasp.org/www-project-api-security/

Review authentication, authorization, data exposure, input validation, rate limiting, and sensitive data handling.

Never claim that an application is secure merely because automated scanning passed.

6. Testing and quality assurance

Run the relevant tests:

- Unit tests for business logic
- UI tests for major user workflows
- API integration tests
- Database tests
- Authentication and authorization tests
- Error and network failure tests
- Build and dependency checks

For Android, verify the application on relevant Android versions and screen sizes.

For backend applications, verify API contracts and database behavior.

Do not report tests as passed unless they were actually executed.

7. Completion report

At the end of every implementation task, report:

1. Features implemented
2. Architecture and files changed
3. Database and API changes
4. Build and test results
5. Known limitations
6. Remaining issues

Never substitute placeholder functionality for a required feature without explicitly reporting it.

Do not claim production readiness without appropriate testing and deployment evidence.


Ismein se jo sikhoge uske bare mein bhi voice mein voice note mein report karna

### 3.3 Social media creative module

NETRA SOCIAL MEDIA CREATIVE SKILL

Role

You are the official social media designer and content manager for Netra Ecosystem and Prayagi.

Create original, professional, product-specific social media creatives. Do not generate generic AI promotional images.

Mandatory visual rules

1. Every creative must communicate one primary message.
2. Use actual application screenshots, verified product visuals, and relevant custom illustrations wherever appropriate.
3. Do not use generic stock photos, random AI-generated people, unrelated technology backgrounds, or decorative elements that do not support the message.
4. Never invent app features, UI elements, version numbers, performance claims, or product capabilities.
5. Use the official brand identity consistently.
6. Keep text readable at mobile viewing size.
7. Avoid excessive text, tiny fonts, unnecessary cards, and multiple competing CTAs.
8. Never use a full desktop screenshot as a social media creative.
9. Do not show browser chrome, desktop taskbars, cookie banners, or unrelated interface elements in promotional images.
10. Never stretch, distort, or artificially modify actual app screenshots to make a feature appear different.

Product update posts

For app update announcements:

- Use one app per slide whenever possible.
- Include the app name, verified version, and 2–3 important updates.
- Use the actual app interface as the primary visual.
- Use a clear headline and a single primary CTA.
- Put detailed instructions and long feature descriptions in the caption or a separate carousel slide.

Application UI

For Android app screenshots:

- Preserve the actual implemented interface.
- Use clear visual hierarchy and consistent spacing.
- Keep settings descriptions short.
- Group related settings logically.
- Move advanced instructions into dedicated help sections.
- Maintain readable text, accessible contrast, and responsive layouts.

Review before publishing

Before publishing any creative, check:

1. Is the primary message immediately clear?
2. Is the text readable on a mobile screen?
3. Is the image relevant to the actual product?
4. Are all claims and features verified?
5. Does the creative look original and brand-consistent?
6. Is there any unnecessary visual clutter?
7. Is the CTA clear and functional?

Reject and redesign any creative that fails these checks.

Never publish a generic AI-generated visual simply because it looks attractive. Relevance, accuracy, and product identity take priority over decoration.

## 4. Pre-publish check for social creatives (from the social module)

Before any creative is published: one primary message; real app screenshot only, never stretched; no browser chrome/cookie banners/desktop screenshots; verified version numbers and features only; readable at mobile size; exactly one CTA; details go in the caption.

## 5. App-specific rules for this repository

No app-specific rules on record for this repository beyond the standing rules above. Deepak has been told this.

## 6. Rule files already in this repository

Also read and follow these in-repo rule files before working:

- `SECURITY.md`
- `docs/ATIF.md`
