// CONFIGURACIÓN DE CONEXIÓN
const API_URL = 'AQUÍ_VA_TU_URL_DE_APPS_SCRIPT'; // Coloca tu URL desplegada de Google Apps Script
const TOKEN = 'mtop2026';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('documentForm') || document.querySelector('form');
  
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Capturar elemento digitador (compatible si se llama 'digitador' o 'comp_responsable')
      const digitadorInput = document.getElementById('digitador') || document.getElementById('comp_responsable');
      
      // Mapeo completo de datos del formulario
      const payload = {
        token: TOKEN,
        digitador: digitadorInput ? digitadorInput.value.trim() : '',
        serie: getVal('serie'),
        subserie: getVal('subserie'),
        caja: getVal('caja'),
        expediente: getVal('expediente'),
        descripcion: getVal('descripcion'),
        numeroDocumento: getVal('numeroDocumento') || getVal('numero_documento'),
        fechaApertura: getVal('fechaApertura') || getVal('fecha_apertura'),
        fechaCierre: getVal('fechaCierre') || getVal('fecha_cierre'),
        fojas: getVal('fojas'),
        tomos: getVal('tomos'),
        destinoFinal: getVal('destinoFinal') || getVal('destino_final'),
        original: getCheck('original'),
        copia: getCheck('copia'),
        cd: getCheck('cd'),
        bloque: getVal('bloque'),
        estanteria: getVal('estanteria'),
        cajaUbicacion: getVal('cajaUbicacion') || getVal('caja_ubicacion')
      };

      // Validación rápida en consola para verificar qué se está enviando
      console.log('Enviando datos a la API:', payload);

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          mode: 'no-cors', // Evita bloqueo CORS al enviar a Google Apps Script
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        alert('¡Registro guardado correctamente!');
        form.reset();
      } catch (error) {
        console.error('Error al enviar los datos:', error);
        alert('Ocurrió un error al guardar el registro.');
      }
    });
  }
});

// Funciones auxiliares para obtener valores de campos de forma segura
function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function getCheck(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}
