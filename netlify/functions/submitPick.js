// netlify/functions/submitPick.js
const { google } = require('googleapis');
const sheets = google.sheets('v4');

// keep this path if schedule.js sits next to this file
const schedule = require('./schedule.js');

// ---------- helpers ----------
const jres = (statusCode, obj) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(obj),
});

// normalize strings (trim, collapse spaces, handle NBSP, lowercase)
const NBSP = /\u00A0/g;
const canon = (s) =>
  (s ?? '')
    .toString()
    .replace(NBSP, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

// accept "1" or "Week 1 (Sep 5–9)" etc.
const normWeek = (w) => {
  const raw = (w ?? '').toString();
  const m = raw.match(/\d+/);
  return m ? m[0] : raw.trim();
};

// ---- time zone helpers (DST-safe, no libs) ----
const LEAGUE_TZ = 'America/New_York';
const GRACE_MS = 10_000; // avoid hard locks at the exact whistle

function tzOffsetMinutes(dateUtc, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const parts = fmt.formatToParts(dateUtc).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return (asUTC - dateUtc.getTime()) / 60000;
}
function makeZonedDateUTC(year, month, day, hour24, minute, timeZone) {
  const guessUtcMs = Date.UTC(year, month - 1, day, hour24, minute, 0);
  const offsetMin = tzOffsetMinutes(new Date(guessUtcMs), timeZone);
  return new Date(guessUtcMs - offsetMin * 60000);
}
function parseTimeETTo24(timeET) {
  // supports "1:00 PM" / "8:20 PM" / "09:30 AM"
  const m = String(timeET || '').trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!m) return null;
  let hh = +m[1], mm = +m[2];
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && hh !== 12) hh += 12;
  if (ap === 'AM' && hh === 12) hh = 0;
  return { hh, mm };
}

// Resolve week games from your schedule
function getWeekGames(week) {
  // Your schedule is keyed by "week" string: schedule[week] = [{home, away, date}, ...]
  return schedule[week] || null;
}

// Find the game object for a given team (case/space tolerant)
function findGameForTeam(games, teamLower) {
  if (!Array.isArray(games)) return null;
  return games.find((g) => {
    const home = canon(g.home);
    const away = canon(g.away);
    return home === teamLower || away === teamLower;
  }) || null;
}

// ET-aware kickoff resolver → returns epoch ms or null if unknown
function getKickoffEpochMsForGame(g) {
  if (!g) return null;

  // 1) Best: explicit epoch
  if (g.kickoffEpoch != null && !Number.isNaN(Number(g.kickoffEpoch))) {
    return Number(g.kickoffEpoch);
  }

  // 2) Next best: ISO with timezone offset (e.g., "2025-09-14T13:00:00-04:00")
  if (g.kickoffISO) {
    const d = new Date(g.kickoffISO);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }

  // 3) Your current format: naive ISO without offset, e.g. "2025-09-14T13:00:00"
  //    Interpret that wall clock in America/New_York.
  if (g.date && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(g.date)) {
    const [ymd, hms] = g.date.split('T'); // "2025-09-14", "13:00:00"
    const [Y, M, D] = ymd.split('-').map(n => +n);
    const [hh, mm] = hms.split(':').map(n => +n); // ignore seconds granularity
    const asUtc = makeZonedDateUTC(Y, M, D, hh, mm, LEAGUE_TZ);
    const ms = asUtc.getTime();
    if (!Number.isNaN(ms)) return ms;
  }

  // 4) Fallback: { date: 'YYYY-MM-DD', timeET: '1:00 PM' }
  if (g.date && /^\d{4}-\d{2}-\d{2}$/.test(g.date) && g.timeET) {
    const [Y, M, D] = g.date.split('-').map(n => +n);
    const tt = parseTimeETTo24(g.timeET);
    if (tt) {
      const asUtc = makeZonedDateUTC(Y, M, D, tt.hh, tt.mm, LEAGUE_TZ);
      const ms = asUtc.getTime();
      if (!Number.isNaN(ms)) return ms;
    }
  }

  // 5) Absolute last resort: try Date(g.date) only if it parses cleanly
  if (g.date) {
    const tryDate = new Date(g.date);
    if (!Number.isNaN(tryDate.getTime())) return tryDate.getTime();
  }

  return null;
}

// Build helpful debug list of expected teams for a week
function expectedTeamsForWeek(games) {
  if (!Array.isArray(games)) return [];
  return games.flatMap(g => [g.home, g.away]);
}

exports.handler = async function (event) {
  try {
    if (event.httpMethod === 'OPTIONS') return jres(200, { ok: true });
    if (event.httpMethod !== 'POST') return jres(405, { error: 'Method Not Allowed' });

    // Parse body (supports JSON or x-www-form-urlencoded)
    const headers = event.headers || {};
    const ct = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();

    let body = {};
    if (ct.includes('application/json')) {
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return jres(400, { error: 'Invalid JSON body' });
      }
    } else {
      body = Object.fromEntries(new URLSearchParams(event.body || ''));
    }

    const username = canon(body.username);
    const week = normWeek(body.week);   // tolerant week parsing
    const team = canon(body.team);

    if (!username || !week || !team) {
      return jres(400, { error: 'Missing username, week, or team' });
    }

    const games = getWeekGames(week);
    if (!games) {
      return jres(400, { error: `Unknown week: ${week}` });
    }

    // 1) Validate NEW team exists this week & hasn't kicked
    const game = findGameForTeam(games, team);
    if (!game) {
      return jres(400, {
        error: 'Unknown team/game for that week',
        debug: { week, receivedTeam: body.team, expectedTeams: expectedTeamsForWeek(games) },
      });
    }

    const newKickMs = getKickoffEpochMsForGame(game);
    const nowMs = Date.now();
    if (newKickMs && nowMs >= newKickMs - GRACE_MS) {
      return jres(403, { error: 'Locked: new pick’s kickoff has passed' });
    }

    // Sheets auth
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const client = await auth.getClient();

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = 'Picks';

    // Pull existing picks (A=username, B=week, C=team, D=result)
    const getResponse = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range: `${sheetName}!A2:D`,
    });
    const rows = getResponse.data.values || [];

    // Find existing pick row for this user+week
    let existingRowIndex = -1;
    let existingTeam = null;

    for (let i = 0; i < rows.length; i++) {
      const rowUser = canon(rows[i][0]);
      const rowWeek = normWeek(rows[i][1]);
      if (rowUser === username && rowWeek === week) {
        existingRowIndex = i; // 0-based for A2:D result set
        existingTeam = canon(rows[i][2]);
        break;
      }
    }

    // 2) If there is an existing pick and its kickoff has passed, block overwrite
    if (existingTeam) {
      const existingGame = findGameForTeam(games, existingTeam);
      const oldKickMs = getKickoffEpochMsForGame(existingGame);
      if (oldKickMs && nowMs >= oldKickMs - GRACE_MS) {
        return jres(403, { error: 'Locked: existing pick already kicked off' });
      }
    }

    // Save/overwrite
    if (existingRowIndex >= 0) {
      const updateRange = `${sheetName}!C${existingRowIndex + 2}`; // add 2 to convert to 1-based rows starting at row 2
      await sheets.spreadsheets.values.update({
        auth: client,
        spreadsheetId,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: { values: [[team]] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        auth: client,
        spreadsheetId,
        range: `${sheetName}!A:D`,
        valueInputOption: 'RAW',
        requestBody: { values: [[username, week, team, '']] },
      });
    }

    return jres(200, { success: true });
  } catch (err) {
    console.error('Error submitting pick:', err);
    return jres(500, { error: 'Failed to submit pick', message: String(err?.message || err) });
  }
};
