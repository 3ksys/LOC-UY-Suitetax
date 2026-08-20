# Propuesta Técnica — STC-A1

## Mover `L598 - Seteo de Tax Codes` de `afterSubmit` a `beforeSubmit`

**Estado:** ✅ **Aprobada por Tekiio (2026-08-20)** e implementada sobre el `_REF` en su variante **híbrida** (§5, fila 2) — ver [informe de refactor §3.bis](../refactors/1-seteo-de-tax-codes.md#3bis-stc-a1--guarda-híbrida-aplicada-2026-08-20). Pendiente: caracterización en la cuenta.
> Tekiio precisó que hay que **asumir cualquier contexto de creación** (CSV, integraciones, etc.) aunque hoy no se usen. Por eso no se aplicó `beforeSubmit` puro: la guarda híbrida verifica el **dato**, no el contexto, y no requiere enumerar la lista del §3.
**Riesgo:** 🔴 Alto (fiscal) · **Impacto esperado:** Alto (el mayor ahorro de GU/tiempo medido)
**Equipo:** Mobeats · **Fecha:** 2026-07-09

---

## 1. Problema

El script corre en `afterSubmit` y, para setear 2 columnas custom por línea (`custcol_l598_codigo_impuesto`, `custcol_l598_tasa_impuesto`), ejecuta en **cada** transacción con impuestos:

1. `record.load()` del registro completo — **~10 GU**
2. `objRecord.save()` del registro completo — **~20 GU**

= **~30 GU y un guardado completo extra por transacción**, además del guardado que ya hizo el sistema.

**Costo real medido** (actualizado 2026-08-06 con APM — ver [medición](../medicion-apm.md)): **30 GU exactas por guardado, verificadas en 5 corridas sobre 5 tipos de registro distintos** (SO, Bill, Bill Credit, PO, Estimate). El 100% del governance proviene del load+save: APM muestra 2 operaciones de registro, 0 búsquedas, 0 llamadas externas. El tiempo del script varía 1,3–7,6s según tipo y frío/caliente (no citable como métrica); el governance no se mueve.
> Nota: la cifra "11–14s ×2" citada originalmente era la **suma acumulada** del script sobre 6-7 guardados del Excel APM de Tekiio (~1,6-2,3s por guardado), no el costo individual — corrección documentada en [medicion-apm.md](../medicion-apm.md).

## 2. Cambio propuesto

Mover la propagación de tax codes a **`beforeSubmit`**, operando directamente sobre `context.newRecord`. Los cambios se persisten **junto con el guardado original** del sistema → se elimina el `record.load()` **y** el `save()` adicional.

**Ahorro medido (ya no estimado):** 30 GU por transacción — el **100% del footprint de governance del script**, verificado empíricamente en 5 corridas — más la eliminación del evento de guardado extra que hoy re-dispara los demás UserEvents del registro en cada transacción.

## 3. El riesgo central (lo que decide si es viable)

> **¿La sublist `taxdetails` de SuiteTax ya está calculada y poblada en `beforeSubmit`?**

- En `afterSubmit` está **garantizado** (el registro ya fue guardado y SuiteTax procesó). **Es muy probable que el script esté en `afterSubmit` exactamente por esto.**
- En `beforeSubmit` **no se puede asumir**: el momento en que el motor SuiteTax arma `taxdetails` puede variar según el **contexto de origen** de la transacción.

Si movemos a `beforeSubmit` y `taxdetails` **no** está listo, `custcol_l598_codigo_impuesto`/`_tasa_impuesto` quedarían **vacíos o incorrectos** → **CFE mal formado → rechazo DGI**. Este riesgo es inaceptable sin validación previa.

### Contextos que la validación DEBE cubrir
- Alta/edición manual por **UI** (rol `URU - Contador`).
- **Transformación** (Factura desde Orden, NC desde Factura).
- **Importación CSV** (si se usa en producción).
- Creación por **script / API / workflow** (si aplica).

## 4. Plan de validación (obligatorio, ANTES de aplicar)

**Experimento no intrusivo** (solo lectura + log, sin cambiar comportamiento):

1. Agregar temporalmente un `beforeSubmit` de **diagnóstico** que registre, sin modificar nada:
   - `getLineCount("taxdetails")` y, por línea, si `taxcode`/`taxrate` vienen poblados **en ese momento**.
   - `context.type` y el contexto de ejecución (`runtime.executionContext`).
2. Ejecutar los **casos UAT** de la demo (Orden/Factura/NC de Venta y Compra) + los contextos del punto 3.
3. Comparar contra lo que hoy ve `afterSubmit`.

**Criterio de éxito:** `taxdetails` completo y correcto en `beforeSubmit` en el **100%** de los contextos relevados.

## 5. Escenarios de decisión

| Resultado de la validación | Decisión |
|---|---|
| `taxdetails` **siempre** listo en `beforeSubmit` | ✅ Aplicar el cambio (ahorro pleno) |
| Listo en UI/transformación pero **no** en algún contexto (p. ej. CSV) | ⚠️ **Híbrido**: `beforeSubmit` cuando está disponible, *fallback* a `afterSubmit` cuando no |
| **Nunca** confiable en `beforeSubmit` | ❌ No mover. Buscar otra optimización (reducir alcance del save, `submitFields` donde aplique, etc.) |

## 6. Caracterización (cuando se aplique)

Comparar **línea por línea** `custcol_l598_codigo_impuesto` y `custcol_l598_tasa_impuesto` entre el original (`afterSubmit`) y el refactor (`beforeSubmit`), para **cada** caso UAT. Deben ser **idénticos**. Cualquier diferencia aborta el cambio.

## 7. Qué se necesita de Tekiio

- [ ] **Aprobar** el cambio de entry point (#8) para pasar a la fase de validación.
- [ ] Habilitar la ejecución del **experimento de diagnóstico** en la cuenta de dev.
- [ ] Confirmar **todos los contextos** de creación de transacciones en producción (UI / CSV / API / workflow / transformación) para cubrirlos en la validación.
- [ ] Confirmar si en Uruguay puede haber **múltiples `taxdetails` por línea** (impuestos compuestos) — relacionado con el hallazgo STC-A3.

## 8. Relación con otros hallazgos del script

- **STC-A2** (manejo de error del `save`): si se elimina el `save`, el hallazgo A2 **desaparece** (ya no hay segundo save que pueda fallar). El cambio de entry point lo resuelve de raíz.
- **STC-A3** (múltiples `taxdetails` → toma `[0]`): **independiente** de este cambio; se valida por separado con el equipo fiscal.
- **STC-B1/B2/C1/D1/D2** (refactor seguro): se pueden aplicar en la misma versión `_REF` una vez aprobada la dirección, o antes como mejora incremental.

---

**Recomendación Mobeats:** aprobar el paso a **fase de validación** (experimento de diagnóstico). Es de bajo riesgo (solo lectura) y su resultado determina de forma objetiva si el cambio —el de mayor impacto de performance del proyecto— es viable.
