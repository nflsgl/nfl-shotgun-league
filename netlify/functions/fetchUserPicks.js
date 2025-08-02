exports.handler = async (event) => {
  const username = event.queryStringParameters.username;

  if (!username) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing username' }),
    };
  }

  // TODO: Replace with real Sheets logic or dummy data for now
  const dummyData = [
    { week: 1, team: 'Saints' },
    { week: 2, team: 'Lions' },
    { week: 3, team: 'Texans' },
    { week: 4, team: 'Vikings' },
  ];

  return {
    statusCode: 200,
    body: JSON.stringify(dummyData),
  };
};
