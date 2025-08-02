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

  try {
    if (contentType.includes('application/json')) {
      data = JSON.parse(event.body || '{}');
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      data = querystring.parse(event.body || '');
    } else {
      console.error('Unsupported content type:', contentType);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unsupported content type' }),
      };
    }
  } catch (parseErr) {
    console.error('Error parsing body:', parseErr);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  const { username, week, team } = data;

  if (!username || !week || !team) {
    console.error('Missing field(s)', { username, week, team });
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing one or more required fields.' }),
    };
  }

  console.log('Received pick:', { username, week, team });

  try {
    const credsRaw = process.env.GOOGLE_CREDS;
    if (!credsRaw) throw new Error('GOOGLE_CREDS env variable is not defined');

    const creds = JSON.parse(credsRaw);

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

    console.log('✅ Pick saved successfully');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Pick saved successfully' }),
    };
  } catch (err) {
    console.error('❌ Error saving pick:', err.message || err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save pick' }),
    };
  }
}
