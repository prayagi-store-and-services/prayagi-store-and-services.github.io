Prayagi website: reusable server-side admission controls must cover admin, staff and future customer login. Customer login stays disabled. New customer-login action must use the same pre-validation, bounded identifiers, shared unauthenticated global and account rolling counters, mail budget and existing authentication/lock rules before launch. No Turnstile in current scope.
Deployment blockers: active Forms-trigger owner/script unverified. Budget-exhaustion must preserve a visible pending request or queue, not silently lose booking or report it confirmed. Mail identity and existing scopes stay unchanged. Never run setupTrigger or production test mail to test protections.

Narrow deployed Version 1 patch only, not the newer repository backend.
- Malformed JSON, arrays, bodies above 8192 characters, unknown actions and bounded fields rejected before locking or accessing Sheets.
- Login methods share rolling limits: 6/account/minute, 30/global/minute; max 24 hashed account buckets, expired after 1 minute. Customer recovery namespace reusable, customer login remains OFF.
- Staff/admin mail recipient budget: 60 per rolling 24 hours, reserve 10 from MailApp remaining account quota. Existing global OTP cap, per-email resend rule, wrong-try and master delays unchanged.
- No changes to sender, execute-as, scopes, master/password/OTP records, booking intake or calendar. Limiter uses new abuse-prefixed properties only.
- No real test mail. CI mocks all Google services. This patch is an application limiter, not an edge/DDoS filter.
- Deployment rollback: select prior web-app Version 1 without changing URL or sender; limiter properties can remain harmlessly unused.
