import { google } from 'googleapis';

export async function handler(event) {
  const username = event.queryStringParameters.username;
  if (!username) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing username' }),
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }

  const creds = JSON.parse(process.env.GOOGLE_CREDS); // ⬅️ pull from env var

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = '1C1Kh5h7Aj1pyFHJXFZB_JG3Nhbxfoyg-x4u6LUH6h0U';
  const range = 'Picks!A2:C';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    const userPicks = rows
      .filter(row => row[0]?.toLowerCase() === username.toLowerCase())
      .map(row => ({ week: row[1], team: row[2] }));

    return {
      statusCode: 200,
      body: JSON.stringify(userPicks),
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch picks' }),
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}
