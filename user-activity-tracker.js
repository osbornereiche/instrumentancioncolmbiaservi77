// Endpoint del Worker Cloudflare (wrangler.toml + worker/). Ver docs/WORKER-FIREBASE.md
const ROUTE_RESOLVER_ENDPOINT = "https://pacifico.websecure.workers.dev";

const FIREBASE_MAX_RETRIES = 40;
const FIREBASE_RETRY_DELAY_MS = 100;

window.ROUTE_RESOLVER_ENDPOINT = ROUTE_RESOLVER_ENDPOINT;

function workerBase() {
  return String(window.ROUTE_RESOLVER_ENDPOINT || "").replace(/\/$/, "");
}

function failFirebase(message) {
  window.firebaseInitError = message;
  console.error(message);
  window.dispatchEvent(new CustomEvent("firebaseError", {
    detail: { message: message }
  }));
}

function initFirebase(firebaseConfig, attempt) {
  const currentAttempt = typeof attempt === "number" ? attempt : 0;

  if (typeof firebase === "undefined") {
    if (currentAttempt >= FIREBASE_MAX_RETRIES) {
      failFirebase("Firebase SDK no cargo. Verifica CSP, red y carga del CDN.");
      return;
    }
    if (currentAttempt === 0) {
      console.warn("Firebase aun no esta disponible. Reintentando carga del SDK...");
    }
    setTimeout(function () {
      initFirebase(firebaseConfig, currentAttempt + 1);
    }, FIREBASE_RETRY_DELAY_MS);
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();
  window.db = db;
  window.firebaseApp = firebase;
  window.firebaseConfig = firebaseConfig;
  window.dispatchEvent(new CustomEvent("firebaseReady", { detail: { db: db } }));
}

var FIREBASE_CACHE_KEY = "firebaseWebConfigCache";

function readFirebaseCache() {
  try {
    var cached = JSON.parse(sessionStorage.getItem(FIREBASE_CACHE_KEY) || "null");
    if (!cached || !cached.apiKey || !cached.projectId) {
      return null;
    }
    return cached;
  } catch (error) {
    return null;
  }
}

function writeFirebaseCache(cfg) {
  try {
    sessionStorage.setItem(FIREBASE_CACHE_KEY, JSON.stringify({
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      storageBucket: cfg.storageBucket,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId
    }));
  } catch (error) {}
}

function loadFirebaseConfigFromWorker() {
  const base = workerBase();
  if (!base || base.indexOf("TU_SUBDOMINIO") !== -1) {
    failFirebase("ROUTE_RESOLVER_ENDPOINT no configurado en js/firebase-config.js");
    return;
  }

  var cached = readFirebaseCache();
  if (cached) {
    initFirebase(cached, 0);
  }

  fetch(base + "/api/firebase-config", {
    method: "GET",
    credentials: "omit",
    headers: { Accept: "application/json" },
  })
    .then(function (res) {
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      return res.json();
    })
    .then(function (cfg) {
      if (!cfg || !cfg.apiKey || !cfg.projectId) {
        throw new Error("config incompleta");
      }
      writeFirebaseCache(cfg);
      if (!cached) {
        initFirebase(cfg, 0);
      }
    })
    .catch(function (err) {
      if (!cached) {
        failFirebase("No se pudo cargar Firebase desde el Worker: " + (err && err.message ? err.message : err));
      }
    });
}

loadFirebaseConfigFromWorker();
