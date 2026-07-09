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

---

**Cómo se usa:** cada script agrega sus cambios de Alto riesgo (y bugs del Grupo A) con un ID `<PREFIJO>-A<n>`. El estado avanza ⏳ → ✅/❌ sólo con confirmación de Tekiio. Recién en `✅ Aprobado` el cambio puede planificarse; al aplicarse pasa a `🔧 Aplicado`.
