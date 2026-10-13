// Run: node tests/availability.test.js  (no dependencies)
var assert = require('assert');
var fs = require('fs');
var vm = require('vm');
var src = fs.readFileSync(__dirname + '/../apps-script/Availability.gs', 'utf8');
var ctx = { module: { exports: {} } }; vm.createContext(ctx); vm.runInContext(src, ctx);
var f0 = ctx.module.exports.sanitizeAvailability_;
var f = function () { return JSON.parse(JSON.stringify(f0.apply(null, arguments))); }; // same-realm copy
var IST = function (iso) { return Date.parse(iso + '+05:30'); };

// 1. Booked event keeps only date and time; the private title/name never appears.
var r = f([{ title: 'Document verification - Sneha Nishad - 9876543210', start: IST('2026-10-12T11:30:00'), end: IST('2026-10-12T12:30:00'), allDay: false }], [], 1);
assert.deepStrictEqual(r.blocks, [{ date: '2026-10-12', start: '11:30', end: '12:30', kind: 'booked' }]);
assert.ok(!/Sneha|Document|9876/.test(JSON.stringify(r)), 'private text leaked');

// 2. "Unavailable" timed block is kind closed; all-day Unavailable makes a closed day.
r = f([{ title: 'Unavailable', start: IST('2026-10-12T13:30:00'), end: IST('2026-10-12T14:00:00'), allDay: false },
       { title: 'Unavailable', allDay: true, startDate: '2026-10-11' }], [], 1);
assert.strictEqual(r.blocks[0].kind, 'closed');
assert.deepStrictEqual(r.closedDays, ['2026-10-11']);

// 3. Closure dates from the sheet are listed, reasons are never read; bad dates are ignored.
r = f([], ['2026-10-17', 'x', '2026-11-06'], 1);
assert.deepStrictEqual(r.closedDays, ['2026-10-17', '2026-11-06']);

// 4. An event crossing midnight (IST) is split per day.
r = f([{ title: 'X', start: IST('2026-10-12T23:00:00'), end: IST('2026-10-13T01:00:00'), allDay: false }], [], 1);
assert.deepStrictEqual(r.blocks.map(function (b) { return b.date + ' ' + b.start + '-' + b.end; }), ['2026-10-12 23:00-23:59', '2026-10-13 00:00-01:00']);

// 5. Output has only the expected keys.
r = f([{ title: 'T', start: IST('2026-10-12T10:00:00'), end: IST('2026-10-12T11:00:00'), allDay: false }], [], 5);
assert.deepStrictEqual(Object.keys(r).sort(), ['blocks', 'closedDays', 'ok', 'updated']);
Object.keys(r.blocks[0]).forEach(function (k) { assert.ok(['date', 'start', 'end', 'kind'].indexOf(k) >= 0); });
console.log('availability tests passed');

// 6. Code.gs: the full start/end interval is checked (a 30 min consulting at 11:45 overlaps a 12:00 booking).
var code = fs.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8');
assert.ok(/durationOf_\(service\)/.test(code) && /toMin_\(k\.start\) < endMin && toMin_\(k\.end\) > mins/.test(code), 'interval overlap check missing');
assert.ok(/emergency \? 'Requested' : 'Confirmed'/.test(code), 'emergency must stay Requested');
assert.ok(!/UrlFetchApp|WA_ENABLED = true/.test(code), 'no WhatsApp sending in this change');
console.log('code guard checks passed');
