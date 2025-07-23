
document.addEventListener('DOMContentLoaded', function () {
  const user = sessionStorage.getItem('username');
  if (!user) {
    window.location.href = 'index.html'; // redirect if not logged in
    return;
  }

  const weekSelect = document.getElementById('week');
  const teamSelect = document.getElementById('team');
  const form = document.getElementById('pickForm');

  const allPicks = JSON.parse(localStorage.getItem('allPicks')) || {};
  const userPicks = allPicks[user] || {};

  // Hide used teams from dropdown (Week 1 only for now)
  const usedTeams = Object.values(userPicks);
  for (const option of [...teamSelect.options]) {
    if (usedTeams.includes(option.value)) {
      option.disabled = true;
      option.textContent += ' (already used)';
    }
  }

  // Prefill if pick exists for this week
  const selectedWeek = weekSelect.value;
  if (userPicks[selectedWeek]) {
    teamSelect.value = userPicks[selectedWeek];
  }

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

    // Show confirmation
    form.innerHTML = `
      <h3>✅ Pick recorded!</h3>
      <p><strong>${team}</strong> has been submitted for Week ${week}.</p>
      <button onclick="window.location.reload()">Make Another Pick</button>
    `;
  });
});
