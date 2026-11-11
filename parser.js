/* Lee un libro de presupuestos de eventos (una hoja por evento) y devuelve,
 * por cada hoja, el precio al cliente, el coste y el desglose por partidas.
 * Funciona en el navegador (window.PEE_parse) y en Node (module.exports). */
(function (root) {
  "use strict";
  var MESES = { ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5,
    jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9, septiembre: 9,
    oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12 };
  var FAMILIAS = [
    ["Espacio", /^alquiler$|alquiler (del )?espacio|localizaci|^espacio|venue|ubicaci|hotel/],
    ["Catering", /catering|comida|bebida|brunch|desayuno|coctel|cocktail|aperitiv|chef|cocina|coffee|smoothie|smothie|vino|menu/],
    ["Activaciones y talleres", /activaci|ativaci|actividad|taller|dinamica|workout|deporte|clase|experiencia|juego|station|zona|exposici|carrito|palomitas|ceremonia|product test/],
    ["Personal y staff", /staff|azafat|camarer|^personal|fee|\bdj\b|animador|monitor|fotograf|foto|video|maquillador|musica|founding|seguridad|convocatoria|influencer/],
    ["Producción y transporte", /produccion|montaje|transporte|transfer|logistic|furgo|envio|vuelo|coordinaci|audiovisual|maquina|ventilador|limpieza|permiso|options|costes extra/],
    ["Regalos y gifting", /regalo|gifting|goodie|merch|personaliza|charm|packaging/],
    ["Materiales y cartelería", /material|carteler|vinilo|imprenta|impresion|brandead|grafic|disen|camiseta|qr|poster|libro/],
    ["Decoración", /decoraci|styling|setting|sitting|mobiliario|photocall|floral|flores|flower|ambientaci|tocador|iluminaci|silla|cristal|celosia|hortensia|ranuncul|crisantem|mesa|set principal|entrada|salon/]
  ];

  function norm(s) {
    return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  }
  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : NaN;
    var s = String(v == null ? "" : v).replace(/[€\s ]/g, "");
    if (!s || /^#/.test(s)) return NaN;
    if (s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    var n = parseFloat(s);
    return isNaN(n) || !/^-?[\d.]+$/.test(s) ? NaN : n;
  }
  function familia(nombre) {
    var n = norm(nombre);
    for (var i = 0; i < FAMILIAS.length; i++) if (FAMILIAS[i][1].test(n)) return FAMILIAS[i][0];
    return "Otros";
  }
  function fecha(texto, anio) {
    var t = norm(texto).replace(/[.,]/g, " ");
    var m = t.match(/(\d{1,2})\s*(?:de\s+)?([a-z]{3,10})/);
    while (m) {
      var mes = MESES[m[2]];
      var d = +m[1];
      if (mes && d >= 1 && d <= new Date(Date.UTC(+anio, mes, 0)).getUTCDate()) return anio + "-" + (mes < 10 ? "0" : "") + mes + "-" + (d < 10 ? "0" : "") + d;
      t = t.slice(t.indexOf(m[0]) + m[0].length);
      m = t.match(/(\d{1,2})\s*(?:de\s+)?([a-z]{3,10})/);
    }
    return "";
  }
  function cliente(nombreHoja) {
    var s = String(nombreHoja).replace(/\b\d{1,2}\s*(?:de\s+)?[a-záéíóú]{3,10}\.?/gi, function (x) {
      return fecha(x, 2000) ? "" : x;
    });
    s = s.replace(/^(evento|accion|acción)\s+/i, "").replace(/[!.]+$/, "").replace(/\s+/g, " ").trim();
    if (!s) return String(nombreHoja).trim();
    return s.toLowerCase().split(" ").map(function (w) { return w.length > 2 || /\d/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w; }).join(" ")
      .replace(/^./, function (c) { return c.toUpperCase(); });
  }

  /* Analiza una hoja convertida a filas (array de arrays). */
  function hoja(nombre, filas, anio, oculta) {
    var ev = { hoja: nombre, cliente: cliente(nombre), titulo: "", fecha: "", pax: null, ingresos: 0, coste: 0,
      partidas: [], avisos: [], incluir: true, motivo: "" };
    var texto = function (r, c) { return String((filas[r] || [])[c] == null ? "" : filas[r][c]).trim(); };
    for (var r0 = 0; r0 < Math.min(filas.length, 3); r0++) {
      var t0 = texto(r0, 0);
      if (/^concepto/i.test(t0)) break;
      if (t0) { ev.titulo = t0; break; }
    }
    var pax = (ev.titulo + " " + nombre).match(/\b(\d{1,3})(?:\s*-\s*(\d{1,3}))?\s*pax/i);
    if (pax) ev.pax = +(pax[2] || pax[1]);
    ev.fecha = fecha(nombre, anio) || fecha(ev.titulo, anio);

    if (oculta) { ev.incluir = false; ev.motivo = "Hoja oculta en el Excel"; }
    if (/^\s*copia de/i.test(nombre)) { ev.incluir = false; ev.motivo = "Es una copia de otra hoja"; }

    // Fila de títulos: la primera cuya columna A empieza por "Concepto"
    var h = -1;
    for (var r = 0; r < Math.min(filas.length, 15); r++) if (/^concepto/i.test(texto(r, 0))) { h = r; break; }
    if (h < 0) { ev.incluir = false; ev.motivo = "No tiene la tabla de conceptos de un presupuesto"; ev.noReconocida = true; return ev; }
    var cab = (filas[h] || []).map(norm);

    // Columna de coste: la primera "Importe" o "Coste" que no sea precio al cliente
    var cCoste = -1, cPrecio = [], costes = [], especial = false;
    cab.forEach(function (c, i) {
      if (i === 0 || !c) return;
      var esPrecio = /precio (para|final|client)|presu(puesto)? (para )?client|^presupuesto|^prespuesto|^precio$/.test(c) && !/unitari/.test(c);
      if (esPrecio) cPrecio.push(i);
      else if (/^(importe|coste)/.test(c) && !/client|\+/.test(c)) { if (cCoste < 0) cCoste = i; costes.push(i); }
      else if (/^(sabado|domingo|lunes|martes|miercoles|jueves|viernes)\b/.test(c)) especial = true;
    });
    if (especial) ev.avisos.push("Formato especial (costes por día): revisa el precio y el coste");
    // Varias sedes o fechas en la misma hoja: cada "Importe" con su "Precio para cliente" a la derecha
    var bloques = costes.length > 1 ? costes.map(function (c) {
      var pr = cPrecio.filter(function (x) { return x > c; })[0];
      return { coste: c, precio: pr, titulo: String((filas[h - 1] || [])[c] || "").trim() };
    }).filter(function (b) { return b.precio !== undefined && costes.every(function (c2) { return c2 <= b.coste || c2 > b.precio; }); }) : [];
    if (cCoste < 0) { ev.incluir = false; ev.motivo = "No se encuentra la columna de coste"; ev.noReconocida = true; return ev; }
    // Si la columna de importe está vacía pero la de su izquierda tiene los costes (caso de alguna hoja)
    var esSeccion = function (r) { return /^\d{1,2}\s*[.\-)]\s*[^\d\s]/.test(texto(r, 0)); };

    // Filas clave
    var fTotal = -1, fPresu = -1;
    for (r = h + 1; r < filas.length; r++) {
      var a = norm(texto(r, 0));
      if (fTotal < 0 && /^total/.test(a)) fTotal = r;
      if (fPresu < 0 && /^presupuesto/.test(a)) fPresu = r;
      if (fTotal > -1 && fPresu > -1) break;
    }
    var fin = fTotal > -1 ? fTotal : filas.length;

    // Partidas (secciones numeradas) y conceptos sueltos
    var actual = null, conceptos = [];
    for (r = h + 1; r < fin; r++) {
      var nombreFila = texto(r, 0);
      if (!nombreFila) continue;
      var coste = num((filas[r] || [])[cCoste]);
      var precio = NaN;
      for (var k = cPrecio.length - 1; k >= 0; k--) { var p = num((filas[r] || [])[cPrecio[k]]); if (!isNaN(p)) { precio = p; break; } }
      if (esSeccion(r)) {
        actual = { nombre: nombreFila.replace(/^\d+\s*[.\-)]\s*/, "").trim(), coste: isNaN(coste) ? NaN : coste, precio: isNaN(precio) ? NaN : precio, fila: r, sumaCoste: 0, sumaPrecio: 0, n: 0 };
        ev.partidas.push(actual);
      } else {
        conceptos.push({ coste: coste, precio: precio });
        if (actual) {
          if (!isNaN(coste)) { actual.sumaCoste += coste; actual.n++; }
          if (!isNaN(precio)) actual.sumaPrecio += precio;
        }
      }
    }
    ev.partidas.forEach(function (p) {
      if (isNaN(p.coste)) p.coste = p.sumaCoste;
      if (isNaN(p.precio)) p.precio = p.sumaPrecio || 0;
      p.familia = familia(p.nombre);
      delete p.sumaCoste; delete p.sumaPrecio; delete p.n;
    });

    // Coste total
    var totalCoste = fTotal > -1 ? num(filas[fTotal][cCoste]) : NaN;
    var sumaPartidas = ev.partidas.reduce(function (s, p) { return s + (p.coste || 0); }, 0);
    var sumaConceptos = conceptos.reduce(function (s, c) { return s + (isNaN(c.coste) ? 0 : c.coste); }, 0);
    if (!isNaN(totalCoste)) ev.coste = totalCoste;
    else if (ev.partidas.length) { ev.coste = sumaPartidas; if (fTotal > -1) ev.avisos.push("El total de gastos del Excel da error; se ha sumado partida a partida"); }
    else ev.coste = sumaConceptos;

    // Precio al cliente: fila "Presupuesto" > total de la última columna de precio con número > suma
    var presu = NaN;
    if (fPresu > -1) {
      var orden = cPrecio.concat([cCoste]);
      for (var i = 0; i < orden.length && isNaN(presu); i++) presu = num(filas[fPresu][orden[i]]);
      for (i = 1; i < (filas[fPresu] || []).length && isNaN(presu); i++) presu = num(filas[fPresu][i]);
    }
    var totalPrecio = NaN, colUsada = -1;
    if (fTotal > -1) for (k = cPrecio.length - 1; k >= 0; k--) {
      var v = num(filas[fTotal][cPrecio[k]]);
      if (!isNaN(v) && v > 0) { totalPrecio = v; colUsada = cPrecio[k]; break; }
    }
    if (!isNaN(presu) && presu > 0) ev.ingresos = presu;
    else if (!isNaN(totalPrecio)) ev.ingresos = totalPrecio;
    else {
      var sp = conceptos.reduce(function (s, c) { return s + (isNaN(c.precio) ? 0 : c.precio); }, 0);
      ev.ingresos = sp || ev.partidas.reduce(function (s, p) { return s + (p.precio || 0); }, 0);
    }
    if (cPrecio.length > 1 && colUsada > -1 && isNaN(presu)) {
      var vivas = cPrecio.filter(function (c) { var x = num(filas[fTotal][c]); return !isNaN(x) && x > 0; });
      if (vivas.length > 1) ev.avisos.push("Hay " + vivas.length + " opciones de precio; se usa la última (" + String(filas[h][colUsada]).trim() + ")");
    }
    if (bloques.length > 1 && fTotal > -1) {
      var bi = 0, bc = 0;
      bloques.forEach(function (b) { bc += num(filas[fTotal][b.coste]) || 0; bi += num(filas[fTotal][b.precio]) || 0; });
      ev.coste = bc; ev.ingresos = bi;
      ev.avisos = ev.avisos.filter(function (a) { return !/opciones de precio/.test(a); });
      ev.avisos.push("Suma " + bloques.length + " ediciones: " + bloques.map(function (b) { return b.titulo || "sin nombre"; }).join(", "));
      ev.partidas.forEach(function (p) { p.coste = NaN; });
      for (r = h + 1, actual = null; r < fin; r++) if (esSeccion(r)) {
        actual = ev.partidas.filter(function (p) { return p.fila === r; })[0];
        if (actual) { actual.coste = 0; actual.precio = 0; bloques.forEach(function (b) { actual.coste += num(filas[r][b.coste]) || 0; actual.precio += num(filas[r][b.precio]) || 0; }); }
      }
    }
    if (!ev.ingresos) ev.avisos.push("Sin precio al cliente");
    if (!ev.coste) ev.avisos.push("Sin costes apuntados");
    if (!ev.fecha) ev.avisos.push("Sin fecha en el nombre de la hoja");
    if (!ev.ingresos && ev.incluir && !ev.motivo) ev.interno = true;
    ev.ingresos = Math.round(ev.ingresos * 100) / 100;
    ev.coste = Math.round(ev.coste * 100) / 100;
    ev.partidas.forEach(function (p) { delete p.fila; p.coste = Math.round((p.coste || 0) * 100) / 100; p.precio = Math.round((p.precio || 0) * 100) / 100; });
    return ev;
  }

  function libro(wb, XLSX, nombreArchivo) {
    var RE_ANIO = /\b20[1-4]\d\b/;
    var anio = (String(nombreArchivo || "").match(RE_ANIO) || [])[0];
    var textoArriba = function (filas) {
      return filas.slice(0, 2).map(function (f) { return f.filter(function (c) { return typeof c === "string"; }).join(" "); }).join(" ");
    };
    if (!anio) {
      var cuenta = {};
      wb.SheetNames.forEach(function (n) {
        var m = (n + " " + textoArriba(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" }))).match(RE_ANIO);
        if (m) cuenta[m[0]] = (cuenta[m[0]] || 0) + 1;
      });
      anio = Object.keys(cuenta).sort(function (a, b) { return cuenta[b] - cuenta[a]; })[0];
    }
    var eventos = [];
    var oculto = {};
    ((wb.Workbook || {}).Sheets || []).forEach(function (s) { if (s.Hidden) oculto[s.name] = true; });
    wb.SheetNames.forEach(function (n) {
      var filas = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" });
      var a = (n + " " + textoArriba(filas)).match(RE_ANIO);
      eventos.push(hoja(n, filas, a ? a[0] : (anio || String(new Date().getFullYear())), !!oculto[n]));
    });
    return { archivo: nombreArchivo || "", anio: anio || "", eventos: eventos, leido: new Date().toISOString() };
  }

  var api = { libro: libro, hoja: hoja, familia: familia, fecha: fecha, num: num };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PEE_parse = api;
})(this);
