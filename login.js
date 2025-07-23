
const players = {'Aaron B.': 'honda', 'Alec B.': 'ford', 'Brad D.': 'chevy', 'Brad G.': 'toyota', 'Brad H.': 'nissan', 'Brian M.': 'jeep', 'Cal N.': 'mazda', 'Carter B.': 'volvo', 'Chuck P.': 'dodge', 'David H.': 'buick', 'Hunter': 'subaru', 'Ian F.': 'tesla', 'Jacob G.': 'fiat', 'Jim C.': 'gmc', 'Joe O.': 'bmw', 'Josh A.': 'audi', 'Justin G.': 'vw', 'Mike D.': 'ram', 'Mike K.': 'lincoln', 'Mitch M.': 'cadillac', 'Nick P.': 'hyundai', 'Riley B.': 'kia', 'Ryan L.': 'mini', 'Taylor H.': 'jaguar', 'Tim B.': 'landrover', 'Tom W.': 'mitsubishi', 'Trevor C.': 'infiniti', 'Zach W.': 'porsche'};

document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const user = document.getElementById("username").value.trim();
  const pw = document.getElementById("password").value.toLowerCase().trim();
  const correct = players[user];

  if (pw === correct) {
    localStorage.setItem("user", user);
    window.location.href = "pick.html";
  } else {
    document.getElementById("errorMsg").textContent = "Incorrect password.";
  }
});
