# Propuesta Técnica — Grupo A de `Transacción (Servidor)`

## Ocho hallazgos de correctitud que requieren decisión de Tekiio

**De:** Mobeats · **Para:** Tekiio · **Fecha:** 2026-08-20
**Estado:** ⏳ Pendiente de definición · **8 de 8 sin responder**
**Ver también:** [Grupo A — documento único de decisión](GRUPO-A-consolidado.md), que consolida estos 8 con los 5 pendientes de los otros scripts.
**Script:** `L598 -Transacción (Servidor)` (2.128 líneas, 3 entry points) · **Análisis completo:** [informe](../refactors/2-transaccion-servidor.md)

---

## 0. Por qué llega como propuesta

`Transacción (Servidor)` es el script **#1 de la matriz de priorización** del proyecto: corre en casi todas las transacciones de la localización. Su análisis arrojó 25 hallazgos; **17 son de refactor seguro** (performance, estándares, mantenibilidad) y avanzan sin aprobación, con caracterización byte a byte.

Los **8 restantes son de Grupo A — correctitud**: cambian comportamiento observable. Por la [metodología acordada](../metodologia-refactor.md#2-clasificación-de-hallazgos) no se aplican dentro del refactor. Se documentan, se proponen, y se ejecutan sólo con aprobación.

**Ninguno bloqueó el refactor seguro: las 4 unidades ya están aplicadas** sobre la copia `_REF` (2026-08-20), a la espera de su caracterización byte a byte. Las versiones refactorizadas **preservan deliberadamente el comportamiento original en los 8 puntos de este documento** — ninguno de estos bugs se corrigió por cuenta propia.

**Van agrupados por tipo de decisión**, no de a uno: varios se resuelven juntos o no se resuelven.

---

# Bloque 1 — El costo por transacción (TRS-A1 y TRS-A2)

## 1.1 Qué pasa hoy

Después de que NetSuite guarda la transacción, el script **vuelve a cargar el documento completo y lo guarda otra vez** para escribir campos calculados (monto en letras, códigos de impuesto por línea, número de comprobante, datos de artículo).

Es exactamente el patrón de `Seteo de Tax Codes`, donde ese costo se midió en **30 unidades de governance por guardado — el 100% del consumo de aquel script** — y se eliminó con la solución híbrida ya aprobada e implementada ([resultados](STC-A1-resultados-implementacion.md)).

Acá hay dos agravantes propios:

**TRS-A2 — El guardado vacío.** Para **Orden de venta** y **Orden de transferencia**, toda la lógica del paso posterior al guardado se saltea… pero la recarga y el guardado extra **se ejecutan igual**. Cada orden de venta de la cuenta paga un ciclo completo de recarga y re-guardado **para no escribir absolutamente nada**.

**TRS-A1 — El resto de los tipos.** Sobre los demás, el mismo patrón se suma a las hasta 11 búsquedas que el script ejecuta por guardado.

## 1.2 Qué proponemos

**TRS-A2 primero, y por separado.** Es un *early return*: si el tipo es orden de venta o de transferencia, salir antes de la recarga. Va **en el paso posterior al guardado**, que es el único que estos tipos atraviesan sin efecto — el llenado de sucursal vacía durante el guardado sí les aplica y no se toca. **Pocas líneas, riesgo mínimo, beneficio inmediato y medible.** Es cambio de comportamiento sólo en sentido formal — deja de escribirse un registro que no cambiaba.

Lo proponemos como cambio independiente y primero de la fila: no depende de nada más y su validación es trivial (que la orden de venta quede idéntica y sin el evento de guardado extra).

**TRS-A1 después**, reutilizando el diseño híbrido ya probado en `Seteo de Tax Codes`: escribir durante el guardado del sistema cuando los datos estén disponibles, con verificación previa y retorno automático al mecanismo actual cuando no lo estén.

Dos particularidades que este script tiene y aquel no, y cómo las resolvemos:

| Obstáculo | Solución propuesta |
|---|---|
| `custbody_l598_nro_comprobante` guarda el **id interno** de la transacción, que **no existe todavía** antes de guardar | Ese campo — y sólo ese — se sigue escribiendo después, pero con **actualización de campo puntual** en vez de recargar y guardar el documento entero. **El propio código ya tiene esa alternativa escrita y comentada** (L1872-1882): cuesta aproximadamente un tercio de la operación actual |
| El toggle de aplicaciones en Nota de Crédito opera sobre el estado posterior al guardado | En `Seteo de Tax Codes` verificamos que ese mecanismo **era un workaround del guardado extra**: sin guardado extra, no hace falta. Probado el 20/08 sobre un Crédito de proveedor real — las aplicaciones quedaron intactas sin ejecutarlo. Se validaría igual acá antes de retirarlo |

## 1.3 Qué necesitamos

- [ ] **Aprobar TRS-A2** (early return). Es el más barato y el más seguro de los ocho.
- [ ] **Aprobar el paso a fase de validación de TRS-A1** — extender a este script el mismo experimento de diagnóstico de solo lectura que se usó en `Seteo de Tax Codes`, ya desplegado y sin riesgo.

> **Nota de método:** antes de cuantificar TRS-A1 vamos a **medir el consumo real de este script con APM**, como hicimos con `Seteo de Tax Codes`. No proyectamos el ahorro por analogía: lo medimos. Esa medición es de sólo lectura y no requiere aprobación; la incluiremos en el informe de resultados.

---

# Bloque 2 — Registros que quedan huérfanos (TRS-A3)

## 2.1 El problema

Al **borrar** una Nota de Crédito de compra o un Resguardo, el script intenta eliminar las retenciones asociadas (`customrecord_l598_retencion`, `customrecord_l598_retencion_nc`).

Lo hace invocando un método que **no existe** en la API de NetSuite: llama `delete` sobre el objeto del registro, cuando la operación pertenece al módulo. El error resultante cae en un bloque que **solo escribe en el log**, así que el borrado falla sin que nadie se entere.

**Consecuencia probable: las retenciones asociadas nunca se borran y quedan huérfanas**, referenciando documentos que ya no existen.

*Verificado en el código: la llamada y el bloque que traga el error. Pendiente de confirmar en la cuenta: el efecto en ejecución.*

## 2.2 Qué proponemos

Es un bug claro y la corrección es de una línea. Pero **corregirlo tiene una consecuencia que hay que decidir antes**: a partir de ese momento **empezarían a borrarse registros que hoy sobreviven**. Eso es un cambio observable, y si algún proceso o reporte depende de esas retenciones huérfanas, se vería afectado.

Además queda el pasivo histórico: los registros ya huérfanos siguen ahí.

Por eso el orden que proponemos es:

1. **Confirmar** en los logs de la cuenta que el error efectivamente ocurre (buscar `"Ocurrio un error al borrar…"`).
2. **Dimensionar** cuántos registros huérfanos existen hoy.
3. Recién entonces decidir la corrección **y qué hacer con el pasivo** — limpiarlo, dejarlo, o marcarlo.

> En el refactor ya separamos las dos ramas de borrado en funciones propias, **sin tocar el bug**. Cuando aprueben la corrección, el cambio va a ser de unas pocas líneas y aislado, no mezclado con movimientos de código.

## 2.3 Qué necesitamos

- [ ] **Acceso o confirmación sobre los logs** de la cuenta para el punto 1.
- [ ] **Definición** sobre el pasivo histórico una vez dimensionado.

---

# Bloque 3 — El monto en letras de los documentos impresos (TRS-A5 y TRS-A6)

## 3.1 El problema

El campo `custbody_l598_monto_escrito` es el **importe en letras que se imprime en el documento fiscal**. Tiene dos defectos:

**TRS-A6 — Los centavos mal formados.** La parte decimal se toma **sin normalizar a dos dígitos**. Un total de `10.50` produce **"…CON 5/100"** en vez de "50/100". Con tres decimales, "CON 567/100". El script ya tiene una función de redondeo apropiada, pero no se usa en ese camino.

**TRS-A5 — La función de navegador.** Ante un valor no numérico, el código llama a `alert()` — una función que **no existe en el servidor**. El error cae en un bloque que devuelve el texto **`"NO DISPONIBLE"`**, que puede terminar impreso en el documento fiscal.

## 3.2 Qué proponemos

Los dos juntos, porque tocan la misma función y la misma salida:

- Normalizar la parte decimal a dos dígitos. El original trae una función de redondeo adecuada que nunca se invoca — en la copia refactorizada se retiró justamente por no usarse, así que la corrección la reincorpora o resuelve el redondeo en el mismo lugar, con idéntico efecto.
- Reemplazar la llamada a `alert()` por manejo controlado del error.

**Requieren aprobación porque cambian un texto fiscal impreso.** Un documento que hoy dice "CON 5/100" pasaría a decir "CON 50/100" — que es lo correcto, pero es un cambio en un documento que ya se emitió así.

## 3.3 Qué necesitamos

- [ ] **Aprobar la corrección** de ambos.
- [ ] **Confirmar el comportamiento esperado** cuando el importe no es numérico: ¿`"NO DISPONIBLE"` es un valor aceptado por el negocio, o debería impedirse el guardado?
- [ ] Indicarnos si hay **documentos ya emitidos** con centavos mal formados que requieran alguna acción.

---

# Bloque 4 — Truncamiento silencioso sobre 1.000 resultados (TRS-A7)

## 4.1 El problema

Las tres búsquedas que completan nombre de artículo, unidad de medida, indicador de facturación y código de percepción/retención por línea leen **como máximo 1.000 resultados, sin paginar**.

Superado ese volumen, las líneas restantes **quedan sin esos datos calculados, sin ningún aviso**. Es el mismo tipo de hallazgo que `GTX-A1`, ya registrado para el script de generación del TXT de DGI.

El módulo compartido del proyecto **ya tiene funciones de búsqueda paginadas** que no se están usando.

## 4.2 Qué proponemos

Usar las funciones paginadas existentes. **El resultado sólo cambia cuando hay más de 1.000 filas**: por debajo de ese volumen el comportamiento es idéntico.

Antes de ejecutarlo queremos saber si ese volumen es alcanzable en la operación real — si nunca lo es, el hallazgo pasa a ser robustez preventiva y baja de prioridad.

## 4.3 Qué necesitamos

- [ ] **Confirmar si una transacción puede superar las 1.000 líneas / artículos / códigos de impuesto** en la operación real.
- [ ] **Aprobar la paginación** como corrección de robustez.

---

# Bloque 5 — Dos definiciones que sólo Tekiio puede dar (TRS-A4 y TRS-A8)

Estos dos no son propuestas: son **preguntas**. No podemos decidirlos desde el código.

## 5.1 TRS-A4 — Un bloque que parece estar apagado a propósito

El script tiene un bloque que, al abrir una Factura de venta nueva, precargaría sucursal, serie y caja por defecto. Está condicionado a una comparación que **probablemente nunca se cumple** (compara el contexto de ejecución en minúsculas contra un valor que NetSuite devuelve en mayúsculas) → sería **código muerto**.

Un comentario en el propio archivo dice: *"Se comenta esta funcionalidad porque está repetida… el script de cliente también la posee"*, lo que sugiere que **la desactivación fue intencional** y se hizo por esa vía.

**La pregunta:** ¿fue deliberado? Si sí, lo removemos como limpieza (sin aprobación, pasa a Grupo D). Si debía funcionar, reactivarlo es un cambio de comportamiento que hay que evaluar.

Lo confirmamos primero en la cuenta — si el bloque nunca corre, sus mensajes de log nunca deberían aparecer.

## 5.2 TRS-A8 — ¿Cuándo debe recalcularse la sucursal?

La condición que decide si se recalcula la información de sucursal incluye un término que hace que **el cálculo se dispare en casi el 100% de los guardados**, incluso cuando los campos ya están completos.

Verificado contra el código (2026-08-27), ese disparo de más **no sobreescribe datos**: en el camino ejecutable el único campo que se escribe es la sucursal, y sólo cuando está vacía. La serie y la caja se leen para decidir si recalcular, pero nunca se escriben — sus escrituras viven únicamente dentro del bloque desactivado de TRS-A4 (§5.1). El costo real del término es **consumo: búsquedas cuyo resultado se descarta**, en casi todos los guardados.

El hallazgo queda entonces partido en dos:

- **La parte técnica no necesita aprobación.** Condicionar el cálculo a que la sucursal esté vacía es equivalente en datos — verificable desde el código — y elimina las búsquedas descartadas. Se reclasifica como mejora de consumo y entra al circuito de refactor seguro, con caracterización.
- **La parte de negocio sigue siendo una pregunta, pero invertida respecto de lo que aparentaba:** hoy una sucursal ya cargada **nunca** se recalcula ni se sobreescribe, aunque cambie la ubicación de la transacción. Si eso es lo deseado, no hay nada más que hacer. Si debería recalcularse al cambiar la ubicación, eso sí es un cambio de comportamiento que requiere definición.

**La pregunta:** ¿una transacción con sucursal ya cargada debe quedar como está aunque cambie la ubicación (comportamiento actual), o debe recalcularse?

## 5.3 Qué necesitamos

- [ ] **TRS-A4:** confirmar si la desactivación del bloque fue intencional.
- [ ] **TRS-A8:** confirmar si una sucursal ya cargada debe recalcularse cuando cambia la ubicación (hoy no se recalcula nunca).

---

## 6. Resumen del pedido

| ID | Qué pedimos | Prioridad | Bloquea a |
|---|---|:--:|---|
| **TRS-A2** | Aprobar el *early return* para Orden de venta / transferencia | 🥇 Alta — el más barato y seguro | Nada |
| **TRS-A1** | Aprobar el paso a **fase de validación** (diagnóstico de solo lectura) | 🥇 Alta — el mayor ahorro | Nada; la medición arranca ya |
| **TRS-A3** | Acceso a logs para confirmar; definición sobre registros huérfanos | 🥈 Media — integridad de datos | La corrección |
| **TRS-A5/A6** | Aprobar la corrección del monto en letras + criterio para importe no numérico | 🥈 Media — texto fiscal impreso | La corrección |
| **TRS-A7** | Confirmar si se superan las 1.000 filas; aprobar paginación | 🥉 Según respuesta | La priorización |
| **TRS-A4** | ¿La desactivación del bloque fue intencional? | 🥉 Baja | Limpieza o reactivación |
| **TRS-A8** | ¿Una sucursal ya cargada debe recalcularse al cambiar la ubicación? (hoy nunca se recalcula) | 🥉 Baja | Sólo un eventual cambio de comportamiento; la mejora de consumo es refactor seguro |

**Nada de esto frenó el refactor seguro** (performance, estándares y mantenibilidad): sus 4 unidades ya están aplicadas sobre la copia `_REF` y quedan pendientes de caracterización byte a byte, como se hizo con `Seteo de Tax Codes`.

### Una pregunta más, que no es de Grupo A pero es de este script

**¿Puede haber más de un registro `customrecord_l598_datos_impositivos_emp` activo por subsidiaria?** Hoy el script lo consulta dos veces por guardado de forma redundante. Si hay uno solo, las dos consultas se unifican en una y el cambio es equivalente — no necesita aprobación, sólo esa confirmación. Si puede haber varios, no lo es y queda como está.

---

*Detalle técnico con evidencia línea por línea: [informe de análisis de `Transacción (Servidor)`](../refactors/2-transaccion-servidor.md). Estado de todos los cambios de Alto riesgo del proyecto: [registro de aprobaciones](../registro-aprobaciones.md).*
