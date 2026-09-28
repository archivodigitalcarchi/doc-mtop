// URL directa de tu ejecutable de Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyY9TNlcH7qu8IsuKr5zg-Y7SfUVd5e8LfqrQFzXrX-e5ueJE-4YoJgUG0cIYKmF-2H/exec";

let enviando = false;

document.addEventListener('DOMContentLoaded', () => {
  const docForm = document.getElementById('docForm');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const pendingBanner = document.getElementById('pendingBanner');
  const btnSync = document.getElementById('btnSync');

  // 1. REGISTRO DEL SERVICE WORKER
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker activo:', reg))
      .catch(err => console.error('Error Service Worker:', err));
  }

  // 2. DETECTOR DE RED EN TIEMPO REAL (ONLINE / OFFLINE)
  function actualizarEstadoRed() {
    if (navigator.onLine) {
      if (statusDot) statusDot.classList.remove('offline');
      if (statusText) statusText.textContent = 'En línea';
      procesarCola(); // Intenta sincronizar automáticamente al volver la red
    } else {
      if (statusDot) statusDot.classList.add('offline');
      if (statusText) statusText.textContent = 'Fuera de línea';
    }
  }

  window.addEventListener('online', actualizarEstadoRed);
  window.addEventListener('offline', actualizarEstadoRed);
  actualizarEstadoRed();

  // 3. CAPTURA DEL FORMULARIO Y GUARDADO INMEDIATO
  docForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Mantener Responsable, Serie y Caja para agilizar el llenado continuo
    const responsableVal = document.getElementById('responsable').value;
    const serieVal = document.getElementById('serie').value;
    const cajaVal = document.getElementById('caja').value;

    const registro = {
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

    // Almacenamiento seguro e inmediato en LocalStorage
    let cola = JSON.parse(localStorage.getItem('cola_mtop') || '[]');
    cola.push(registro);
    localStorage.setItem('cola_mtop', JSON.stringify(cola));

    // Refrescar estado visual de la cola y disparar envío asíncrono
    actualizarBanner();
    procesarCola();

    // Resetear formulario manteniendo campos persistentes
    docForm.reset();
    document.getElementById('responsable').value = responsableVal;
    document.getElementById('serie').value = serieVal;
    document.getElementById('caja').value = cajaVal;
    document.getElementById('expediente').focus();
  });

  // 4. MOTOR DE SINCRONIZACIÓN EN SEGUNDO PLANO
  async function procesarCola() {
    if (enviando || !navigator.onLine) return;

    let cola = JSON.parse(localStorage.getItem('cola_mtop') || '[]');
    if (cola.length === 0) return;

    enviando = true;

    while (cola.length > 0 && navigator.onLine) {
      const item = cola[0];
      try {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(item)
        });

        // Remover de la cola local tras confirmar envío
        cola.shift();
        localStorage.setItem('cola_mtop', JSON.stringify(cola));
        actualizarBanner();
      } catch (err) {
        console.error('Error enviando registro a Google Sheets:', err);
        break; // Detener bucle si falla la conexión temporalmente
      }
    }

    enviando = false;
  }

  // 5. BANNER VISUAL DE REGISTROS PENDIENTES
  function actualizarBanner() {
    let cola = JSON.parse(localStorage.getItem('cola_mtop') || '[]');
    if (pendingBanner) {
      if (cola.length > 0) {
        pendingBanner.style.display = 'flex';
        const pendingText = document.getElementById('pendingText');
        if (pendingText) {
          pendingText.textContent = `Sincronizando ${cola.length} registro(s) pendiente(s)...`;
        }
      } else {
        pendingBanner.style.display = 'none';
      }
    }
  }

  if (btnSync) {
    btnSync.addEventListener('click', procesarCola);
  }

  actualizarBanner();
  procesarCola();
});
