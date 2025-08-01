document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');

  // Simple username-password map
  const users = {
    "aaronb": "honda",
    "alecb": "toyota",
    "bradd": "chevy",
    "bradg": "ford",
    "bradh": "mazda",
    "brianm": "nissan",
    "caln": "subaru",
    "carterb": "bmw",
    "chuckp": "audi",
    "davidh": "volvo",
    "hunter": "dodge",
    "ianf": "gmc",
    "jacobg": "jeep",
    "jimc": "lexus",
    "joseph": "buick",
    "joshua": "acura",
    "justing": "vw",
    "miked": "hyundai",
    "mikek": "kia",
    "mitchm": "ram",
    "nickp": "tesla",
    "rileyb": "pontiac",
    "ryanl": "cadillac",
    "taylorh": "infiniti",
    "timb": "lincoln",
    "tomw": "chrysler",
    "trevorc": "mini",
    "zachw": "fiat"
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const usernameInput = document.getElementById('username').value.toLowerCase().replace(/\s/g, '');
    const passwordInput = document.getElementById('password').value.toLowerCase();

    if (users[usernameInput] === passwordInput) {
      localStorage.setItem('user', usernameInput);
      localStorage.setItem('loginTime', Date.now());
      window.location.href = 'home.html';
    } else {
      errorMsg.textContent = 'Invalid login idiot. Try again.';
    }
  });
});
