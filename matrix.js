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

  const userMap = {
    alecb: 'Alec B.', aaronb: 'Aaron B.', bradd: 'Brad D.', bradg: 'Brad G.', bradh: 'Brad H.',
    brianm: 'Brian M.', caln: 'Cal N.', carterb: 'Carter B.', chuckp: 'Chuck P.', davidh: 'David H.',
    dmatt: 'D-Matt', hunter: 'Hunter', ianf: 'Ian F.', jacobg: 'Jacob G.', joseph: 'Joe O.',
    joshua: 'Josh A.', justing: 'Justin G.', miked: 'Mike D.', mikek: 'Mike K.', mitchm: 'Mitch M.',
    nickp: 'Nick P.', rileyb: 'Riley B.', ryanl: 'Ryan L.', taylorh: 'Taylor H.',
    timb: 'Tim B.', tomw: 'Tom W.', trevorc: 'Trevor C.', zackt: 'Zack T.', zachw: 'Zach W.'
  };

  const formatUsername = (username) => userMap[username] || username;

  // ✅ REAL CURRENT TIME
  const currentTime = Date.now();

  // Logo helper: "dallas cowboys" → "cowboys"
  const getLogoFilename = (teamName) => {
    return teamName.split(' ').pop();
  };

  const teamKickoffMap = {}; // { week: { team: Date } }

  Object.entries(schedule).forEach(([week, games]) => {
    teamKickoffMap[week] = {};
    games.forEach(game => {
      const kickoff = new Date(game.date);
      const home = game.home.toLowerCase();
      const away = game.away.toLowerCase();
      teamKickoffMap[week][home] = kickoff;
      teamKickoffMap[week][away] = kickoff;
    });
  });

  try {
    const response = await fetch('/.netlify/functions/fetchAllPicks');
    const picks = await response.json();

    const allUsers = Object.keys(userMap).sort();
    const weeks = Object.keys(schedule).sort((a, b) => Number(a) - Number(b));

    const matrix = {};
    allUsers.forEach(u => matrix[u] = {});

    picks.forEach(p => {
      const uname = p.username.toLowerCase();
      if (!matrix[uname]) return;
      matrix[uname][p.week] = {
        team: p.team?.toLowerCase(),
        result: p.result
      };
    });

    const table = document.getElementById('matrixTable');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th class="username-col">Player</th>` + weeks.map(w => `<th>Week ${w}</th>`).join('');
    table.appendChild(headerRow);

    allUsers.forEach(username => {
      const row = document.createElement('tr');
      const displayName = formatUsername(username);
      row.innerHTML = `<td class="username-col">${displayName}</td>`;

      weeks.forEach(week => {
        const cell = document.createElement('td');
        const pick = matrix[username][week];
        if (pick?.team) {
          const kickoff = teamKickoffMap[week]?.[pick.team];
          if (kickoff && currentTime < kickoff.getTime()) {
            cell.textContent = '🔒';
          } else {
            const img = document.createElement('img');
            img.src = `logos/${getLogoFilename(pick.team)}.png`;
            img.alt = pick.team;
            img.className = 'matrix-logo';
            if (pick.result === 'loss') img.style.textDecoration = 'line-through';
            cell.appendChild(img);
          }
        } else {
          cell.textContent = ''; // No pick
        }
        row.appendChild(cell);
      });

      table.appendChild(row);
    });

  } catch (err) {
    console.error('Error loading matrix:', err);
  }
});
