/**
 * Pa Eso Estamos · conexión entre la app de gastos y esta hoja de Google.
 *
 * 1. Cambia la contraseña de la línea CLAVE.
 * 2. Implementar > Nueva implementación > Aplicación web.
 *    Ejecutar como: Yo. Quién tiene acceso: Cualquier usuario.
 * 3. Copia la dirección que termina en /exec y pégala en la app (Ajustes).
 */
const CLAVE = "cambia-esta-clave";
const HOJA = "Movimientos";
const CAMPOS = ["id", "fecha", "linea", "categoria", "concepto", "importe", "ejemplo"];
const TITULOS = ["ID", "Fecha", "Línea", "Categoría", "Concepto", "Importe", "Ejemplo"];
const LINEAS = ["Ingresos", "Coste de ventas", "Personal", "Gastos operativos", "Gastos fijos",
  "Amortizaciones", "Gastos financieros", "Impuesto sobre beneficios"];

function doGet() {
  return ContentService.createTextOutput("Pa Eso Estamos: el script está activo.");
}

function doPost(e) {
  let salida;
  try {
    const p = JSON.parse(e.postData.contents);
    if (CLAVE === "cambia-esta-clave") salida = { ok: false, error: "clave_sin_cambiar" };
    else if (p.clave !== CLAVE) salida = { ok: false, error: "clave" };
    else {
      const candado = LockService.getScriptLock();
      candado.waitLock(25000);
      try { salida = ejecutar_(p); } finally { candado.releaseLock(); }
    }
  } catch (err) {
    salida = { ok: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(salida)).setMimeType(ContentService.MimeType.JSON);
}

function hoja_() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(HOJA);
  if (!h) h = libro.insertSheet(HOJA);
  if (h.getLastRow() === 0) {
    h.getRange(1, 1, 1, TITULOS.length).setValues([TITULOS]).setFontWeight("bold");
    h.setFrozenRows(1);
    const regla = SpreadsheetApp.newDataValidation().requireValueInList(LINEAS, true).setAllowInvalid(true).build();
    h.getRange(2, 3, h.getMaxRows() - 1, 1).setDataValidation(regla);
  }
  return h;
}

function ejecutar_(p) {
  const h = hoja_();
  if (p.accion === "listar") return { ok: true, movimientos: listar_(h) };
  if (p.accion === "guardar") { guardar_(h, p.items || []); return { ok: true }; }
  if (p.accion === "borrar") { borrar_(h, p.ids || []); return { ok: true }; }
  return { ok: false, error: "accion" };
}

function fecha_(v, zona) {
  return v instanceof Date ? Utilities.formatDate(v, zona, "yyyy-MM-dd") : String(v || "");
}

/** Devuelve todas las filas. A las que se han escrito a mano sin ID les pone uno. */
function listar_(h) {
  const ultima = h.getLastRow();
  if (ultima < 2) return [];
  const zona = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const datos = h.getRange(2, 1, ultima - 1, CAMPOS.length).getValues();
  const lista = [];
  datos.forEach(function (f, i) {
    if (f[1] === "" && f[5] === "") return;
    if (f[0] === "") {
      f[0] = Utilities.getUuid().slice(0, 12);
      h.getRange(i + 2, 1).setValue(f[0]);
    }
    lista.push({ id: String(f[0]), fecha: fecha_(f[1], zona), linea: f[2], categoria: f[3], concepto: f[4], importe: f[5], ejemplo: f[6] });
  });
  return lista;
}

function indice_(h) {
  const ultima = h.getLastRow();
  const mapa = {};
  if (ultima < 2) return mapa;
  h.getRange(2, 1, ultima - 1, 1).getValues().forEach(function (f, i) { if (f[0] !== "") mapa[String(f[0])] = i + 2; });
  return mapa;
}

function guardar_(h, items) {
  const mapa = indice_(h);
  const nuevas = [];
  items.forEach(function (m) {
    const fila = CAMPOS.map(function (c) { return m[c] === undefined || m[c] === null ? "" : m[c]; });
    fila[0] = String(m.id);
    if (mapa[fila[0]]) h.getRange(mapa[fila[0]], 1, 1, CAMPOS.length).setValues([fila]);
    else nuevas.push(fila);
  });
  if (nuevas.length) h.getRange(h.getLastRow() + 1, 1, nuevas.length, CAMPOS.length).setValues(nuevas);
}

function borrar_(h, ids) {
  const mapa = indice_(h);
  ids.map(function (id) { return mapa[String(id)]; })
    .filter(function (n) { return n; })
    .sort(function (a, b) { return b - a; })
    .forEach(function (n) { h.deleteRow(n); });
}
