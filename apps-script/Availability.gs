/**
 * Public availability, pure logic (no Google services here, so it can be tested with Node).
 * Input: raw calendar blocks and closure dates. Output: only dates and times. Event titles, names, services,
 * closure reasons and any other private detail never leave this function.
 * Block kinds: 'closed' = shop hours off (titled "Unavailable" in the BOOKING calendar), 'booked' = any other event.
 */
var IST_OFFSET_MIN = 330;
function istParts_(ms) {
  var d = new Date(ms + IST_OFFSET_MIN * 60000), iso = d.toISOString();
  return { date: iso.slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
function hhmm_(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
function sanitizeAvailability_(raw, closureDates, nowMs) {
  var closed = {}, blocks = [];
  (closureDates || []).forEach(function (d) { if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) closed[d] = true; });
  (raw || []).forEach(function (e) {
    var isClosedKind = e.title === 'Unavailable';
    if (e.allDay) {
      if (isClosedKind) { closed[e.startDate] = true; }
      else { closed[e.startDate] = closed[e.startDate] || false; blocks.push({ date: e.startDate, start: '00:00', end: '23:59', kind: 'booked' }); }
      return;
    }
    var a = istParts_(e.start), b = istParts_(e.end - 1);
    for (var day = a.date; day <= b.date; day = nextDay_(day)) {
      var s = day === a.date ? a.min : 0, en = day === b.date ? b.min + 1 : 1440;
      if (en <= s) continue;
      blocks.push({ date: day, start: hhmm_(s), end: hhmm_(Math.min(en, 1439)), kind: isClosedKind ? 'closed' : 'booked' });
    }
  });
  var closedDays = Object.keys(closed).filter(function (k) { return closed[k]; }).sort();
  blocks.sort(function (x, y) { return (x.date + x.start) < (y.date + y.start) ? -1 : 1; });
  return { ok: true, updated: nowMs, closedDays: closedDays, blocks: blocks };
}
function nextDay_(iso) { var d = new Date(Date.parse(iso + 'T00:00:00Z') + 86400000); return d.toISOString().slice(0, 10); }
if (typeof module !== 'undefined') module.exports = { sanitizeAvailability_: sanitizeAvailability_ };
