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
    // Use full path per project convention
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
  // Roster (current usernames → pretty display)
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
  // Style injection (background colors, layout, lock overlay)
  // -----------------------------
  injectStyles(`
    #matrixTable { width: 100%; border-collapse: collapse; table-layout: fixed; }
    #matrixTable th, #matrixTable td { border: 1px solid #ddd; padding: 6px; text-align: center; vertical-align: middle; }
    #matrixTable th.username-col, #matrixTable td.username-col { position: sticky; left: 0; background: #fff; z-index: 1; }
    #matrixTable th { position: sticky; top: 0; background: #fff; z-index: 2; }

    /* Cell states */
    td.cell-win   { background-color: #c8e6c9; } /* light green */
    td.cell-loss  { background-color: #ffcdd2; } /* light red */
    td.cell-pend  { background-color: #eeeeee; } /* light gray (pending or locked) */
    td.cell-empty { background-color: #f7f7f7; } /* no pick logged */

    /* Logo fit */
    .matrix-logo { max-width: 80%; max-height: 48px; object-fit: contain; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2)); }

    /* Legend */
    .legend { display: flex; gap: 12px; align-items: center; margin: 10px 0 14px; font-size: 14px; flex-wrap: wrap; }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; }
    .legend-swatch { width: 16px; height: 16px; border: 1px solid #ccc; display: inline-block; }
    .swatch-win { background: #c8e6c9; }
    .swatch-loss { background: #ffcdd2; }
    .swatch-pend { background: #eeeeee; }
    .swatch-empty { background: #f7f7f7; }
  `);

  // Legend (optional, looks nice)
  const tableEl = document.getElementById('matrixTable');
  if (!tableEl) {
    console.error('matrix.js: #matrixTable not found');
    return;
  }
  tableEl.insertAdjacentHTML('beforebegin', `
    <div class="legend">
      <div class="legend-item"><span class="legend-swatch swatch-win"></span> Win</div>
      <div class="legend-item"><span class="legend-swatch swatch-loss"></span> Loss</div>
      <div class="legend-item"><span class="legend-swatch swatch-pend"></span> Pending / Locked</div>
      <div class="legend-item"><span class="legend-swatch swatch-empty"></span> No Pick</div>
      <div class="legend-item">🔒 = Hidden until kickoff</div>
    </div>
  `);

  // -----------------------------
  // Helpers: schedule → kickoff map, logos, result normalization
  // -----------------------------
  const currentTime = Date.now();

  // schedule is assumed global, with weeks as keys and games like { home, away, date }
  const teamKickoffMap = {}; // { [week]: { [teamLower]: Date } }
  Object.entries(schedule).forEach(([week, games]) => {
    teamKickoffMap[week] = {};
    games.forEach(game => {
      const kickoff = new Date(game.date); // expects ISO in schedule.js
      const home = game.home.toLowerCase();
      const away = game.away.toLowerCase();
      teamKickoffMap[week][home] = kickoff;
      teamKickoffMap[week][away] = kickoff;
    });
  });

  const getLogoFilename = (teamName) => {
    // "Detroit Lions" → "lions" (your logos folder uses last word lowercased)
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
  // Fetch all picks once
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
  // Build user→week map
  // -----------------------------
  const allUsers = Object.keys(userMap).sort();
  const weeks = Object.keys(schedule).map(n => Number(n)).sort((a, b) => a - b);

  const matrix = {};
  allUsers.forEach(u => (matrix[u] = {}));

  // expecting picks like: { username, week, team, result }
  for (const p of Array.isArray(picks) ? picks : []) {
    const uname = String(p.username || '').toLowerCase();
    if (!matrix[uname]) continue;
    const wk = Number(p.week);
    if (!Number.isFinite(wk)) continue;
    matrix[uname][wk] = {
      team: (p.team || '').toLowerCase(),
      teamRaw: p.team || '',
      result: normalizeRes
