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
  const confirmBox = document.getElementById('confirmBox');
  let usedTeams = [];

  async function loadUsedTeams() {
    try {
      const res = await fetch(`/.netlify/functions/fetchUserPicks?username=${encodeURIComponent(user)}`);
      const picks = await res.json();
      console.log("User picks:", picks);
      usedTeams = picks.map(p => p.team.toLowerCase());
      console.log("Used teams for user:", usedTeams);
    } catch (err) {
      console.error("Error fetching used teams:", err);
      usedTeams = [];
    }
  }

  // Auto-select current week
  const today = new Date();
  let currentWeek = null;
  for (const [week, games] of Object.entries(schedule)) {
    for (const game of games) {
      const gameDate = new Date(game.date);
      if (today <= gameDate) {
        currentWeek = week;
        break;
      }
    }
    if (currentWeek) break;
  }
  if (!currentWeek) currentWeek = Object.keys(schedule).pop();
  weekSelect.value = currentWeek;

  function populateTeamsForWeek(week) {
    teamSelect.innerHTML = '<option value="">-- Choose a team --</option>';
    const matchups = schedule[week] || [];
    const teamOptions = [];

    matchups.forEach(game => {
      [game.home, game.away].forEach(team => {
        const opp = team === game.home ? game.away : game.home;
        const location = team === game.home ? 'vs' : '@';
        const label = `${team} (${location} ${opp})`;
        const alreadyUsed = usedTeams.includes(team.toLowerCase());

        teamOptions.push({
          value: team,
          label: alreadyUsed ? `❌ ${label}` : label,
          disabled: alreadyUsed
        });
      });
    });

    // Sort alphabetically by value (team name)
    teamOptions.sort((a, b) => a.value.localeCompare(b.value));

    teamOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.disabled) {
        option.disabled = true;
        option.style.color = "#aaa";
        option.style.textDecoration = "line-through";
      }
      teamSelect.appendChild(option);
    });
  }

  await loadUsedTeams();
  populateTeamsForWeek(weekSelect.value);

  weekSelect.addEventListener('change', () => {
    populateTeamsForWeek(weekSelect.value);
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const week = weekSelect.value;
    const team = teamSelect.value;

    if (!week || !team) {
      alert("Please select both a week and a team.");
      return;
    }

    try {
      const res = await fetch('/.netlify/functions/submitPick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, week, team })
      });

      const result = await res.json();
      if (res.ok) {
        confirmBox.style.display = 'block';
        confirmBox.textContent = `✅ Pick submitted: ${team} for Week ${week}`;
        form.reset();
        weekSelect.value = currentWeek;

        // Re-fetch and reload picks
        await loadUsedTeams();
        populateTeamsForWeek(currentWeek);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("⚠️ Error: " + err.message);
    }
  });
});
