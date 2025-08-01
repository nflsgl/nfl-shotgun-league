export async function handler(event, context) {
  const username = event.queryStringParameters.username;
  if (!username) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing username' }),
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }

  const url = `https://script.google.com/macros/s/AKfycbxlxW1BRCg03ScwtukXcWrUsEh_59j9gzAhoXbjzU_DMHFLwJe_ngVDHS9LntUhYVcy/exec?username=${encodeURIComponent(username)}`;

  try {
    const res = await fetch(url);
    const body = await res.text(); // may not always be valid JSON
    return {
      statusCode: 200,
      body,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Upstream fetch failed' }),
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}

