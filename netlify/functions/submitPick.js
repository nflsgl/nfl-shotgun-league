// netlify/functions/submitPick.js
const { google } = require('googleapis');
const sheets = google.sheets('v4');

// ✅ keep your path as-is if schedule.js sits next to this file
const schedule = require('./schedule.js');

// ---- JSON response helper (so every path returns real JSON) ----
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

exports.handler = async function (event) {
  try {
    // Allow CORS preflight (harmless even if not needed)
    if (event.httpMethod === 'OPTIONS') {
      return jres(200, { ok: true });
    }

    if (event.httpMethod !== 'POST') {
      return jres(405, { error: 'Method Not Allowed' });
    }

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

    const username = String(body.username || '').trim().toLowerCase();
    const week     = String(body.week || '').trim();     // keep as string to match schedule keys like "1"
    const team     = String(body.team || '').trim().toLowerCase();

    if (!username || !week || !team) {
      return jres(400, { error: 'Missing username, week, or team' });
    }

    // Helper: find kickoff Date for a given (week, team)
    const getKickoff = (wk, teamLower) => {
      const games = schedule[wk] || [];
      const g = games.find((x) => {
        const home = String(x.home || '').toLowerCase();
        const away = String(x.away || '').toLowerCase();
        return home === teamLower || away === teamLower;
      });
      if (!g) return null;
      const d = new Date(g.date);
      return isNaN(d) ? null : d;
    };

    // 1) Block if NEW team’s kickoff has already passed
    const newKick = getKickoff(week, team);
    if (!newKick) {
      return jres(400, { error: 'Unknown team/game for that week' });
    }
    const now = Date.now();
    if (now >= newKick.getTime()) {
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
      const rowUser = (rows[i][0] || '').toLowerCase();
      const rowWeek = String(rows[i][1] || '').trim();
      if (rowUser === username && rowWeek === week) {
        existingRowIndex = i; // 0-based for A2:D result set
        existingTeam = String(rows[i][2] || '').toLowerCase();
        break;
      }
    }

    // 2) If there is an existing pick and its kickoff has passed, block overwrite
    if (existingTeam) {
      const oldKick = getKickoff(week, existingTeam);
      if (oldKick && now >= oldKick.getTime()) {
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
    console.error('Error submitting pick:', err.message, err.stack);
    return jres(500, { error: 'Failed to submit pick', message: err.message });
  }
};
