# Documentación — Refactor LOC URU SuiteTax

Localización fiscal Uruguay para NetSuite (SuiteTax). Proyecto de refactor de SuiteScripts encarado por **Mobeats** para **Tekiio**.

## Índice

### Planificación y proceso
- [Plan de refactor](plan-refactor.md) — objetivo, alcance, fases, priorización, estado y descubrimientos.
- [Metodología de refactor](metodologia-refactor.md) — el proceso estándar por script (el "molde" que se replica en los 73 scripts).
- [Carga y deploy de scripts en NetSuite](carga-y-deploy-de-scripts.md) — procedimiento operativo: File Cabinet, script record, deployment aislado y verificación.

### Informes por script (análisis y refactor)
- [Resumen ejecutivo — 6 scripts críticos](resumen-analisis-scripts-criticos.md) — estado, patrones sistémicos y pedidos a Tekiio. **El documento para compartir.**
- [1 — Seteo de Tax Codes](refactors/1-seteo-de-tax-codes.md) — `_REF` aplicado **con STC-A1 (guarda híbrida)**. Caracterizado en `vendorcredit`: **30 GU → 0**, output idéntico.
- [2 — Transacción (Servidor)](refactors/2-transaccion-servidor.md) — análisis.
- [3 — Calcular Retenciones (SS)V2](refactors/3-calcular-retenciones-ss.md) — análisis.
- [4 — Asignar Rubro IVA](refactors/4-asignar-rubro-iva.md) — análisis.
- [5 — Conexion Directa FE (SS)](refactors/5-conexion-directa-fe-ss.md) — análisis + anexo del flujo de tipo de CFE (error 100000).
- [6 — Setear Unidad Indexada](refactors/6-setear-unidad-indexada.md) — análisis + causa raíz probable de UAT-12.

### Propuestas de cambio (Grupo A — requieren aprobación de Tekiio)
- [STC-A1 — Entry point de Seteo de Tax Codes](propuestas/STC-A1-entrypoint-seteo-tax-codes.md) — ✅ aprobada 2026-08-20, aplicada en variante híbrida.
- [STC-A1 — Diseño del experimento de diagnóstico](propuestas/STC-A1-experimento-diagnostico.md) — instrumento de solo lectura que validó el timing de `taxdetails`.
- [STC-A1 — Resultados de la validación técnica](propuestas/STC-A1-resultados-para-tekiio.md) — los 8 escenarios del experimento (11/08).
- [STC-A1 — Resultados de la implementación](propuestas/STC-A1-resultados-implementacion.md) — **30 GU → 0 medidas en la cuenta** (20/08). *Para compartir con Tekiio.*
- [STC-A2 y STC-A3](propuestas/STC-A2-A3-manejo-error-y-multiples-taxdetails.md) — manejo de error del `save` y múltiples `taxdetails` por línea. **STC-A2: 🔧 aplicado y verificado** (07/09) · **STC-A3: ⏳ pendiente de definición fiscal**.
- [Registro de aprobaciones](registro-aprobaciones.md) — estado de todos los cambios de Alto riesgo.

### Caracterización y medición
- [Seteo de Tax Codes](caracterizacion/1-seteo-de-tax-codes.md) — plan de captura original vs `_REF`, procedimiento en la cuenta, plantillas CSV y evidencia de las corridas.
- [Medición APM](medicion-apm.md) — cómo medir tiempo y governance en la cuenta, baseline del original y resultados del híbrido.

### Pilotos
- [Generación TXT DGI (Sched)](pilotos/generacion-txt-dgi.md) — piloto end-to-end. Informe completo del primer refactor.

### Requerimientos del cliente
- [Criterios_Refactor_LOC_URU.md](requerimientos-cliente/Criterios_Refactor_LOC_URU.md) — criterios de análisis, refactor y medición.
- [Lineamientos_Refactor_Tekiio.md](requerimientos-cliente/Lineamientos_Refactor_Tekiio.md) — restricciones de entorno, roles y metodología de trabajo.

### Análisis previo
- [ANALISIS-LEGACY-SUITETAX.md](analisis/ANALISIS-LEGACY-SUITETAX.md) — mapa de coexistencia SuiteTax / Legacy en el tema impuestos.
- [demo-tekiio-flujos-y-scripts.md](analisis/demo-tekiio-flujos-y-scripts.md) — rol de cada script en los flujos de Venta/Compra, arquitectura FE y retenciones, datos de prueba.
- [PROJECT-OVERVIEW.md](analisis/PROJECT-OVERVIEW.md) — visión completa: 73 scripts, módulos, flujos, tabla maestra.

### Registro de cambios
- `../CHANGELOG.md` — cambios aplicados en esta versión del refactor.

---

## Cómo se organiza esto

| Carpeta / archivo | Para qué |
|---|---|
| `docs/plan-refactor.md` | El **qué** y el **cuándo**: fases, prioridades, estado. |
| `docs/metodologia-refactor.md` | El **cómo**: proceso, disciplinas y entregables por script. |
| `docs/carga-y-deploy-de-scripts.md` | El **cómo operativo** en la cuenta: subir, crear y deployar un `_REF`. |
| `docs/requerimientos-cliente/` | Documentos que definen qué pide Tekiio (Criterios, Lineamientos). |
| `docs/analisis/` | Análisis propios del código (legacy, hallazgos transversales). |
| `docs/pilotos/` | Un informe por script piloto/refactorizado. |
| `docs/caracterizacion/` | Plan de captura y evidencia original vs `_REF` por script, más plantillas CSV. |
| `docs/propuestas/` | Cambios de **Grupo A** que no entran al refactor sin aprobación de Tekiio, más sus informes de resultados. |
| `docs/medicion-apm.md` | El **cómo se mide**: governance y tiempo en la cuenta, y por qué la métrica citable es GU. |
| `CHANGELOG.md` | Bitácora cronológica de cambios aplicados. |
