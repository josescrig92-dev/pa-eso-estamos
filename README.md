# Pa Eso Estamos · cuentas de eventos

Web para ver las cuentas de la empresa a partir del Excel de presupuestos (una hoja por evento).

**App:** https://josescrig92-dev.github.io/pa-eso-estamos/

## Cómo se usa
1. Abre la app y pulsa **Abrir desde Google Drive** (o sube el `.xlsx` desde el ordenador). Después, **Actualizar desde Drive** vuelve a leer el mismo archivo con los últimos cambios.
2. La app lee todas las hojas a la vez y muestra:
   - **Resumen**: facturación, margen bruto, GOP, EBITDA, cascada hasta el beneficio neto, ratios, mes a mes y eventos a revisar.
   - **Eventos**: cada hoja con su facturación, coste, margen y partidas. Se puede corregir la fecha, la facturación o el coste, y apartar eventos.
   - **En qué se gasta**: las partidas (decoración, catering, espacio…) sumadas de todos los eventos.
   - **Clientes**: facturación y margen por cliente.
   - **Gastos de estructura**: sueldos, autónomos, gestoría, alquiler… Hay que meterlos una vez para que el GOP y el EBITDA sean reales.
3. **Descargar informe** genera un Excel con la cuenta de resultados, los eventos y las partidas.

El archivo no se sube a ningún servidor: se lee en el navegador.

**Dónde se guardan los ajustes** (gastos de estructura y correcciones de eventos):
- Si el Excel es una hoja de Google abierta desde Drive, en una pestaña **Ajustes app** del propio Excel, que la app crea sola. Así todas ven lo mismo. Si dos personas cambian ajustes a la vez, se queda el último guardado.
- Si se sube un archivo desde el ordenador, solo en ese navegador.

## Cómo lee cada hoja
- Busca la fila de títulos que empieza por **Concepto**.
- **Coste**: la columna *Importe* o *Coste*. Usa la fila **TOTAL**; si da error (#VALUE!, #REF!), suma las partidas numeradas (1., 2., …).
- **Facturación**: la fila **Presupuesto** si tiene cifra; si no, el total de la última columna *Precio para cliente* con número.
- **Fecha**: del nombre de la hoja (p. ej. "Benefit 28 ene."). El año sale del nombre del archivo o del título.
- Se apartan de las cuentas las hojas ocultas, las que empiezan por "Copia de" y las que no tienen tabla de presupuesto.

## Cálculos
- Margen bruto = facturación − coste de los eventos
- GOP = margen bruto − personal − gastos operativos
- EBITDA = GOP − gastos fijos (alquiler, seguros, tributos)
- EBIT = EBITDA − amortizaciones
- Beneficio neto = EBIT − gastos financieros − impuesto sobre beneficios

## Conexión con Google Drive (una sola vez)
1. Entra en https://console.cloud.google.com/ y crea un proyecto ("Pa Eso Estamos").
2. **APIs y servicios → Biblioteca**: activa **Google Drive API**, **Google Picker API** y **Google Sheets API** (esta última para guardar los ajustes en el Excel).
3. **Pantalla de consentimiento de OAuth**: tipo *Externo* (o *Interno* si usáis Google Workspace), nombre de la app y vuestro correo. Si es *Externo*, añade como **usuarios de prueba** los correos de Google de quienes vayan a usar la app.
4. **Credenciales → Crear credenciales → ID de cliente de OAuth**, tipo *Aplicación web*. En **Orígenes de JavaScript autorizados** pon `https://josescrig92-dev.github.io`.
5. **Credenciales → Crear credenciales → Clave de API**. Restríngela a *Sitios web* `https://josescrig92-dev.github.io/*` y a la API *Google Picker API*.
6. Pon el ID de cliente y la clave de API en [`config.js`](config.js). No son secretos: Google los da para usarlos en una web.

La app pide el permiso mínimo de Drive (`drive.file`): solo puede leer los archivos que cada persona elige en el selector, nada más del Drive.
