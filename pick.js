document.addEventListener('DOMContentLoaded', async function () {
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

  const picksCSV = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRv9PUKq_JE6dUMgdoDYFsOZESjh2jD2gK40wLKiYsrCp6WALkdKJsxJeJ8ylYnGQLwStKjlLGrXMX9/pub?output=csv')
    .then(res => res.text());

  const allPicks = {};
  picksCSV.trim().split('\n').slice(1).forEach(row => {
    const [username, week, team] = row.split(',');
    const uname = username.trim().toLowerCase();
    if (!allPicks[uname]) allPicks[uname] = {};
    allPicks[uname][week.trim()] = team.trim();
  });

  const userPicks = allPicks[user] || {};
  const usedTeams = Object.values(userPicks);

  function getMatchupOption(matchup, isHomeTeam) {
    const team = isHomeTeam ? matchup.home : matchup.away;
    const opp = isHomeTeam ? matchup.away : matchup.home;
    const spread = isHomeTeam ? matchup.odds.spread.home : matchup.odds.spread.away;
    const location = isHomeTeam ? 'vs' : '@';
    return {
      value: team,
      label: `${team} ${spread > 0 ? '+' : ''}${spread} (${location} ${opp})`
    };
  }

  function populateTeamsForWeek(week) {
    teamSelect.innerHTML = '<option value="">-- Choose a team --</option>';

    if (!schedule[week] || schedule[week].length === 0) {
      return;
    }

    const options = [];
    for (const matchup of schedule[week]) {
      options.push(getMatchupOption(matchup, true));
      options.push(getMatchupOption(matchup, false));
    }

    for (const { value, label } of options) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;

      if (usedTeams.includes(value)) {
        option.disabled = true;
        option.textContent += ' (already used)';
      }

      teamSelect.appendChild(option);
    }

    // If user already picked for this week
    const selectedTeam = userPicks[week];
    if (selectedTeam) {
      teamSelect.value = selectedTeam;
    }
  }

  weekSelect.addEventListener('change', function () {
    populateTeamsForWeek(this.value);
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const week = weekSelect.value;
    const team = teamSelect.value;

    if (!week || !team) return;

    const submission = {
      username: user,
      week: week,
      team: team
    };

    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbwA-PGrBpDfHv3mT47lyh6_eLHsszFAxch-OwcNZIZgUBirDCdDh0oPx33JfCWiOxor/exec', {
        method: 'POST',
        body: JSON.stringify(submission),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.text();

      form.innerHTML = `
        <h3>✅ ${result}</h3>
        <p><strong>${team}</strong> has been submitted for Week ${week}.</p>
        <button onclick="window.location.reload()">Make Another Pick</button>
      `;
    } catch (err) {
      alert('Error submitting pick: ' + err.message);
    }
  });

  // Auto-trigger initial population if current week is pre-selected
  if (weekSelect.value) {
    populateTeamsForWeek(weekSelect.value);
  }
});
