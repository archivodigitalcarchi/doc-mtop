/**
 * FRONTEND APP — Sistema de Gestión Documental MTOP
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_REEMPLAZA_CON_TU_ID_AQUÍ/exec'; // Pon aquí tu URL de Apps Script
const TOKEN = 'mtop2026';

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const pendingBanner = document.getElementById('pendingBanner');
const pendingText = document.getElementById('pendingText');
const btnSync = document.getElementById('btnSync');
const form = document.getElementById('docForm');

function updateOnlineStatus() {
  if (navigator.onLine) {
    statusDot.classList.remove('offline');
    statusText.textContent = 'En línea';
    syncPendingData();
  } else {
    statusDot.classList.add('offline');
    statusText.textContent = 'Modo sin conexión (guardando localmente)';
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

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

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Captura de todos los datos permitiendo cualquier tipo de carácter
  const formData = {
    responsable: document.getElementById('responsable').value.trim(),
    serie: document.getElementById('serie').value.trim(),
    subserie: document.getElementById('subserie').value.trim(),
    caja: document.getElementById('caja').value.trim(),
    expediente: document.getElementById('expediente').value.trim(),
    descripcion: document.getElementById('descripcion').value.trim(),
    numeroDocumento: document.getElementById('numeroDocumento').value.trim(),
    fechaApertura: document.getElementById('fechaApertura').value.trim(),
    fechaCierre: document.getElementById('fechaCierre').value.trim(),
    fojas: document.getElementById('fojas').value.trim(),
    tomos: document.getElementById('tomos').value.trim(),
    destinoFinal: document.getElementById('destinoFinal').value.trim(),
    original: document.getElementById('original').checked,
    copia: document.getElementById('copia').checked,
    cd: document.getElementById('cd').checked,
    bloque: document.getElementById('bloque').value.trim(),
    estanteria: document.getElementById('estanteria').value.trim(),
    cajaUbicacion: document.getElementById('cajaUbicacion').value.trim()
  };

  if (navigator.onLine) {
    try {
      await sendData(formData);
      alert('Expediente guardado con éxito');
      form.reset();
    } catch (err) {
      savePendingData(formData);
      alert('Guardado localmente por problemas de red.');
      form.reset();
    }
  } else {
    savePendingData(formData);
    alert('Guardado en modo sin conexión.');
    form.reset();
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.error('Error SW:', err));
}
