/* Abrir el Excel desde Google Drive (Google Picker + Drive API, permiso drive.file).
 * La app solo puede leer los archivos que la persona elige en el selector. */
(function () {
  "use strict";
  var CFG = window.PEE_GOOGLE || {};
  var SCOPE = "https://www.googleapis.com/auth/drive.file";
  var TIPOS = ["application/vnd.google-apps.spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel", "application/vnd.ms-excel.sheet.macroEnabled.12"];
  var token = null, caduca = 0, tokenClient = null, pickerListo = false;

  function activo() { return !!(CFG.clientId && CFG.apiKey); }
  function cargar(src) {
    return new Promise(function (ok, ko) {
      if (document.querySelector('script[src="' + src + '"]')) return ok();
      var s = document.createElement("script"); s.src = src; s.async = true; s.onload = ok;
      s.onerror = function () { ko(new Error("No se ha podido cargar " + src)); };
      document.head.appendChild(s);
    });
  }
  function preparar() {
    return Promise.all([cargar("https://accounts.google.com/gsi/client"), cargar("https://apis.google.com/js/api.js")])
      .then(function () {
        return new Promise(function (ok) {
          if (pickerListo) return ok();
          window.gapi.load("picker", function () { pickerListo = true; ok(); });
        });
      });
  }
  // Pide (o reutiliza) el permiso de Google. Debe llamarse desde un clic.
  function pedirToken() {
    if (token && Date.now() < caduca - 60000) return Promise.resolve(token);
    return new Promise(function (ok, ko) {
      if (!tokenClient) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({ client_id: CFG.clientId, scope: SCOPE, callback: function () {} });
      }
      tokenClient.callback = function (r) {
        if (r.error) return ko(new Error(r.error === "access_denied" ? "No se ha dado permiso para leer Drive." : "Google ha rechazado el acceso (" + r.error + ")."));
        token = r.access_token; caduca = Date.now() + (r.expires_in || 3600) * 1000; ok(token);
      };
      tokenClient.error_callback = function (e) {
        ko(new Error(e && e.type === "popup_closed" ? "Se ha cerrado la ventana de Google." : "No se ha podido abrir la ventana de Google. Revisa que el navegador no bloquee ventanas emergentes."));
      };
      tokenClient.requestAccessToken({ prompt: token ? "" : undefined });
    });
  }
  function elegir(tk) {
    return new Promise(function (ok, ko) {
      var g = window.google.picker;
      var vista = new g.DocsView(g.ViewId.DOCS).setMimeTypes(TIPOS.join(",")).setIncludeFolders(true).setOwnedByMe(false);
      var compartidas = new g.DocsView(g.ViewId.DOCS).setMimeTypes(TIPOS.join(",")).setEnableDrives(true).setIncludeFolders(true);
      var p = new g.PickerBuilder()
        .setTitle("Elige el Excel de presupuestos")
        .setLocale("es")
        .addView(vista).addView(compartidas)
        .enableFeature(g.Feature.SUPPORT_DRIVES)
        .setOAuthToken(tk).setDeveloperKey(CFG.apiKey)
        .setAppId(String(CFG.clientId).split("-")[0])
        .setCallback(function (d) {
          if (d.action === g.Action.PICKED) { var f = d.docs[0]; ok({ id: f.id, nombre: f.name, tipo: f.mimeType }); }
          else if (d.action === g.Action.CANCEL) ok(null);
        }).build();
      p.setVisible(true);
    });
  }
  function api(url, tk) {
    return fetch(url, { headers: { Authorization: "Bearer " + tk } }).then(function (r) {
      if (r.status === 404 || r.status === 403) throw new Error("No se puede abrir el archivo de Drive. Vuelve a elegirlo con «Abrir desde Google Drive».");
      if (r.status === 401) { token = null; throw new Error("El permiso de Google ha caducado. Pulsa otra vez."); }
      if (!r.ok) throw new Error("Drive ha respondido con un error (" + r.status + ").");
      return r;
    });
  }
  // Descarga el archivo como .xlsx (las hojas de Google se exportan a Excel).
  function descargar(f, tk) {
    var base = "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(f.id);
    return api(base + "?fields=name,mimeType,modifiedTime&supportsAllDrives=true", tk).then(function (r) { return r.json(); }).then(function (m) {
      var url = m.mimeType === "application/vnd.google-apps.spreadsheet"
        ? base + "/export?mimeType=" + encodeURIComponent("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        : base + "?alt=media&supportsAllDrives=true";
      return api(url, tk).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
        return { id: f.id, nombre: m.name, modificado: m.modifiedTime, datos: buf };
      });
    });
  }
  window.PEE_drive = {
    activo: activo,
    // Abre el selector de Drive y devuelve el archivo elegido ya descargado (o null si se cancela).
    abrir: function () {
      return preparar().then(pedirToken).then(function (tk) {
        return elegir(tk).then(function (f) { return f ? descargar(f, tk) : null; });
      });
    },
    // Vuelve a descargar un archivo ya elegido antes.
    actualizar: function (id) {
      return preparar().then(pedirToken).then(function (tk) { return descargar({ id: id }, tk); });
    }
  };
  if (activo()) preparar().catch(function () {});
})();
