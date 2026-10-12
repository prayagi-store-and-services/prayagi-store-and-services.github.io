# Security notes - Prayagi Store and Services site

## Staff page (13 Oct 2026, not connected yet)

New page `/staff/`. It is inert ("Unavailable") until the owner deploys the backend and its address is set in `staff/staff.js`. Customer login does not exist.

- Admin login (prayagijanseva@gmail.com only): no password. A 6-digit code is emailed from the owner's account by a Google Apps Script. The code is stored only as a salted hash, works once, expires in 5 minutes, allows 5 wrong tries, and at most 3 codes per 15 minutes are sent. It is never logged or returned to the browser.
- Staff login: password, set by the staff member with a one-time 8-digit invite from the admin (valid 24 hours, handed over in person). Passwords are stored salted and iterated, never in this repo. 5 wrong tries lock the account for 15 minutes.
- Sessions last 8 hours, live in the browser tab only (sessionStorage), and are re-checked on every call, so a disabled staff member loses access at once.
- Booking rules enforced by the backend: 1-hour gap between appointments, closed days, Rs 50 emergency flag. It does not update Google Calendar and does not send WhatsApp.
- No key, password or code is in this repo. The page has a strict Content-Security-Policy and writes data to the screen as text only.
- Staff WhatsApp OTP (Fast2SMS "otp" template, paid per message) is designed but OFF. When enabled, the key stays in Apps Script properties only.
- Honest limit: tested with a simulated backend (26 checks), not on real Apps Script yet. Apps Script web apps cannot see the caller's IP, so rate limits are per email, not per IP.

## Address (11 Oct 2026)
- Shop address and map pin match the owner-confirmed master address (Naini, Prayagraj 211008). The map is a plain link, no embed and no script.

## Ratings section (11 Oct 2026)
- Static text only. No script, no widget, no embed and no call to JustDial or IndiaOnline is made by the page.
- The two rating figures are typed in with the date they were checked (11 October 2026) and are labeled as not live.
- The two source links open in a new tab with rel="noopener noreferrer". Nothing is sent to those sites until the visitor clicks.
- No IndiaMART rating is shown because none was verified.
