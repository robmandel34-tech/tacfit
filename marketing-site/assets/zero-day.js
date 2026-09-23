/* ===========================================================================
   Zero Day cadence — the single source of truth for the schedule.

   A Zero Day competition starts every CADENCE_DAYS days, always on a Monday.
   To change the schedule, change ANCHOR and/or CADENCE_DAYS here and nowhere
   else: the date is computed at page load, so it can never go stale in markup.

   ANCHOR  — any Monday a Zero Day starts on, past or upcoming (YYYY-MM-DD).
             An upcoming anchor is itself the next drop, then the cadence runs
             forward from it.
   =========================================================================== */
(function () {
  var ANCHOR = '2026-10-05';   // a Monday
  var CADENCE_DAYS = 14;

  var MS_PER_DAY = 86400000;

  // Parse as a *local* date. `new Date('2026-10-05')` parses as UTC midnight,
  // which lands on the previous day for anyone west of Greenwich.
  function localDate(iso) {
    var p = iso.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function startOfToday() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  // The next drop that has not started yet. If today *is* a drop day, today
  // still counts as the current one — joining is open on day one.
  // Day arithmetic goes through the Date constructor (calendar days), not
  // fixed 24h millisecond steps: across the autumn DST change a 24h step lands
  // on 23:00 the previous day and would report the drop as a Sunday.
  function nextDrop() {
    var anchor = localDate(ANCHOR);
    var today = startOfToday();
    var elapsed = Math.round((today - anchor) / MS_PER_DAY);
    if (elapsed <= 0) return anchor;
    var into = elapsed % CADENCE_DAYS;
    if (into === 0) return today;
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + (CADENCE_DAYS - into));
  }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function render() {
    var d;
    try { d = nextDrop(); } catch (e) { return; }
    var long = DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
    // "Next drop: Monday, September 28 · Free"
    document.querySelectorAll('[data-next-drop]').forEach(function (el) {
      el.textContent = 'Next drop: ' + long + ' · Free';
    });
    // Bare date, for use inside a sentence.
    document.querySelectorAll('[data-next-drop-date]').forEach(function (el) {
      el.textContent = long;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
