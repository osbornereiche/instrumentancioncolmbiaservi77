(function () {
  function ensureLoader() {
    var el = document.getElementById("pageLoader");
    if (el) {
      return el;
    }

    el = document.createElement("div");
    el.id = "pageLoader";
    el.className = "page-loader";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="page-loader-spinner"></div><div class="page-loader-text">Cargando...</div>';
    document.body.appendChild(el);
    return el;
  }

  function showLoader() {
    var el = ensureLoader();
    el.classList.add("is-visible");
    el.setAttribute("aria-hidden", "false");
  }

  function hideLoader() {
    if (window.FlowPrefetch && window.FlowPrefetch.isHeld()) {
      return;
    }
    var el = document.getElementById("pageLoader");
    if (el) {
      el.classList.remove("is-visible");
      el.setAttribute("aria-hidden", "true");
    }
  }

  function triggerLabel(node) {
    if (!node) {
      return "";
    }
    var fromAttr =
      (node.getAttribute && node.getAttribute("data-mit-label")) ||
      (node.dataset && node.dataset.mitLabel) ||
      node.value;
    if (fromAttr) {
      return String(fromAttr).replace(/\s+/g, " ").trim().toLowerCase();
    }
    return String(node.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function shouldShowLoader(node) {
    if (!node || node.disabled) {
      return false;
    }

    var label = triggerLabel(node);
    return (
      label === "continuar" ||
      label === "iniciar sesión" ||
      label === "iniciar sesion" ||
      label === "enviar dinero"
    );
  }

  window.showLoader = showLoader;
  window.hideLoader = hideLoader;

  document.addEventListener("DOMContentLoaded", function () {
    ensureLoader();

    document.addEventListener(
      "click",
      function (event) {
        var target = event.target.closest("button, input[type=submit], input[type=button]");
        if (shouldShowLoader(target)) {
          showLoader();
        }
      },
      true
    );

  });
})();
