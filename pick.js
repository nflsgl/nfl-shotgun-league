document.addEventListener('DOMContentLoaded', async () => {
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
  const confirmBox = document.getElementById('confirmBox');

  let userUsedTeams = [];

  try {
    const res = await fetch(`https://script.google.com/macros/s/AKfycbxlxW1BRCg03ScwtukXcWrUsEh_59j9gzAhoXbjzU_DMHFLwJe_ngVDHS9LntUhYVcy/exec?username=${encodeURIComponent(user.toLowerCase())}`);
    const allPicks = await res.json();
    console.log('RAW picks data from server:', allPicks);

    const filtered = allPicks.filter(
      row => row.username && row.username.toLowerCase() === user.toLowerCase()
    );
    userUsedTeams = filtered.map(row => row.team?.toLowerCase?.()).filter(Boolean);
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

  // Create hidden iframe for form target
  const iframe = document.createElement('iframe');
  iframe.name = 'hiddenFrame';
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  iframe.onload = () => {
    confirmBox.textContent = '✅ Pick submitted successfully!';
    confirmBox.style.color = 'green';
    confirmBox.style.display = 'block';
    setTimeout(() => {
      confirmBox.style.display = 'none';
    }, 3000);
  };

  document.getElementById('pickForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const week = weekSelect.value;
    const team = teamSelect.value;
    if (!week || !team) return;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://script.google.com/macros/s/AKfycbxlxW1BRCg03ScwtukXcWrUsEh_59j9gzAhoXbjzU_DMHFLwJe_ngVDHS9LntUhYVcy/exec';
    form.target = 'hiddenFrame';

    const uInput = document.createElement('input');
    uInput.type = 'hidden';
    uInput.name = 'username';
    uInput.value = user;

    const wInput = document.createElement('input');
    wInput.type = 'hidden';
    wInput.name = 'week';
    wInput.value = week;

    const tInput = document.createElement('input');
    tInput.type = 'hidden';
    tInput.name = 'team';
    tInput.value = team;

    form.appendChild(uInput);
    form.appendChild(wInput);
    form.appendChild(tInput);

    document.body.appendChild(form);
    form.submit();
  });
});
