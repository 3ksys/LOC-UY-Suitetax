# Propuesta Técnica — CRT-A10

## Validar las llamadas `https.post` de `Calcular Retenciones (SS)V2` a sus Suitelets

**De:** Mobeats · **Para:** Tekiio · **Fecha:** 2026-10-26
**Responde a:** el rechazo de Tekiio (Desarrollo) a nuestra recomendación original de dejar CRT-A10 fuera del refactor ([registro](../registro-aprobaciones.md), [informe §4](../refactors/3-calcular-retenciones-ss.md#4-recomendaciones-grupo-a-fuera-del-refactor--requieren-aprobación-tekiio)).
**Riesgo:** 🔴 Alto (integridad de datos fiscales) · **Estado:** ⏳ Pendiente de las decisiones del §4

---

## 1. Qué entendimos del rechazo

Nuestra posición era que validar o consolidar las llamadas era una decisión del cliente. Tekiio la tomó: **hay que corregirlo**. Pide tres cosas, y esta propuesta responde cada una:

| Pedido de Tekiio | Dónde se responde |
|---|---|
| Capturar y registrar el código de estado y el body de cada llamada | §3.1 |
| Documentar en el código cada decisión de continuar ante una falla, con su regla de negocio | §3.3 y §4 |
| Análisis de estrés de governance de los 4 Suitelets | §5 |

**No proponemos consolidar los Suitelets.** Tekiio no lo pidió y es el cambio más caro y riesgoso. Queda en §6.

> **Nombre a confirmar.** El comentario menciona `L598 - Crear Resguardo (SL)V2_2.js`. En el repositorio solo existe `L598 - Crear Resguardo (SL)V2.js`, y el UE invoca `customscript_l598_crear_resguardo_sl_v2`. Necesitamos confirmar si en la cuenta hay una versión `V2_2` distinta.

---

## 2. Estado actual

El UE corre en `afterSubmit`. Cuando se llega a la primera llamada, la factura o nota de crédito **ya está guardada** y nada de lo que pase después la revierte.

| # | Suitelet | Qué ya está guardado antes | Si falla hoy | Qué se usa del resultado |
|:--:|---|---|---|---|
| 1 | Calcular Retenciones (`:1055`) | Solo la transacción original | Log. No se genera nada más | Todo el flujo posterior |
| 2 | Crear Retención Detalle (`:1567`) | **URU-Retención** (`:1556`) | Si `https.post` lanza: log y se saltea el link en la factura (`:1576`) → **URU-Retención huérfana** y posible duplicado en la próxima edición | **Nada** (ver bug D3 abajo) |
| 3 | Crear Resguardo (`:1642`) | URU-Retención + link en la factura | Body no-JSON: log y **se saltea el pago**. `{"error":...}` con 200: se ignora y **el pago sigue** | Nada |
| 4 | Crear Pago Factura (`:1666`) | Todo lo anterior | Log ("Error generando vendor payment") | Nada |

**Hallazgos que agravan el problema:**

- **El usuario nunca ve un error.** El UE arma un objeto `objRta` con errores y avisos (`:1060`), pero nunca lo lee, ni lo devuelve, ni lo guarda en un campo. Todo queda en el log del script.
- **Bug D3 (`:1571`).** Después de llamar a Crear Retención Detalle, el código parsea `response.body`, que es la respuesta de la **llamada 1**, y no `responseSLDetalle.body`. El resultado del Suitelet 2 se descarta siempre. El `_REF` lo conserva a propósito para preservar el comportamiento.
- **`response.code` no alcanza solo.** Los 4 Suitelets atrapan sus excepciones y responden **200** con `{"error":"..."}`. Un error real llega como éxito HTTP. Solo devuelven 500 cuando el parámetro de entrada no es JSON válido (el `JSON.parse` está fuera del `try`) o cuando se agota el governance.
- **Crear Resguardo puede fallar sin avisar.** Sus errores internos ("no hay detalles", falla del `save`) solo hacen log y la respuesta sale sin id. El objeto `respuesta {error, detalles_errores}` que declara nunca se escribe.
- **Sin rollback entre Suitelets.** Cada uno guarda por su cuenta. Una falla a mitad de camino deja registros parciales: detalles creados sin retención o resguardo sin pago.

Ya existe en el repositorio un patrón para validar respuestas (`response.code == 200` en `Generar CAE Lotes.js:655,691`). La propuesta lo extiende, no inventa uno nuevo.

---

## 3. Cambio propuesto

Se aplica sobre `L598 - Calcular Retenciones (SS)V2_REF.js` y sobre los Suitelets involucrados, en unidades de trabajo separadas (§7).

### 3.1 Una sola función para invocar Suitelets

Las 4 llamadas pasan por `invocarSuitelet(nombre, scriptId, deploymentId, body)`, que:

1. Atrapa las excepciones de red y timeout de `https.post`.
2. Valida `response.code === 200`.
3. Valida que el body no esté vacío y sea JSON.
4. Valida que el JSON no tenga `error` (con la forma que corresponda a cada Suitelet).
5. Ante cualquier falla, hace `log.error` con el nombre del Suitelet, el id de la transacción, el código HTTP y el body (truncado a 1000 caracteres).
6. Devuelve `{ ok, data, error }`. **No lanza**: la decisión de seguir o cortar queda explícita en cada punto de llamada (§3.3).

### 3.2 Contrato de respuesta uniforme en los Suitelets

Para que el punto 4 sea confiable, los 4 Suitelets responden siempre con la misma forma:

- Éxito: `{ "error": false, ... }` con los datos actuales.
- Falla: `{ "error": true, "mensaje": "..." }`.

Esto implica:

- Mover el `JSON.parse` del parámetro de entrada dentro del `try`.
- En Crear Resguardo, escribir la respuesta de error que hoy se declara y nunca se envía.

Los datos que devuelven en el éxito no cambian.

### 3.3 Decisión explícita en cada punto de llamada

Cada llamada queda así:

```js
const resultado = invocarSuitelet('Crear Resguardo', ...);
if (!resultado.ok) {
  // Regla de negocio: sin resguardo no se genera el pago, para no dejar
  // facturas pagadas sin resguardo (CRT-A10, decisión Tekiio YYYY-MM-DD).
  registrarFalla(...);
  return;
}
```

El comportamiento concreto de cada llamada depende de las decisiones del §4. El comentario cita la decisión aprobada.

### 3.4 Corregir el bug D3

Parsear `responseSLDetalle` en vez de `response` y validarlo con §3.1. Hoy no cambia el resultado, porque `newRetencion` no se usa. Lo que agrega es que las fallas de Crear Retención Detalle se empiezan a detectar.

### 3.5 Reordenar el link de la URU-Retención (requiere aprobación)

Mover el `submitFields` de `custbody_l598_link_retencion` (`:1576`) a **inmediatamente después** del `save()` de la URU-Retención, antes de la llamada 2. Con eso, una falla de los Suitelets 2 a 4 ya no deja una retención sin vínculo que pueda duplicarse en la próxima edición. Es un cambio de orden con efecto observable: por eso va al §4.

---

## 4. Decisiones que necesitamos de Tekiio / Producto

Son reglas de negocio. No las podemos inferir del código.

| # | Pregunta | Propuesta por defecto de Mobeats |
|:--:|---|---|
| D1 | Si falla **Crear Retención Detalle**, ¿se sigue con resguardo y pago? | **Seguir y registrar la falla.** Los detalles de otras transacciones se crean como pendientes y los procesa luego `Pendiente Generar Retención (MR)V2`. |
| D2 | Si falla **Crear Resguardo**, ¿se genera igual el pago? | **No.** Es exactamente el escenario "factura pagada sin resguardo" que Tekiio marcó como riesgo. Hoy depende de cómo falle: a veces paga y a veces no. |
| D3 | ¿Dónde debe **ver** el usuario la falla? | **Un campo de estado en la transacción** (por ejemplo `custbody_l598_estado_retencion` con el último error). Alternativas: solo log (estado actual) o `throw` en `afterSubmit`, que muestra el error pero **no revierte** el guardado y puede confundir. El campo nuevo requiere crear una customización. |
| D4 | ¿Se aprueba el reorden del link (§3.5)? | **Sí.** Elimina el caso de retención huérfana y duplicada. |

---

## 5. Análisis de governance

### 5.1 Estimación desde el código (a confirmar con medición)

Cada Suitelet tiene su propio presupuesto de 1000 unidades por invocación. El UE tiene otras 1000.

| Script | Costo base aprox. | Qué escala con el volumen | Límite teórico aprox. |
|---|---|---|---|
| UE Calcular Retenciones (SS) | 130–150 GU | Nada relevante (casi fijo) | Sin riesgo |
| **SL Calcular Retenciones** | 150–250 GU | **~20–30 GU por detalle de retención** (transacciones acumuladas del proveedor en el período) | **~30–40 detalles** |
| SL Crear Retención Detalle | ~0 | ~6 GU por detalle de otras transacciones | ~160 detalles |
| SL Crear Resguardo | ~85 GU | ~2 GU por detalle | ~450 detalles |
| SL Crear Pago Factura | ~30 GU | Nada (las líneas `apply` no consumen GU) | Sin riesgo |

**El cuello de botella es el SL Calcular Retenciones.** Un proveedor con muchas transacciones acumuladas en el período puede agotar el governance. Hoy eso devuelve un 500, el UE lo registra en el log y **la retención no se genera, sin aviso**.

### 5.2 Plan de medición

1. **Escenarios:** un proveedor con 1, 10, 30 y 50 transacciones acumuladas en el período, en sandbox.
2. **Instrumento:** `log.audit` de `runtime.getCurrentScript().getRemainingUsage()` al final de cada Suitelet. Es temporal y se retira después. También se usa APM, como en las mediciones anteriores ([medicion-apm.md](../medicion-apm.md)).
3. **Entregable:** una tabla de GU medidas por escenario, el umbral real de detalles y una recomendación: aceptar el límite, paginar o derivar los casos grandes a un proceso asíncrono (este último sería otra propuesta).

---

## 6. Fuera de alcance

- **Consolidar los Suitelets o pasar a un proceso asíncrono (Map/Reduce o tarea).** Resolvería la falta de atomicidad y la latencia (5,4 s medidos), pero es un rediseño. Se reevalúa con los resultados del §5.
- **Suitelets publicados con URL externa sin autenticación.** Las 4 llamadas usan `returnExternalUrl: true` y no envían credenciales. Si los deployments están como "disponible sin login", cualquiera con la URL puede crear registros. **Lo registramos como hallazgo de seguridad aparte**: hay que revisarlo en la cuenta.
- **Filtros de configuración sin `"AND"`** (`:2371-2374`, `:2402-2405`). Pueden hacer fallar en OneWorld la búsqueda que habilita resguardo y pago. Ya está registrado como `CRT-A3`.

---

## 7. Plan de implementación

| Unidad | Contenido | Depende de |
|:--:|---|---|
| U1 | `invocarSuitelet` + log de código y body en las 4 llamadas + corrección D3, **sin cambiar el flujo** | — |
| U2 | Contrato de respuesta uniforme en los 4 Suitelets | — |
| U3 | Política por llamada, reorden del link y visibilidad para el usuario | Decisiones D1–D4 |
| U4 | Medición de governance (§5.2) | U1 (para ver los 500 en el log) |

U1, U2 y U4 pueden avanzar ya. U3 espera las decisiones del §4.

**Validación en la cuenta:** se fuerza cada tipo de falla (deployment deshabilitado → no-200, parámetro inválido → 500, error de negocio → `{"error":true}`) y se verifica el log, el estado resultante de los registros y lo que ve el usuario.

---

## 8. Verificado en la cuenta (solo lectura) — 2026-10-30

**Nombre del Suitelet (§1).** En la cuenta el script `customscript_l598_crear_resguardo_sl_v2` (id 172) usa el archivo `L598 - Crear Resguardo (SL)V2.js`. En el listado de scripts no aparece ningún archivo `V2_2`. La duda queda resuelta salvo que Tekiio mencione un archivo fuera del listado.

**Suitelets publicados sin login (§6).** Los 4 deployments tienen **"Available Without Login" activado** (campo `isonline`):

| Suitelet | Script | Deployment | Estado | Sin login |
|---|---|---|---|:--:|
| Calcular Retenciones (SL) | 26 | 44 | Released | Sí |
| Crear Retención Detalle (SL) V2 | 171 | 172 | Released | Sí |
| Crear Resguardo (SL) V2 | 172 | 173 | Released | Sí |
| Crear Pago Factura (SL) V2 | 173 | 174 | Released | Sí |

Es coherente con que el UE los invoque con `returnExternalUrl: true` y sin credenciales: **la arquitectura actual lo necesita**. Pasa a ser un hallazgo de seguridad concreto: quien conozca la URL externa de un deployment puede crear URU-Retenciones, Resguardos o pagos. No se tocó nada. Cambiarlo exige rediseñar la autenticación entre el UE y los Suitelets, así que va como propuesta aparte y con decisión de Tekiio. Verificado en la cuenta de desarrollo; la de producción puede diferir.

---

## 9. U1 aplicada en el `_REF` — 2026-10-30 (commit `7ac798b`)

Se aplicó **solo U1**, en `L598 - Calcular Retenciones (SS)V2_REF.js`. U2, U3 y U4 siguen sin tocar.

**Qué hace.** Las 4 llamadas pasan por `invocarSuitelet`, que registra con `log.error` (título `CRT-A10 <Suitelet>`) el motivo cuando la respuesta no es válida: sin respuesta, código distinto de 200, body que no es JSON, o JSON con `error`. Incluye la transacción y el body truncado a 1000 caracteres.

**Qué no cambia (flujo idéntico).** Es lo que permite aplicarla antes de D1 a D4:
- Devuelve la respuesta cruda de `https.post`; el código que la usa no se tocó.
- Relanza las excepciones de `https.post`, como hoy.
- Los `JSON.parse(responseSL.body)` de las llamadas 3 y 4, que deciden si se genera el pago, siguen donde estaban.
- Ninguna falla corta ni cambia lo que sigue: la política (§4) queda para U3.

**D3 (§3.4).** Se quitó el `JSON.parse(response.body)` que re-parseaba la respuesta de la llamada 1, que ya se había parseado y no podía lanzar. La respuesta de Crear Retención Detalle ahora se valida y queda en el log, sin que el flujo dependa de ella.

**Validación.** Solo offline, con `tools/arnes-grupo-a.js`: el wrapper devuelve la misma respuesta en los 6 escenarios, relanza la excepción y loguea el motivo en cada falla (200 con `{"error":...}`, 500, body no JSON, `https.post` que lanza). **No se probó en la cuenta**: la búsqueda guardada id 20 impide generar retenciones, así que ninguna de las 4 llamadas se puede ejecutar de punta a punta.

**Pendiente.** Aprobación formal de Tekiio de esta propuesta; U2 modifica los Suitelets originales (código productivo) y U4 depende de poder generar retenciones.

