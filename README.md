# Pa Eso Estamos · cuentas de eventos

Web para ver las cuentas de la empresa a partir del Excel de presupuestos (una hoja por evento).

**App:** https://josescrig92-dev.github.io/pa-eso-estamos/

## Cómo se usa
1. Abre la app y sube el Excel (`.xlsx`). Si está en Google Drive, descárgalo como Excel; desde el móvil se puede elegir directamente de Drive.
2. La app lee todas las hojas a la vez y muestra:
   - **Resumen**: facturación, margen bruto, GOP, EBITDA, cascada hasta el beneficio neto, ratios, mes a mes y eventos a revisar.
   - **Eventos**: cada hoja con su facturación, coste, margen y partidas. Se puede corregir la fecha, la facturación o el coste, y apartar eventos.
   - **En qué se gasta**: las partidas (decoración, catering, espacio…) sumadas de todos los eventos.
   - **Clientes**: facturación y margen por cliente.
   - **Gastos de estructura**: sueldos, autónomos, gestoría, alquiler… Hay que meterlos una vez para que el GOP y el EBITDA sean reales.
3. **Descargar informe** genera un Excel con la cuenta de resultados, los eventos y las partidas.

El archivo no se sube a ningún servidor: se lee en el navegador. Las correcciones y los gastos de estructura se guardan en ese navegador.

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
