const { google } = require('googleapis');
const sheets = google.sheets('v4');

exports.handler = async function (event) {
  try {
    const { username } = event.queryStringParameters || {};

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing username' }),
      };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const range = 'Picks!A2:D';

    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];

    const picks = rows
      .filter(row => row[0]?.toLowerCase() === username.toLowerCase())
      .map(row => ({
        username: row[0]?.toLowerCase(),
        week: row[1],
        team: row[2],
        result: row[3]?.toLowerCase() || '',
      }));

    return {
      statusCode: 200,
      body: JSON.stringify(picks),
    };
  } catch (err) {
    console.error('Error fetching user picks:', err.message, err.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch user picks', message: err.message }),
    };
  }
};
