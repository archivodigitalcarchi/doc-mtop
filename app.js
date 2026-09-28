// URL de Web App de Google Apps Script (Reemplazar con la URL publicada)
const SCRIPT_URL = 'https://script.google.com/macros/s/TU_SCRIPT_ID_AQUI/exec';

// Registro del Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker registrado correctamente'))
    .catch(err => console.error('Error al registrar Service Worker:', err));
}

// Elementos del DOM
const docForm = document.getElementById('docForm');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const pendingBanner = document.getElementById('pendingBanner');
const pendingText = document.getElementById('pendingText');
const btnSync = document.getElementById('btnSync');

// Monitoreo de Conexión
function checkOnlineStatus() {
  if (navigator.onLine) {
    statusDot.classList.add('online');
    statusText.textContent = 'En línea (Sincronización activa)';
    syncPendingData();
  } else {
    statusDot.classList.remove('online');
    statusText.textContent = 'Sin conexión (Modo Offline activo)';
  }
  updatePendingUI();
}

window.addEventListener('online', checkOnlineStatus);
window.addEventListener('offline', checkOnlineStatus);

// Manejo de almacenamiento local (IndexedDB)
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MTOP_InventarioDB', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('registros')) {
        db.createObjectStore('registros', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveRecordLocally(data) {
  const db = await openDB();
  const tx = db.transaction('registros', 'readwrite');
  const store = tx.objectStore('registros');
  await store.add({ data, timestamp: new Date().getTime() });
  updatePendingUI();
}

async function getPendingRecords() {
  const db = await openDB();
  const tx = db.transaction('registros', 'readonly');
  const store = tx.objectStore('registros');
  return new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

async function clearPendingRecords() {
  const db = await openDB();
  const tx = db.transaction('registros', 'readwrite');
  const store = tx.objectStore('registros');
  await store.clear();
  updatePendingUI();
}

async function updatePendingUI() {
  const pending = await getPendingRecords();
  if (pending.length > 0) {
    pendingBanner.style.display = 'flex';
    pendingText.textContent = `Hay ${pending.length} registro(s) guardado(s) localmente pendiente(s) de envío.`;
  } else {
    pendingBanner.style.display = 'none';
  }
}

// Envío de datos al Servidor
async function sendDataToServer(data) {
  return fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}

// Envío del Formulario
docForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Preservar valores persistentes (Responsable, Serie y Caja)
  const responsableVal = document.getElementById('responsable').value;
  const serieVal = document.getElementById('serie').value;
  const cajaVal = document.getElementById('caja').value;

  const formData = {
    responsable: responsableVal,
    serie: serieVal,
    subserie: document.getElementById('subserie').value,
    caja: cajaVal,
    expediente: document.getElementById('expediente').value,
    descripcion: document.getElementById('descripcion').value,
    numeroDocumento: document.getElementById('numeroDocumento').value,
    fechaApertura: document.getElementById('fechaApertura').value,
    fechaCierre: document.getElementById('fechaCierre').value,
    fojas: document.getElementById('fojas').value,
    tomos: document.getElementById('tomos').value,
    destinoFinal: document.getElementById('destinoFinal').value,
    original: document.getElementById('original').checked ? 'X' : '',
    copia: document.getElementById('copia').checked ? 'X' : '',
    cd: document.getElementById('cd').checked ? 'X' : '',
    bloque: document.getElementById('bloque').value,
    estanteria: document.getElementById('estanteria').value,
    cajaUbicacion: document.getElementById('cajaUbicacion').value
  };

  if (navigator.onLine) {
    try {
      await sendDataToServer(formData);
      alert('¡Expediente guardado correctamente!');
    } catch (err) {
      console.warn('Error al enviar. Guardando localmente:', err);
      await saveRecordLocally(formData);
      alert('Guardado en la memoria del dispositivo (Modo Offline). Se enviará al reconectarse.');
    }
  } else {
    await saveRecordLocally(formData);
    alert('Guardado en la memoria del dispositivo (Sin conexión). Se enviará al reconectarse.');
  }

  // Resetear formulario manteniendo Responsable, Serie y Caja
  docForm.reset();
  document.getElementById('responsable').value = responsableVal;
  document.getElementById('serie').value = serieVal;
  document.getElementById('caja').value = cajaVal;
  
  // Enfocar en Expediente para continuar la carga rápida
  document.getElementById('expediente').focus();
});

// Sincronización Manual/Automática
async function syncPendingData() {
  if (!navigator.onLine) return;

  const pending = await getPendingRecords();
  if (pending.length === 0) return;

  try {
    for (const record of pending) {
      await sendDataToServer(record.data);
    }
    await clearPendingRecords();
    alert('¡Registros guardados en local sincronizados con éxito!');
  } catch (err) {
    console.error('Error durante la sincronización:', err);
  }
}

btnSync.addEventListener('click', syncPendingData);

// Inicialización
checkOnlineStatus();
