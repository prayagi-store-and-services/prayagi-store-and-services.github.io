# Security notes - Prayagi Store and Services site

## Staff page (13 Oct 2026, not connected yet)

New page `/staff/`. It is inert ("Unavailable") until the owner deploys the backend and its address is set in `staff/staff.js`. Customer login does not exist.

- Admin login (prayagijanseva@gmail.com only): no password. A 6-digit code is emailed from the owner's account by a Google Apps Script. The code is stored only as a salted hash, works once, expires in 10 minutes, and a new code can be requested only 3 minutes after the last one (the new one replaces the old), and at most 5 codes per 15 minutes are sent. wrong codes typed against a live code count (requests do not); 3 wrong codes burn that code. This 24-hour lock applies to staff and customers, not to the admin. It is never logged or returned to the browser.
- Staff login: password, set by the staff member with a one-time 8-digit invite from the admin (valid 24 hours, handed over in person). Passwords are stored salted and iterated, never in this repo. 3 wrong passwords lock the account for 24 hours from the moment it locked, then it unlocks by itself.
- Early unlock: only the admin can release a 24-hour lock early (admin screen). Staff can only send an unlock request; they cannot unlock anyone. Lock, request and unlock events go to an Audit sheet (no codes or passwords in it). The admin has no lock; adminUnlock() in the Apps Script project only resets the master-password wait.
- Admin is never locked out. The admin gets 3 tries per emailed code; after 3 wrong codes (or if the code has not arrived after 2 minutes) a master-password box appears; it is not shown before. The master password is exactly 12 digits, set by the admin himself on this page after an email-code login (nobody else sees it), stored only as a salted, iterated hash. Instead of a lock, wrong master-password tries add a growing wait (30 s, 1 min, 5 min, 15 min, then 1 hour) and every try, wrong or right, emails an alert to the admin address and is audit-logged. Honest risks: 12 digits is a small keyspace if the stored hash ever leaks; an attacker who knows the admin email can open the master box by typing 3 wrong codes and can then keep the wait at 1 hour for the admin's own master attempts (the emailed code still works).
- Customers: login is OFF. Staff can only save a customer record. Forgot-password rules are coded: a locked customer cannot reset during the lock; a locked staff member may reset but cannot log in until the lock ends or the admin unlocks. WhatsApp reset is Unavailable until it is switched on.
- Sessions last 8 hours, live in the browser tab only (sessionStorage), and are re-checked on every call, so a disabled staff member loses access at once.
- Booking rules enforced by the backend: 1-hour gap between appointments, closed days, Rs 50 emergency flag. It does not update Google Calendar and does not send WhatsApp.
- No key, password or code is in this repo. The page has a strict Content-Security-Policy and writes data to the screen as text only.
- Staff WhatsApp OTP (Fast2SMS "otp" template, paid per message) is designed but OFF. When enabled, the key stays in Apps Script properties only.
- Honest limit: tested with a simulated backend (57 checks), not on real Apps Script yet. Apps Script web apps cannot see the caller's IP, so rate limits are per email, not per IP.

## Address (11 Oct 2026)
- Shop address and map pin match the owner-confirmed master address (Naini, Prayagraj 211008). The map is a plain link, no embed and no script.

## Ratings section (11 Oct 2026)
- Static text only. No script, no widget, no embed and no call to JustDial or IndiaOnline is made by the page.
- The two rating figures are typed in with the date they were checked (11 October 2026) and are labeled as not live.
- The two source links open in a new tab with rel="noopener noreferrer". Nothing is sent to those sites until the visitor clicks.
- No IndiaMART rating is shown because none was verified.
