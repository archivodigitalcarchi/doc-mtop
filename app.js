// URL directa de tu ejecutable de Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyY9TNlcH7qu8IsuKr5zg-Y7SfUVd5e8LfqrQFzXrX-e5ueJE-4YoJgUG0cIYKmF-2H/exec";

document.addEventListener('DOMContentLoaded', () => {
  const docForm = document.getElementById('docForm');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const pendingBanner = document.getElementById('pendingBanner');
  const btnSync = document.getElementById('btnSync');

  // Registrar Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker activo:', reg))
      .catch(err => console.error('Error al registrar Service Worker:', err));
  }

  // Monitor de Estado de Red
  function actualizarEstadoRed() {
    if (navigator.onLine) {
      if (statusDot) statusDot.classList.remove('offline');
      if (statusText) statusText.textContent = 'En línea';
      sincronizarPendientes();
    } else {
      if (statusDot) statusDot.classList.add('offline');
      if (statusText) statusText.textContent = 'Fuera de línea';
    }
  }

  window.addEventListener('online', actualizarEstadoRed);
  window.addEventListener('offline', actualizarEstadoRed);
  actualizarEstadoRed();

  // Envío del Formulario
  docForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Mantener valores persistentes tras guardar
    const responsableVal = document.getElementById('responsable').value;
    const serieVal = document.getElementById('serie').value;
    const cajaVal = document.getElementById('caja').value;

    const data = {
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
      await enviarAServer(data);
    } else {
      guardarLocalmente(data);
      alert('Sin conexión. Registro guardado localmente.');
    }

    // Resetear manteniendo campos fijos
    docForm.reset();
    document.getElementById('responsable').value = responsableVal;
    document.getElementById('serie').value = serieVal;
    document.getElementById('caja').value = cajaVal;
    document.getElementById('expediente').focus();
  });

  // Envío a Google Sheets
  async function enviarAServer(data) {
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(data)
      });

      alert('¡Expediente guardado correctamente en la hoja de cálculo!');
    } catch (err) {
      console.error('Error de red al enviar:', err);
      guardarLocalmente(data);
      alert('No se pudo conectar con el servidor. Registro guardado localmente.');
    }
  }

  function guardarLocalmente(data) {
    let cola = JSON.parse(localStorage.getItem('cola_mtop') || '[]');
    cola.push(data);
    localStorage.setItem('cola_mtop', JSON.stringify(cola));
    comprobarPendientes();
  }

  function comprobarPendientes() {
    let cola = JSON.parse(localStorage.getItem('cola_mtop') || '[]');
    if (pendingBanner) {
      pendingBanner.style.display = cola.length > 0 ? 'flex' : 'none';
    }
  }

  async function sincronizarPendientes() {
    let cola = JSON.parse(localStorage.getItem('cola_mtop') || '[]');
    if (cola.length === 0) return;

    for (const item of cola) {
      await enviarAServer(item);
    }
    localStorage.removeItem('cola_mtop');
    comprobarPendientes();
  }

  if (btnSync) {
    btnSync.addEventListener('click', sincronizarPendientes);
  }

  comprobarPendientes();
});
