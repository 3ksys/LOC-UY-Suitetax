# Carga y deploy de scripts en NetSuite

Procedimiento operativo para subir un script `_REF` a la cuenta compartida del refactor, crear su registro de Script y deployarlo **sin interferir** con los scripts originales ni con otros usuarios de la cuenta.

Es la ejecución concreta del paso **5. DEPLOY AISLADO** del [flujo por script](metodologia-refactor.md#4-flujo-por-script). El *por qué* del aislamiento está en [Metodología, §6](metodologia-refactor.md#6-aislamiento-en-la-cuenta); acá está el *cómo*.

**Fuente:** manual "Proceso Carga Script — Refactor LOC Uruguay" (Tekiio).

---

## Contexto

| Ítem | Valor |
|---|---|
| Cuenta | `3KSYS-DEV ACCT SDN` (LOC URU / LOC PAN — SUITE TAX) |
| Carpeta destino en File Cabinet | `SuiteScripts > Refactor LOC URU - Mobeats` |
| Rol de audiencia del refactor | `URU-Contador Suitetax (Mobeats)` |
| Status del deployment | `Testing` |

⚠️ La cuenta es **producción de desarrollo compartida**. Todo lo que se sube tiene que quedar contenido en la carpeta y el rol de arriba.

---

## Convención de nombres e IDs

Se define **antes** de guardar el registro.

> ⚠️ **El ID del Script es inmutable.** Una vez guardado, el campo `ID` pasa a ser texto de solo lectura: al entrar en `Editar` se puede cambiar el `NOMBRE`, pero **no el ID** (verificado en la cuenta). Un ID mal puesto solo se arregla borrando y recreando el registro.

### Límite de caracteres

> ⚠️ **El campo `NOMBRE` del Script record acepta 40 caracteres** (verificado en la cuenta: `MOBEATS - L598 - Seteo de Tax Codes [REF]` son 41 y se guardó cortado en `… [REF`, perdiendo el `]`).

Esto condiciona todo el diseño del nombre. Varios nombres de archivo del proyecto **ya superan 40 por sí solos** — `L598 - Generacion Archivo De Pagos Santander (Suitelet)` son 55. Por lo tanto:

- El nombre del Script record **no puede** replicar textualmente el nombre del archivo. Se abrevia.
- El marcador de refactor va **al principio**, no al final: la truncación corta la cola, y perder el marcador es perder lo único que distingue el refactor del original.

### Formato

| Elemento | Formato | Ejemplo |
|---|---|---|
| Archivo | `<nombre original>_REF.js` | `L598 - Seteo de Tax Codes_REF.js` |
| Script → **Name** | `REF - <prefijo> - <nombre abreviado> (<tipo>)` — máx. 40 | `REF - L598 - Seteo de Tax Codes` |
| Script → **ID** | `customscript_<slug>_ref` | `customscript_l598_seteo_tax_codes_ref` |
| Deployment → **ID** | `customdeploy_<slug>_ref` | `customdeploy_l598_seteo_tax_codes_ref` |

Si el script tiene **más de un deployment** (uno por tipo de registro), se desambigua con el tipo de registro **completo** al final. Como el slug entero no suele entrar en el límite (ver abajo), el medio descriptivo se abrevia a una **sigla** — la misma que usan los IDs de hallazgos del script en los informes:

- `customdeploy_l598_stc_ref_salesorder`, `..._stc_ref_vendorbill`, `..._stc_ref_purchaseorder` (STC = Seteo de Tax Codes)

Prioridad de supervivencia en el ID de deployment: prefijo del módulo → `_ref` → **tipo de registro completo** → el medio descriptivo (lo único que se abrevia). El tipo va completo porque es lo que distingue un deployment de otro dentro del mismo script.

- El prefijo `REF - ` agrupa todos los refactors al ordenar la lista de Scripts y es inmune a la truncación.
- No lleva prefijo `MOBEATS`: con 40 caracteres no se puede gastar 10 en eso, y la autoría ya la dan el campo `PROPIETARIO` y la carpeta `Refactor LOC URU - Mobeats` del File Cabinet.
- El marcador es siempre `REF` / `_ref`, el mismo del archivo. **No se inventa un segundo marcador** (`_refactor`, `_mobeats`, `_v3`): un solo criterio en archivo, script y deployment.
- El sufijo de tipo entre paréntesis se conserva en el nombre cuando el archivo lo tiene, por el mismo motivo de colisión que en el ID (ver abajo).
- El `slug` del ID sigue el patrón de los IDs originales de la cuenta (`customscript_l598_conexion_directa_fe_sl`), así el refactor queda alfabéticamente al lado del original.

**Ejemplos de nombre:**

| Archivo original | Script → Name | Largo |
|---|---|---|
| `L598 - Seteo de Tax Codes.js` | `REF - L598 - Seteo de Tax Codes` | 31 |
| `L598 - Conexion Directa FE (SL).js` | `REF - L598 - Conexion Directa FE (SL)` | 37 |
| `L598 - Generación TXT Localizaciones (Sched).js` | `REF - L598 - Gen TXT Local (Sched)` | 34 |
| `L598 - Generacion Archivo De Pagos Santander (Suitelet).js` | `REF - L598 - Gen Arch Pagos Sant (SL)` | 37 |

Al abreviar, el orden de prioridad de lo que **debe** sobrevivir es: `REF` → prefijo del módulo → sufijo de tipo → palabras descriptivas. Las palabras del medio son lo único negociable.

### Cómo derivar el `slug` del nombre del archivo

1. Bajar todo a minúsculas y separar palabras con `_`.
2. Quitar acentos y `ñ` → `Generación` = `generacion`.
3. Conservar el prefijo del módulo: `L598`, `L307`, `3K`, `PRY`, `PAN` → `l598`, `l307`, `3k`, …
4. **Convertir el sufijo de tipo entre paréntesis en sufijo del ID** — obligatorio:

   | En el archivo | En el ID |
   |---|---|
   | `(CL)` / `(Cliente)` | `_cl` |
   | `(UE)` | `_ue` |
   | `(SL)` / `(Suitelet)` | `_sl` |
   | `(SS)` | `_ss` |
   | `(MR)` | `_mr` |
   | `(Sched)` | `_sched` |
   | `(WF)` / `(Wf Action)` | `_wf` |

5. Conservar el sufijo `V2` si el original lo tiene → `_v2` (es una versión histórica preexistente, no nuestro refactor — ver [Metodología §5](metodologia-refactor.md#5-convención-de-nomenclatura)).
6. Cerrar siempre con `_ref`.

⚠️ **El paso 4 no es cosmético.** Hay scripts que se diferencian *únicamente* por ese sufijo: `L598 - Conexion Directa FE` existe en `(CL)`, `(SL)` y `(SS)`; `L598 - Completar Numero de Identificacion Fiscal` en `(CL)` y `(UE)`. Un ID sin el sufijo de tipo colisiona entre scripts distintos.

**Ejemplos:**

| Archivo original | ID del refactor |
|---|---|
| `L598 - Seteo de Tax Codes.js` | `customscript_l598_seteo_tax_codes_ref` |
| `L598 - Generación TXT Localizaciones (Sched).js` | `customscript_l598_gen_txt_localizaciones_sched_ref` |
| `L598 - Conexion Directa FE (SL).js` | `customscript_l598_conexion_directa_fe_sl_ref` |
| `L598 - Procesar TransaccionesV2.js` | `customscript_l598_procesar_transacciones_v2_ref` |

### Si el ID queda muy largo

> ⚠️ **El ID también tiene límite de 40 caracteres, incluyendo el prefijo** (`customscript`/`customdeploy` = 12), o sea **28 tipeados**. Verificado 2026-07-30: el campo ID del deployment deja de aceptar entrada en el carácter 28. No trunca al guardar — directamente no deja escribir más, así que un ID que "entró" está completo.

Escribir el ID **sin el prefijo** (`_l598_seteo_tax_codes_ref`): NetSuite le agrega `customscript` al guardar.

Si no entra, abreviar **palabras del medio** (`generacion` → `gen`, `identificacion` → `ident`, `validacion` → `valid`), o el medio completo a una sigla (`seteo_tax_codes` → `stc`) cuando hay que dejar lugar al sufijo de tipo del deployment. Nunca se recortan:

- el prefijo del módulo (`l598`),
- el sufijo de tipo (`_cl`, `_ue`, …),
- el `_ref` final.

Después de guardar, **verificar que el ID quedó completo** y no truncado: un `_ref` perdido por truncamiento convierte el registro del refactor en algo indistinguible del original.

La abreviatura usada se anota en el informe del script para que quede rastreable.

### Corregir un ID mal puesto

El `NOMBRE` se edita en el registro. El `ID` **no**: hay que recrear.

1. Pestaña **Despliegues** → borrar los deployments existentes (`Acciones > Eliminar` en cada uno). NetSuite no permite eliminar un Script con deployments.
2. En el Script record: `Acciones > Eliminar`. **Esto borra el registro, no el archivo** — el `.js` sigue en el File Cabinet.
3. Recrear con `Setup > Customization > Scripts > New` apuntando al archivo que ya está subido (no hace falta volver a cargarlo) y completar `NOMBRE` + `ID` **antes** de guardar.

Cuanto más temprano, más barato: sin deployments, logs ni parámetros apuntando al registro, borrar y recrear no cuesta nada.

### Antipatrones

| ❌ | Por qué |
|---|---|
| `customscript_refactor_1` | Contador sin significado: en Script Execution Logs no se sabe qué corrió. Con 73 scripts es inrastreable. |
| `customscript_seteo_tax_codes` | Sin `_ref`: se confunde con el original. |
| `MOBEATS - L598 - Seteo de Tax Codes [REF]` | 41 caracteres: NetSuite corta en 40 y se pierde justo el marcador. |
| Marcador de refactor al final del nombre | La truncación come la cola. El marcador va al principio. |
| Renombrar el original | El original **nunca** se toca, tampoco su registro. |

---

## 1. Carga del archivo al File Cabinet

Ruta: **Documents > Files > SuiteScripts**.

1. Ubicar la carpeta del proyecto: `SuiteScripts > Refactor LOC URU - Mobeats`.
2. `Add File` → seleccionar el `.js` local.
3. Verificar que el archivo aparezca listado en esa carpeta (nombre, tamaño y fecha de modificación).

> El archivo se sube a la carpeta del refactor, **nunca** sobre el original en `SuiteScripts` raíz o en `LOC URU`.

## 2. Creación del registro de Script

Ruta: **Setup > Customization > Scripts > New**.

1. En **Upload Script File**, elegir el archivo recién subido → `Create Script Record`.
2. NetSuite deduce el **Type** desde el `@NScriptType` del archivo (ej: `User Event`). Si el tipo que muestra no es el esperado, el problema está en el JSDoc del script, no en el formulario.
3. Completar **Name** e **ID** según la [convención de nombres e IDs](#convención-de-nombres-e-ids). El ID se escribe sin el prefijo (`_l598_seteo_tax_codes_ref`); NetSuite lo guarda como `customscript_l598_seteo_tax_codes_ref`.
4. `Save`.
5. Verificar en el registro guardado:
   - que el **ID completo** quedó como se esperaba (sin truncar),
   - que quedaron tildados los **entry points** correctos y **los mismos que el original**.

> **Los entry points no se eligen en el formulario.** Los checkboxes (`BEFORE LOAD` / `BEFORE SUBMIT` / `AFTER SUBMIT`) son un reflejo de solo lectura del objeto que devuelve el `define(...)` del archivo. Para cambiarlos hay que cambiar el `return` del módulo, resubir el archivo y reabrir el script record (`Editar` → `Guardar`) para que NetSuite lo re-parsee.
>
> En un refactor **deben coincidir exactamente con los del original**. Una diferencia acá invalida la caracterización, y un cambio de entry point es un hallazgo de **Grupo A** que requiere aprobación de Tekiio ([criterio v2 #8](metodologia-refactor.md#2-clasificación-de-hallazgos)).

## 3. Creación del deployment

> ⚠️ **Primero contar los deployments del original.** `Applies To` acepta **un solo tipo de registro por deployment**, así que un script que corre sobre varias transacciones tiene **varios** deployments. Además, muchos UserEvents son agnósticos del tipo de registro (usan `context.newRecord.type`), por lo que su alcance real **no está en el código: está en los deployments**.
>
> Antes de crear nada, abrir el Script record **original** → pestaña **Despliegues** y listar cada deployment con su `Applies To`. Esa lista define cuántos hay que replicar. Replicar solo uno caracteriza una fracción del comportamiento y deja el resto sin probar.

Desde el registro del Script → `Deploy Script`. **Uno por cada deployment del original.**

Campos a definir:

| Campo | Valor para el refactor | Por qué |
|---|---|---|
| **Applies To** | El registro/transacción del script original (ej: `Invoice`) | Debe coincidir con el original para poder caracterizar el mismo caso. |
| **ID** | `customdeploy_<mismo slug>_ref` — ver [convención](#convención-de-nombres-e-ids) | Trazabilidad script ↔ deployment. |
| **Status** | `Testing` | No corre en el flujo normal de la cuenta. |
| **Audience → Internal Roles** | `URU-Contador Suitetax (Mobeats)` | Aísla la ejecución del rol de pruebas del refactor. |
| **Event Type** | Según el original (vacío = todos) | Copiar del deployment original. |
| **Log Level** | `Debug` durante la caracterización | Necesario para leer la traza de ejecución. |
| **Execute As Role** | Según el original (los ejemplos usan `Administrator`) | Un cambio acá altera permisos efectivos → puede cambiar comportamiento. |
| **Deployed** | Tildado | Sin esto no ejecuta. |

⚠️ **Un UserEvent no se aísla solo con el rol** — se dispara por evento del registro. El aislamiento real lo da la combinación `Status = Testing` + **Audience** restringida.

## 4. Verificación

1. Abrir el Script Deployment guardado y confirmar: `Status = Testing`, `Deployed` tildado, `Applies To` correcto y en **Internal Roles** únicamente `URU-Contador Suitetax (Mobeats)` (con `ALL INTERNAL ROLES` **destildado**).
2. Ejecutar un caso de prueba con el rol de pruebas y confirmar en **Script Execution Logs** que corrió el `_REF` (la constante de proceso lleva sufijo `[REF]` — ver [convención de nomenclatura](metodologia-refactor.md#5-convención-de-nomenclatura)).

## 5. Antes de dar el deploy por bueno

> **Nota del manual:** revisar el deployment del **script original** para validar cómo está configurado, por si hay que ajustar alguno de los parámetros anteriores.

El original es la referencia de configuración. Cualquier diferencia de `Applies To`, `Event Type`, `Execute As Role` o parámetros del script invalida la caracterización: estarías comparando dos escenarios distintos, no dos versiones del mismo código.

---

## Checklist

- [ ] Archivo en `SuiteScripts > Refactor LOC URU - Mobeats`
- [ ] `Name` e `ID` del script según la [convención](#convención-de-nombres-e-ids), ID completo y sin truncar
- [ ] Entry points del script record **idénticos a los del original**
- [ ] Deployment creado con `Status = Testing`
- [ ] Audience = solo `URU-Contador Suitetax (Mobeats)`
- [ ] `Applies To`, `Event Type`, `Execute As Role` y parámetros comparados contra el deployment del original
- [ ] `Log Level = Debug`
- [ ] `Deployed` tildado
- [ ] ID del deployment (`customdeploy_..._ref`) alineado con el del script
- [ ] Ejecución verificada en Script Execution Logs con el rol de pruebas

---

## Relacionados

- [Metodología de refactor](metodologia-refactor.md) — proceso completo por script.
- [Plan de refactor](plan-refactor.md) — restricciones del entorno compartido.
- [Lineamientos_Refactor_Tekiio.md](requerimientos-cliente/Lineamientos_Refactor_Tekiio.md) — roles, entorno y acuerdos de trabajo.
