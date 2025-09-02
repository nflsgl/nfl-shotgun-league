// matrix.js
document.addEventListener('DOMContentLoaded', async () => {
  // ---- Auth gate (1-hour session) ----
  const user = localStorage.getItem('user');
  const loginTime = parseInt(localStorage.getItem('loginTime'), 10);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (!user || !loginTime || (now - loginTime) > oneHour) {
    localStorage.clear();
    window.location.href = 'index.html';
    return;
  }

  // ---- Logout ----
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'index.html';
    });
  }

  // ---- Username display map ----
  const userMap = {
    alecb: 'Alec B.', aaronb: 'Aaron B.', bradd: 'Brad D.', bradg: 'Brad G.', bradh: 'Brad H.',
    brianm: 'Brian M.', caln: 'Cal N.', carterb: 'Carter B.', chuckp: 'Chuck P.', davidh: 'David H.',
    hunter: 'Hunter', ianf: 'Ian F.', jacobg: 'Jacob G.', jimc: 'Jim C.', joeo: 'Joe O.',
    josha: 'Josh A.', justing: 'Justin G.', miked: 'Mike D.', mikek: 'Mike K.', mitchm: 'Mitch M.',
    nickp: 'Nick P.', rileyb: 'Riley B.', ryanl: 'Ryan L.', taylorh: 'Taylor H.',
    timb: 'Tim B.', tomw: 'Tom W.', trevorc: 'Trevor C.', zachw: 'Zach W.'
  };
  const formatUsername = (username) => userMap[username] || username;

  // ---- Helpers ----
  // "detroit lions" -> "lions" (expects logo at logos/lions.png)
  const getLogoFilename = (teamName) => teamName.trim().toLowerCase().split(' ').pop();

  // Build a kickoff lookup: { "1": { "lions": Date, "bears": Date, ... }, "2": {...}, ... }
  const teamKickoffMap = {};
  Object.entries(window.schedule || {}).forEach(([weekKey, games]) => {
    const wk = String(weekKey);
    teamKickoffMap[wk] = {};
    (games || []).forEach(game => {
      // IMPORTANT: Ensure game.date is ISO with timezone offset, e.g. "2025-09-07T13:00:00-04:00"
      const kickoff = new Date(game.date);
      const home = String(game.home || '').toLowerCase();
      const away = String(game.away || '').toLowerCase();
      if (!isNaN(kickoff.getTime())) {
        teamKickoffMap[wk][home] = kickoff;
        teamKickoffMap[wk][away] = kickoff;
      }
    });
  });

  // ---- Fetch all picks and render matrix ----
  try {
    const response = await fetch('/.netlify/functions/fetchAllPicks', { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const picks = await response.json();

    // Users: alphabetical by username key (lowercase)
    const allUsers = Object.keys(userMap).sort();

    // Weeks: normalize to strings, sort numerically
    const weeks = Object.keys(window.schedule || {})
      .map(w => String(w))
      .sort((a, b) => Number(a) - Number(b));

    // Matrix structure: { username: { "1": { team, result }, "2": {...} } }
    const matrix = {};
    allUsers.forEach(u => { matrix[u] = {}; });

    (picks || []).forEach(p => {
      const uname = String(p.username || '').toLowerCase();
      const wk = String(p.week);
      if (!matrix[uname]) return;
      const team = String(p.team || '').toLowerCase();
      matrix[uname][wk] = { team, result: p.result };
    });

    // Build table
    const table = document.getElementById('matrixTable');
    if (!table) {
      console.error('matrix.js: #matrixTable not found');
      return;
    }

    // Header row
    const headerRow = document.createElement('tr');
    headerRow.innerHTML =
      `<th class="username-col">Player</th>` +
      weeks.map(w => `<th>Week ${w}</th>`).join('');
    table.appendChild(headerRow);

    // Current time (real clock)
    const currentTime = Date.now();

    // Rows
    allUsers.forEach(username => {
      const row = document.createElement('tr');
      const displayName = formatUsername(username);
      row.innerHTML = `<td class="username-col">${displayName}</td>`;

      weeks.forEach(wk => {
        const cell = document.createElement('td');
        const pick = matrix[username][wk];

        if (pick?.team) {
          const kickoff = teamKickoffMap[wk]?.[pick.team];

          // If we know the kickoff and it's in the future, lock it.
          // If kickoff is missing/invalid, stay conservative and lock.
          if (!kickoff || isNaN(kickoff.getTime()) || currentTime < kickoff.getTime()) {
            cell.textContent = '🔒';
            cell.title = 'Locked until kickoff';
          } else {
            const img = document.createElement('img');
            img.src = `logos/${getLogoFilename(pick.team)}.png`;
            img.alt = pick.team;
            img.className = 'matrix-logo';
            if (pick.result === 'loss') img.style.textDecoration = 'line-through';

            // Optional: fallback if logo 404s
            img.onerror = () => { cell.textContent = getLogoFilename(pick.team).toUpperCase(); };

            cell.appendChild(img);
          }
        } else {
          // No pick submitted for that week
          cell.textContent = '';
        }

        row.appendChild(cell);
      });

      table.appendChild(row);
    });

  } catch (err) {
    console.error('matrix.js error fetching/rendering:', err);
    const table = document.getElementById('matrixTable');
    if (table) {
      const msg = document.createElement('caption');
      msg.textContent = 'Unable to load matrix at this time.';
      msg.style.color = 'crimson';
      msg.style.fontSize = '0.9rem';
      table.appendChild(msg);
    }
  }
});
