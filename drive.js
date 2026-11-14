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
        return { id: f.id, nombre: m.name, modificado: m.modifiedTime, tipo: m.mimeType, datos: buf };
      });
    });
  }
  // Escribe la pestaña de ajustes de una hoja de Google (la crea si no existe).
  function escribirPestana(id, titulo, filas, tk) {
    var base = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(id);
    var rango = encodeURIComponent("'" + titulo + "'!A1:Z2000");
    var json = function (metodo, url, cuerpo) {
      return fetch(url, { method: metodo, headers: { Authorization: "Bearer " + tk, "Content-Type": "application/json" }, body: cuerpo ? JSON.stringify(cuerpo) : undefined })
        .then(function (r) {
          if (r.status === 401) { token = null; throw new Error("permiso"); }
          if (r.status === 403) return r.json().catch(function () { return {}; }).then(function (j) {
            var m = (j.error && j.error.message) || "";
            throw new Error(/has not been used|is disabled|SERVICE_DISABLED/i.test(m) ? "sheets_api" : "sin_permiso");
          });
          if (!r.ok) throw new Error("Google Sheets ha respondido con un error (" + r.status + ").");
          return r.json();
        });
    };
    return json("GET", base + "?fields=sheets.properties.title").then(function (d) {
      var existe = (d.sheets || []).some(function (s) { return s.properties.title === titulo; });
      return existe ? null : json("POST", base + ":batchUpdate", { requests: [{ addSheet: { properties: { title: titulo, tabColor: { red: 0.06, green: 0.42, blue: 0.36 } } } }] });
    }).then(function () {
      return json("POST", base + "/values/" + rango + ":clear", {});
    }).then(function () {
      return json("PUT", base + "/values/" + encodeURIComponent("'" + titulo + "'!A1") + "?valueInputOption=RAW", { values: filas });
    });
  }

  window.PEE_drive = {
    activo: activo,
    // ¿Hay permiso de Google vigente sin tener que pedirlo con un clic?
    conPermiso: function () { return !!(token && Date.now() < caduca - 60000); },
    // Guarda la pestaña de ajustes. Si el permiso ha caducado, hay que llamarla desde un clic.
    guardarAjustes: function (id, titulo, filas) {
      return preparar().then(pedirToken).then(function (tk) { return escribirPestana(id, titulo, filas, tk); });
    },
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
