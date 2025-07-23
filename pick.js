document.addEventListener('DOMContentLoaded', function () {
  const user = localStorage.getItem('user');
  const loginTime = parseInt(localStorage.getItem('loginTime'), 10);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (!user || !loginTime || now - loginTime > oneHour) {
    localStorage.clear();
    window.location.href = 'index.html';
    return;
  }

  const weekSelect = document.getElementById('week');
  const teamSelect = document.getElementById('team');
  const form = document.getElementById('pickForm');

  const allPicks = JSON.parse(localStorage.getItem('allPicks')) || {};
  const userPicks = allPicks[user] || {};

  // Hide used teams
  const usedTeams = Object.values(userPicks);
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
