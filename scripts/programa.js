
const db = firebase.database();
let userId = null;

const readyBtn = document.getElementById('readyBtn');
const restartBtn = document.getElementById('restartBtn');
const statusDiv = document.getElementById('status');
const roleDiv = document.getElementById('role');

// Autenticación anónima
firebase.auth().signInAnonymously().then(userCredential => {
  userId = userCredential.user.uid;
  console.log('Usuario anónimo con uid:', userId);
  db.ref(`players/${userId}`).set({ ready: false });
});

// btn listo
readyBtn.addEventListener('click', () => {
  if (userId) {
    console.log('Usuario listo:', userId);
    db.ref(`players/${userId}`).update({ ready: true });
  }
});

// btn reinicio
restartBtn.addEventListener('click', () => {
  console.log('Reiniciando juego...');
  db.ref('players').remove();
  db.ref('roles').remove();
  roleDiv.innerText = '';
  statusDiv.innerText = 'Esperando jugadores...';
});

// cambios en los jugadores
db.ref('players').on('value', snapshot => {
  const players = snapshot.val() || {};
  const playerIds = Object.keys(players);
  const total = playerIds.length;
  const readyCount = playerIds.filter(id => players[id].ready).length;

  console.log(`Jugadores conectados: ${total}, listos: ${readyCount}`);
  statusDiv.innerText = `Jugadores listos: ${readyCount} / ${total}`;

  if (total > 1 && readyCount === total) {
    console.log('Todos listos, asignando roles...');
    asignarRoles(playerIds);
  }
});

// Asignar roles
function asignarRoles(playerIds) {
  db.ref('roles').once('value').then(snapshot => {
    if (snapshot.exists()) {
      console.log('Roles ya fueron asignados, no se vuelve a asignar.');
      return;
    }

    const impostorIndex = Math.floor(Math.random() * playerIds.length);
    const jugadorAsignado = jugadorAleatorio();

    console.log('Asignando jugador a todos:', jugadorAsignado);
    console.log('Impostor será el jugador en el índice:', impostorIndex);

    playerIds.forEach((id, index) => {
      const rol = (index === impostorIndex) ? 'Impostor' : 'Jugador';
      db.ref(`roles/${id}`).set({
        role: rol,
        name: jugadorAsignado
      }).then(() => {
        console.log(`Rol asignado a ${id}: ${rol} (${jugadorAsignado})`);
      }).catch(err => {
        console.error(`Error asignando rol a ${id}:`, err);
      });
    });
  });
}

// Mostrar el rol
db.ref(`roles`).on('value', snapshot => {
  const roles = snapshot.val();
  if (roles && userId && roles[userId]) {
    const { role, name } = roles[userId];
    console.log('Tu rol fue asignado:', role, name);
    roleDiv.innerText = `Tu rol: ${role}\nJugador asignado: ${name}`;
  } else {
    console.log('Aún no se asignó rol para este usuario');
  }
});

// jugadores de fútbol momentanea (cambiaremos a bd)
function jugadorAleatorio() {
  const jugadores = ['Messi', 'Cristiano Ronaldo', 'Mbappé', 'Haaland', 'Neymar', 'Modric', 'Griezmann'];
  const indice = Math.floor(Math.random() * jugadores.length);
  return jugadores[indice];
}
