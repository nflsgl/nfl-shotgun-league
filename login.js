
const users = {
  aaronb: "honda",
  alecb: "ford",
  bradd: "chevy",
  bradg: "toyota",
  bradh: "nissan",
  brianm: "jeep",
  caln: "mazda",
  carterb: "volvo",
  chuckp: "dodge",
  davidh: "buick",
  hunter: "subaru",
  ianf: "tesla",
  jacobg: "fiat",
  jimc: "gmc",
  joeo: "bmw",
  josha: "audi",
  justing: "vw",
  miked: "ram",
  mikek: "lincoln",
  mitchm: "cadillac",
  nickp: "hyundai",
  rileyb: "kia",
  ryanl: "mini",
  taylorh: "jaguar",
  timb: "landrover",
  tomw: "mitsubishi",
  trevorc: "infiniti",
  zachw: "porsche"
};

document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("username").value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const passwordInput = document.getElementById("password").value.toLowerCase().trim();
  const correctPassword = users[usernameInput];

  if (passwordInput === correctPassword) {
    localStorage.setItem("user", usernameInput);
    window.location.href = "home.html";
  } else {
    document.getElementById("errorMsg").textContent = "Incorrect username or password.";
  }
});
