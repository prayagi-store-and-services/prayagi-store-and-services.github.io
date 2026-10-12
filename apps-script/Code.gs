/**
 * Prayagi staff login backend (Google Apps Script web app). Free, no Cloud Functions, no paid SMS.
 * Deploy as: Execute as ME (prayagideepak@gmail.com), access: Anyone. Nothing secret is stored in this file.
 * Admin login = one-time 6-digit code emailed (from this script's account) to the fixed admin address below, no password.
 * Staff login = password (set by the staff member with a one-time invite from the admin). WhatsApp OTP for staff is designed but OFF (WA_ENABLED=false)
 * until the Fast2SMS template and fee are confirmed; its API key would live only in Script Properties, never in this file or the site.
 * The code is never logged, never shown in a response, and is stored only as a salted hash.
 */
var ADMIN = 'prayagijanseva@gmail.com';
var OTP_TTL_MS = 5 * 60 * 1000;      // code valid 5 minutes
var OTP_MAX_TRIES = 5;               // wrong guesses per code
var SEND_PER_EMAIL = 3;              // codes per email per 15 minutes
var SEND_WINDOW_MS = 15 * 60 * 1000;
var SEND_GLOBAL_PER_HOUR = 30;
var SESSION_TTL_MS = 8 * 60 * 60 * 1000;
var BUFFER_MIN = 60;                 // 1-hour buffer between appointments
var WA_ENABLED = false;              // staff WhatsApp OTP (Fast2SMS): not built, not enabled
var PW_MIN = 10, PW_FAILS = 5, PW_LOCK_MS = 15 * 60 * 1000, PW_ROUNDS = 3000;
var P = PropertiesService.getScriptProperties();

function doGet() { return out_({ ok: true, service: 'prayagi-staff' }); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (x) { return out_({ ok: false, error: 'Busy, try again.' }); }
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (b.action) {
      case 'requestOtp': return out_(requestOtp_(b));
      case 'verifyOtp': return out_(verifyOtp_(b));
      case 'loginPassword': return out_(loginPassword_(b));
      case 'setPassword': return out_(setPassword_(b));
      case 'logout': P.deleteProperty('sess:' + hash_(b.token || '')); return out_({ ok: true });
    }
    var s = session_(b.token);
    if (!s) return out_({ ok: false, error: 'Please log in again.', relogin: true });
    switch (b.action) {
      case 'me': return out_({ ok: true, email: s.email, role: s.role });
      case 'listAppointments': return out_(listAppointments_());
      case 'addAppointment': return out_(addAppointment_(b, s));
      case 'setStatus': return out_(setStatus_(b, s));
      case 'listStaff': return out_(admin_(s) || listStaff_());
      case 'addStaff': return out_(admin_(s) || addStaff_(b));
      case 'createInvite': return out_(admin_(s) || createInvite_(b));
      case 'setStaffActive': return out_(admin_(s) || setStaffActive_(b));
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
  var generic = { ok: true, message: 'If this email is registered, a code has been sent. It is valid for 5 minutes.' };
  if (!validEmail_(email)) return generic;
  var g = JSON.parse(P.getProperty('sendlog') || '[]').filter(function (t) { return now - t < 3600000; });
  if (g.length >= SEND_GLOBAL_PER_HOUR) return generic;
  if (email !== ADMIN) return generic;                        // email OTP is admin-only; same reply for everyone else, no probing
  var role = 'admin';
  var st = JSON.parse(P.getProperty('otp:' + email) || '{}');
  var log = (st.sent || []).filter(function (t) { return now - t < SEND_WINDOW_MS; });
  if (log.length >= SEND_PER_EMAIL) return generic;
  var code = code6_();
  log.push(now); g.push(now);
  P.setProperty('otp:' + email, JSON.stringify({ h: hash_(email + '|' + code), exp: now + OTP_TTL_MS, tries: 0, sent: log }));
  P.setProperty('sendlog', JSON.stringify(g));
  MailApp.sendEmail(email, 'Prayagi staff login code',
    'Your Prayagi staff login code is ' + code + '.\nIt works once and expires in 5 minutes. If you did not ask for it, ignore this email and tell the shop owner.');
  return generic;
}

function verifyOtp_(b) {
  var email = norm_(b.email), code = String(b.code || '').replace(/\D/g, ''), now = Date.now();
  var bad = { ok: false, error: 'Code is wrong or expired.' };
  var raw = P.getProperty('otp:' + email);
  if (!raw || code.length !== 6) return bad;
  var st = JSON.parse(raw);
  if (now > st.exp || st.tries >= OTP_MAX_TRIES) { st.h = ''; st.exp = 0; P.setProperty('otp:' + email, JSON.stringify(st)); return bad; }
  st.tries++;
  if (!st.h || !same_(st.h, hash_(email + '|' + code))) { P.setProperty('otp:' + email, JSON.stringify(st)); return bad; }
  st.h = ''; st.exp = 0; P.setProperty('otp:' + email, JSON.stringify(st));   // single use
  if (email !== ADMIN) return bad;
  var role = 'admin';
  var token = rand_(32);
  P.setProperty('sess:' + hash_(token), JSON.stringify({ email: email, role: role, exp: now + SESSION_TTL_MS }));
  return { ok: true, token: token, role: role, email: email };
}

function session_(token) {
  if (!token) return null;
  var k = 'sess:' + hash_(token), raw = P.getProperty(k);
  if (!raw) return null;
  var s = JSON.parse(raw);
  if (Date.now() > s.exp) { P.deleteProperty(k); return null; }
  var role = roleOf_(s.email);                                 // re-check every call: disabled staff lose access at once
  if (!role) { P.deleteProperty(k); return null; }
  s.role = role; return s;
}

function sheet_(name) {
  var id = P.getProperty('sheetId'), ss;
  if (id) ss = SpreadsheetApp.openById(id);
  else { ss = SpreadsheetApp.create('Prayagi staff data (private)'); P.setProperty('sheetId', ss.getId()); }
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    var heads = { Staff: ['email', 'name', 'status', 'added', 'mobile', 'pwsalt', 'pwhash', 'invitehash', 'inviteexp', 'fails', 'lockuntil'], Appointments: ['id', 'name', 'mobile', 'service', 'date', 'time', 'emergency', 'status', 'note', 'by', 'created'], Closures: ['date', 'reason'] };
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
  return { ok: true };
}
function setStaffActive_(b) {
  var email = norm_(b.email), sh = sheet_('Staff'), rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (norm_(rows[i][0]) === email) { sh.getRange(i + 1, 3).setValue(b.active ? 'active' : 'disabled'); return { ok: true }; }
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
function toMin_(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
function addAppointment_(b, s) {
  var name = clean_(b.name, 60), mobile = String(b.mobile || '').replace(/\D/g, ''), service = clean_(b.service, 80);
  var date = String(b.date || ''), time = String(b.time || '');
  if (!name || !service) return { ok: false, error: 'Name and service are required.' };
  if (!/^[6-9]\d{9}$/.test(mobile)) return { ok: false, error: 'Enter a 10-digit mobile number.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, error: 'Check the date and time.' };
  var closed = listClosures_().closures.some(function (c) { return c.date === date; });
  if (closed) return { ok: false, error: 'The shop is closed on that date.' };
  var clash = listAppointments_().appointments.some(function (a) {
    return a.date === date && a.status !== 'Cancelled' && Math.abs(toMin_(a.time) - toMin_(time)) < BUFFER_MIN;
  });
  if (clash) return { ok: false, error: 'Another appointment is within 1 hour of that time.' };
  var id = 'A' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10);
  sheet_('Appointments').appendRow([id, name, mobile, service, date, time, b.emergency === true, 'Confirmed', clean_(b.note, 200), s.email, new Date()]);
  return { ok: true, id: id, fee: b.emergency === true ? 50 : 0 };
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
  return { ok: true };
}
function loginPassword_(b) {
  var bad = { ok: false, error: 'Email or password is wrong.' };
  var email = norm_(b.email), now = Date.now();
  var st = staffRow_(email);
  if (!st || String(st.r[2]) !== 'active' || !st.r[6]) return bad;
  if (now < Number(st.r[10] || 0)) return { ok: false, error: 'Too many wrong tries. Wait 15 minutes.' };
  if (!same_(String(st.r[6]), pw_(String(st.r[5]), String(b.password || '')))) {
    var f = Number(st.r[9] || 0) + 1;
    st.sh.getRange(st.n, 10).setValue(f >= PW_FAILS ? 0 : f);
    if (f >= PW_FAILS) st.sh.getRange(st.n, 11).setValue(now + PW_LOCK_MS);
    return bad;
  }
  st.sh.getRange(st.n, 10).setValue(0);
  var token = rand_(32);
  P.setProperty('sess:' + hash_(token), JSON.stringify({ email: email, role: 'staff', exp: now + SESSION_TTL_MS }));
  return { ok: true, token: token, role: 'staff', email: email };
}
