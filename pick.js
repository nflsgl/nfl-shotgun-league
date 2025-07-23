
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
  const matchupDisplay = document.getElementById('matchup');
  const oddsDisplay = document.getElementById('odds');

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
    matchupDisplay.innerHTML = '';
    oddsDisplay.innerHTML = '';

    if (!schedule[selectedWeek]) return;

    const usedTeams = Object.values(userPicks);
    const teamMap = {};

    schedule[selectedWeek].forEach(game => {
      // Home team entry
      teamMap[game.home] = {
        opponent: game.away,
        location: "vs",
        odds: game.odds || {}
      };
      // Away team entry
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
      option.textContent = `${team} (${t.location} ${t.opponent})`;
      if (usedTeams.includes(team)) {
        option.disabled = true;
        option.textContent += ' (already used)';
      }
      teamSelect.appendChild(option);
    });

    // Pre-select if pick exists
    if (userPicks[selectedWeek]) {
      teamSelect.value = userPicks[selectedWeek];
      teamSelect.dispatchEvent(new Event('change'));
    }
  });

  // Show matchup + odds when a team is selected
  teamSelect.addEventListener('change', function () {
    const selectedWeek = weekSelect.value;
    const selectedTeam = teamSelect.value;
    matchupDisplay.innerHTML = '';
    oddsDisplay.innerHTML = '';

    if (!selectedTeam || !schedule[selectedWeek]) return;

    const game = schedule[selectedWeek].find(
      g => g.home === selectedTeam || g.away === selectedTeam
    );

    if (game) {
      const opponent = game.home === selectedTeam ? game.away : game.home;
      const location = game.home === selectedTeam ? "vs" : "@";
      matchupDisplay.textContent = `${selectedTeam} (${location} ${opponent})`;

      if (game.odds) {
        const ml = game.odds.moneyline || {};
        const spread = game.odds.spread || {};
        const mlText = `Moneyline: ${selectedTeam} ${ml[selectedTeam] ?? '-'} / ${opponent} ${ml[opponent] ?? '-'}`;
        const spText = `Spread: ${selectedTeam} ${spread[selectedTeam] ?? '-'} / ${opponent} ${spread[opponent] ?? '-'}`;
        oddsDisplay.innerHTML = `<p>${mlText}</p><p>${spText}</p>`;
      }
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

    // Confirmation display
    form.innerHTML = `
      <h3>✅ Pick recorded!</h3>
      <p><strong>${team}</strong> has been submitted for Week ${week}.</p>
      <button onclick="window.location.reload()">Make Another Pick</button>
    `;
  });
});
