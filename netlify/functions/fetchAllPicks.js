const { google } = require('googleapis');
const sheets = google.sheets('v4');

exports.handler = async function(event, context) {
  try {
    // Authorize using your service account credentials
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const range = 'Picks!A2:D'; // Adjust if more columns needed

    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify([]),
      };
    }

    const picks = rows.map(row => ({
      username: row[0]?.toLowerCase(),
      week: row[1],
      team: row[2],
      result: row[3]?.toLowerCase(), // 'win' / 'loss' / blank
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(picks),
    };
  } catch (err) {
    console.error('Error fetching picks:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch picks' }),
    };
  }
};
