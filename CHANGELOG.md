# Changelog

Todos los cambios relevantes del proyecto de refactor **LOC URU SuiteTax** se documentan acá.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Convención del proyecto: las versiones refactorizadas de cada script se identifican con el sufijo **`_REF`** y el original **nunca** se sobreescribe.

Leyenda de grupos de hallazgos: **A** correctitud · **B** governance/performance · **C** estándares 2.1 · **D** mantenibilidad.

---

## [Sin publicar]

### Añadido
- Estructura de documentación del proyecto: `docs/` (plan maestro, metodología, pilotos) y este `CHANGELOG.md`.
- **Piloto** `L598 - Generación TXT Localizaciones (Sched)_REF.js` — refactor de gobierno/performance, estándares 2.1 y mantenibilidad (grupos B+C+D). Ver [informe](docs/pilotos/generacion-txt-dgi.md).
- **Refactor** `L598 - Seteo de Tax Codes_REF.js` — B+C+D (comportamiento preservado). Ver [informe](docs/refactors/1-seteo-de-tax-codes.md) y [propuesta STC-A1](docs/propuestas/STC-A1-entrypoint-seteo-tax-codes.md).
- Priorización calibrada de los 75 scripts ([priorizacion-scripts.md](docs/priorizacion-scripts.md)) y relevamiento de flujos de prueba UAT + baseline real ([flujos-prueba-y-plan-ejecucion.md](docs/flujos-prueba-y-plan-ejecucion.md)).
- **STC-A1 aplicado (guarda híbrida)** en `L598 - Seteo de Tax Codes_REF.js`, aprobado por Tekiio el 2026-08-20. Ver [§3.bis del informe](docs/refactors/1-seteo-de-tax-codes.md#3bis-stc-a1--guarda-híbrida-aplicada-2026-08-20).
- [Informe de resultados de la implementación de STC-A1](docs/propuestas/STC-A1-resultados-implementacion.md) para Tekiio — **30 GU → 0 medidas en la cuenta**.
- [Propuesta conjunta STC-A2/A3](docs/propuestas/STC-A2-A3-manejo-error-y-multiples-taxdetails.md) — manejo de error del `save` y múltiples `taxdetails` por línea.
- [Medición APM](docs/medicion-apm.md) — procedimiento, baseline de governance del original y Fase A-bis con el resultado del híbrido.
- **Refactor** `L598 - Setear Unidad Indexada_REF.js` — C+D (9 cambios, comportamiento preservado). B1 🔴 y D6 quedan bloqueados por Tekiio; B2 espera `utilities_REF`. Ver [informe §3.bis](docs/refactors/6-setear-unidad-indexada.md#3bis-unidades-aplicadas-2026-09-15).
- **Refactor** `L598 - Asignar Rubro IVA_REF.js` — B+C+D (12 cambios, comportamiento preservado). ARI-B3 reclasificado a Grupo A; B4 🔴; B5 bloqueado por la definición de las SS. Ver [informe §3.bis](docs/refactors/4-asignar-rubro-iva.md#3bis-unidades-aplicadas-2026-09-15).
- **Refactor** `L598 - Calcular Retenciones (SS)V2_REF.js` — B+C+D (15 cambios, comportamiento preservado; los 4 bloques de posteo fiscal solo reciben cambios mecánicos). B1 y D1 🔴; B4 excluido; B5 parcial. Ver [bitácora](docs/refactors/3-calcular-retenciones-ss-bitacora.md).
- **Refactor** `L598 - Conexion Directa FE (SS)_REF.js` — B+C+D (10 completos + C1/D3 parciales, comportamiento preservado). 4362 → 4048 líneas: 4 funciones muertas y bloques comentados fuera. B1, B5, D1 🔴; B2 excluido (tipos de campo); D5 reclasificado a corrección; B7 espera `utilities_REF`. Ver [bitácora](docs/refactors/5-conexion-directa-fe-ss-bitacora.md).

### Cambiado (refactor — comportamiento preservado)
- **Generación TXT Localizaciones (Sched):**
  - Agrupación de transacciones **O(n²) → O(n)** con `Map` preservando orden de salida *(B)*.
  - Eliminado `log.debug` masivo y `JSON.stringify` dentro de loops *(B)*.
  - `@NApiVersion 2.x → 2.1`; `var → const/let`; `new Object()/new Array() → {}/[]`; arrow functions *(C)*.
  - `padding_left/right` duplicados eliminados; se usa `utilities.padding_left` *(D)*.
  - `generarTXT` (196 líneas) dividida en `agruparTransacciones`, `construirContenidoTXT`, `consultarConfiguracion`, `filtrosSubsidiariaPeriodo` *(D)*.
  - Fuga a scope global corregida (`urlRT`, `body`) y rama muerta de `formatearNumero` eliminada *(D)*.
  - Resultado: **844 → ~560 líneas (−34%)**. Contenido del TXT verificado byte-idéntico por revisión manual; validación empírica pendiente.
- **Seteo de Tax Codes:**
  - Match de `taxdetails` **O(n×m) → O(n)** con `Map` (primer match gana) *(B)*.
  - Eliminado el 2º loop de solo-logging y los `log.debug` de dump *(B)*; `N/search` sin uso *(C)*; `arrayTaxCodes` que sólo alimentaba un log *(D)*.
  - **STC-A1 (aprobado por Tekiio 2026-08-20) — guarda híbrida `beforeSubmit`/`afterSubmit`** *(A)*: las columnas se escriben durante el guardado del sistema cuando la sublist `taxdetails` ya está completa, con *fallback* automático al `load`+`save` original cuando no lo está. La verificación es sobre el dato, no sobre el contexto — cubre UI, CSV, integraciones y cualquier contexto futuro sin lista que mantener.
  - **Resultado medido en la cuenta (`vendorcredit` 15227, 2026-08-20): 30 GU → 0 y 2 → 0 operaciones de registro**, con output byte a byte idéntico (líneas y sublist `apply`). Es el 100% del footprint de governance del script, más la eliminación del guardado extra que re-disparaba los demás UserEvents. [Evidencia](docs/caracterizacion/1-seteo-de-tax-codes.md#caracterización-del-híbrido-stc-a1--vendorcredit-15227-2026-08-20).
  - `desaplicarYAplicarNC` **no** se ejecuta en la rama inline: quedó probado que era un workaround del segundo save. Se conserva intacto en la rama de fallback.
  - Caracterización pendiente para `salesorder`, `estimate`, `purchaseorder` y `vendorbill`; los tipos con CFE siguen bloqueados por el middleware CAE.

### Pendiente de aprobación (bugs preexistentes — NO aplicados)
> No se corrigen dentro del refactor. Requieren cambio separado y aprobación explícita de Tekiio.
- **A1** — `searchRubroPublicidad` trunca a 1000 resultados (no pagina): riesgo de declaración DGI incompleta. 🔴 Alto.
- **A2** — `resultado`/`idLogGeneral` indefinidos si `archivoGenerar != "2181"`: falla en `enviarMail`. 🔴 Alto.
- **A3** — `configCarpeta`/`configNombreArchivo` solo se resuelven con exactamente 1 config. 🟡 Medio.
- ~~**STC-A1**~~ — ✅ **Aprobado por Tekiio (2026-08-20) y aplicado** en su variante híbrida. Ver arriba.
- **STC-A2** — `Seteo de Tax Codes`: manejo de error del `save`. 🔴 Alto. ~~(se resuelve con STC-A1)~~ **corregido**: el híbrido conserva el `save` en la rama de fallback, así que el hallazgo sobrevive con alcance reducido. [Propuesta](docs/propuestas/STC-A2-A3-manejo-error-y-multiples-taxdetails.md).
- **STC-A3** — `Seteo de Tax Codes`: múltiples `taxdetails` por línea (toma `[0]`). 🔴 Alto (validar fiscal). [Propuesta](docs/propuestas/STC-A2-A3-manejo-error-y-multiples-taxdetails.md).

### Notas
- La consolidación de la doble lectura de `customsearch_l598_beta_2181` (candidato B1) queda diferida: requiere SuiteQL por ser dos niveles de agregación distintos.
