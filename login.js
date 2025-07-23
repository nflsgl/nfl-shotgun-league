
const users = {'aaronb': 'honda', 'alecb': 'ford', 'bradd': 'chevy', 'bradg': 'toyota', 'bradh': 'nissan', 'brianm': 'jeep', 'caln': 'mazda', 'carterb': 'volvo', 'chuckp': 'dodge', 'davidh': 'buick', 'hunter': 'subaru', 'ianf': 'tesla', 'jacobg': 'fiat', 'jimc': 'gmc', 'joeo': 'bmw', 'josha': 'audi', 'justing': 'vw', 'miked': 'ram', 'mikek': 'lincoln', 'mitchm': 'cadillac', 'nickp': 'hyundai', 'rileyb': 'kia', 'ryanl': 'mini', 'taylorh': 'jaguar', 'timb': 'landrover', 'tomw': 'mitsubishi', 'trevorc': 'infiniti', 'zachw': 'porsche'};

document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const username = document.getElementById("username").value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const password = document.getElementById("password").value.toLowerCase().trim();
  const correct = users[username];

  if (password === correct) {
    localStorage.setItem("user", username);
    window.location.href = "home.html";
  } else {
    document.getElementById("errorMsg").textContent = "Incorrect username or password.";
  }
});
