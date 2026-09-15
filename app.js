// ============================================================
// CONFIGURA ESTO cuando despliegues tu Apps Script como Web App
// ============================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbyY9TNIcH7qu8IsuKr5zg-Y7SfUVd5e8LfqrQFzXrX-e5ueJE-4YoJgUG0cIYKmF-2H/exec';
const TOKEN = 'mtop2026';// debe ser igual al TOKEN en Code.gs

const QUEUE_KEY = 'doc_mtop_queue';

// ---- Listas de opciones ----
const SERIES = [
  'TH - Talento Humano', 'SG - Secretaría General', 'TIC - Tecnologías de la Información',
  'FIN - Financiero', 'JUR - Jurídico', 'PU - Proyectos Urbanos', 'PR - Proyectos Rurales',
  'DP - Dirección Provincial', 'TS - Técnico Social', 'T - Técnico', 'C - Contabilidad'
];

function fillSelect(id, values) {
  const el = document.getElementById(id);
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
setInterval(trySync, 20000); // reintenta cada 20s por si acaso

function updateStatus() {
  const dot = document.getElementById('statusDot');
  const label = document.getElementById('statusLabel');
  if (navigator.onLine) {
    dot.classList.remove('offline');
    label.textContent = 'En línea';
  } else {
    dot.classList.add('offline');
    label.textContent = 'Sin conexión — se guarda en este dispositivo';
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
  if (q.length > 0) {
    badge.textContent = `${q.length} pendiente${q.length > 1 ? 's' : ''} de enviar`;
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

function onSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!form.serie.value || !form.caja.value) {
    showToast('Serie y N° Caja son obligatorios', 'error');
    return;
  }

  // Deshabilitar botón temporalmente para evitar doble clic accidental
  if (submitBtn) submitBtn.disabled = true;

  const record = {
    token: TOKEN,
    serie: form.serie.value,
    subserie: form.subserie.value,
    caja: form.caja.value,
    expediente: form.expediente.value,
    descripcion: form.descripcion.value,
    numeroDocumento: form.numeroDocumento.value,
    fechaApertura: form.fechaApertura.value,
    fechaCierre: form.fechaCierre.value,
    fojas: form.fojas.value,
    tomos: form.tomos.value,
    destinoFinal: form.destinoFinal.value,
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

  form.reset();
  showToast('Expediente guardado. Puedes seguir con el siguiente.', 'success');
  
  // Reactivar botón para el siguiente expediente
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

  // Procesamos un registro a la vez y actualizamos la cola inmediatamente
  while (getQueue().length > 0 && navigator.onLine) {
    const currentQueue = getQueue();
    const record = currentQueue[0]; // Tomamos el primer registro de la cola

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(record)
      });
      const data = await res.json();
      
      if (data.ok) {
        // ELIMINACIÓN INMEDIATA DEL REGISTRO EXITOSO:
        // Se vuelve a leer la cola por si cambió y se elimina el elemento enviado
        const updatedQueue = getQueue().filter(r => r._localId !== record._localId);
        setQueue(updatedQueue);
      } else {
        // Si el servidor respondió pero con error, detenemos el ciclo
        break;
      }
    } catch (err) {
      // Falla de red: detenemos la sincronización para reintentar después
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
  el.textContent = msg;
  el.className = 'toast show ' + (type || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
