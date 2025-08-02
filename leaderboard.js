document.addEventListener('DOMContentLoaded', async () => {
  const user = localStorage.getItem('user');
  const loginTime = parseInt(localStorage.getItem('loginTime'), 10);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (!user || !loginTime || now - loginTime > oneHour) {
    localStorage.clear();
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
  });

  function formatUsername(username) {
    const userMap = {
      alecb: 'Alec B.', aaronb: 'Aaron B.', bradd: 'Brad D.', bradg: 'Brad G.', bradh: 'Brad H.',
      brianm: 'Brian M.', caln: 'Cal N.', carterb: 'Carter B.', chuckp: 'Chuck P.', davidh: 'David H.',
      hunter: 'Hunter', ianf: 'Ian F.', jacobg: 'Jacob G.', jimc: 'Jim C.', joeo: 'Joe O.',
      josha: 'Josh A.', justing: 'Justin G.', miked: 'Mike D.', mikek: 'Mike K.', mitchm: 'Mitch M.',
      nickp: 'Nick P.', rileyb: 'Riley B.', ryanl: 'Ryan L.', taylorh: 'Taylor H.',
      timb: 'Tim B.', tomw: 'Tom W.', trevorc: 'Trevor C.', zachw: 'Zach W.'
    };
    return userMap[username.toLowerCase()] || username;
  }

  try {
    const response = await fetch('/.netlify/functions/fetchUserPicks');
    const raw = await response.json();
    console.log('Fetched raw pick data:', raw);
    const data = Array.isArray(raw) ? raw : raw.data || [];


    const scores = {};

    data.forEach(pick => {
      const { username, result } = pick;
      const lowerUser = username.toLowerCase();

      if (!scores[lowerUser]) scores[lowerUser] = 0;
      if (result?.toLowerCase() === 'win') {
        scores[lowerUser]++;
      }
    });

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    const tbody = document.querySelector('#leaderboardTable tbody');
    sorted.forEach(([user, points]) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${formatUsername(user)}</td>
        <td>${points}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading leaderboard:', err);
  }
});
