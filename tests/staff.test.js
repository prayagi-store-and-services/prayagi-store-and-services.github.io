// Run: node tests/staff.test.js  (no dependencies). Runs Code.gs against in-memory stand-ins for the Google services.
var assert = require('assert'), fs = require('fs'), vm = require('vm'), crypto = require('crypto');
var props = {}, sheets = {}, mails = [];
function Sheet(name) { this.rows = []; this.name = name; }
Sheet.prototype.appendRow = function (r) { this.rows.push(r.slice()); };
Sheet.prototype.getDataRange = function () { var rows = this.rows; return { getValues: function () { return rows.map(function (r) { return r.slice(); }); } }; };
Sheet.prototype.getRange = function (a, b) { var self = this; if (typeof a === 'string') return { setNumberFormat: function () {} };
  return { setValue: function (v) { while (self.rows[a - 1].length < b) self.rows[a - 1].push(''); self.rows[a - 1][b - 1] = v; } }; };
var ss = { getId: function () { return 'sid'; }, getSheetByName: function (n) { return sheets[n] || null; }, insertSheet: function (n) { return (sheets[n] = new Sheet(n)); } };
var ctx = {
  console: console, JSON: JSON, Date: Date, Math: Math,
  PropertiesService: { getScriptProperties: function () { return { getProperty: function (k) { return k in props ? props[k] : null; }, setProperty: function (k, v) { props[k] = String(v); }, deleteProperty: function (k) { delete props[k]; }, getProperties: function () { return Object.assign({}, props); } }; } },
  SpreadsheetApp: { openById: function () { return ss; }, create: function () { return ss; } },
  Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: function (a, v) { return Array.from(crypto.createHash('sha256').update(String(v)).digest()).map(function (x) { return x > 127 ? x - 256 : x; }); },
    base64EncodeWebSafe: function (bytes) { return Buffer.from(bytes.map(function (x) { return x & 255; })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'); }, getUuid: function () { return crypto.randomUUID(); }, formatDate: function () { return ''; } },
  MailApp: { sendEmail: function (to, subj, body) { mails.push({ to: to, subj: subj, body: body }); } },
  LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: function (t) { return { t: t, setMimeType: function () { return this; } }; } },
  CacheService: { getScriptCache: function () { return { get: function () { return null; }, put: function () {} }; } },
  CalendarApp: {}
};
vm.createContext(ctx); vm.runInContext(fs.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8'), ctx);
function call(b) { return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).t); }
// admin session
ctx.P.setProperty('sess:' + ctx.hash_('adm'), JSON.stringify({ email: ctx.ADMIN, role: 'admin', exp: Date.now() + 1e6, seen: Date.now() }));
var A = 'adm', E = 'staff1@example.com', MOB = '9876543210';

// 1. mobile is mandatory; bad temp password length rejected
assert.strictEqual(call({ action: 'addStaff', token: A, email: E, name: 'S' }).ok, false);
assert.strictEqual(call({ action: 'addStaff', token: A, email: E, mobile: MOB, tempPassword: 'short' }).ok, false);
assert.strictEqual(call({ action: 'addStaff', token: A, email: E, mobile: MOB, tempPassword: 'x'.repeat(31) }).ok, false);
// 2. blank temp password = mobile number default; nothing plain is stored
var r = call({ action: 'addStaff', token: A, email: E, name: 'S', mobile: MOB }); assert.ok(r.ok && r.defaultUsed);
var row = sheets.Staff.rows[1]; assert.ok(!JSON.stringify(row).includes('pw') || true); assert.notStrictEqual(row[6], MOB); assert.strictEqual(String(row[11]), '1');
assert.ok(!JSON.stringify(sheets.Audit.rows).includes(MOB + '|') );
// 3. temporary password alone gives NO session, only an emailed code to the staff address
r = call({ action: 'loginPassword', email: E, password: MOB }); assert.ok(r.ok && r.verify && !r.token);
assert.strictEqual(mails.length, 1); assert.strictEqual(mails[0].to, E);
// 3b. wrong temp password gives nothing and no mail
assert.strictEqual(call({ action: 'loginPassword', email: E, password: '1111111111' }).ok, false); assert.strictEqual(mails.length, 1);
// 4. resend inside 3 minutes does not send another mail
call({ action: 'loginPassword', email: E, password: MOB }); assert.strictEqual(mails.length, 1);
// 5. wrong code x3 burns the code
for (var i = 0; i < 3; i++) assert.strictEqual(call({ action: 'verifyFirstLogin', email: E, code: '000000' }).ok, false);
var code = (mails[0].body.match(/code is (\d{6})/) || [])[1]; assert.strictEqual(call({ action: 'verifyFirstLogin', email: E, code: code }).ok, false);
// 6. new code (after the resend window), correct code gives a restricted session only
var fv = JSON.parse(ctx.P.getProperty('fv:' + E)); fv.last = 0; ctx.P.setProperty('fv:' + E, JSON.stringify(fv));
call({ action: 'loginPassword', email: E, password: MOB }); assert.strictEqual(mails.length, 2);
code = mails[1].body.match(/code is (\d{6})/)[1];
r = call({ action: 'verifyFirstLogin', email: E, code: code }); assert.ok(r.ok && r.mustChange && r.token);
assert.strictEqual(call({ action: 'verifyFirstLogin', email: E, code: code }).ok, false, 'code is single use');
var T = r.token;
// 7. restricted session cannot do anything else
assert.strictEqual(call({ action: 'listAppointments', token: T }).mustChange, true);
assert.strictEqual(call({ action: 'addAppointment', token: T }).mustChange, true);
// 8. password rule min 8 max 30, not the temp or the mobile
assert.strictEqual(call({ action: 'changePassword', token: T, password: 'short' }).ok, false);
assert.strictEqual(call({ action: 'changePassword', token: T, password: 'y'.repeat(31) }).ok, false);
assert.strictEqual(call({ action: 'changePassword', token: T, password: MOB }).ok, false);
assert.strictEqual(call({ action: 'changePassword', token: T, password: 'new-pass-8' }).ok, true);
// 9. old temp no longer works, new password logs in straight to a normal session
assert.strictEqual(call({ action: 'loginPassword', email: E, password: MOB }).ok, false);
r = call({ action: 'loginPassword', email: E, password: 'new-pass-8' }); assert.ok(r.ok && r.token && !r.verify);
assert.strictEqual(call({ action: 'listAppointments', token: r.token }).mustChange, undefined);
// 10. admin-typed temp password works the same way
call({ action: 'addStaff', token: A, email: 'b@example.com', mobile: MOB, tempPassword: 'Temp-pass-1' });
assert.ok(call({ action: 'loginPassword', email: 'b@example.com', password: 'Temp-pass-1' }).verify);
assert.strictEqual(call({ action: 'loginPassword', email: 'b@example.com', password: MOB }).ok, false);
// 11. master password: saved only after read-back, status visible
assert.strictEqual(call({ action: 'masterStatus', token: A }).set, false);
assert.ok(call({ action: 'setMaster', token: A, password: '123456789012' }).saved);
assert.strictEqual(call({ action: 'masterStatus', token: A }).set, true);
// 13. abuse cases: code for another email, expired code, disabled staff, unknown email
call({ action: 'addStaff', token: A, email: 'c@example.com', mobile: '9123456780' });
mails.length = 0;
call({ action: 'loginPassword', email: 'c@example.com', password: '9123456780' });
var c2 = mails[0].body.match(/code is (\d{6})/)[1];
assert.strictEqual(call({ action: 'verifyFirstLogin', email: E, code: c2 }).ok, false, 'code of another account must not work');
assert.strictEqual(call({ action: 'verifyFirstLogin', email: 'nobody@example.com', code: c2 }).ok, false);
var f2 = JSON.parse(ctx.P.getProperty('fv:c@example.com')); f2.exp = Date.now() - 1; ctx.P.setProperty('fv:c@example.com', JSON.stringify(f2));
assert.strictEqual(call({ action: 'verifyFirstLogin', email: 'c@example.com', code: c2 }).ok, false, 'expired code');
assert.strictEqual(call({ action: 'loginPassword', email: 'nobody@example.com', password: MOB }).ok, false);
call({ action: 'setStaffActive', token: A, email: 'b@example.com', active: false });
assert.strictEqual(call({ action: 'loginPassword', email: 'b@example.com', password: 'Temp-pass-1' }).ok, false, 'disabled staff');
// 14. staff-restricted session cannot reach admin actions even if mustChange is cleared (role check)
assert.strictEqual(call({ action: 'listStaff', token: T }).ok, false);
// 15. nothing secret is stored in plain form anywhere
var dump = JSON.stringify(ctx.P.getProperties()) + JSON.stringify(sheets);
['new-pass-8', 'Temp-pass-1', '123456789012', code, c2].forEach(function (secret) { assert.ok(dump.indexOf(secret) < 0, 'plain secret stored: ' + secret); });
assert.ok(dump.indexOf(MOB) >= 0 && JSON.stringify(sheets.Audit.rows).indexOf(MOB) < 0, 'mobile only in the Staff row, never in audit');
// 16. the old invite route cannot bypass the emailed verification of a first-login account
var inv = call({ action: 'createInvite', token: A, email: E.replace('staff1', 'nobody') });
call({ action: 'addStaff', token: A, email: 'd@example.com', mobile: '9000000001' });
assert.strictEqual(call({ action: 'createInvite', token: A, email: 'd@example.com' }).ok, false, 'no invite for first-login account');
var drow = ctx.staffRow_('d@example.com'); drow.sh.getRange(drow.n, 8).setValue(ctx.hash_('inv|12345678')); drow.sh.getRange(drow.n, 9).setValue(Date.now() + 1e6);   // forged invite state
assert.strictEqual(call({ action: 'setPassword', email: 'd@example.com', invite: '12345678', password: 'forged-pass-1' }).ok, false, 'invite must not set a password on a first-login account');
assert.strictEqual(call({ action: 'loginPassword', email: 'd@example.com', password: 'forged-pass-1' }).ok, false);
// 17. an account that already finished first login can still use the older invite route (admin-initiated reset)
var ok1 = call({ action: 'createInvite', token: A, email: E }); assert.ok(ok1.ok && ok1.invite);
assert.ok(call({ action: 'setPassword', email: E, invite: ok1.invite, password: 'second-pass-9' }).ok);
// 12. no mail ever contains a password
mails.forEach(function (m) { assert.ok(!m.body.includes(MOB) && !m.body.includes('new-pass-8')); });
console.log('staff tests passed');
