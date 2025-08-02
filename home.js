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

  const currentPickDiv = document.getElementById('currentPick');
  const pastPicksDiv = document.getElementById('pastPicks');

  try {
    const res = await fetch(`/.netlify/functions/fetchUserPicks?username=${encodeURIComponent(user)}`);
    const picks = await res.json();

    if (!Array.isArray(picks)) throw new Error('Picks not in array format');

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

    // Show current week's pick
    const thisWeekPick = picks.find(p => p.week == currentWeek);
    currentPickDiv.innerHTML = thisWeekPick
      ? `<div class="pick-entry">
            <img class="team-logo" src="/logos/${thisWeekPick.team.toLowerCase().replace(/\s/g, '')}.png">
            <span>Week ${currentWeek}: ${thisWeekPick.team}</span>
         </div>`
      : `<div class="pick-entry">No pick submitted yet for Week ${currentWeek}</div>`;

    // Show past picks (excluding current week)
    const pastPicks = picks
      .filter(p => parseInt(p.week) < parseInt(currentWeek))
      .sort((a, b) => parseInt(a.week) - parseInt(b.week));

    pastPicksDiv.innerHTML = '<h3>Past Picks</h3>';
    if (pastPicks.length === 0) {
      pastPicksDiv.innerHTML += '<div>No past picks.</div>';
    } else {
      for (const pick of pastPicks) {
        const div = document.createElement('div');
        div.className = 'pick-entry';

        const logo = document.createElement('img');
        logo.className = 'team-logo';
        logo.src = `/logos/${pick.team.toLowerCase().replace(/\s/g, '')}.png`;

        const label = document.createElement('span');
        label.textContent = `Week ${pick.week}: ${pick.team}`;

        div.appendChild(logo);
        div.appendChild(label);
        pastPicksDiv.appendChild(div);
      }
    }
  } catch (err) {
    console.error('Error loading picks:', err);
    currentPickDiv.textContent = '⚠️ Error loading your pick.';
    pastPicksDiv.textContent = '';
  }
});
