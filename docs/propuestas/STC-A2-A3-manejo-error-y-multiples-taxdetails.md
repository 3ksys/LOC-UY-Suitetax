# Propuesta Técnica — STC-A2 y STC-A3

## Dos hallazgos de correctitud en `L598 - Seteo de Tax Codes` que Mobeats no puede resolver por su cuenta

**De:** Mobeats · **Para:** Tekiio · **Fecha:** 2026-08-20
**Estado:** **STC-A2 → ✅ Aprobado y 🔧 aplicado** (Tekiio, 2026-09-07: Alt 2 + Alt 1, sobre la estructura de LOG de FE) · **STC-A3 → ⏳ sigue pendiente de definición**
**Relacionada:** [propuesta STC-A1](STC-A1-entrypoint-seteo-tax-codes.md) (aprobada 2026-08-20) · [informe de refactor](../refactors/1-seteo-de-tax-codes.md) · [registro de aprobaciones](../registro-aprobaciones.md)

---

## 0. Por qué llegan como propuesta y no como cambio aplicado

La [metodología del proyecto](../metodologia-refactor.md#2-clasificación-de-hallazgos) clasifica los hallazgos en cuatro grupos. Los de **Grupo A — Correctitud** (bugs que cambian comportamiento) **no entran al refactor automáticamente**: se documentan, se proponen y se aplican sólo con aprobación de Tekiio. STC-A2 y STC-A3 son los dos hallazgos de Grupo A que quedan abiertos en este script después de STC-A1.

Ninguno de los dos bloquea la caracterización de STC-A1 en curso. El código actual **preserva el comportamiento original en ambos casos**, de forma deliberada y documentada.

Los dos necesitan definición de Tekiio, pero **no son el mismo tipo de pendiente**:

| | Qué falta | Quién decide |
|---|---|---|
| **STC-A2** | Elegir entre alternativas técnicas con distinto impacto en el usuario | Tekiio (producto / funcional) |
| **STC-A3** | Responder una pregunta fiscal que determina si el hallazgo siquiera existe | Equipo fiscal / DGI |

---

# STC-A2 — El fallo silencioso del `save()`

> **Resuelto (2026-09-07).** Tekiio aprobó la **Alternativa 2 + Alternativa 1**, con la precisión de reutilizar las tablas y registros de detalle de LOG del proceso de Facturación Electrónica (`customrecord_l598_fact_elec_log` / `_dlog`) en lugar de un campo custom de cabecera — lo que responde el primer bullet del §5. Implementación, límites y los dos códigos que faltan definir en la cuenta: [refactor §3.ter](../refactors/1-seteo-de-tax-codes.md#3ter-stc-a2--marcado-del-fallo-aplicado-2026-09-07).

## 1. El problema

Todo el cuerpo del `afterSubmit` está envuelto en un `try/catch` cuya única acción es escribir en el log:

```js
} catch (error) {
    log.error(proceso, `Error NetSuite Excepcion - detalles: ${error.message}`);
}
```
[`L598 - Seteo de Tax Codes_REF.js:150-152`](../../LOC%20UY/L598%20-%20Seteo%20de%20Tax%20Codes_REF.js#L150-L152) · idéntico al original ([`:56`](../../LOC%20UY/L598%20-%20Seteo%20de%20Tax%20Codes.js#L56))

El `objRecord.save()` que persiste los tax codes está dentro de ese bloque. **Si falla, la transacción ya quedó guardada por el sistema — sin las columnas de impuestos — y el flujo continúa como si nada.** El usuario ve un guardado exitoso. Nadie recibe una alerta.

**La consecuencia es fiscal, no técnica:** `custcol_l598_codigo_impuesto` y `custcol_l598_tasa_impuesto` alimentan el CFE. Una transacción sin esos valores produce un **CFE mal formado**, y el problema se descubre cuando DGI lo rechaza — o peor, cuando no lo rechaza.

> ⚠️ **Alcance corregido (2026-09-07) — el riesgo fiscal no es uniforme por tipo de transacción.**
>
> Los logs de la invoice 15822 probaron que en varios tipos hay **dos** scripts escribiendo esas dos columnas: este y `L598 -Transacción (Servidor)`, que por la duplicación **TRS-D1** hace el mismo trabajo y **escribe último**. Donde eso pasa, un fallo silencioso del `save` de STC **queda tapado**: TRS escribe los tax codes igual y el CFE sale bien formado.
>
> El riesgo fiscal de STC-A2 es pleno solo donde STC es el **único** escritor:
>
> | Tipo | ¿TRS escribe estas columnas? | Riesgo de STC-A2 |
> |---|---|---|
> | `purchaseorder` | **no tiene deployment de TRS** | 🔴 pleno |
> | `salesorder` | tiene deployment, pero hace *early return* (TRS-A2) | 🔴 pleno |
> | `invoice`, `creditmemo`, `cashsale`, `cashrefund`, `estimate`, `vendorbill`, `vendorcredit` | sí | 🟡 fallo enmascarado |
>
> Esto **no invalida** el marcado. Seguir sin saber que el `save` falló es un problema en cualquier tipo, y depender de que otro script tape el fallo es una **garantía accidental, no un diseño** — desaparece el día que se defina un dueño único (TRS-D1). Pero acota dónde la consecuencia es *fiscal* y dónde es solo de trazabilidad, y eso cambia la prioridad de la Saved Search de intercepción.
>
> Evidencia: [caracterización § invoice 15822](../caracterizacion/1-seteo-de-tax-codes.md#invoice-15822--quién-escribe-las-columnas-en-invoice-2026-09-07).

**Agravante de detectabilidad:** los Script Execution Logs de NetSuite se purgan. Un problema fiscal puede aparecer meses después, cuando la única evidencia de qué pasó ya no existe.

## 2. Qué cambió con STC-A1 (y qué no)

Al aprobar STC-A1 se anotó que este hallazgo *"se resuelve solo"*, porque al eliminar el segundo `save()` desaparecía el punto de fallo. **Eso era cierto para la variante `beforeSubmit` pura, no para la híbrida que finalmente se implementó** — corrección registrada el 2026-08-20.

La guarda híbrida conserva el `load`+`save` en la **rama legacy** (el fallback que corre cuando la sublist `taxdetails` no está disponible en `beforeSubmit`). Por lo tanto:

| | Antes de STC-A1 | Después del híbrido |
|---|---|---|
| Transacciones expuestas | **100%** — todas pasaban por el `save` | Sólo las que caen a la rama legacy |
| Criticidad de un fallo | Alta | **Más alta**, en términos relativos |

La segunda fila no es un error de tipeo. La rama legacy corre **únicamente cuando la guarda ya detectó una anomalía**. Un fallo ahí es un segundo problema encima de uno ya excepcional: exactamente el escenario donde menos se puede permitir el silencio.

## 3. Alternativas

| # | Alternativa | Impacto en el usuario | Detectable | Grupo |
|:--:|---|---|:--:|:--:|
| 0 | Dejar como está | Ninguno | ❌ | — |
| 1 | **Diagnóstico específico en el log** — distinguir "falló el `save`" de "no encontré `taxdetails`", que hoy se confunden en el mismo mensaje | Ninguno | ⚠️ Sólo hasta que se purgue el log | D |
| 2 | **Marcar la transacción** en un campo custom de estado (ej. `custbody_l598_stc_error`) + Saved Search de monitoreo | Ninguno en el guardado; visible en listados y reportes | ✅ Permanente | **A** |
| 3 | **`throw` en `afterSubmit`** | Pantalla de error tras el guardado | ✅ Inmediato | **A** |
| 4 | **Bloquear el guardado desde `beforeSubmit`** cuando falten tax codes | El usuario no puede guardar | ✅ Inmediato — **previene** el dato malo | **A** |

**Sobre la alternativa 3, un punto técnico que conviene tener presente:** en NetSuite, una excepción en `afterSubmit` **no revierte el guardado** — el registro ya está comprometido cuando ese entry point corre. Es decir, el `throw` le muestra un error al usuario **pero la transacción queda guardada igual, y mal**. Se combina lo peor de los dos mundos: fricción para el usuario sin prevención del dato incorrecto. Mobeats puede confirmarlo con una prueba controlada en la cuenta si Tekiio lo considera necesario antes de descartarlo.

**La alternativa 4 sí previene**, porque un `throw` en `beforeSubmit` aborta el guardado antes de persistir. Es también la más invasiva: convierte un problema de datos en un bloqueo operativo. Sólo tiene sentido si Tekiio considera que **una transacción sin tax codes nunca debe existir** en la base.

## 4. Recomendación de Mobeats

**Alternativa 2 + alternativa 1** (marca en campo custom, con diagnóstico específico en el log).

El razonamiento: el problema real de STC-A2 no es que el fallo ocurra — es que **es invisible**. La alternativa 2 lo hace encontrable de forma permanente y consultable, sin tocar la experiencia del usuario ni introducir un bloqueo operativo. Es la respuesta proporcional a un fallo que, tras el híbrido, debería ser excepcional.

La alternativa 4 queda disponible si Tekiio define que la ausencia de tax codes es un bloqueante duro. Es una decisión de negocio, no técnica, y por eso no la tomamos nosotros.

## 5. Qué necesitamos de Tekiio (STC-A2)

- [ ] **Elegir alternativa** (0-4, o combinación).
- [ ] Si es la 2: **confirmar si crear un campo custom de cabecera** en las transacciones alcanzadas es aceptable, o si existe ya un mecanismo de marcado/log de errores en la localización que convenga reutilizar (los scripts `Grabar Cabecera/Detalle LOG Proceso FE` sugieren que sí).
- [ ] Si es la 4: **confirmar que bloquear el guardado es aceptable operativamente** para los usuarios de `URU - Contador`.

---

# STC-A3 — Múltiples `taxdetails` por línea

## 1. Qué hace el código hoy

Para cada línea de la transacción, el script busca su impuesto en la sublist `taxdetails` usando `taxdetailsreference` como vínculo. **Si esa referencia devuelve más de un resultado, toma el primero y descarta el resto sin dejar registro.**

En el original era un `filter(...)[0]` ([`:82`](../../LOC%20UY/L598%20-%20Seteo%20de%20Tax%20Codes.js#L82)); en el refactor es un `Map` que conserva el primer valor por clave ([`indexarTaxDetails`](../../LOC%20UY/L598%20-%20Seteo%20de%20Tax%20Codes_REF.js#L160)). **La semántica es idéntica** — se preservó a propósito, y esa equivalencia está verificada en la [revisión manual de comportamiento](../refactors/1-seteo-de-tax-codes.md#3-garantía-de-comportamiento-revisión-manual).

## 2. Por qué puede importar

Si una línea puede tener **impuestos compuestos** — dos o más tributos sobre el mismo renglón — entonces las columnas `custcol_l598_codigo_impuesto` y `custcol_l598_tasa_impuesto` sólo pueden representar a uno de ellos. El CFE informaría un impuesto parcial sobre esa línea.

**Si en Uruguay eso no ocurre, el hallazgo no existe** y se cierra sin cambio de código. Esa es la pregunta.

## 3. Lo que Mobeats no puede decidir

No es una limitación de acceso ni de tiempo: es que la respuesta correcta **depende del criterio fiscal y del formato del CFE**, no del código. Si los impuestos compuestos existieran, habría que definir además qué se informa en esas dos columnas: ¿el impuesto principal? ¿la suma de las tasas? ¿el CFE admite varios impuestos por línea y el modelo de datos actual se queda corto? Ninguna de esas respuestas se deduce leyendo el script.

## 4. Lo que sí podemos aportar: convertir la pregunta en dato

Mismo enfoque que resolvió STC-A1. En lugar de esperar la definición teórica, **medimos si el caso ocurre en la cuenta**.

Es una línea de log en el indexado: cuando una `taxdetailsreference` aparece más de una vez, registrar la transacción, la línea y los códigos en conflicto. **Costo cero de governance, sin cambio de comportamiento** — sólo observa lo que ya se está recorriendo.

Con eso, en pocas semanas de operación normal la pregunta se responde con evidencia:

| Resultado de la medición | Consecuencia |
|---|---|
| Cero ocurrencias | STC-A3 se cierra como hallazgo teórico. Sin cambio de código |
| Ocurrencias detectadas | Se lleva al equipo fiscal con casos reales — transacción, línea y códigos concretos, no una hipótesis |

## 5. Qué necesitamos de Tekiio (STC-A3)

- [ ] **La pregunta de fondo:** ¿en la localización uruguaya una línea de transacción puede estar alcanzada por más de un impuesto simultáneamente? *(Esta consulta ya figuraba en el §7 de la propuesta STC-A1 y quedó sin responder — se repone acá.)*
- [ ] **Aprobar la instrumentación de detección** (punto 4). Es de riesgo nulo — sólo lectura y log — y no requiere esperar la respuesta fiscal: se puede desplegar en paralelo.

---

## 6. Resumen del pedido

| ID | Qué pedimos | Bloquea a |
|---|---|---|
| **STC-A2** | Elegir alternativa de manejo de error (recomendación: marca + log específico) | Nada. Se aplica cuando se defina |
| **STC-A3** a | Responder si existen impuestos compuestos por línea en UY | La decisión de fondo |
| **STC-A3** b | Aprobar el log de detección (riesgo nulo, sólo lectura) | Nada. Se puede desplegar ya |

Ninguno de los tres bloquea la caracterización de STC-A1, que sigue su curso.
