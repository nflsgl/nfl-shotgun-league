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

  const form = document.getElementById('pickForm');
  const weekSelect = document.getElementById('week');
  const teamSelect = document.getElementById('team');

  // Fetch all existing picks (read-only)
  const picksCSV = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRv9PUKq_JE6dUMgdoDYFsOZESjh2jD2gK40wLKiYsrCp6WALkdKJsxJeJ8ylYnGQLwStKjlLGrXMX9/pub?output=csv')
    .then(res => res.text());

  const allPicks = {};
  picksCSV.trim().split('\n').slice(1).forEach(row => {
    const [username, week, team] = row.split(',');
    const uname = username.toLowerCase().trim();
    if (!allPicks[uname]) allPicks[uname] = {};
    allPicks[uname][week.trim()] = team.trim();
  });

  const userPicks = allPicks[user] || {};
  const usedTeams = Object.values(userPicks);

  // Disable used teams in the dropdown
  for (const option of [...teamSelect.options]) {
    if (usedTeams.includes(option.value)) {
      option.disabled = true;
      option.textContent += ' (already used)';
    }
  }

  // Pre-fill if a pick exists
  const selectedWeek = weekSelect.value;
  if (userPicks[selectedWeek]) {
    teamSelect.value = userPicks[selectedWeek];
  }

  // Handle form submission
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

      // Show confirmation
      form.innerHTML = `
        <h3>✅ ${result}</h3>
        <p><strong>${team}</strong> has been submitted for Week ${week}.</p>
        <button onclick="window.location.reload()">Make Another Pick</button>
      `;
    } catch (err) {
      alert("Failed to submit pick: " + err.message);
    }
  });
});
