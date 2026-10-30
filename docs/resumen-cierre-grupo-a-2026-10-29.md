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
- Límite: el período solo tiene 2 líneas; no cubre el caso de más de 1000 resultados (GTX-A1) ni la rama de publicidad con datos. No se midieron GU ni tiempo comparables.

## 3. Lo que necesitamos de Tekiio

1. **Búsqueda guardada `customsearch_l598_transaction_det_ret` (id 20):** está desalineada con la librería de CRT y con el `afterSubmit`. Hoy ninguna vía puede crear retenciones, lo que bloquea probar A3, A6 y A8 en la cuenta.
2. **CDF:** versión de referencia y deriva de SICFE; búsqueda guardada 164 con 4 columnas SICFE de más; proveedor y configuración de FE inactivos. Sin eso el CDF no corre en la cuenta, y por eso **CDF-B5 no se aplica** (cambia la persistencia de un flujo fiscal sin poder regresionarlo).
3. **CDF-B2:** confirmar el tipo de `shipstatus` y que los otros seis campos coinciden con lo inferido desde el formulario (cae: texto; trans_interna: checkbox; documento_xml_fe, sucursal, tipo_comprobante, serie_comprobante: lista/registro). Alternativa: permiso de lectura de campos para el rol de Mobeats.
4. **Hallazgos sin resolver:** TRS-A5, TRS-D1, STC-A3, OV #53, Expense Categories. TRS-A6 no aplica en Vendor Credit (por confirmar).
5. **Fechas de aprobación** de los hallazgos aplicados, para completar el registro.

## 4. A tener en cuenta

- Durante las pruebas se cambió temporalmente la configuración de SICFE en la cuenta; se revirtió.
- No se re-guardaron documentos fiscales ya informados a DGI.
- Objetos que quedaron en la cuenta: script 709 y deployment 358 (Not Scheduled), archivos TXT 15593 y 15693, logs 3101, 3102 y 3201.
- Detalle y trazabilidad: [registro-aprobaciones.md](registro-aprobaciones.md), [pilotos/generacion-txt-dgi.md](pilotos/generacion-txt-dgi.md), bitácoras en [refactors/](refactors/).
