# Pa Eso Estamos · control de gastos y beneficios

App web para llevar ingresos y gastos y ver la cuenta de resultados con GOP, EBITDA y ratios.
Se publica con GitHub Pages y guarda los datos en una hoja de Google Sheets de vuestro Drive.
En este repositorio solo hay código, ningún dato de la empresa.

## Puesta en marcha (una sola vez)

### 1. Publicar la web
En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
rama `main`, carpeta `/ (root)`, **Save**. En un par de minutos la app estará en
`https://josescrig92-dev.github.io/pa-eso-estamos/`.

### 2. Crear la hoja de datos
1. En Google Drive, crea una hoja de cálculo nueva (por ejemplo "Pa Eso Estamos - Movimientos").
2. Menú **Extensiones → Apps Script**. Borra lo que haya y pega el contenido de [`apps-script/Code.gs`](apps-script/Code.gs).
3. Cambia la contraseña de la línea `const CLAVE = "cambia-esta-clave";` por una vuestra.
4. **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier usuario**. Autoriza cuando lo pida.
5. Copia la dirección que termina en `/exec`.

### 3. Conectar la app
Abre la app, pestaña **Ajustes**, pega la dirección y escribe la contraseña. Se recuerda en ese dispositivo.
Para no tener que pegar la dirección en cada dispositivo, escríbela en [`config.js`](config.js).

## Cómo se guardan los datos
- Cada movimiento es una fila de la pestaña `Movimientos` de la hoja: ID, Fecha, Línea, Categoría, Concepto, Importe, Ejemplo.
- Se puede escribir directamente en la hoja: deja la columna ID vacía y la app la rellena. La columna Línea debe ser una de:
  Ingresos, Coste de ventas, Personal, Gastos operativos, Gastos fijos, Amortizaciones, Gastos financieros, Impuesto sobre beneficios.
- Los importes van en positivo y sin IVA.
- Quien tenga la dirección del script y la contraseña puede leer y cambiar los datos. Si cambias la contraseña, hay que volver a implementar el script (Implementar → Gestionar implementaciones → editar → Nueva versión).

## Cálculos
- Margen bruto = ingresos − coste de ventas
- GOP = margen bruto − personal − gastos operativos
- EBITDA = GOP − gastos fijos (alquiler, seguros, tributos)
- EBIT = EBITDA − amortizaciones
- Beneficio neto = EBIT − gastos financieros − impuesto sobre beneficios
