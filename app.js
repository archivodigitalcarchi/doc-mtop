/**
 * FRONTEND APP — Sistema de Gestión Documental MTOP
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_REEMPLAZA_CON_TU_ID_AQUÍ/exec'; // Pon aquí tu URL desplegada de Google Apps Script
const TOKEN = 'mtop2026';

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const pendingBanner = document.getElementById('pendingBanner');
const pendingText = document.getElementById('pendingText');
const btnSync = document.getElementById('btnSync');
const form = document.getElementById('docForm');

// Verificar estado de conexión
function updateOnlineStatus() {
  if (navigator.onLine) {
    statusDot.classList.remove('offline');
    statusText.textContent = 'En línea';
    syncPendingData();
  } else {
    statusDot.classList.add('offline');
    statusText.textContent = 'Modo sin conexión (datos se guardarán localmente)';
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// Manejo de IndexedDB / localStorage para envíos offline
function getPendingData() {
  const records = localStorage.getItem('mtop_pending_records');
  return records ? JSON.parse(records) : [];
}

function savePendingData(data) {
  const records = getPendingData();
  records.push(data);
  localStorage.setItem('mtop_pending_records', JSON.stringify(records));
  checkPendingRecords();
}

function checkPendingRecords() {
  const records = getPendingData();
  if (records.length > 0) {
    pendingBanner.style.display = 'flex';
    pendingText.textContent = `Hay ${records.length} registro(s) pendiente(s) de envío.`;
  } else {
    pendingBanner.style.display = 'none';
  }
}

checkPendingRecords();

// Función para enviar datos
async function sendData(data) {
  const payload = { ...data, token: TOKEN };
  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response;
}

// Sincronizar pendientes cuando se recupera internet
async function syncPendingData() {
  if (!navigator.onLine) return;
  const records = getPendingData();
  if (records.length === 0) return;

  btnSync.disabled = true;
  btnSync.textContent = 'Enviando...';

  const remaining = [];
  for (let item of records) {
    try {
      await sendData(item);
    } catch (e) {
      remaining.push(item);
    }
  }

  localStorage.setItem('mtop_pending_records', JSON.stringify(remaining));
  btnSync.disabled = false;
  btnSync.textContent = 'Sincronizar';
  checkPendingRecords();
}

btnSync.addEventListener('click', syncPendingData);

// Enviar Formulario
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
    serie: document.getElementById('serie').value,
    subserie: document.getElementById('subserie').value,
    caja: document.getElementById('caja').value,
    expediente: document.getElementById('expediente').value,
    descripcion: document.getElementById('descripcion').value,
    numeroDocumento: document.getElementById('numeroDocumento').value,
    fechaApertura: document.getElementById('fechaApertura').value,
    fechaCierre: document.getElementById('fechaCierre').value,
    fojas: document.getElementById('fojas').value,
    tomos: document.getElementById('tomos').value
  };

  if (navigator.onLine) {
    try {
      await sendData(formData);
      alert('Expediente guardado con éxito');
      form.reset();
    } catch (err) {
      savePendingData(formData);
      alert('No se pudo conectar con el servidor. Se guardó localmente para enviar después.');
      form.reset();
    }
  } else {
    savePendingData(formData);
    alert('Guardado localmente en modo sin conexión.');
    form.reset();
  }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.error('Error al registrar SW:', err));
}
