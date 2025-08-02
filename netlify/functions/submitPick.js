import { google } from 'googleapis';
import querystring from 'querystring';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  const contentType = event.headers['content-type'] || '';
  let data = {};

  if (contentType.includes('application/json')) {
    data = JSON.parse(event.body || '{}');
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    data = querystring.parse(event.body || '');
  }

  const { username, week, team } = data;

  if (!username || !week || !team) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing one or more required fields.' }),
    };
  }

  try {
    const creds = JSON.parse(process.env.GOOGLE_CREDS);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetId = '1C1Kh5h7Aj1pyFHJXFZB_JG3Nhbxfoyg-x4u6LUH6h0U';
    const sheetName = 'Picks';

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:C`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[username, week, team]],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Pick saved successfully' }),
    };
  } catch (err) {
    console.error('Error saving pick:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save pick' }),
    };
  }
}
