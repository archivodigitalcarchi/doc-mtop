// URL de tu Google Apps Script (Sustituye con la tuya si la cambiaste)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx.../exec"; 

document.addEventListener('DOMContentLoaded', () => {
  const docForm = document.getElementById('docForm');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const pendingBanner = document.getElementById('pendingBanner');
  const btnSync = document.getElementById('btnSync');

  // REGISTRO DEL SERVICE WORKER
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado:', reg))
      .catch(err => console.error('Error al registrar SW:', err));
  }

  // DETECCIÓN DE CONEXIÓN EN TIEMPO REAL
  function actualizarEstadoRed() {
    if (navigator.onLine) {
      statusDot.classList.remove('offline');
      statusText.textContent = 'En línea';
      sincronizarPendientes();
    } else {
      statusDot.classList.add('offline');
      statusText.textContent = 'Fuera de línea';
    }
  }

  window.addEventListener('online', actualizarEstadoRed);
  window.addEventListener('offline', actualizarEstadoRed);
  actualizarEstadoRed();

  // GUARDAR FORMULARIO
  docForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
      timestamp: new Date().toISOString(),
      responsable: document.getElementById('responsable').value,
      serie: document.getElementById('serie').value,
      subserie: document.getElementById('subserie').value,
      caja: document.getElementById('caja').value,
      expediente: document.getElementById('expediente').value,
      descripcion: document.getElementById('descripcion').value,
      numeroDocumento: document.getElementById('numeroDocumento').value,
      fechaApertura: document.getElementById('fechaApertura').value,
      fechaCierre: document.getElementById('fechaCierre').value,
      fojas: document.getElementById('fojas').value,
      tomos: document.getElementById('tomos').value,
      destinoFinal: document.getElementById('destinoFinal').value,
      original: document.getElementById('original').checked ? 'SÍ' : 'NO',
      copia: document.getElementById('copia').checked ? 'SÍ' : 'NO',
      cd: document.getElementById('cd').checked ? 'SÍ' : 'NO',
      bloque: document.getElementById('bloque').value,
      estanteria: document.getElementById('estanteria').value,
      cajaUbicacion: document.getElementById('cajaUbicacion').value
    };

    if (navigator.onLine) {
      enviarAServer(data);
    } else {
      guardarLocalmente(data);
      alert('Sin conexión a Internet. El registro se guardó localmente y se enviará al reconectar.');
    }

    docForm.reset();
  });

  function enviarAServer(data) {
    fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(() => alert('¡Expediente guardado con éxito en la nube!'))
    .catch(err => {
      console.error('Error al enviar:', err);
      guardarLocalmente(data);
    });
  }

  function guardarLocalmente(data) {
    let cola = JSON.parse(localStorage.getItem('cola_mtop') || '[]');
    cola.push(data);
    localStorage.setItem('cola_mtop', JSON.stringify(cola));
    comprobarPendientes();
  }

  function comprobarPendientes() {
    let cola = JSON.parse(localStorage.getItem('cola_mtop') || '[]');
    if (cola.length > 0) {
      pendingBanner.style.display = 'flex';
    } else {
      pendingBanner.style.display = 'none';
    }
  }

  function sincronizarPendientes() {
    let cola = JSON.parse(localStorage.getItem('cola_mtop') || '[]');
    if (cola.length === 0) return;

    cola.forEach(item => enviarAServer(item));
    localStorage.removeItem('cola_mtop');
    comprobarPendientes();
  }

  if (btnSync) {
    btnSync.addEventListener('click', sincronizarPendientes);
  }

  comprobarPendientes();
});
