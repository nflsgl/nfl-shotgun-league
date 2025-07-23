
document.addEventListener('DOMContentLoaded', function () {
  const user = localStorage.getItem('user');
  const loginTime = parseInt(localStorage.getItem('loginTime'), 10);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (!user || !loginTime || now - loginTime > oneHour) {
    localStorage.clear();
    window.location.href = '/nfl-shotgun-league/index.html';
    return;
  }

  const weekSelect = document.getElementById('week');
  const teamSelect = document.getElementById('team');
  const form = document.getElementById('pickForm');

  const allPicks = JSON.parse(localStorage.getItem('allPicks')) || {};
  const userPicks = allPicks[user] || {};

  // Populate week dropdown from schedule
  Object.keys(schedule).forEach(week => {
    const option = document.createElement("option");
    option.value = week;
    option.textContent = `Week ${week}`;
    weekSelect.appendChild(option);
  });

  // Update team dropdown when a week is selected
  weekSelect.addEventListener('change', function () {
    const selectedWeek = weekSelect.value;
    teamSelect.innerHTML = '<option value="">-- Choose a team --</option>';

    if (!schedule[selectedWeek]) return;

    const usedTeams = Object.values(userPicks);
    const teamMap = {};

    schedule[selectedWeek].forEach(game => {
      teamMap[game.home] = {
        opponent: game.away,
        location: "vs",
        odds: game.odds || {}
      };
      teamMap[game.away] = {
        opponent: game.home,
        location: "@",
        odds: game.odds || {}
      };
    });

    Object.keys(teamMap).forEach(team => {
      const option = document.createElement("option");
      option.value = team;
      const t = teamMap[team];
      const spread = t.odds?.spread || {};
      const spreadValue = spread[team] !== undefined
        ? (spread[team] > 0 ? '+' : '') + spread[team]
        : '';
      option.textContent = `${team} ${spreadValue} (${t.location} ${t.opponent})`;

      if (usedTeams.includes(team)) {
        option.disabled = true;
        option.textContent += ' (already used)';
      }
      teamSelect.appendChild(option);
    });

    // Pre-select if pick exists
    if (userPicks[selectedWeek]) {
      teamSelect.value = userPicks[selectedWeek];
    }
  });

  // Handle form submission
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const team = teamSelect.value;
    const week = weekSelect.value;

    if (!team || !week) return;

    if (!allPicks[user]) {
      allPicks[user] = {};
    }

    allPicks[user][week] = team;
    localStorage.setItem('allPicks', JSON.stringify(allPicks));

    form.innerHTML = `
      <h3>✅ Pick recorded!</h3>
      <p><strong>${team}</strong> has been submitted for Week ${week}.</p>
      <button onclick="window.location.reload()">Make Another Pick</button>
    `;
  });
});
