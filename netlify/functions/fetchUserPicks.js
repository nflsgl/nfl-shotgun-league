const { google } = require('googleapis');
const creds = require('./creds.json'); // your service account credentials

const SHEET_ID = 'YOUR_SHEET_ID_HERE';  // Replace me
const SHEET_NAME = 'Picks';             // Replace me if different

exports.handler = async (event) => {
  const username = event.queryStringParameters.username?.toLowerCase();

  if (!username) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing username' }),
    };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_NAME,
    });

    const rows = res.data.values;
    if (!rows || rows.length < 2) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const header = rows[0];
    const picks = rows.slice(1).map(row => {
      const obj = {};
      header.forEach((col, i) => {
        obj[col.toLowerCase()] = row[i];
      });
      return obj;
    });

    const userPicks = picks.filter(p => p.username?.toLowerCase() === username);

    return {
      statusCode: 200,
      body: JSON.stringify(userPicks),
    };
  } catch (err) {
    console.error('Fetch error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' }),
    };
  }
};
