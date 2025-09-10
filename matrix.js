document.addEventListener('DOMContentLoaded', async () => {
  // -----------------------------
  // Auth guard + logout
  // -----------------------------
  const user = localStorage.getItem('user');
  const loginTime = parseInt(localStorage.getItem('loginTime'), 10);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (!user || !loginTime || now - loginTime > oneHour) {
    localStorage.clear();
    window.location.href = '/nfl-shotgun-league/index.html';
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = '/nfl-shotgun-league/index.html';
    });
  }

  // -----------------------------
  // User roster map
  // -----------------------------
  const userMap = {
    mikek: 'Mike K.', carterb: 'Carter B.', caln: 'Cal N.', davidh: 'David H.', chuckp: 'Chuck P.',
    dmatt: 'D-Matt', aaronb: 'Aaron B.', miked: 'Mike D.', nickp: 'Nick P.', zackt: 'Zack T.',
    bradg: 'Brad G.', trevorc: 'Trevor C.', hunter: 'Hunter', ryanl: 'Ryan L.', bradh: 'Brad H.',
    joseph: 'Joe O.', mitchm: 'Mitch M.', brianm: 'Brian M.', timb: 'Tim B.', alecb: 'Alec B.',
    zachw: 'Zach W.', jacobg: 'Jacob G.', justing: 'Justin G.', tomw: 'Tom W.', joshua: 'Josh A.',
    taylorh: 'Taylor H.', rileyb: 'Riley B.'
  };
  const formatUsername = (username) => userMap[username] || username;

  // -----------------------------
  // Style injection
  // -----------------------------
  injectStyles(`
    .matrix-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    #matrixTable {
      border-collapse: collapse;
      width: 100%;
      min-width: 1000px;
      table-layout: fixed;
    }
    #matrixTable th, #matrixTable td {
      border: 1px solid #ddd;
      padding: 6px;
      text-align: center;
      vertical-align: middle;
    }
    #matrixTable th.username-col,
    #matrixTable td.username-col {
      position: sticky;
      left: 0;
      background: #fff;
      z-index: 2;
      min-width: 110px;
    }
    #matrixTable th {
      position: sticky;
      top: 0;
      background: #fff;
      z-index: 3;
    }

    /* Cell states */
    td.cell-win   { background-color: #c8e6c9; }
    td.cell-loss  { background-color: #ffcdd2; }
    td.cell-pend  { background-color: #eeeeee; }
    td.cell-empty { background-color: #f7f7f7; }

    .matrix-logo {
      max-width: 80%;
      max-height: 48px;
      object-fit: contain;
      filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
    }

    /* Legend */
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin: 10px 0 14px;
      font-size: 14px;
    }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; }
    .legend-swatch { width: 16px; height: 16px; border: 1px solid #ccc; display: inline-block; }
    .swatch-win { background: #c8e6c9; }
    .swatch-loss { background: #ffcdd2; }
    .swatch-pend { background: #eeeeee; }
    .swatch-empty { background: #f7f7f7; }

    /* Mobile tweaks */
    @media (max-width: 600px) {
      .matrix-logo { max-height: 32px; }
      #matrixTable th, #matrixTable td {
        padding: 4px;
        font-size: 12px;
      }
    }
  `);

  // Add legend
  const container = document.querySelector('.matrix-container') || document.body;
  container.insertAdjacentHTML('beforebegin', `
    <div class="legend">
      <div class="legend-item"><span class="legend-swatch swatch-win"></span> Win</div>
      <div class="legend-item"><span class="legend-swatch swatch-loss"></span> Loss</div>
      <div class="legend-item"><span class="legend-swatch swatch-pend"></span> Pending / Locked</div>
      <div class="legend-item"><span class="legend-swatch swatch-empty"></span> No Pick</div>
      <div class="legend-item">🔒 = Hidden until kickoff</div>
    </div>
  `);

  // -----------------------------
  // Helpers
  // -----------------------------
  const currentTime = Date.now();

  const teamKickoffMap = {};
  Object.entries(schedule).forEach(([week, games]) => {
    teamKickoffMap[week] = {};
    games.forEach(game => {
      const kickoff = new Date(game.date);
      teamKickoffMap[week][game.home.toLowerCase()] = kickoff;
      teamKickoffMap[week][game.away.toLowerCase()] = kickoff;
    });
  });

  const getLogoFilename = (teamName) => {
    if (!teamName) return '';
    return teamName.trim().split(/\s+/).pop().toLowerCase();
  };

  const normalizeResult = (val) => {
    if (!val) return 'pending';
    const s = String(val).trim().toLowerCase();
    if (s === 'win' || s === 'w') return 'win';
    if (s === 'loss' || s === 'l' || s === 'lose' || s === 'lost') return 'loss';
    return 'pending';
  };

  const classForResult = (res) => {
    if (res === 'win') return 'cell-win';
    if (res === 'loss') return 'cell-loss';
    return 'cell-pend';
  };

  // -----------------------------
  // Fetch picks
  // -----------------------------
  let picks;
  try {
    const response = await fetch('/.netlify/functions/fetchAllPicks');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    picks = await response.json();
  } catch (err) {
    console.error('Error fetching picks:', err);
    return;
  }

  // -----------------------------
  // Build matrix
  // -----------------------------
  const allUsers = Object.keys(userMap).sort();
  const weeks = Object.keys(schedule).map(n => Number(n)).sort((a, b) => a - b);

  const matrix = {};
  allUsers.forEach(u => (matrix[u] = {}));

  for (const p of Array.isArray(picks) ? picks : []) {
    const uname = String(p.username || '').toLowerCase();
    if (!matrix[uname]) continue;
    const wk = Number(p.week);
    if (!Number.isFinite(wk)) continue;
    matrix[uname][wk] = {
      team: (p.team || '').toLowerCase(),
      teamRaw: p.team || '',
      result: normalizeResult(p.result)
    };
  }

  // -----------------------------
  // Render table
  // -----------------------------
  const tableEl = document.getElementById('matrixTable');
  if (!tableEl) {
    console.error('matrix.js: #matrixTable not found');
    return;
  }

  // Header
  const headerRow = document.createElement('tr');
  headerRow.innerHTML =
    `<th class="username-col">Player</th>` +
    weeks.map(w => `<th>W${w}</th>`).join('');
  tableEl.appendChild(headerRow);

  // Rows
  for (const username of allUsers) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.className = 'username-col';
    nameCell.textContent = formatUsername(username);
    row.appendChild(nameCell);

    for (const week of weeks) {
      const td = document.createElement('td');
      const pick = matrix[username][week];

      if (!pick || !pick.team) {
        td.className = 'cell-empty';
        row.appendChild(td);
        continue;
      }

      const kickoff = teamKickoffMap[week]?.[pick.team];
      const locked = kickoff && currentTime < kickoff.getTime();

      if (locked) {
        td.className = 'cell-pend';
        td.textContent = '🔒';
      } else {
        td.className = classForResult(pick.result);
        const img = document.createElement('img');
        img.className = 'matrix-logo';
        img.alt = pick.teamRaw || pick.team;
        img.src = `logos/${getLogoFilename(pick.teamRaw || pick.team)}.png`;
        td.appendChild(img);
      }

      row.appendChild(td);
    }

    tableEl.appendChild(row);
  }

  // -----------------------------
  // Utils
  // -----------------------------
  function injectStyles(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
});
