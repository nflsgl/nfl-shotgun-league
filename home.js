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

  const currentPickBox = document.getElementById('currentPick');
  const pastPicksBox = document.getElementById('pastPicks');

  const teamLogoMap = {
    "Cardinals": "cardinals",
    "Falcons": "falcons",
    "Ravens": "ravens",
    "Bills": "bills",
    "Panthers": "panthers",
    "Bears": "bears",
    "Bengals": "bengals",
    "Browns": "browns",
    "Cowboys": "cowboys",
    "Broncos": "broncos",
    "Lions": "lions",
    "Packers": "packers",
    "Texans": "texans",
    "Colts": "colts",
    "Jaguars": "jaguars",
    "Chiefs": "chiefs",
    "Raiders": "raiders",
    "Chargers": "chargers",
    "Rams": "rams",
    "Dolphins": "dolphins",
    "Vikings": "vikings",
    "Patriots": "patriots",
    "Saints": "saints",
    "Giants": "giants",
    "Jets": "jets",
    "Eagles": "eagles",
    "Steelers": "steelers",
    "49ers": "49ers",
    "Seahawks": "seahawks",
    "Buccaneers": "buccaneers",
    "Titans": "titans",
    "Commanders": "commanders"
  };

  try {
    const res = await fetch(`/.netlify/functions/fetchUserPicks?username=${encodeURIComponent(user)}`);
    const picks = await res.json();

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

    // Show current pick
    const thisWeekPick = picks.find(p => p.week == currentWeek);
    if (thisWeekPick) {
      currentPickBox.innerHTML = `
        <p>You have selected <strong>${thisWeekPick.team}</strong> for Week ${currentWeek}.</p>
        <p>If you want to change your pick, press <a href="pick.html">Submit Pick</a> and re-submit for this week.</p>
        <p>Your pick will lock at kickoff (or Sunday at 1 pm).</p>
      `;
    } else {
      currentPickBox.innerHTML = `
        <p>You have not yet submitted a pick for Week ${currentWeek}.</p>
        <p>Head to <a href="pick.html">Submit Pick</a> to make your selection.</p>
      `;
    }

    // Show prior picks
    const past = picks.filter(p => p.week < currentWeek).sort((a, b) => a.week - b.week);
    pastPicksBox.innerHTML = '';
    if (past.length === 0) {
      pastPicksBox.textContent = 'No picks from previous weeks.';
    } else {
      past.forEach(p => {
        const div = document.createElement('div');
        div.className = 'pick-entry';

        const logo = document.createElement('img');
        logo.className = 'team-logo';
        const logoKey = teamLogoMap[p.team] || p.team.toLowerCase();
        logo.src = `/logos/${logoKey}.png`;
        logo.alt = p.team;

        const text = document.createElement('span');
        text.textContent = `Week ${p.week}: ${p.team}`;

        div.appendChild(logo);
        div.appendChild(text);
        pastPicksBox.appendChild(div);
      });
    }
  } catch (err) {
    console.error('Error loading picks:', err);
    currentPickBox.textContent = '⚠️ Failed to load current pick.';
    pastPicksBox.textContent = '';
  }
});
