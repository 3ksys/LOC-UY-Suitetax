# STC-A1 — Resultados de la validación técnica

**De:** Mobeats · **Para:** Tekiio · **Fecha:** 11/08/2026
**Complementa:** el resumen de avance del 05/08 y la [propuesta STC-A1](STC-A1-entrypoint-seteo-tax-codes.md).

---

## 1. Qué validamos y por qué importa

La propuesta STC-A1 plantea mover el script `Seteo de Tax Codes` para que escriba las columnas de impuestos **durante** el guardado de la transacción, en lugar de re-cargar y re-guardar el documento completo después. El ahorro está medido: **30 unidades de governance por guardado — el 100% del consumo del script — más la eliminación de un guardado extra** que hoy vuelve a disparar el resto de los scripts.

La propuesta identificaba un riesgo central que había que despejar antes de tocar nada: *¿la información de impuestos que el script necesita (la sublista `taxdetails` de SuiteTax) ya está calculada y correcta en ese momento del guardado?* Si no lo estuviera, el cambio produciría CFE mal formados. Ese riesgo es lo que validamos.

## 2. Cómo lo validamos (sin tocar nada)

Desplegamos un **script de diagnóstico de solo lectura** — no modifica ninguna transacción, solo registra — bajo el mismo esquema de aislamiento de todo el proyecto (Status Testing + rol de pruebas Mobeats). En cada guardado fotografía la sublista de impuestos **dos veces**: en el momento propuesto (antes de persistir) y en el momento actual (después, exactamente como la ve el script de hoy). Si ambas fotos son idénticas, el cambio es seguro para ese caso.

Con ese instrumento ejecutamos **8 escenarios** que cubren alta manual, ediciones (incluyendo cambios de artículos y cantidades) y transformaciones entre transacciones — en ventas y compras, siempre sobre transacciones de prueba propias y sin tocar documentos CFE.

## 3. Resultados: 8 de 8 idénticos

| # | Escenario | Transacción de prueba | Resultado |
|---|---|---|:--:|
| 1 | Alta manual — venta | Estimaciones 15400 y 15401 | ✅ Idéntico |
| 2 | Alta manual — compra | Orden de compra 15408 | ✅ Idéntico |
| 3 | Edición sin cambios | Estimación 15399 | ✅ Idéntico |
| 4 | Edición cambiando cantidad | Estimación 15400 | ✅ Idéntico |
| 5 | Edición **cambiando un artículo por otro de distinta tasa** | Estimación 15400 | ✅ Idéntico — el sistema recalcula a tiempo, sin datos viejos |
| 6 | Transformación Estimación → Orden de venta | 15401 → 15402 | ✅ Idéntico |
| 7 | Transformación Orden de compra → Factura de proveedor | 15408 → 15409 | ✅ Idéntico |
| 8 | Transformación Factura → Crédito de proveedor | 15409 → 15410 | ✅ Idéntico |

En los 8 escenarios, la información de impuestos estaba **completa, actualizada y correctamente vinculada a las líneas** en el momento propuesto. Incluimos a propósito los casos más exigentes: el cambio de artículo en plena edición (donde datos "viejos" habrían aparecido si existiera el problema) y las transformaciones (donde los datos nacen copiados de otra transacción). La evidencia completa — logs estructurados de cada corrida, apareados por transacción — está en la [documentación del experimento](STC-A1-experimento-diagnostico.md).

## 4. Qué falta para el 100%

El criterio de la propuesta exige cubrir **todos** los contextos de creación que existan en producción. Nos falta lo que no podemos responder solos:

| Pendiente | Qué necesitamos de Tekiio |
|---|---|
| Importación CSV / API / integraciones / workflows | **Confirmar si en producción se crean transacciones por estas vías.** Si la respuesta es "solo por pantalla", estos casos se descartan y la validación queda completa. Si existen, los cubrimos con el mismo instrumento (ya desplegado) |
| Tipos con CFE (Factura de venta, NC, Ticket) | Se validan con el mismo procedimiento cuando se destrabe el middleware CAE — el instrumento ya tiene deployments listos |

## 5. Pedido concreto

1. **Confirmar los contextos de creación de producción** (punto anterior — una respuesta de una línea puede cerrar la validación).
2. **Aprobar la aplicación de STC-A1** sobre la versión refactorizada (`_REF`), condicionada a ese cierre. La implementación se caracterizará después con el mismo método byte-a-byte del resto del proyecto: original vs refactor sobre las mismas transacciones, cero diferencias o se aborta.

---

*Datos técnicos de respaldo: script de diagnóstico `customscript_l598_diag_stc_a1` (solo lectura, logs Audit "DIAG-A1"), 5 deployments aislados con el rol de pruebas. Medición de governance: APM, 5 corridas sobre 5 tipos de registro, 30 GU exactas en todas (ver resumen del 05/08).*
