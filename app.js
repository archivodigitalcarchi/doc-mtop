// ============================================================
// CONFIGURACIÓN DE CONEXIÓN Y COLA OFFLINE
// ============================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbyY9TNIcH7qu8IsuKr5zg-Y7SfUVd5e8LfqrQFzXrX-e5ueJE-4YoJgUG0cIYKmF-2H/exec';
const TOKEN = 'mtop2026';

const QUEUE_KEY = 'doc_mtop_queue';

// ---- Listas de opciones ----
const SERIES = [
  'TH - TALENTO HUMANO', 'SG - SECRETARÍA GENERAL', 'TIC - TECNOLOGÍAS DE LA INFORMACIÓN',
  'FIN - FINANCIERO', 'JUR - JURÍDICO', 'PU - PROYECTOS URBANOS', 'PR - PROYECTOS RURALES',
  'DP - DIRECCIÓN PROVINCIAL', 'TS - TÉCNICO SOCIAL', 'T - TÉCNICO', 'C - CONTABILIDAD'
];

function fillSelect(id, values) {
  const el = document.getElementById(id);
  if (!el) return;
  values.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  });
}

function range(prefix, n) {
  return Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);
}

document.addEventListener('DOMContentLoaded', () => {
  fillSelect('serie', SERIES);
  fillSelect('bloque', range('B', 20));
  fillSelect('estanteria', range('EST', 20));
  fillSelect('cajaUbicacion', range('C', 20));

  updateStatus();
  updatePendingBadge();
  trySync();

  document.getElementById('form').addEventListener('submit', onSubmit);
});

window.addEventListener('online', () => { updateStatus(); trySync(); });
window.addEventListener('offline', updateStatus);
setInterval(trySync, 20000);

function updateStatus() {
  const dot = document.getElementById('statusDot');
  const label = document.getElementById('statusLabel');
  if (navigator.onLine) {
    if (dot) dot.classList.remove('offline');
    if (label) label.textContent = 'En línea';
  } else {
    if (dot) dot.classList.add('offline');
    if (label) label.textContent = 'Sin conexión — se guarda en este dispositivo';
  }
}

function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; }
  catch { return []; }
}
function setQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); updatePendingBadge(); }

function updatePendingBadge() {
  const q = getQueue();
  const badge = document.getElementById('pendingBadge');
  if (badge) {
    if (q.length > 0) {
      badge.textContent = `${q.length} pendiente${q.length > 1 ? 's' : ''} de enviar`;
      badge.classList.add('show');
    } else {
      badge.classList.remove('show');
    }
  }
}

function onSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  // CAPTURA DIRECTA FORZADA POR ID
  const digitadorInput = document.getElementById('digitador');
  const digitadorVal = digitadorInput ? digitadorInput.value.trim() : '';

  if (!digitadorVal || !form.serie.value || !form.caja.value) {
    showToast('Digitador, Serie y N° Caja son obligatorios', 'error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  // CONSTRUCCIÓN DEL REGISTRO PARA APPS SCRIPT
  const record = {
    token: TOKEN,
    digitador: digitadorVal.toUpperCase(),
    serie: (form.serie.value || '').toUpperCase(),
    subserie: (form.subserie.value || '').toUpperCase().trim(),
    caja: (form.caja.value || '').toUpperCase().trim(),
    expediente: (form.expediente.value || '').toUpperCase().trim(),
    descripcion: (form.descripcion.value || '').toUpperCase().trim(),
    numeroDocumento: (form.numeroDocumento.value || '').toUpperCase().trim(),
    fechaApertura: form.fechaApertura.value,
    fechaCierre: form.fechaCierre.value,
    fojas: (form.fojas.value || '').toUpperCase().trim(),
    tomos: (form.tomos.value || '').toUpperCase().trim(),
    destinoFinal: (form.destinoFinal.value || '').toUpperCase().trim(),
    original: form.original.checked,
    copia: form.copia.checked,
    cd: form.cd.checked,
    bloque: form.bloque.value,
    estanteria: form.estanteria.value,
    cajaUbicacion: form.cajaUbicacion.value,
    _localId: Date.now() + '-' + Math.random().toString(36).slice(2)
  };

  const q = getQueue();
  q.push(record);
  setQueue(q);

  // Mantiene el valor del digitador activo para no escribirlo en cada registro
  form.reset();
  if (digitadorInput) digitadorInput.value = digitadorVal;

  showToast('Expediente guardado. Puedes seguir con el siguiente.', 'success');

  if (submitBtn) submitBtn.disabled = false;

  trySync();
}

let syncing = false;
async function trySync() {
  if (syncing || !navigator.onLine) return;
  if (!API_URL || API_URL.indexOf('PEGA_AQUI') === 0) return;

  const q = getQueue();
  if (q.length === 0) return;

  syncing = true;

  while (getQueue().length > 0 && navigator.onLine) {
    const currentQueue = getQueue();
    const record = currentQueue[0];

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(record)
      });
      const data = await res.json();

      if (data.ok) {
        const updatedQueue = getQueue().filter(r => r._localId !== record._localId);
        setQueue(updatedQueue);
      } else {
        break;
      }
    } catch (err) {
      break;
    }
  }

  syncing = false;

  if (getQueue().length === 0 && q.length > 0) {
    showToast('Todos los expedientes pendientes se sincronizaron', 'success');
  }
}

let toastTimer;
function showToast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show ' + (type || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
