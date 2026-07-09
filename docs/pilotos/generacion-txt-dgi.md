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

Se verificó por inspección que el contenido del TXT es idéntico:

- **Orden de líneas:** `Map` preserva orden de primera aparición → igual que el `concat(ctaAjena, normales)` original.
- **Construcción de línea:** `campos.join(';')` + `formatearNumero(...)` + `\r\n` por línea (incluida la última) → idéntico al `+=` original.
- **`formatearNumero`:** verificada equivalencia caso por caso (positivo, negativo, cero, NaN, vacío). El padding y el signo se mantienen (`-` + 11 dígitos / 12 dígitos).
- **Reglas de negocio intactas:** condición cuenta-ajena/beneficios, filtro rubro 514 vs publicidad, redondeo `!= 0`, mismos índices de columnas (`columns[1..16]`), mismos IDs de saved searches, parámetros y campos.

✔ **Sintaxis validada** con `node --check`.
⏳ **Pendiente:** validación empírica byte-a-byte en la cuenta (§5).

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
- [ ] Deploy aislado del `_REF` (Status=Testing) — *desbloqueado, listo para ejecutar*
- [ ] Caracterización byte-a-byte (`cmp`) — *desbloqueado (no requiere baseline)*
- [ ] Medición GU/tiempo propia — *desbloqueada*
- [ ] Baseline de Tekiio (tiempos/métricas de sus pruebas) — **PENDIENTE** (para casos representativos y comparación de referencia)
- [ ] Validación funcional conjunta Mobeats/Tekiio
