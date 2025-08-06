const { google } = require('googleapis');
const sheets = google.sheets('v4');

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body);
    const { username, week, team } = body;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = 'Picks';

    // Get all existing data
    const getResponse = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range: `${sheetName}!A2:D`,
    });

    const rows = getResponse.data.values || [];

    let updated = false;

    // Try to find existing pick to overwrite
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0]?.toLowerCase() === username.toLowerCase() && rows[i][1] == week) {
        const updateRange = `${sheetName}!C${i + 2}`;
        await sheets.spreadsheets.values.update({
          auth: client,
          spreadsheetId,
          range: updateRange,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[team]],
          },
        });
        updated = true;
        break;
      }
    }

    // Otherwise, append a new row
    if (!updated) {
      await sheets.spreadsheets.values.append({
        auth: client,
        spreadsheetId,
        range: `${sheetName}!A:D`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[username, week, team, '']],
        },
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Error submitting pick:', err.message, err.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to submit pick', message: err.message }),
    };
  }
};
