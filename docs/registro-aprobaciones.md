# Registro de Aprobaciones — Cambios de Alto Riesgo

Registro central del proyecto. Toda modificación clasificada como **Alto riesgo**, o cualquier cambio que **altere el comportamiento funcional** (p. ej. corrección de bugs del Grupo A, cambios de entry point `afterSubmit`↔`beforeSubmit` — criterio #8), debe estar registrada acá y **aprobada explícitamente por Tekiio antes de planificarse o aplicarse**.

> **Regla (criterio #1 + criterios de aceptación):** ningún cambio de Alto riesgo se aplica sin una fila en estado `✅ Aprobado`, con responsable y fecha.

## Estados

⏳ Pendiente · ✅ Aprobado · ❌ Rechazado · 🔧 Aplicado (post-aprobación)

## Registro

| ID | Script | Cambio propuesto | Riesgo | Estado | Solicitado (por / fecha) | Aprobado (por / fecha) | Notas |
|----|--------|------------------|:------:|:------:|--------------------------|------------------------|-------|
| GTX-A1 | Generación TXT Localizaciones (Sched) | Paginar `searchRubroPublicidad` (hoy trunca a 1000 resultados) | 🔴 Alto | ⏳ Pendiente | Mobeats · 2026-07-07 | — | Bug fiscal: declaración DGI incompleta si el período supera 1000 transacciones de publicidad |
| GTX-A2 | Generación TXT Localizaciones (Sched) | Garantizar `resultado`/`idLogGeneral` definidos si `archivoGenerar != "2181"` | 🔴 Alto | ⏳ Pendiente | Mobeats · 2026-07-07 | — | Hoy falla en `enviarMail` (undefined) |
| GTX-A3 | Generación TXT Localizaciones (Sched) | Manejar configuración con 0 o 2+ resultados (hoy sólo resuelve con exactamente 1) | 🟡 Medio | ⏳ Pendiente | Mobeats · 2026-07-07 | — | TXT no se genera sin diagnóstico claro |
| STC-A1 | Seteo de Tax Codes | Mover de `afterSubmit` a `beforeSubmit` (elimina `record.load()`+`save()` ≈30 GU/transacción) — #8 | 🔴 Alto | 🔧 Aplicado | Mobeats · 2026-07-09 | **Tekiio · 2026-08-20** | **El mayor ahorro de performance del proyecto.** Aplicado en su variante **híbrida** (guarda de completitud + fallback a `afterSubmit`), por el requisito de Tekiio de asumir cualquier contexto de creación. Ver [propuesta](propuestas/STC-A1-entrypoint-seteo-tax-codes.md) y [refactor §3.bis](refactors/1-seteo-de-tax-codes.md#3bis-stc-a1--guarda-híbrida-aplicada-2026-08-20). Pendiente: caracterización |
| STC-A2 | Seteo de Tax Codes | Manejo de error del `save`: hoy si falla, la transacción queda sin tax codes sin alerta | 🔴 Alto | 🔧 Aplicado | Mobeats · 2026-07-09 | **Tekiio · 2026-09-07** | Aprobado **Alt 2 + Alt 1**, reutilizando la estructura de LOG del proceso de FE (`customrecord_l598_fact_elec_log` / `_dlog`) en lugar de un campo custom de cabecera. Descartadas: Alt 0 (riesgo fiscal), Alt 3 (el `throw` en `afterSubmit` no revierte el guardado), Alt 4 (bloqueo operativo). Ver [propuesta STC-A2/A3](propuestas/STC-A2-A3-manejo-error-y-multiples-taxdetails.md) y [refactor §3.ter](refactors/1-seteo-de-tax-codes.md#3ter-stc-a2--marcado-del-fallo-aplicado-2026-09-07). **Pendiente de dato:** códigos de estado y de mensaje en la cuenta |
| STC-A3 | Seteo de Tax Codes | `filter` de `taxdetails` devuelve >1 y toma sólo `[0]`, descarta el resto sin aviso | 🔴 Alto | ⏳ Pendiente | Mobeats · 2026-07-09 | — | Validar con fiscal si en UY hay impuestos compuestos por línea. Ver [propuesta STC-A2/A3](propuestas/STC-A2-A3-manejo-error-y-multiples-taxdetails.md) — incluye instrumentación de detección (riesgo nulo) para responder con datos |

---

**Cómo se usa:** cada script agrega sus cambios de Alto riesgo (y bugs del Grupo A) con un ID `<PREFIJO>-A<n>`. El estado avanza ⏳ → ✅/❌ sólo con confirmación de Tekiio. Recién en `✅ Aprobado` el cambio puede planificarse; al aplicarse pasa a `🔧 Aplicado`.
