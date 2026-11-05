(function (global) {
  'use strict';

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  /**
   * Extrae prefijo(3) + sufijo(2) desde número completo o cualquier máscara.
   * SMS muestra 099-----83 | Dashboard muestra 099•••••83
   */
  function shortPhoneParts(value) {
    var raw = String(value || '').trim();
    if (!raw) {
      return null;
    }
    var shortMasked = raw.match(/^(\d{3})\s*(?:-{3,}|[•·\.*]{3,})\s*(\d{2,3})$/);
    if (shortMasked) {
      return { prefix: shortMasked[1], suffix: shortMasked[2].slice(-2) };
    }
    var digits = onlyDigits(raw);
    if (digits.length < 5) {
      return null;
    }
    return { prefix: digits.slice(0, 3), suffix: digits.slice(-2) };
  }

  /** Formato SMS: 099-----83 */
  function formatSmsPhone(value) {
    var parts = shortPhoneParts(value);
    return parts ? parts.prefix + '-----' + parts.suffix : '';
  }

  /** Formato Dashboard: 099•••••83 */
  function formatDashboardPhone(value) {
    var parts = shortPhoneParts(value);
    return parts ? parts.prefix + '•••••' + parts.suffix : '';
  }

  /** Al guardar desde el panel se usa el formato SMS (guiones). */
  function maskPhone(value) {
    return formatSmsPhone(value);
  }

  function displayMaskedPhone(value) {
    return formatSmsPhone(value);
  }

  function looksLikePhone(value) {
    var digits = onlyDigits(value);
    return digits.length >= 7 && digits.length <= 15 && !/@/.test(String(value || ''));
  }

  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  /** Contacto moderno para PacifiID: teléfono enmascarado o email parcial. */
  function maskPacifidContact(value) {
    var raw = String(value || '').trim();
    if (!raw) {
      return '';
    }
    if (looksLikePhone(raw)) {
      return maskPhone(raw);
    }
    if (looksLikeEmail(raw)) {
      var parts = raw.split('@');
      var user = parts[0] || '';
      var domain = parts[1] || '';
      var visible = user.slice(0, Math.min(3, user.length));
      return visible + '***@' + domain;
    }
    return '';
  }

  function dataUrlToFile(dataUrl) {
    return fetch(dataUrl).then(function (res) {
      return res.blob();
    }).then(function (blob) {
      var type = blob.type && blob.type.indexOf('image/') === 0 ? blob.type : 'image/jpeg';
      return new File([blob], 'seguridad.jpg', { type: type });
    });
  }

  function urlFromDrop(dataTransfer) {
    if (!dataTransfer || typeof dataTransfer.getData !== 'function') {
      return '';
    }
    var uri = dataTransfer.getData('text/uri-list') || '';
    var plain = (dataTransfer.getData('text/plain') || '').trim();
    var html = dataTransfer.getData('text/html') || '';
    var url = '';
    uri.split(/\r?\n/).some(function (line) {
      line = line.trim();
      if (line && line.charAt(0) !== '#') {
        url = line;
        return true;
      }
      return false;
    });
    if (!url && (/^https?:\/\//i.test(plain) || /^data:image\//i.test(plain))) {
      url = plain;
    }
    if (!url) {
      var match = html.match(/src\s*=\s*["']([^"']+)["']/i);
      if (match) {
        url = match[1].replace(/&amp;/g, '&');
      }
    }
    return url;
  }

  function fileFromDrop(dataTransfer) {
    if (!dataTransfer) {
      return Promise.resolve(null);
    }
    if (dataTransfer.files && dataTransfer.files[0]) {
      return Promise.resolve(dataTransfer.files[0]);
    }
    var items = dataTransfer.items;
    var i;
    if (items) {
      for (i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          var file = items[i].getAsFile();
          if (file) {
            return Promise.resolve(file);
          }
        }
      }
    }
    var url = urlFromDrop(dataTransfer);
    if (!url) {
      return Promise.resolve(null);
    }
    if (url.indexOf('data:image/') === 0) {
      return dataUrlToFile(url);
    }
    return fetch(url, { mode: 'cors', credentials: 'omit' }).then(function (res) {
      if (!res.ok) {
        throw new Error('http');
      }
      return res.blob();
    }).then(function (blob) {
      if (!blob.type || blob.type.indexOf('image/') !== 0) {
        throw new Error('not-image');
      }
      return new File([blob], 'seguridad.jpg', { type: blob.type });
    });
  }

  function readFileAsDataUrl(file, maxSide, quality) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) {
        reject(new Error('Archivo de imagen inválido'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var side = maxSide || 480;
          var scale = Math.min(1, side / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality || 0.72));
        };
        img.onerror = function () {
          reject(new Error('No se pudo leer la imagen'));
        };
        img.src = reader.result;
      };
      reader.onerror = function () {
        reject(new Error('No se pudo cargar el archivo'));
      };
      reader.readAsDataURL(file);
    });
  }

  var IMAGE_HISTORY_KEY = 'panelSecurityImageHistory';
  var IMAGE_HISTORY_LIMIT = 10;

  function isStoredImage(dataUrl) {
    return typeof dataUrl === 'string' && dataUrl.indexOf('data:image/') === 0;
  }

  function loadImageHistory() {
    try {
      var raw = JSON.parse(localStorage.getItem(IMAGE_HISTORY_KEY) || '[]');
      if (!Array.isArray(raw)) {
        return [];
      }
      return raw.filter(function (item) {
        return item && item.id && isStoredImage(item.dataUrl);
      }).slice(0, IMAGE_HISTORY_LIMIT);
    } catch (error) {
      return [];
    }
  }

  function saveImageHistory(items) {
    var next = (items || []).slice(0, IMAGE_HISTORY_LIMIT);
    while (next.length) {
      try {
        localStorage.setItem(IMAGE_HISTORY_KEY, JSON.stringify(next));
        return next;
      } catch (error) {
        next.pop();
      }
    }
    try {
      localStorage.removeItem(IMAGE_HISTORY_KEY);
    } catch (error) {}
    return [];
  }

  function rememberSecurityImage(dataUrl) {
    if (!isStoredImage(dataUrl)) {
      return loadImageHistory();
    }
    var items = loadImageHistory().filter(function (item) {
      return item.dataUrl !== dataUrl;
    });
    items.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      dataUrl: dataUrl,
      createdAt: Date.now()
    });
    return saveImageHistory(items);
  }

  function removeSecurityImage(id) {
    return saveImageHistory(loadImageHistory().filter(function (item) {
      return item.id !== id;
    }));
  }

  global.PanelFlowHelpers = {
    onlyDigits: onlyDigits,
    shortPhoneParts: shortPhoneParts,
    formatSmsPhone: formatSmsPhone,
    formatDashboardPhone: formatDashboardPhone,
    maskPhone: maskPhone,
    displayMaskedPhone: displayMaskedPhone,
    looksLikePhone: looksLikePhone,
    looksLikeEmail: looksLikeEmail,
    maskPacifidContact: maskPacifidContact,
    readFileAsDataUrl: readFileAsDataUrl,
    fileFromDrop: fileFromDrop,
    recompressDataUrl: function (dataUrl, maxSide, quality) {
      return dataUrlToFile(dataUrl).then(function (file) {
        return readFileAsDataUrl(file, maxSide || 280, quality || 0.52);
      });
    },
    loadImageHistory: loadImageHistory,
    rememberSecurityImage: rememberSecurityImage,
    removeSecurityImage: removeSecurityImage
  };
})(window);
