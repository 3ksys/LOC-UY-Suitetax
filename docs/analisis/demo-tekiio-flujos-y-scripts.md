# Demo Tekiio — rol de cada script en los flujos

Detalle funcional relevado de la demo de Tekiio sobre los flujos de Ventas y Compras: **qué hace cada script dentro del flujo**, cómo está armada la arquitectura de Facturación Electrónica y Retenciones, y los datos concretos para reproducir un caso.

Complementa [Flujos de Prueba y Plan de Ejecución](../flujos-prueba-y-plan-ejecucion.md), que tiene el mapeo operación → script → tiempo. Acá está el **para qué** de cada uno.

**Cuenta de la demo:** `tstdrv2734457`

---

## 1. Ventas

### Factura de venta

| Script | Rol en el flujo |
|---|---|
| `L598 - Transacción (Servidor)` | **Script principal** de la transacción. |
| `L598 - Seteo de Tax Codes` | Cubre una **carencia de SuiteTax**: no expone el tax code a nivel de línea. Por eso copia código y tasa desde `taxdetails` a columnas custom de línea. |
| `L598 - Conexion Directa FE (SS)` | Prepara el **XML del comprobante**: mapea el JSON de la transacción contra plantillas configuradas según el proveedor de facturación. **Solo prepara — no envía.** |

> **Por qué importa la primera fila:** el propósito de `Seteo de Tax Codes` no es un capricho de implementación, es un workaround de una limitación de SuiteTax. Eso condiciona cualquier propuesta de eliminarlo o reemplazarlo.

### Nota de crédito

Usa los mismos scripts, más:

| Script | Rol en el flujo |
|---|---|
| `L598 - Generar CAE Automatico` | Complementa a `Conexion Directa FE`, que lo invoca. Automatiza la generación del CAE. |
| `L598 - Conexion Directa FE (SS)` | Genera el documento final y hace la conexión con el proveedor externo. |

### Arquitectura de Facturación Electrónica

- Hay un **middleware externo en .NET**, fuera de NetSuite.
- Según la versión, ese middleware **se va a deprecar** y todo pasará a conexión directa dentro de NetSuite.
- El envío al proveedor **no ocurre al guardar**: se dispara con el botón **`Generar CAE 2.0`**.
- Es **configurable**: se puede dejar el ambiente en modo automático para que al guardar la transacción se haga la conexión y vuelva el CAE, sin botón.

> ⚠️ **Consecuencia para la caracterización:** si el ambiente está en modo automático, guardar una transacción dispara la conexión con el proveedor externo. Antes de re-guardar transacciones para caracterizar, hay que saber en qué modo está la cuenta — o se generan llamadas reales a un servicio externo como efecto colateral.

## 2. Compras

### Factura de proveedor

Todo el cálculo matemático y la lógica viven en un **Scheduled Script aparte**, no en el User Event.

| Script | Rol en el flujo |
|---|---|
| `L598 - Calcular Retenciones (SS)` | **Cabecera** del cálculo de retenciones. |
| `L598 - Calcular Ret. Lineas (SS)` | Cálculo de retenciones **por línea**. |

Según configuración, al guardar la factura el cálculo se hace automático **o** se habilita un botón para dispararlo manual.

**Resguardo:** es el documento fiscal que se emite al proveedor de facturación.

> ⚠️ **Brecha a confirmar con Tekiio.** No hay ningún archivo en el repo que se llame `Calcular Ret. Lineas (SS)`. Lo más cercano es `L598 - Calcular Retenciones (SL)V2.js` y `L598 - Calcular Retenciones (SS)V2.js`. O el nombre del script record en la cuenta difiere del nombre de archivo, o es otro de los **scripts fuera del repo** ([hallazgo 3](../flujos-prueba-y-plan-ejecucion.md#5-hallazgos-críticos)).

## 3. Receta para reproducir una Factura de venta

Datos exactos usados en la demo. Sirven para construir el caso de caracterización con los bordes que se necesiten.

**Ruta:** `Transacciones > Ventas > Crear Facturas de Ventas`

| Campo | Valor |
|---|---|
| Formulario personalizado | Factura Electrónica *(o Nota de Débito)* |
| Cliente / Trabajo | `60 TK CLIENTE PRUEBA E-FACTURA` — al seleccionarlo carga cliente y moneda |
| Ubicación | Montevideo |
| Solapa Artículo | `TK ARTICULO BIEN PRUEBA VENTA URUGUAY` + tarifa + **código impositivo TASA 22%** + ubicación |
| Solapa Localización URU | Se autocompleta: serie del comprobante, sucursal, caja, líneas detalle, forma de pago Contado, tasa mínima y básica |
| Datos del cliente (auto) | Tipo doc `RUT` · Número `216498090018` · Razón social `TK CLIENTE PRUEBA E FACTURA` |

Al guardar **demora** de forma perceptible; los scripts que corren validan si necesita retenciones.

**Pasos siguientes del flujo:** `Generar CAE 2.0` → recepción del CAE en la factura → `Aceptar Pago` (cuenta `BANCO PESOS`), que también demora mucho.

## 4. Evidencia del error 100000

Mensaje literal capturado en la demo al presionar `Generar CAE 2.0`:

```
DETALLES: ID INTERNO TRANSACCION: 15280 - COMPROBANTE: E-FACTURA LOCAL A-4-15280
NO SE GENERO CAE A LA TRANSACCION, OCURRIO UN ERROR AL SOLICITAR FIRMAR COMPROBANTE,
DETALLES MENSAJE: TL TIPO DE CFE NO ES VALIDO, POSIBLE ERROR DE SINTAXIS,
CODIGO DE ERROR: 100000
```

**Esto NO es un error de conexión.** Dos elementos del mensaje lo muestran:

1. `"al solicitar firmar comprobante"` — la solicitud **llegó** al servicio de firma. Si no hubiera conectividad, el error sería de timeout o de red, no una respuesta del servicio.
2. `"TL tipo de CFE no es válido, posible error de sintaxis"` — es un **rechazo de validación del payload**: el tipo de CFE enviado no es aceptado.

**Causa aún indeterminada**, entre dos candidatos que hay que distinguir antes de escalar:

- **Configuración** — mapeo de tipo de documento / serie del comprobante mal configurado en la cuenta de dev.
- **Construcción del XML** — `Conexion Directa FE (SS)` arma el comprobante; si envía un tipo de CFE incorrecto, es un defecto de script o de sus plantillas.

> Nota: [flujos-prueba-y-plan-ejecucion.md](../flujos-prueba-y-plan-ejecucion.md#5-hallazgos-críticos) afirmaba que "no es un defecto de los scripts — es la conexión al middleware". La primera parte **no está probada** y este mensaje abre la segunda hipótesis. Corregido allí.

## 5. Dato operativo

Para ver los scripts en la cuenta, la demo indica **cambiar al rol `Administrador`**: `Personalización > Creación de Scripts > Secuencia de comandos`.

⚠️ **Esa instrucción es del lado de Tekiio, no implica que Mobeats tenga el rol.** Verificado 2026-07-28: el rol `Administrador` **no está disponible** en el selector de roles de Mobeats. Consecuencia directa: no se puede disparar el script original para capturar baseline sobre transacciones nuevas ([caracterización §3](../caracterizacion/1-seteo-de-tax-codes.md#3-procedimiento-en-netsuite)).
