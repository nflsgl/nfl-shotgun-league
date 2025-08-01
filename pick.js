document.addEventListener('DOMContentLoaded', async () => {
  const user = localStorage.getItem('user');
  const loginTime = parseInt(localStorage.getItem('loginTime'), 10);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (!user || !loginTime || now - loginTime > oneHour) {
    localStorage.clear();
    window.location.href = '/index.html';
    return;
  }

  const weekSelect = document.getElementById('week');
  const teamSelect = document.getElementById('team');
  const confirmBox = document.getElementById('confirmBox');

  let userUsedTeams = [];

  // 🔄 Fetch user's used picks from Netlify function
  try {
    const res = await fetch(`https://nflsgl.netlify.app/.netlify/functions/fetchUserPicks?username=${encodeURIComponent(user.toLowerCase())}`);
    const picks = await res.json();
    console.log('User picks:', picks);

    userUsedTeams = picks.map(row => row.team?.toLowerCase?.()).filter(Boolean);
    console.log('Used teams for user:', userUsedTeams);
  } catch (err) {
    console.error('Error fetching used teams:', err);
  }

  Object.keys(schedule).sort((a, b) => parseInt(a) - parseInt(b)).forEach(week => {
    const games = schedule[week];
    const startDate = new Date(games[0].date);
    const endDate = new Date(games[games.length - 1].date);
    const label = `Week ${week} (${startDate.toLocaleDateString()}–${endDate.toLocaleDateString()})`;
    const option = new Option(label, week);
    weekSelect.appendChild(option);
  });

  weekSelect.addEventListener('change', () => {
    populateTeamsForWeek(weekSelect.value);
  });

  function getMatchupOption(matchup, isHomeTeam) {
    if (!matchup || !matchup.home || !matchup.away) {
      return { value: '', label: 'Invalid matchup' };
    }
    const team = isHomeTeam ? matchup.home : matchup.away;
    const opp = isHomeTeam ? matchup.away : matchup.home;
    const location = isHomeTeam ? 'vs' : '@';

    return {
      value: team,
      label: `${team} (${location} ${opp})`
    };
  }

  function populateTeamsForWeek(week) {
    teamSelect.innerHTML = '';
    const games = schedule[week];
    if (!games || !Array.isArray(games)) return;

    const teamsAdded = new Set();

    games.forEach(game => {
      [true, false].forEach(isHome => {
        const { value, label } = getMatchupOption(game, isHome);
        if (!value || teamsAdded.has(value)) return;

        const option = new Option(label, value);
        const isUsed = userUsedTeams.includes(value.toLowerCase());

        if (isUsed) {
          option.disabled = true;
          option.style.textDecoration = 'line-through';
          option.style.color = 'gray';
        }

        teamSelect.appendChild(option);
        teamsAdded.add(value);
      });
    });
  }

  // 🔄 Submit pick using Netlify function (no iframe required)
  document.getElementById('pickForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const week = weekSelect.value;
    const team = teamSelect.value;
    if (!week || !team) return;

    try {
      const res = await fetch('https://nflsgl.netlify.app/.netlify/functions/submitPick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, week, team })
      });

      const result = await res.json();

      if (res.ok) {
        confirmBox.textContent = '✅ Pick submitted successfully!';
        confirmBox.style.color = 'green';
        confirmBox.style.display = 'block';
      } else {
        confirmBox.textContent = `⚠️ Error: ${result.error || 'Failed to submit pick'}`;
        confirmBox.style.color = 'red';
        confirmBox.style.display = 'block';
      }

      setTimeout(() => {
        confirmBox.style.display = 'none';
      }, 4000);
    } catch (err) {
      console.error('Submission error:', err);
      confirmBox.textContent = '⚠️ Failed to submit pick. Please try again.';
      confirmBox.style.color = 'red';
      confirmBox.style.display = 'block';
    }
  });
});
