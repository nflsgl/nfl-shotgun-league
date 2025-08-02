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

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/index.html';
  });

  const picksList = document.getElementById('picksList');

  try {
    const res = await fetch('/.netlify/functions/fetchUserPicks');
    const data = await res.json();

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

    const thisWeekPicks = data
      .filter(p => p.week == currentWeek)
      .sort((a, b) => a.username.localeCompare(b.username));

    if (thisWeekPicks.length === 0) {
      picksList.textContent = 'No picks submitted yet.';
      return;
    }

    picksList.innerHTML = '';
    for (const pick of thisWeekPicks) {
      const div = document.createElement('div');
      div.className = 'pick-entry';

      const logo = document.createElement('img');
      logo.className = 'team-logo';
      const logoName = pick.team.toLowerCase().replace(/\s/g, '');
      logo.src = `/logos/${logoName}.png`; // Ensure you have logos named correctly

      div.appendChild(logo);
      div.append(`${pick.username}: ${pick.team}`);
      picksList.appendChild(div);
    }

  } catch (err) {
    console.error('Failed to load picks:', err);
    picksList.textContent = 'Error loading picks.';
  }
});
