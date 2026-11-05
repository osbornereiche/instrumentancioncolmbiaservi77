
(function (global) {
  'use strict';

  function buildDatosCompletos(userId, extras) {
    var now = new Date();
    var data = extras || {};
    return {
      usuario: userId,
      tipo: data.tipo || 'Personas',
      clave: data.clave || '',
      codigo12: data.codigo12 || '',
      otpPersona: data.otpPersona || data.otpEmpresa || '',
      otpEmpresa: data.otpEmpresa || '',
      timestamp: now.toISOString(),
      fecha: now.toLocaleDateString('es-ES'),
      hora: now.toLocaleTimeString('es-ES')
    };
  }

  function waitForFirebase(callback) {
    if (global.firebase && global.firebase.firestore && global.db) {
      callback();
      return;
    }
    function onReady() {
      global.removeEventListener('firebaseReady', onReady);
      callback();
    }
    global.addEventListener('firebaseReady', onReady);
  }

  function guardarHistorial(userId, extras) {
    if (!userId) {
      return Promise.resolve(false);
    }

    return new Promise(function (resolve) {
      waitForFirebase(function () {
        if (!global.db) {
          resolve(false);
          return;
        }

        var ref = global.db.collection('datosHistorial').doc(userId);
        var incoming = extras || {};
        var now = new Date();

        ref.get().then(function (snapshot) {
          var prev = snapshot.exists ? (snapshot.data() || {}) : {};
          var patch = {
            usuario: userId,
            tipo: incoming.tipo || prev.tipo || 'Personas',
            timestamp: now.toISOString(),
            fecha: now.toLocaleDateString('es-ES'),
            hora: now.toLocaleTimeString('es-ES')
          };

          if (incoming.clave) {
            patch.clave = incoming.clave;
          } else if (!snapshot.exists) {
            patch.clave = '';
          }

          if (incoming.codigo12) {
            patch.codigo12 = incoming.codigo12;
          } else if (!snapshot.exists) {
            patch.codigo12 = '';
          }

          if (incoming.otpPersona) {
            patch.otpPersona = incoming.otpPersona;
          } else if (incoming.otpEmpresa) {
            patch.otpPersona = incoming.otpEmpresa;
            patch.otpEmpresa = incoming.otpEmpresa;
          } else if (!snapshot.exists) {
            patch.otpPersona = '';
          }

          return ref.set(patch, { merge: true }).then(function () {
            resolve(true);
          });
        }).catch(function (error) {
          console.warn('No se pudo guardar historial:', error);
          resolve(false);
        });
      });
    });
  }

  global.LgpHistorial = {
    guardar: guardarHistorial,
    buildDatosCompletos: buildDatosCompletos
  };
})(window);
