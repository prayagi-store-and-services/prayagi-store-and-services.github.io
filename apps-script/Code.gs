/**
 * Prayagi staff login backend (Google Apps Script web app). Free, no Cloud Functions, no paid SMS.
 * Deploy as: Execute as ME (prayagideepak@gmail.com), access: Anyone. Nothing secret is stored in this file.
 * Admin login = one-time 6-digit code emailed (from this script's account) to the fixed admin address below, no password.
 * Staff login = password (set by the staff member with a one-time invite from the admin). WhatsApp OTP for staff is designed but OFF (WA_ENABLED=false)
 * until the Fast2SMS template and fee are confirmed; its API key would live only in Script Properties, never in this file or the site.
 * The code is never logged, never shown in a response, and is stored only as a salted hash.
 */
var ADMIN = 'prayagijanseva@gmail.com';
var OTP_TTL_MS = 10 * 60 * 1000;     // code valid 10 minutes (matches the WhatsApp template text)
var RESEND_MS = 3 * 60 * 1000;       // a new code can be requested only 3 minutes after the last one; the new code replaces the old
var OTP_MAX_TRIES = 3;               // wrong guesses allowed per account, then locked
var SEND_PER_EMAIL = 5;              // codes per email per 15 minutes (the 3-minute resend rule already caps it)
var SEND_WINDOW_MS = 15 * 60 * 1000;
var SEND_GLOBAL_PER_HOUR = 30;
var SESSION_TTL_MS = 8 * 60 * 60 * 1000;   // absolute limit
var IDLE_MS = 15 * 60 * 1000;               // idle limit
var ACTIONS_PER_MIN = 40;                   // per session
var ALERTS_PER_HOUR = 5;                    // flood limit on alert emails
var BUFFER_MIN = 60;                 // 1-hour buffer between appointments
var CUSTOMER_LOGIN_ENABLED = false;   // customer login stays OFF by owner order
var MASTER_LEN = 12, MASTER_ROUNDS = 5000, MASTER_WINDOW_MS = 30 * 60 * 1000;
var MASTER_DELAYS_S = [30, 60, 300, 900, 3600];   // escalating wait between master-password attempts; the admin is never locked out
var WA_ENABLED = false;              // staff WhatsApp OTP (Fast2SMS): not built, not enabled
var LOCK_MS = 24 * 3600 * 1000;      // owner rule: 3 wrong attempts lock the account for 24 hours from the moment it locked, then it auto-releases
var PW_MIN = 10, PW_FAILS = 3, PW_LOCK_MS = LOCK_MS, PW_ROUNDS = 3000;
var P = PropertiesService.getScriptProperties();

function doGet(e) {
  var a = e && e.parameter && e.parameter.action;
  if (a === 'availability') { try { return out_(availability_()); } catch (x) { return out_({ ok: false, error: 'Unavailable' }); } }
  return out_({ ok: true, service: 'prayagi-staff' });
}

// Public availability: dates and times only (see Availability.gs). Cached 5 minutes so the public page is at most about 5-10 minutes behind the calendar.
var BOOKING_CAL_ID = '801ceaf817c96d3c6a2c04f9bbc6f9951e926cb1838f7f703a0c964316d50dfa@group.calendar.google.com';
var AVAIL_DAYS = 60, AVAIL_CACHE_S = 300;
function availability_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('avail');
  if (hit) return JSON.parse(hit);
  var now = Date.now(), cal = CalendarApp.getCalendarById(BOOKING_CAL_ID);
  if (!cal) throw new Error('calendar');
  var from = new Date(now - 86400000), to = new Date(now + AVAIL_DAYS * 86400000);
  var raw = cal.getEvents(from, to).map(function (ev) {
    var all = ev.isAllDayEvent();
    return { title: ev.getTitle() === 'Unavailable' ? 'Unavailable' : 'x', allDay: all, startDate: all ? Utilities.formatDate(ev.getAllDayStartDate(), 'Asia/Kolkata', 'yyyy-MM-dd') : '', start: ev.getStartTime().getTime(), end: ev.getEndTime().getTime() };
  });
  var dates = sheet_('Closures').getDataRange().getValues().slice(1).map(function (x) { return fmtDate_(x[0]); });   // dates only; reasons are never read
  var res = sanitizeAvailability_(raw, dates, now);
  cache.put('avail', JSON.stringify(res), AVAIL_CACHE_S);
  return res;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (x) { return out_({ ok: false, error: 'Busy, try again.' }); }
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (b.action) {
      case 'requestOtp': return out_(requestOtp_(b));
      case 'verifyOtp': return out_(verifyOtp_(b));
      case 'loginPassword': return out_(loginPassword_(b));
      case 'masterOption': return out_(masterOption_());
      case 'loginMaster': return out_(loginMaster_(b));
      case 'forgotPassword': return out_(forgotPassword_(b));
      case 'setPassword': return out_(setPassword_(b));
      case 'logoutAll': { var ss = session_(b.token); if (ss && !ss.rateLimited) revokeAll_(ss.email); return out_({ ok: true }); }
      case 'logout': P.deleteProperty('sess:' + hash_(b.token || '')); return out_({ ok: true });
    }
    var s = session_(b.token);
    if (!s) return out_({ ok: false, error: 'Please log in again.', relogin: true });
    if (s.rateLimited) return out_({ ok: false, error: 'Too many actions. Wait a minute.' });
    switch (b.action) {
      case 'me': return out_({ ok: true, email: s.email, role: s.role });
      case 'listAppointments': return out_(listAppointments_());
      case 'addAppointment': return out_(addAppointment_(b, s));
      case 'setStatus': return out_(setStatus_(b, s));
      case 'listStaff': return out_(admin_(s) || listStaff_());
      case 'addStaff': return out_(admin_(s) || addStaff_(b));
      case 'createInvite': return out_(admin_(s) || createInvite_(b));
      case 'setStaffActive': return out_(admin_(s) || setStaffActive_(b));
      case 'setMaster': return out_(admin_(s) || setMaster_(b, s));
      case 'createCustomer': return out_(createCustomer_(b, s));
      case 'requestUnlock': return out_(requestUnlock_(b, s));
      case 'listLocks': return out_(admin_(s) || listLocks_());
      case 'unlock': return out_(admin_(s) || unlock_(b, s));
      case 'listClosures': return out_(listClosures_());
      case 'addClosure': return out_(admin_(s) || addClosure_(b));
    }
    return out_({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return out_({ ok: false, error: "Server error." }); // details are not sent to the browser
  } finally { lock.releaseLock(); }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function admin_(s) { return s.role === 'admin' ? null : { ok: false, error: 'Admin only.' }; }
function norm_(v) { return String(v || '').trim().toLowerCase(); }
function validEmail_(v) { return /^[a-z0-9._%+\-]{1,64}@[a-z0-9.\-]{1,190}\.[a-z]{2,}$/.test(v); }

function salt_() {
  var s = P.getProperty('salt');
  if (!s) { s = rand_(32); P.setProperty('salt', s); }
  return s;
}
function hash_(v) { return b64_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt_() + '|' + v)); }
function b64_(bytes) { return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, ''); }
function rand_(n) {
  var bytes = [];
  while (bytes.length < n) {
    bytes = bytes.concat(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now()));
  }
  return b64_(bytes.slice(0, n));
}
function code6_() {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now());
  var n = 0; for (var i = 0; i < 6; i++) n = n * 256 + (d[i] & 255);
  return ('000000' + (n % 1000000)).slice(-6);
}
function same_(a, b) { if (a.length !== b.length) return false; var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

function roleOf_(email) {
  if (email === ADMIN) return 'admin';
  var rows = sheet_('Staff').getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (norm_(rows[i][0]) === email && String(rows[i][2]) === 'active') return 'staff';
  return null;
}

function requestOtp_(b) {
  var email = norm_(b.email), now = Date.now();
  var generic = { ok: true, message: 'If this email is registered, a code has been sent. It is valid for 10 minutes. You can ask for a new one after 3 minutes.' };
  if (!validEmail_(email)) return generic;
  var g = JSON.parse(P.getProperty('sendlog') || '[]').filter(function (t) { return now - t < 3600000; });
  if (g.length >= SEND_GLOBAL_PER_HOUR) return generic;
  if (email !== ADMIN) return generic;                        // email OTP is admin-only; same reply for everyone else, no probing
  var role = 'admin';
  var st = JSON.parse(P.getProperty('otp:' + email) || '{}');
  var log = (st.sent || []).filter(function (t) { return now - t < SEND_WINDOW_MS; });
  if (log.length >= SEND_PER_EMAIL) return generic;
  if (log.length && now - log[log.length - 1] < RESEND_MS) return { ok: true, message: 'A code was just sent. You can ask for a new one after 3 minutes; the new code replaces the old one.' };
  var code = code6_();
  log.push(now); g.push(now);
  P.setProperty('otp:' + email, JSON.stringify({ h: hash_(email + '|' + code), exp: now + OTP_TTL_MS, fails: 0, masterUntil: st.masterUntil || 0, sent: log }));
  P.setProperty('sendlog', JSON.stringify(g));
  MailApp.sendEmail(email, 'Prayagi staff login code',
    'Your Prayagi staff login code is ' + code + '.\nIt works once and expires in 10 minutes. A newer code replaces this one. If you did not ask for it, ignore this email and tell the shop owner.');
  return generic;
}

function verifyOtp_(b) {
  var email = norm_(b.email), code = String(b.code || '').replace(/\D/g, ''), now = Date.now();
  var bad = { ok: false, error: 'Code is wrong or expired.' };
  var raw = P.getProperty('otp:' + email);
  if (!raw || code.length !== 6) return bad;
  var st = JSON.parse(raw);
  if (now > st.exp || !st.h) return bad;                       // expired or already used: not counted as a wrong attempt
  if (!same_(st.h, hash_(email + '|' + code))) {               // only a wrong code typed against a live code counts
    st.fails = (st.fails || 0) + 1;
    if (st.fails >= OTP_MAX_TRIES) {                           // admin is never locked: the code is burned, a new one must be requested, and the master-password option opens
      st.fails = 0; st.h = ''; st.exp = 0; st.masterUntil = now + MASTER_WINDOW_MS;
      P.setProperty('otp:' + email, JSON.stringify(st));
      audit_('system', '3 wrong OTP attempts: master option opened', email);
      return { ok: false, error: 'Code is wrong or expired.', masterAvailable: true };
    }
    P.setProperty('otp:' + email, JSON.stringify(st));
    return bad;
  }
  st.fails = 0;
  st.h = ''; st.exp = 0; P.setProperty('otp:' + email, JSON.stringify(st));   // single use
  if (email !== ADMIN) return bad;
  var role = 'admin';
  var token = rand_(32);
  P.setProperty('sess:' + hash_(token), JSON.stringify({ email: email, role: role, exp: now + SESSION_TTL_MS, seen: now }));
  return { ok: true, token: token, role: role, email: email };
}

function session_(token) {
  if (!token) return null;
  var k = 'sess:' + hash_(token), raw = P.getProperty(k), now = Date.now();
  if (!raw) return null;
  var s = JSON.parse(raw);
  if (now > s.exp || now - (s.seen || 0) > IDLE_MS) { P.deleteProperty(k); return null; }   // absolute 8 h, idle 15 min
  var role = roleOf_(s.email);                                 // re-check every call: disabled staff lose access at once
  if (!role) { P.deleteProperty(k); return null; }
  s.win = (s.win || []).filter(function (t) { return now - t < 60000; });
  if (s.win.length >= ACTIONS_PER_MIN) return { rateLimited: true };
  s.win.push(now); s.seen = now; s.role = role;
  P.setProperty(k, JSON.stringify(s));
  return s;
}
function revokeAll_(email) {                                   // end every session of this account
  var all = P.getProperties();
  for (var key in all) if (key.indexOf('sess:') === 0) { try { if (JSON.parse(all[key]).email === email) P.deleteProperty(key); } catch (e) {} }
}
function alert_(subject, body) {                               // flood-limited alert email to the admin
  var now = Date.now(), log = JSON.parse(P.getProperty('alertlog') || '[]').filter(function (t) { return now - t < 3600000; });
  if (log.length >= ALERTS_PER_HOUR) return;
  log.push(now); P.setProperty('alertlog', JSON.stringify(log));
  MailApp.sendEmail(ADMIN, subject, body);
}

function sheet_(name) {
  var id = P.getProperty('sheetId'), ss;
  if (id) ss = SpreadsheetApp.openById(id);
  else { ss = SpreadsheetApp.create('Prayagi staff data (private)'); P.setProperty('sheetId', ss.getId()); }
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    var heads = { Customers: ['mobile', 'name', 'status', 'created', 'lockuntil'], Audit: ['time', 'actor', 'action', 'target'], Unlocks: ['id', 'target', 'requestedBy', 'time', 'status'], Staff: ['email', 'name', 'status', 'added', 'mobile', 'pwsalt', 'pwhash', 'invitehash', 'inviteexp', 'fails', 'lockuntil'], Appointments: ['id', 'name', 'mobile', 'service', 'date', 'time', 'emergency', 'status', 'note', 'by', 'created'], Closures: ['date', 'reason'] };
    sh.appendRow(heads[name]);
    if (name === 'Appointments') sh.getRange('E:F').setNumberFormat('@');   // keep date and time as plain text
    if (name === 'Closures') sh.getRange('A:A').setNumberFormat('@');
  }
  return sh;
}
function clean_(v, n) { return String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n).replace(/^[=+\-@]/, "'$&"); } // blocks spreadsheet formula injection

function listStaff_() {
  var r = sheet_('Staff').getDataRange().getValues().slice(1).map(function (x) { return { email: x[0], name: x[1], status: x[2] }; });
  return { ok: true, staff: r };
}
function addStaff_(b) {
  var email = norm_(b.email);
  if (!validEmail_(email) || email === ADMIN) return { ok: false, error: 'Enter a valid staff email.' };
  var sh = sheet_('Staff'), rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (norm_(rows[i][0]) === email) { sh.getRange(i + 1, 3).setValue('active'); return { ok: true }; }
  sh.appendRow([email, clean_(b.name, 60), 'active', new Date(), clean_(b.mobile, 15)]);
  audit_('admin', 'staff added', email);
  return { ok: true };
}
function setStaffActive_(b) {
  var email = norm_(b.email), sh = sheet_('Staff'), rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (norm_(rows[i][0]) === email) { sh.getRange(i + 1, 3).setValue(b.active ? 'active' : 'disabled'); if (!b.active) revokeAll_(email); audit_('admin', b.active ? 'staff enabled' : 'staff disabled', email); return { ok: true }; }
  return { ok: false, error: 'Not found.' };
}

function listClosures_() { return { ok: true, closures: sheet_('Closures').getDataRange().getValues().slice(1).map(function (x) { return { date: fmtDate_(x[0]), reason: x[1] }; }) }; }
function addClosure_(b) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date || ''))) return { ok: false, error: 'Date must be YYYY-MM-DD.' };
  sheet_('Closures').appendRow([b.date, clean_(b.reason, 80)]); return { ok: true };
}
function fmtDate_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Kolkata', 'yyyy-MM-dd') : String(v); }
function fmtTime_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Kolkata', 'HH:mm') : String(v); }

function listAppointments_() {
  var rows = sheet_('Appointments').getDataRange().getValues().slice(1).map(function (x) {
    return { id: x[0], name: x[1], mobile: x[2], service: x[3], date: fmtDate_(x[4]), time: fmtTime_(x[5]), emergency: x[6] === true || x[6] === 'TRUE', status: x[7], note: x[8], by: x[9] };
  });
  rows.sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
  return { ok: true, appointments: rows };
}
function durationOf_(service) { return /consult/i.test(String(service || '')) ? 30 : 15; }   // consulting = 30 min, other services = one 15-min slot (owner decision 2026-10-06)
function toMin_(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
function addAppointment_(b, s) {
  var name = clean_(b.name, 60), mobile = String(b.mobile || '').replace(/\D/g, ''), service = clean_(b.service, 80);
  var date = String(b.date || ''), time = String(b.time || '');
  if (!name || !service) return { ok: false, error: 'Name and service are required.' };
  if (!/^[6-9]\d{9}$/.test(mobile)) return { ok: false, error: 'Enter a 10-digit mobile number.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, error: 'Check the date and time.' };
  var closed = listClosures_().closures.some(function (c) { return c.date === date; });
  if (closed) return { ok: false, error: 'The shop is closed on that date.' };
  var mins = toMin_(time);
  if (new Date(date + 'T00:00:00Z').getUTCDay() === 0) return { ok: false, error: 'The shop is closed on Sundays.' };
  if (!((mins >= 570 && mins < 840) || (mins >= 990 && mins < 1200))) return { ok: false, error: 'Outside shop hours (9:30-14:00, 16:30-20:00).' };
  var emergency = b.emergency === true;
  var startMs = Date.parse(date + 'T' + time + ':00+05:30');
  var insideBuffer = startMs < Date.now() + BUFFER_MIN * 60000;
  if (insideBuffer && !emergency && s.role !== 'admin') return { ok: false, error: 'Less than 1 hour ahead: only an emergency booking (fee 50) or the owner can book this.' };
  var av;
  try { av = availability_(); } catch (x) { return { ok: false, error: 'Calendar check is unavailable, nothing was saved.' }; }   // fail closed
  if (av.closedDays.indexOf(date) >= 0) return { ok: false, error: 'The shop is closed on that date.' };
  var dur = durationOf_(service), endMin = mins + dur;   // full interval [start, start+duration) must not touch a booked or closed block
  var busy = av.blocks.some(function (k) { return k.date === date && toMin_(k.start) < endMin && toMin_(k.end) > mins; });
  if (busy) return { ok: false, error: 'That time is already booked or closed in the calendar.' };
  var clash = listAppointments_().appointments.some(function (a) {
    return a.date === date && a.status !== 'Cancelled' && toMin_(a.time) < endMin && toMin_(a.time) + durationOf_(a.service) > mins;
  });
  if (clash) return { ok: false, error: 'Another appointment is already at that time.' };
  var id = 'A' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10);
  sheet_('Appointments').appendRow([id, name, mobile, service, date, time, emergency, emergency ? 'Requested' : 'Confirmed', clean_(b.note, 200), s.email, new Date()]);
  return { ok: true, id: id, fee: emergency ? 50 : 0, status: emergency ? 'Requested' : 'Confirmed' };   // emergency stays Requested until the owner checks the 50 payment
}
function setStatus_(b, s) {
  if (['Confirmed', 'Cancelled', 'Requested'].indexOf(b.status) < 0) return { ok: false, error: 'Bad status.' };
  var sh = sheet_('Appointments'), rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (rows[i][0] === b.id) { sh.getRange(i + 1, 8).setValue(b.status); sh.getRange(i + 1, 10).setValue(s.email); return { ok: true }; }
  return { ok: false, error: 'Not found.' };
}

function staffRow_(email) {
  var sh = sheet_('Staff'), rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (norm_(rows[i][0]) === email) return { sh: sh, n: i + 1, r: rows[i] };
  return null;
}
function pw_(salt, pw) {
  var h = salt + '|' + pw;
  for (var i = 0; i < PW_ROUNDS; i++) h = b64_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + '|' + salt));
  return h;
}
function createInvite_(b) {
  var st = staffRow_(norm_(b.email));
  if (!st) return { ok: false, error: 'Add the staff member first.' };
  var code = code6_() + code6_().slice(0, 2);                 // 8 digits, shown once to the admin, hand it over in person
  st.sh.getRange(st.n, 8).setValue(hash_('inv|' + code));
  st.sh.getRange(st.n, 9).setValue(Date.now() + 24 * 3600000);
  return { ok: true, invite: code, note: 'Valid 24 hours, works once. Give it to the staff member in person.' };
}
function setPassword_(b) {
  var bad = { ok: false, error: 'Invite is wrong or expired.' };
  var st = staffRow_(norm_(b.email));
  var pw = String(b.password || '');
  if (!st || String(st.r[2]) !== 'active' || !st.r[7]) return bad;
  if (Date.now() > Number(st.r[8]) || !same_(String(st.r[7]), hash_('inv|' + String(b.invite || '').replace(/\D/g, '')))) return bad;
  if (pw.length < PW_MIN) return { ok: false, error: 'Password needs at least ' + PW_MIN + ' characters.' };
  var salt = rand_(16);
  st.sh.getRange(st.n, 6).setValue(salt);
  st.sh.getRange(st.n, 7).setValue(pw_(salt, pw));
  st.sh.getRange(st.n, 8).setValue('');                        // invite is single use
  st.sh.getRange(st.n, 9).setValue(0);
  st.sh.getRange(st.n, 10).setValue(0);
  revokeAll_(norm_(b.email));                                  // password change ends old sessions
  audit_(norm_(b.email), 'password set', norm_(b.email));
  return { ok: true };
}
function loginPassword_(b) {
  var bad = { ok: false, error: 'Email or password is wrong.' };
  var email = norm_(b.email), now = Date.now();
  var st = staffRow_(email);
  if (!st || String(st.r[2]) !== 'active' || !st.r[6]) return bad;
  if (now < Number(st.r[10] || 0)) return { ok: false, error: 'Too many wrong tries. This account is locked for 24 hours from the time it locked.' };
  if (!same_(String(st.r[6]), pw_(String(st.r[5]), String(b.password || '')))) {
    var f = Number(st.r[9] || 0) + 1;
    st.sh.getRange(st.n, 10).setValue(f >= PW_FAILS ? 0 : f);
    if (f >= PW_FAILS) { st.sh.getRange(st.n, 11).setValue(now + PW_LOCK_MS); audit_('system', 'locked (wrong password x3)', email); }
    return bad;
  }
  st.sh.getRange(st.n, 10).setValue(0);
  var token = rand_(32);
  P.setProperty('sess:' + hash_(token), JSON.stringify({ email: email, role: 'staff', exp: now + SESSION_TTL_MS, seen: now }));
  return { ok: true, token: token, role: 'staff', email: email };
}

function audit_(actor, action, target) { sheet_('Audit').appendRow([new Date(), actor, action, target]); } // never contains codes or passwords

/** Staff (or admin) asks the admin to unlock someone. Staff cannot unlock anything themselves. */
function requestUnlock_(b, s) {
  var target = norm_(b.email);
  if (!staffRow_(target)) return { ok: false, error: 'No such staff account.' };
  sheet_('Unlocks').appendRow(['U' + Date.now(), target, s.email, new Date(), 'pending']);
  audit_(s.email, 'unlock requested', target);
  return { ok: true, message: 'Request sent. Only the admin can unlock.' };
}
function listLocks_() {
  var now = Date.now(), locked = [];
  sheet_('Staff').getDataRange().getValues().slice(1).forEach(function (r) {
    if (now < Number(r[10] || 0)) locked.push({ email: r[0], until: new Date(Number(r[10])).toISOString() });
  });
  var req = sheet_('Unlocks').getDataRange().getValues().slice(1).filter(function (r) { return r[4] === 'pending'; })
    .map(function (r) { return { id: r[0], target: r[1], by: r[2] }; });
  return { ok: true, locked: locked, requests: req };
}
function unlock_(b, s) {
  var target = norm_(b.email), st = staffRow_(target);
  if (!st) return { ok: false, error: 'No such staff account.' };
  st.sh.getRange(st.n, 10).setValue(0); st.sh.getRange(st.n, 11).setValue(0);
  var sh = sheet_('Unlocks'), rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (rows[i][1] === target && rows[i][4] === 'pending') sh.getRange(i + 1, 5).setValue('approved by ' + s.email);
  audit_(s.email, 'unlocked', target);
  return { ok: true };
}
/**
 * Recovery for the ADMIN's own lock (3 wrong codes): nobody on the website can unlock the admin.
 * The script owner (prayagideepak@gmail.com) opens this Apps Script project and runs adminUnlock() once.
 * Otherwise the lock ends by itself 24 hours after it started.
 */
function adminUnlock() {
  var raw = P.getProperty('otp:' + ADMIN);
  if (raw) { var st = JSON.parse(raw); st.lockUntil = 0; st.fails = 0; st.mfails = 0; st.mnext = 0; P.setProperty('otp:' + ADMIN, JSON.stringify(st)); }
  audit_('script owner', 'admin unlocked', ADMIN);
}

/** Admin master password: exactly 12 digits, accepted instead of the emailed code. Set by the admin on the site after an OTP login. Stored only as a salted, iterated hash. */
function setMaster_(b, s) {
  var pw = String(b.password || '');
  if (!/^\d{12}$/.test(pw)) return { ok: false, error: 'The master password must be exactly 12 digits.' };
  var salt = rand_(16);
  P.setProperty('master', JSON.stringify({ salt: salt, h: masterHash_(salt, pw) }));
  audit_(s.email, 'master password set', ADMIN);
  return { ok: true };
}
function masterHash_(salt, pw) {
  var h = salt + '|' + pw;
  for (var i = 0; i < MASTER_ROUNDS; i++) h = b64_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + '|' + salt + '|m'));
  return h;
}
/** Shown to the admin only after a code was requested and has not arrived for 2 minutes. The master field is not offered before that or before 3 wrong codes. */
function masterOption_() {
  var now = Date.now(), st = JSON.parse(P.getProperty('otp:' + ADMIN) || '{}');
  var last = (st.sent || []).slice(-1)[0] || 0;
  if (!last || now - last < 120000) return { ok: true, masterAvailable: now < (st.masterUntil || 0) };
  st.masterUntil = now + MASTER_WINDOW_MS; P.setProperty('otp:' + ADMIN, JSON.stringify(st));
  audit_('system', 'code not received: master option opened', ADMIN);
  return { ok: true, masterAvailable: true };
}
function loginMaster_(b) {
  var now = Date.now(), st = JSON.parse(P.getProperty('otp:' + ADMIN) || '{}');
  var m = P.getProperty('master');
  if (now >= (st.masterUntil || 0)) return { ok: false, error: 'Use the emailed code first.' };   // option must have been opened by 3 wrong codes or a missing code
  if (!m) return { ok: false, error: 'No master password has been set.' };
  if (now < (st.mnext || 0)) return { ok: false, error: 'Wait ' + Math.ceil((st.mnext - now) / 1000) + ' seconds before the next try.', wait: Math.ceil((st.mnext - now) / 1000) };
  var mm = JSON.parse(m), pw = String(b.password || '');
  var good = /^\d{12}$/.test(pw) && same_(mm.h, masterHash_(mm.salt, pw));
  alert_('Prayagi admin master-password attempt: ' + (good ? 'SUCCESS' : 'failed'),
    'A master-password login was ' + (good ? 'accepted' : 'tried and failed') + ' at ' + new Date().toString() + '. If this was not you, set a new master password after logging in.');
  if (!good) {
    st.mfails = (st.mfails || 0) + 1;
    st.mnext = now + MASTER_DELAYS_S[Math.min(st.mfails - 1, MASTER_DELAYS_S.length - 1)] * 1000;
    P.setProperty('otp:' + ADMIN, JSON.stringify(st));
    audit_('system', 'master password wrong (attempt ' + st.mfails + ')', ADMIN);
    return { ok: false, error: 'Master password is wrong.' };
  }
  st.mfails = 0; st.mnext = 0; st.masterUntil = 0; P.setProperty('otp:' + ADMIN, JSON.stringify(st));
  var token = rand_(32);
  P.setProperty('sess:' + hash_(token), JSON.stringify({ email: ADMIN, role: 'admin', exp: now + SESSION_TTL_MS, seen: now }));
  audit_(ADMIN, 'admin login with master password', ADMIN);
  return { ok: true, token: token, role: 'admin', email: ADMIN };
}

/** Staff create a customer record (customer login itself is OFF). Mobile is the key; no password is set here. */
function createCustomer_(b, s) {
  var mobile = String(b.mobile || '').replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(mobile)) return { ok: false, error: 'Enter a 10-digit mobile number.' };
  var sh = sheet_('Customers'), rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (String(rows[i][0]) === mobile) return { ok: false, error: 'This customer already exists.' };
  sh.appendRow([mobile, clean_(b.name, 60), 'created', new Date(), 0]);
  audit_(s.email, 'customer created', mobile);
  return { ok: true };
}
/**
 * Forgot password. WhatsApp OTP is OFF, so this only answers truthfully.
 * Rule (owner): a locked CUSTOMER cannot reset during the lock. A locked STAFF member can reset, but still cannot log in until the lock ends or the admin unlocks.
 */
function forgotPassword_(b) {
  var now = Date.now();
  var mobile = String(b.mobile || '').replace(/\D/g, ''), email = norm_(b.email);
  if (b.kind === 'customer') {
    if (!CUSTOMER_LOGIN_ENABLED) return { ok: false, error: 'Unavailable: customer login is not open yet.' };
    var rows = sheet_('Customers').getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) if (String(rows[i][0]) === mobile && now < Number(rows[i][4] || 0))
      return { ok: false, error: 'This account is locked. Forgot password does not work while it is locked. It unlocks by itself 24 hours after it locked, or the shop can ask the admin to unlock it.' };
  } else {
    var st = staffRow_(email);
    if (st && now < Number(st.r[10] || 0)) {
      if (!WA_ENABLED) return { ok: false, error: 'Unavailable: WhatsApp code is not connected yet. You can reset after it is, but you can log in only after the lock ends or the admin unlocks you.' };
    }
  }
  if (!WA_ENABLED) return { ok: false, error: 'Unavailable: WhatsApp code is not connected yet.' };
  return { ok: false, error: 'Unavailable.' };
}
