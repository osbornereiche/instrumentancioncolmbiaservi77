(function (global) {
  'use strict';

  function apiBase() {
    var base = global.ROUTE_RESOLVER_ENDPOINT || '';
    return String(base).replace(/\/$/, '');
  }

  var ROUTE_CACHE_KEY = 'routeResolverCache';

  function readRouteCache() {
    try {
      var cached = JSON.parse(global.sessionStorage.getItem(ROUTE_CACHE_KEY) || '{}');
      return cached && typeof cached === 'object' ? cached : {};
    } catch (error) {
      return {};
    }
  }

  function rememberRoute(page, url) {
    if (!page || !url) {
      return;
    }
    try {
      var cached = readRouteCache();
      cached[String(page)] = url;
      global.sessionStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(cached));
    } catch (error) {}
  }

  function resolveRoute(page, docId) {
    var base = apiBase();
    if (!page || !docId || !base) {
      return Promise.resolve(null);
    }

    var cachedUrl = readRouteCache()[String(page)];
    if (cachedUrl) {
      return Promise.resolve({ url: cachedUrl });
    }

    var endpoint = base + '/api/route?page=' +
      encodeURIComponent(page) + '&docId=' + encodeURIComponent(docId);

    return fetch(endpoint, {
      method: 'GET',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    }).then(function (res) {
      if (!res.ok) {
        return null;
      }
      return res.json();
    }).then(function (data) {
      if (!data || !data.url) {
        return null;
      }
      rememberRoute(page, data.url);
      return data;
    }).catch(function (err) {
      console.warn('RouteResolver: no se pudo resolver la ruta', err);
      return null;
    });
  }

  function applyRedirect(targetPage, docId, normalizePathFn) {
    var normalizePath = normalizePathFn || function (url) { return url; };
    var location = global.location;

    return resolveRoute(targetPage, docId).then(function (route) {
      if (!route || !route.url) {
        return { ok: false };
      }

      var currentFile = normalizePath(location.pathname);
      var targetFile = normalizePath(route.url);

      if (route.url.indexOf('http') === 0) {
        location.href = route.url;
        return { ok: true, redirected: true };
      }
      if (targetFile === currentFile) {
        return { ok: true, redirected: false, samePage: true };
      }
      location.href = route.url;
      return { ok: true, redirected: true };
    });
  }

  global.RouteResolver = {
    resolve: resolveRoute,
    applyRedirect: applyRedirect
  };
})(window);
