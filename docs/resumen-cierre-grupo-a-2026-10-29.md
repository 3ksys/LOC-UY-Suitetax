# Refactor LOC Uruguay — Resumen de cierre de la etapa (Grupo A, piloto TXT, CDF)

**De:** Mobeats · **Para:** Tekiio · **Fecha:** 29/10/2026
**Cuenta:** `3KSYS-DEV ACCT SDN` (tstdrv2734457), rol de pruebas URU-Contador Suitetax (Mobeats).

## 1. Qué se verificó

| Hallazgo | Qué corrige | Cómo se verificó |
|---|---|---|
| CRT-A1, A3, A6, A8 | Validación de edición de Resguardo, filtros de subsidiaria, retorno ante entrada inválida, literal de importes | Arnés offline (`tools/arnes-grupo-a.js`, antes/después). En la cuenta: A1 verificado; A3, A6 y A8 **no** (ver §3) |
| CRT-A2 | Borrado de URU-Retención Detalle (`objRecord.delete` no existía) | **Cuenta**: se borró una URU-Retención; sus 4 detalles desaparecieron y no hay errores en el log |
| CRT-A11 | Limpieza al borrar un URU-Resguardo (`removeLine` con índice fijo) | **Cuenta**: se borró el Resguardo #271 sin error; no tenía retenciones vinculadas, así que el retorno a "Pendiente de Resguardo" no se pudo observar |
| CDF-A2, CDF-A8 | Envío de mail y subtotales | Arnés offline |
| CDF-C2 | Código SuiteScript 1.0 muerto | Revisión: sin `nlapi*`/`nlobj*` fuera del encabezado |
| TRS-A6 | `getNumeroEnLetras` | Arnés offline |

## 2. Piloto Generación TXT (`_REF`, script 709, deployment 358)

- Con los mismos parámetros (Uruguay, Sep 2026, BETA 2181), el original y el `_REF` generaron un TXT **idéntico byte a byte** (128 bytes, 2 líneas).
- La primera corrida del `_REF` **falló** por una regresión nuestra: pasaba objetos `search.Filter` a `searchSavedPro`, que reasigna `operator` (solo lectura). Se corrigió y la segunda corrida fue correcta. La inspección de código no la había detectado.
- Segunda corrida con Dic 2023 (12 líneas, rubros 504/505/506): también idéntico byte a byte (30/10/2026).
- Límite: ningún período de la cuenta se acerca a 1000 resultados (máximo 6 filas), así que GTX-A1 y la rama de publicidad con datos no se cubren. No se midieron GU ni tiempos comparables.

## 3. Respuestas de Tekiio del 26/10 y lo que sigue abierto

**Decisiones ya tomadas** (registradas en [registro-aprobaciones.md](registro-aprobaciones.md)):

| Hallazgo | Decisión |
|---|---|
| ARI-B4, CDF-B1, CDF-D1 | Rechazados de común acuerdo (reemplazo de mecanismo o iniciativa dedicada). CDF-B1: Mobeats propuso leer columnas por nombre con `armarArreglosSS`; espera sí/no |
| CDF-A7 | Retirado: un `save()` dentro de un User Event no dispara User Events. Queda como ítem nuevo propuesto: `submitFields` en vez de `save()` (20 a 10 GU), a la espera de aprobación |
| CRT-A10 | Tekiio pide corregirlo (no dejarlo fuera). [Propuesta](propuestas/CRT-A10-validacion-llamadas-suitelets.md) en espera de sus decisiones D1 a D4 |
| CRT-A13, CRT-D1 | A la espera del sí/no de Tekiio sobre las alternativas propuestas |

**Lo que necesitamos de Tekiio**
1. **CRT-A10:** decisiones D1 a D4 (qué hacer si falla cada Suitelet, dónde ve el usuario la falla, reorden del link). Mientras tanto se puede avanzar con U1, U2 y U4 de la propuesta.
2. **Seguridad (nuevo, 30/10):** los 4 Suitelets de CRT están publicados **sin login** en la cuenta de desarrollo (deployments 44, 172, 173 y 174). Ver §8 de la propuesta. Necesita decisión de Tekiio y revisión en producción.
3. **Búsqueda guardada `customsearch_l598_transaction_det_ret` (id 20):** desalineada con la librería de CRT y con el `afterSubmit`. Hoy ninguna vía puede crear retenciones, lo que bloquea probar A3, A6 y A8 en la cuenta y también la medición de governance (U4).
4. **CDF:** deriva de SICFE; búsqueda guardada 164 con 4 columnas SICFE de más; proveedor y configuración de FE inactivos. Sin eso el CDF no corre en la cuenta, y por eso **CDF-B5 no se aplica**.
5. **CDF-B2:** confirmar el tipo de `shipstatus` y que los otros seis campos coinciden con lo inferido desde el formulario (cae: texto; trans_interna: checkbox; documento_xml_fe, sucursal, tipo_comprobante, serie_comprobante: lista/registro).
6. **Hallazgos sin resolver:** TRS-A5, TRS-D1, STC-A3, OV #53, Expense Categories. TRS-A6 no aplica en Vendor Credit (por confirmar).
7. **Fechas de aprobación** de los hallazgos aplicados, para completar el registro.

## 4. A tener en cuenta

- Durante las pruebas se cambió temporalmente la configuración de SICFE en la cuenta; se revirtió.
- No se re-guardaron documentos fiscales ya informados a DGI.
- Objetos que quedaron en la cuenta: script 709 y deployment 358 (Not Scheduled), archivos TXT 15593 y 15693, logs 3101, 3102 y 3201.
- Detalle y trazabilidad: [registro-aprobaciones.md](registro-aprobaciones.md), [pilotos/generacion-txt-dgi.md](pilotos/generacion-txt-dgi.md), bitácoras en [refactors/](refactors/).
