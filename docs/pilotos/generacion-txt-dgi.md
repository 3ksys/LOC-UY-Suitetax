# Informe de Refactor — Piloto

**Script:** `L598 - Generación TXT Localizaciones (Sched)`
**Versión refactorizada:** `L598 - Generación TXT Localizaciones (Sched)_REF.js`
**Equipo:** Mobeats · **Cliente:** Tekiio · **Localización:** Uruguay (SuiteTax)
**Alcance aprobado:** B (Governance/Performance) + C (Estándares 2.1) + D (Mantenibilidad). Comportamiento del TXT **preservado**.

---

## 1. Resumen

| Métrica | Original | Refactor | Δ |
|---|---|---|---|
| Líneas de código | 844 | ~560 | **−34%** |
| `@NApiVersion` | 2.x | **2.1** | ✔ |
| Funciones >40 líneas | 3 (`execute`, `generarTXT`, `formatearNumero`) | 0 | ✔ |
| `padding_*` duplicados | sí (local + utilities) | no (usa utilities) | ✔ |
| Complejidad agrupación | **O(n²)** | **O(n)** | ✔ |
| `log.debug` (ruido) | ~25 | 4 (clave) | ✔ |
| Global leaks (`var` faltante) | 2 (`urlRT`, `body`) | 0 | ✔ |

> Métricas de GU consumidas y tiempo de ejecución: **pendientes de medición empírica en la cuenta** (ver §5).

---

## 2. Plan de Cambios (priorizado por criterio #1→#6)

Cada cambio indica **qué se modifica, por qué y qué mejora aporta**, con su **riesgo** (Bajo/Medio/Alto) y **estado**. Ordenado por la prioridad de criterios del cliente. Los cambios que alteran comportamiento (🔴 y bugs del Grupo A) NO se aplican sin aprobación registrada en [registro-aprobaciones.md](../registro-aprobaciones.md).

| Criterio | ID | Qué se modifica | Por qué | Qué mejora aporta | Riesgo | Estado |
|---|---|---|---|---|:--:|:--:|
| **#1 Integridad** | GTX-A1 | Paginar `searchRubroPublicidad` (hoy trunca a 1000) | Trunca resultados → declaración DGI incompleta | Corrige bug fiscal de correctitud | 🔴 Alto | ⏳ Pend. aprob. |
| **#1 Integridad** | GTX-A2 | Definir `resultado`/`idLogGeneral` si `archivoGenerar != "2181"` | Hoy `enviarMail` falla con undefined | Evita falla silenciosa del proceso | 🔴 Alto | ⏳ Pend. aprob. |
| **#1 Integridad** | GTX-A3 | Manejar config con 0 o 2+ resultados | Hoy sólo resuelve con exactamente 1 | Diagnóstico claro si falta/duplica config | 🟡 Medio | ⏳ Pend. aprob. |
| **#2 Governance** | B2 | `searchSavedPro` sin consumir su `.array`; helper `filtrosSubsidiariaPeriodo` | Armaba `armarArreglosSS`, que este script descartaba | Menos trabajo y GU por corrida | 🟡 Medio | 🔧 Aplicado |
| **#2 Governance** | B1 | Consolidar la doble lectura de `customsearch_l598_beta_2181` vía SuiteQL | Dos agregaciones distintas (detalle vs SUM/GROUP) de la misma fuente | Menos GU; **criterio prioritario (v2)** | 🟠 Medio-Alto | 💡 Propuesto (SuiteQL) |
| **#3 Performance** | B3 | Agrupación `(RUT+línea)` con `Map` en vez de doble loop | El original recorría los arrays acumulados → O(n²) | O(n) preservando orden (byte-idéntico) | 🟡 Medio | 🔧 Aplicado |
| **#3 Performance** | B4 | Eliminar `log.debug` masivo y `JSON.stringify` en loops | CPU + riesgo de saturar el logging | Menos tiempo y ruido | 🟢 Bajo | 🔧 Aplicado |
| **#4 Patrones** | C1 | `@NApiVersion 2.x → 2.1` | Estándar solicitado | Alineado a SuiteScript 2.1 | 🟢 Bajo | 🔧 Aplicado |
| **#4 Patrones** | C2 | `var→const/let`, literales `{}`/`[]`, arrow functions | ES6 de 2.1 | Código estándar, scope seguro | 🟢 Bajo | 🔧 Aplicado |
| **#5 Legibilidad** | D2 | Dividir `generarTXT` (196 líneas) en sub-funciones | Múltiples responsabilidades en una función | Una responsabilidad por función | 🟡 Medio | 🔧 Aplicado |
| **#5 Legibilidad** | D3 | `urlRT`/`body` con `const` (eran globales) | `var` faltante → fuga al scope global | Sin fugas globales | 🟢 Bajo | 🔧 Aplicado |
| **#5 Legibilidad** | D4 | Eliminar la rama decimal muerta de `formatearNumero` | Nunca se ejecuta (siempre `toFixed(0)`) | Menos código muerto | 🟢 Bajo | 🔧 Aplicado |
| **#5 Legibilidad** | D5 | Hardcodes → constantes; quitar `log.debug('entroooo')` y línea comentada | Intención explícita, sin ruido | Más mantenible | 🟢 Bajo | 🔧 Aplicado |
| **#6 Reutilización** | D1 | Usar `utilities.padding_left` (quitar duplicados locales) | Duplicación con la librería compartida | Una sola fuente del helper | 🟢 Bajo | 🔧 Aplicado |

### Matriz de riesgo

| Riesgo | Cant. | IDs | ¿Requiere aprobación? |
|:--:|:--:|---|:--:|
| 🟢 Bajo | 7 | B4, C1, C2, D1, D3, D4, D5 | No |
| 🟡 Medio | 4 | B2, B3, D2, GTX-A3 | Sólo GTX-A3 (altera comportamiento) |
| 🟠 Medio-Alto | 1 | B1 (candidato SuiteQL) | Al planificar |
| 🔴 Alto | 2 | GTX-A1, GTX-A2 | **Sí** |

- **Aplicados en el refactor (comportamiento intacto):** B2, B3, B4, C1, C2, D1, D2, D3, D4, D5.
- **Pendientes de aprobación (registrados):** GTX-A1, GTX-A2, GTX-A3 → [registro-aprobaciones.md](../registro-aprobaciones.md).
- **Candidato futuro:** B1 (requiere SuiteQL; prioritario por criterio v2).

---

## 3. Garantía de comportamiento (revisión manual de byte-identidad)

> ⚠️ **Corrección (2026-10-29):** la caracterización en la cuenta (§8) encontró que la inspección omitió una regresión: el `_REF` pasaba objetos `search.Filter` a `utilities.searchSavedPro`, que reasigna `operator` (solo lectura en `search.Filter`). Corregida en `152ce56`; con el fix el TXT es byte-idéntico (§8).

Se verificó por inspección que el contenido del TXT es idéntico:

- **Orden de líneas:** `Map` preserva orden de primera aparición → igual que el `concat(ctaAjena, normales)` original.
- **Construcción de línea:** `campos.join(';')` + `formatearNumero(...)` + `\r\n` por línea (incluida la última) → idéntico al `+=` original.
- **`formatearNumero`:** verificada equivalencia caso por caso (positivo, negativo, cero, NaN, vacío). El padding y el signo se mantienen (`-` + 11 dígitos / 12 dígitos).
- **Reglas de negocio intactas:** condición cuenta-ajena/beneficios, filtro rubro 514 vs publicidad, redondeo `!= 0`, mismos índices de columnas (`columns[1..16]`), mismos IDs de saved searches, parámetros y campos.

✔ **Sintaxis validada** con `node --check`.
✔ **Validación empírica byte-a-byte en la cuenta:** hecha el 2026-10-29, idénticos tras el fix (§8).

---

## 4. Recomendaciones fuera de alcance (Grupo A — requieren aprobación de Tekiio)

> Estos son **bugs preexistentes**. NO se tocaron en el refactor (cambiarían comportamiento). Se reportan para corrección **separada** y aprobada, registrados en [registro-aprobaciones.md](../registro-aprobaciones.md).

| ID | Bug | Ubicación (original) | Impacto | Riesgo | Estado |
|---|---|---|---|:--:|:--:|
| GTX-A1 | `searchRubroPublicidad` lee solo los primeros **1000** resultados (no pagina) | línea 194 | Declaración DGI incompleta si el período supera 1000 trans. de publicidad | 🔴 Alto | ⏳ Pend. aprob. |
| GTX-A2 | `resultado`/`idLogGeneral` indefinidos si `archivoGenerar != "2181"` → falla en `enviarMail` | líneas 113-131 | Falla silenciosa | 🔴 Alto | ⏳ Pend. aprob. |
| GTX-A3 | `configCarpeta`/`configNombreArchivo` solo se resuelven con exactamente 1 config | líneas 87-94 | TXT no generado sin diagnóstico claro | 🟡 Medio | ⏳ Pend. aprob. |

### Candidato no aplicado (riesgo/esfuerzo)
- **B1 — Consolidar la doble lectura de `customsearch_l598_beta_2181`:** no es la misma query (una es a nivel **detalle**, otra **SUM/GROUP**). Su unificación segura requiere **SuiteQL** (`N/query`). Estimado como mejora futura de governance.

---

## 5. Procedimiento de caracterización y medición (a ejecutar en la cuenta dev)

**Objetivo:** demostrar que el refactor produce el MISMO TXT y medir la mejora.

1. **Deploy aislado del refactor**
   - Subir `..._REF.js` como Script nuevo en NetSuite.
   - Crear el deployment con **Status = `Testing`** y **Audience** = rol/empleado de pruebas (`URU-Contador Mobeats`). Esto evita que corra junto al original.
   - Replicar los mismos parámetros (`custscript_l598_gen_txt_loc_*`).

2. **Baseline (original)**
   - Ejecutar el script **original** con un período real representativo (idealmente uno con **>1000** transacciones para exponer A1).
   - Descargar el TXT → `original.txt`. Registrar **GU** (Script Execution Log → "Units Used") y **tiempo** (inicio/fin del log).

3. **Refactor**
   - Ejecutar el `_REF` con los **mismos** parámetros (mismo período/subsidiaria).
   - Descargar el TXT → `refactor.txt`. Registrar GU y tiempo.

4. **Comparación byte a byte**
   ```bash
   # En Windows (Git Bash):
   diff <(xxd original.txt) <(xxd refactor.txt) && echo "IDÉNTICOS" || echo "DIFERENCIAS"
   # o simplemente:
   cmp original.txt refactor.txt && echo "IDÉNTICOS"
   ```
   - **Resultado esperado:** `IDÉNTICOS`. Si difieren → investigar antes de avanzar.
   - ⚠️ Nota: si el período tiene >1000 trans. de publicidad, los TXT podrían diferir por el bug **A1** (no por el refactor). Validar primero con un período <1000 para aislar el refactor.

5. **Completar la tabla comparativa**

   | Métrica | Original | Refactor | Δ % | Evidencia |
   |---|---|---|---|---|
   | Governance Units | _____ | _____ | _____ | Execution Log |
   | Tiempo de ejecución | _____ | _____ | _____ | Timestamps log |
   | Líneas de código | 844 | ~560 | −34% | repo |
   | TXT byte-idéntico | — | — | — | `cmp` |

---

## 6. Estado del piloto

- [x] Análisis y reporte de hallazgos
- [x] Refactor B+C+D (código) + validación de sintaxis
- [x] Revisión manual de byte-identidad
- [x] Documentación / justificación / recomendaciones
- [x] Acceso a la cuenta dev — **OK (2026-07-07)**
- [x] Deploy aislado del `_REF` — **2026-10-29** (ver §7)
- [x] Caracterización byte-a-byte — **2026-10-29**, idénticos tras corregir una regresión (ver §8)
- [ ] Medición GU/tiempo propia — *desbloqueada*
- [ ] Baseline de Tekiio (tiempos/métricas de sus pruebas) — **PENDIENTE** (para casos representativos y comparación de referencia)
- [ ] Validación funcional conjunta Mobeats/Tekiio

---

## 7. Deploy del `_REF` en la cuenta — 2026-10-29

| Objeto | Valor |
|---|---|
| Archivo | `SuiteScripts > Refactor LOC URU - Mobeats > L598 - Generación TXT Localizaciones (Sched)_REF.js` (id 15591; 32.325 bytes en el deploy inicial, 32.775 tras el fix de §8) |
| Script record | id **709**, `customscript_l598_gen_txt_loc_sched_ref`, `REF - L598 - Gen TXT Local (Sched)`, API 2.1 |
| Deployment | id **358**, `customdeploy_l598_gen_txt_loc_sched_ref`, **Not Scheduled**, Log Debug, Execute As Administrator |
| Original (referencia) | script id 8 (`customscript_l598_gen_txt_loc_sched`, API **2.0**), deployment `customdeploy_l598_gen_txt_loc_sched`: Not Scheduled, Debug, Administrator |

- **Desvío de deploy:** los 9 parámetros llevan prefijo `custscript_l598_gtl_` y sufijo `_ref` (IDs únicos en la cuenta; el nombre completo + `_ref` superaba los 40 caracteres). Mismos tipos y listas que el original (verificado en la pestaña Parameters).
- **Valores fijos copiados del deployment original:** Estado OK = `OK`, Estado ERROR = `ERROR`, TAFACE = `TAFACE`, Unidades Indexadas Límite = 60.000,00, Rubro = `416|Créd. Prov. Software Hab.- Art.4 Dec. 206/019`. Usuario, Subsidiaria, Período y Archivo los pasa el Suitelet en cada ejecución; en el `_REF` hay que cargarlos a mano en el deployment antes de cada corrida.
- **Sin audiencia:** un scheduled script no tiene Audience. "Not Scheduled" implica que solo corre si alguien lo ejecuta a mano.
- El nombre de salida lleva fecha y hora, así que original y `_REF` no se pisan (comprobado en §8).

---

## 8. Caracterización en la cuenta — 2026-10-29

Mismos parámetros en ambos: subsidiaria Parent Company : Uruguay, período Sep 2026, archivo BETA 2181. El original corrió por el Suitelet y el `_REF` por el deployment 358 (Scheduled, evento único, luego devuelto a Not Scheduled).

| Corrida | Resultado |
|---|---|
| Original, 00:09 | Archivo 15593 `BETA_2181_20261029_000856.txt`, 128 bytes, log 3101 |
| `_REF` v1, 00:31 (archivo de 32.325 bytes) | **Falló**: `RORV007 function searchSavedPro: Read only property: operator`; resultado "No se encontraron transacciones a informar en el TXT." (log 3102, sin archivo) |
| `_REF` v2, 09:31 (32.775 bytes, commit `152ce56`) | Archivo 15693, 128 bytes, `error:false`, log 3201, duración 20 s |

- **Regresión encontrada:** `filtrosSubsidiariaPeriodo` devolvía `search.createFilter(...)` y `generarTXT` los pasaba a `utilities.searchSavedPro`, que reasigna `arrayParams[i].operator`. El original le pasa objetos planos. El fix devuelve objetos planos y los convierte con `filtrosComoSearchFilter` solo para el `search.load` del rubro publicidad.
- **Comparación:** el contenido de 15593 y 15693 es idéntico (128 caracteres, 2 líneas, `\r\n` al final de cada una):

  `212661610019;02181;202609;218131050015;202609;505;000098699605`
  `212661610019;02181;202609;214483980016;202609;506;-00000100000`
- **Límite de la prueba:** el período tiene solo 2 líneas, así que no ejercita la ruta de >1000 resultados (GTX-A1), el filtro de rubro 514 ni la rama de publicidad con datos. La identidad está probada para este caso, no para todos.
- **No medido:** GU y tiempo comparables (el original corrió por Suitelet + task, el `_REF` por schedule). La tabla de §5 sigue sin completar en esas filas.
- **Estado del deployment 358:** Not Scheduled.
