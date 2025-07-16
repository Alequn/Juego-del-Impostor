const firebaseConfig = {
  apiKey: "AIzaSyBITsUwjILxL--fI-VIJf3EFmqJHhNVS-U",
  authDomain: "jugadoresaleatorios-e7c76.firebaseapp.com",
  databaseURL: "https://jugadoresaleatorios-e7c76-default-rtdb.firebaseio.com",
  projectId: "jugadoresaleatorios-e7c76",
  storageBucket: "jugadoresaleatorios-e7c76.appspot.com",
  messagingSenderId: "688515212678",
  appId: "1:688515212678:web:021467f83c0393d28c7807",
  measurementId: "G-TMELDNZPY8"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();

let userId = null;
let userName = null;
let salaCode = "1";
let isLeader = false;

const loginDiv = document.getElementById("loginDiv");
const salaDiv = document.getElementById("salaDiv");
const nameInput = document.getElementById("nameInput");
const entrarBtn = document.getElementById("entrarBtn");
const salaCodeDisplay = document.getElementById("salaCodeDisplay");
const miembrosList = document.getElementById("miembrosList");
const statusDiv = document.getElementById("status");
const countdownDiv = document.getElementById("countdown");
const roleText = document.getElementById("roleText");
const playerName = document.getElementById("playerName");
const playerImg = document.getElementById("playerImg");
const iniciarBtn = document.getElementById("iniciarBtn");
const reiniciarBtn = document.getElementById("reiniciarBtn");
const tipoJuegoSelect = document.getElementById("tipoJuegoSelect");
const tipoJuegoLabel = document.getElementById("tipoJuegoLabel");

entrarBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Ingresa un nombre válido");

  userName = name;

  const auth = firebase.auth();
  const cred = await auth.signInAnonymously();
  userId = cred.user.uid;

  const playerRef = db.ref(`salas/${salaCode}/players/${userId}`);
  const playersSnapshot = await db.ref(`salas/${salaCode}/players`).once("value");
  const players = playersSnapshot.val() || {};

  isLeader = Object.keys(players).length === 0;

  await playerRef.set({ name: userName, leader: isLeader });
  playerRef.onDisconnect().remove();

  salaCodeDisplay.innerText = salaCode;
  loginDiv.style.display = "none";
  salaDiv.style.display = "block";

  escucharSala();
});

function escucharSala() {
  const playersRef = db.ref(`salas/${salaCode}/players`);
  const gameStateRef = db.ref(`salas/${salaCode}/gameState`);

  playersRef.on("value", (snap) => {
    const players = snap.val() || {};
    if (Object.keys(players).length === 0) {
      db.ref(`salas/${salaCode}`).remove();
      return;
    }
    actualizarLista(players);
  });

  gameStateRef.on("value", (snap) => {
    const state = snap.val();
    if (!state) {
      countdownDiv.innerText = "";
      statusDiv.innerText = "";
      roleText.innerText = "";
      playerName.innerText = "";
      playerImg.style.display = "none";
      return;
    }

    if (state.countdown !== undefined && state.countdown > 0) {
      countdownDiv.innerText = `Partida inicia en: ${state.countdown} seg`;
    } else {
      countdownDiv.innerText = "";
    }

    if (state.started && state.roles) {
      mostrarRol(state);
    }
  });
}

function actualizarLista(players) {
  miembrosList.innerHTML = "";
  Object.entries(players).forEach(([id, p]) => {
    const li = document.createElement("li");
    let label = p.name;
    if (p.leader) label += " (Líder)";
    li.textContent = label;
    miembrosList.appendChild(li);
  });

  iniciarBtn.style.display = isLeader ? "inline-block" : "none";
  reiniciarBtn.style.display = isLeader ? "inline-block" : "none";
  tipoJuegoSelect.style.display = isLeader ? "inline-block" : "none";
  tipoJuegoLabel.style.display = isLeader ? "inline" : "none";
}

iniciarBtn.addEventListener("click", async () => {
  const playersSnap = await db.ref(`salas/${salaCode}/players`).once("value");
  const players = playersSnap.val();
  const ids = Object.keys(players || {});
  if (ids.length < 2) return alert("Mínimo 2 jugadores para comenzar.");

  let roles = {};
  const impostorId = ids[Math.floor(Math.random() * ids.length)];
  let detectiveId;
  do {
    detectiveId = ids[Math.floor(Math.random() * ids.length)];
  } while (detectiveId === impostorId);

  ids.forEach(id => {
    roles[id] = id === impostorId ? "Impostor" : (id === detectiveId ? "Detective" : "Civil");
  });

  let dataUrl;
  if(tipoJuegoSelect.value === "jugadores") {
    dataUrl = "./json/jugadores.json";
  } else if(tipoJuegoSelect.value === "clubes") {
    dataUrl = "./json/clubes.json";
  } else {
    dataUrl = "./json/selecciones.json";
  }

  const res = await fetch(dataUrl);
  const items = await res.json();
  const elegido = items[Math.floor(Math.random() * items.length)];

  await db.ref(`salas/${salaCode}/gameState`).set({
    countdown: 5,
    started: false,
    jugador: elegido,
    roles: roles
  });

  let counter = 5;
  const interval = setInterval(async () => {
    counter--;
    if (counter > 0) {
      await db.ref(`salas/${salaCode}/gameState`).update({ countdown: counter });
    } else {
      clearInterval(interval);
      await db.ref(`salas/${salaCode}/gameState`).update({
        countdown: 0,
        started: true
      });
    }
  }, 1000);
});

reiniciarBtn.addEventListener("click", async () => {
  await db.ref(`salas/${salaCode}/gameState`).remove();
});

async function mostrarRol(state) {
  const rol = state.roles[userId];
  roleText.innerText = `Tu rol es: ${rol}`;

  if (rol === "Impostor") {
    playerName.innerText = "Debes descubrir al jugador sin pistas.";
    playerImg.style.display = "none";
  } else {
    playerName.innerText = `Jugador: ${state.jugador.name}`;
    playerImg.src = state.jugador.photo;
    playerImg.style.display = "block";
  }
}


const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
let width, height;
let particles = [];
const maxParticles = 80;
const maxDist = 120;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}

class Particle {
  constructor() {
    this.x = random(0, width);
    this.y = random(0, height);
    this.vx = random(-0.3, 0.3);
    this.vy = random(-0.3, 0.3);
    this.radius = random(1.5, 3);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > width) this.vx = -this.vx;
    if (this.y < 0 || this.y > height) this.vy = -this.vy;
  }

  draw() {
    ctx.beginPath();
    ctx.fillStyle = "rgba(100, 181, 246, 0.7)"; // celeste claro
    ctx.shadowColor = "rgba(100, 181, 246, 0.8)";
    ctx.shadowBlur = 4;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function connectParticles() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      let dx = particles[i].x - particles[j].x;
      let dy = particles[i].y - particles[j].y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(100, 181, 246, ${(1 - dist / maxDist) * 0.4})`;
        ctx.lineWidth = 1;
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  connectParticles();
  requestAnimationFrame(animate);
}

function initParticles() {
  particles = [];
  for (let i = 0; i < maxParticles; i++) {
    particles.push(new Particle());
  }
}

window.addEventListener("resize", () => {
  resize();
  initParticles();
});

resize();
initParticles();
animate();
