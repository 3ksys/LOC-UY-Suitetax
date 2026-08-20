# STC-A1 — Resultados de la implementación

**De:** Mobeats · **Para:** Tekiio · **Fecha:** 20/08/2026
**Continúa:** la [validación técnica del 11/08](STC-A1-resultados-para-tekiio.md) y la [propuesta STC-A1](STC-A1-entrypoint-seteo-tax-codes.md), aprobada por Tekiio el 20/08.

---

## 1. El resultado en una línea

El script `Seteo de Tax Codes` pasó de consumir **30 unidades de governance por guardado a 0**, con el output **byte a byte idéntico** al original.

Son el **100% del consumo del script**, más la eliminación del guardado extra que hasta ahora volvía a disparar el resto de los scripts de la transacción en cada operación.

| | Antes | Después |
|---|:--:|:--:|
| Unidades de governance | **30** | **0** |
| Operaciones de registro (`load` + `save`) | **2** | **0** |
| Guardados de la transacción | 2 (el del usuario + uno extra) | **1** |
| Errores | 0 | 0 |
| Columnas de impuestos por línea | — | **idénticas** |

Medido con APM sobre la misma transacción usada como referencia en la caracterización previa (Crédito de proveedor `URU-00005`, id 15227).

## 2. Qué se implementó, y por qué así

Tekiio planteó que **hay que asumir que las transacciones pueden generarse por cualquier contexto** — CSV, integraciones — aunque hoy no se usen en la cuenta. Eso descarta validar contexto por contexto: la lista es abierta por definición.

Por eso no se aplicó el cambio "puro", sino la variante **híbrida** que la propuesta ya contemplaba:

- **Antes de guardar**, el script verifica si la información de impuestos ya está disponible y completa. Si lo está, escribe las columnas ahí mismo, aprovechando el guardado que el sistema va a hacer igual. **Costo cero.**
- **Si no lo está** — cualquier contexto, conocido o futuro, donde el cálculo no haya ocurrido todavía — el script **no escribe nada** y deja actuar al mecanismo actual, exactamente como funciona hoy.

**La verificación es sobre el dato, no sobre el contexto.** No hay una lista de contextos que mantener: una integración que todavía no existe pasa por la misma comprobación que la pantalla. Y ante cualquier duda el sistema se comporta como hoy: **se pierde el ahorro, nunca la corrección**.

Esto también responde a la observación del equipo de producto. Que NetSuite históricamente calculara los impuestos recién después de guardar es precisamente el motivo por el que el script se escribió así, y por el que el diseño **no asume** que hoy sea distinto: lo comprueba en cada guardado.

## 3. Cómo se validó

Se eligió deliberadamente **el caso que podía fallar**: el Crédito de proveedor. Es el único tipo donde el cambio altera comportamiento, porque el script incluye una rutina que desaplica y vuelve a aplicar los documentos asociados — un mecanismo que existía para proteger esas aplicaciones del guardado extra. Sin guardado extra, esa rutina no se ejecuta, y había que probar que las aplicaciones quedaban intactas.

Resultado sobre `URU-00005` (una factura aplicada por 1.220.000,00 entre 14 líneas posibles, con 4 retenciones asociadas):

| Qué se comparó | Resultado |
|---|:--:|
| Código y tasa de impuesto de la línea | ✅ idénticos |
| Importes de impuesto y totales | ✅ idénticos |
| Documento aplicado, monto y saldos | ✅ idénticos |
| Retenciones y demás facturas (sin aplicar) | ✅ intactas |
| Aplicaciones nuevas o perdidas | ✅ ninguna |

Se verificó además, en los registros de ejecución, que sólo corrió la versión de prueba: ni el script original ni los demás scripts de la localización intervinieron, de modo que el resultado es atribuible al cambio y a nada más.

## 4. Una corrección de método que vale la pena contar

La **primera** corrida informó "camino optimizado" en su registro de ejecución y produjo un resultado correcto — pero al medir el governance seguía consumiendo las 30 unidades. Un defecto técnico hacía que la segunda mitad del script no reconociera el trabajo ya hecho y lo repitiera.

Dos cosas a destacar:

1. **El diseño falló hacia el lado seguro.** Ante la duda ejecutó el mecanismo actual: resultado correcto, ahorro perdido. Es exactamente el comportamiento que se buscaba para un script que alimenta CFE.
2. **Sin medir el governance, la conclusión habría sido equivocada.** El registro del script decía una cosa y el consumo real decía otra. Se corrigió el diseño y se repitió la prueba completa, y el resultado de la sección 1 corresponde a esa segunda corrida.

Lo mencionamos porque es el criterio con el que trabajamos: **ningún ahorro se informa sin medirlo**, y cuando la evidencia contradice una conclusión previa, se corrige y se deja registrado.

## 5. Qué falta

| Pendiente | Estado |
|---|---|
| Extender la caracterización a Orden de venta, Estimación, Orden de compra y Factura de proveedor | En curso. Ninguno tiene la complejidad del Crédito de proveedor: el caso de riesgo ya está cubierto |
| Tipos con CFE (Factura de venta, NC, Ticket) | ⛔ Bloqueados por el middleware CAE. Quedamos a la espera de la revisión de Tekiio en la cuenta — e interesados en probar también una **respuesta exitosa** del facturador, como sugirieron |
| Crédito de proveedor con **2 o más documentos aplicados** | Residual anotado. La prueba se hizo con uno aplicado; el mecanismo no depende de la cantidad, pero se puede cerrar si Tekiio lo prefiere |

## 6. Pedido

1. **Tomar conocimiento del resultado** y confirmar si quieren revisarlo con el equipo de producto antes de que sigamos, como habían planteado.
2. **Destrabar el middleware CAE** — es lo único que impide completar la validación sobre los tipos que emiten CFE.
3. Para cuando corresponda: quedan abiertos **STC-A2 y STC-A3**, documentados en su [propuesta](STC-A2-A3-manejo-error-y-multiples-taxdetails.md). Ninguno bloquea lo anterior.

---

*Evidencia técnica completa: [caracterización del híbrido](../caracterizacion/1-seteo-de-tax-codes.md#caracterización-del-híbrido-stc-a1--vendorcredit-15227-2026-08-20) · [medición APM](../medicion-apm.md) · [informe de refactor](../refactors/1-seteo-de-tax-codes.md). Todo ejecutado sobre la copia `_REF` con el rol de pruebas Mobeats, sin tocar el script original ni transacciones de terceros.*
