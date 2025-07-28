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
  const submitBtn = form.querySelector('button[type="submit"]');

  // Load picks CSV
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

  function isThursdayNightGame(matchup) {
    const kickoff = new Date(matchup.kickoff);
    return kickoff.getDay() === 4 && kickoff.getHours() >= 20;
  }

  function hasThursdayGameStarted(scheduleWeek) {
    const thursdayGame = scheduleWeek.find(m => isThursdayNightGame(m));
    if (!thursdayGame) return false;
    const now = new Date();
    return now >= new Date(thursdayGame.kickoff);
  }

  function populateTeamsForWeek(week) {
    teamSelect.innerHTML = '<option value="">-- Choose a team --</option>';
    if (!schedule[week] || schedule[week].length === 0) return;

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

    if (!week || !team) {
      alert('Please select both a week and a team.');
      return;
    }

    if (hasThursdayGameStarted(schedule[week]) && !userPicks[week]) {
      alert('Thursday game has started. You can no longer pick this week.');
      return;
    }

    if (userPicks[week] && userPicks[week] !== team) {
      const confirmChange = confirm(`You've already picked ${userPicks[week]} for Week ${week}. Replace it with ${team}?`);
      if (!confirmChange) return;
    }

    const submission = {
      username: user,
      week: week,
      team: team
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbxlxW1BRCg03ScwtukXcWrUsEh_59j9gzAhoXbjzU_DMHFLwJe_ngVDHS9LntUhYVcy/exec', {
        method: 'POST',
        body: JSON.stringify(submission),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        }
      });

      const result = await response.text();

      form.innerHTML = `
        <div style="padding: 1em; border: 2px solid green; border-radius: 10px; background: #eaffea; text-align: center;">
          <h3>✅ ${result}</h3>
          <p><strong>${team}</strong> has been submitted for <strong>Week ${week}</strong>.</p>
          <button onclick="window.location.reload()">Make Another Pick</button>
        </div>
      `;
    } catch (err) {
      alert('Error submitting pick: ' + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Pick';
    }
  });

  if (weekSelect.value) {
    populateTeamsForWeek(weekSelect.value);
  }
});
