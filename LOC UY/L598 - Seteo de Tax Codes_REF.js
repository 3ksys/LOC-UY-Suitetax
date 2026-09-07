/**
 * @format
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * ============================================================================
 * REFACTOR (Mobeats) de "L598 - Seteo de Tax Codes".
 * ----------------------------------------------------------------------------
 * Alcance: A1 (entry point, híbrido) + B (performance) + C (estándares 2.1) + D (mantenibilidad).
 * Comportamiento preservado (mismos custcol_l598_codigo_impuesto/tasa por línea).
 *
 * Cambios aplicados:
 *   A1  híbrido beforeSubmit/afterSubmit con guarda de completitud (ver bloque siguiente).
 *   B1  filter O(n×m) dentro del loop -> Map indexado O(1) (misma semántica "primer match gana").
 *   B2  eliminado el 2º loop de solo-logging y los log.debug de dump (ruido en cada transacción).
 *   C1  eliminado N/search del define (se importaba pero no se usaba).
 *       Reintroducido por STC-A2 (con N/format) para escribir el LOG de FE.
 *   D1  eliminado arrayTaxCodes (sólo alimentaba un log).
 *
 * ----------------------------------------------------------------------------
 * STC-A1 — Guarda híbrida (aprobado por Tekiio, 2026-08-20)
 * ----------------------------------------------------------------------------
 * Problema: el original hacía record.load() + save() en afterSubmit para setear
 * 2 columnas por línea = 30 GU por transacción + un guardado extra.
 *
 * Solución: escribir las columnas en beforeSubmit sobre context.newRecord — los
 * cambios viajan en el guardado que el sistema ya va a hacer, costo 0 GU — PERO
 * sólo cuando se puede probar que la sublist "taxdetails" ya está poblada en ese
 * momento. La verificación es de datos, no de contexto: no hay lista de contextos
 * (UI / CSV / API / workflow / integración futura) que mantener.
 *
 *   beforeSubmit -> guarda completa   => escribe inline. 0 GU.
 *   beforeSubmit -> guarda incompleta => NO escribe nada (todo o nada) y
 *                                        afterSubmit ejecuta el load+save legacy. 30 GU,
 *                                        idéntico al comportamiento original.
 *
 * afterSubmit decide LEYENDO EL REGISTRO, nunca por estado compartido:
 * reconstruye el índice de taxdetails desde context.newRecord (0 GU, sin load) y
 * verifica que cada línea ya tenga en sus columnas EXACTAMENTE el valor que le
 * corresponde según ese índice. Si todo coincide, no hay nada que hacer y sale.
 * Si algo difiere -> load + save legacy, sin cambios respecto del original.
 *
 * ----------------------------------------------------------------------------
 * ⚠️ POR QUÉ NO HAY UNA BANDERA DE MÓDULO (corrección 2026-08-20)
 * ----------------------------------------------------------------------------
 * La primera versión de este híbrido usaba una variable de módulo (`escrituraInline`)
 * que beforeSubmit ponía en true y afterSubmit leía para saltear el legacy.
 * **No funciona: el scope del módulo NO se comparte entre beforeSubmit y afterSubmit.**
 *
 * Medido en la cuenta (vendorcredit 15227, 2026-08-20, APM SuiteScript Analysis):
 * beforeSubmit logueó `rama=inline` y consumió 0 GU / 0 operaciones de registro,
 * pero afterSubmit consumió **30 GU y 2 operaciones** — el load+save legacy corrió
 * igual, porque leyó la bandera en false. El fail-safe hizo su trabajo (output
 * byte a byte idéntico, cero errores), pero el ahorro no se materializó.
 *
 * Verificar el RESULTADO en el registro es además estrictamente mejor que preguntar
 * quién lo escribió: cubre el caso de una edición cuyas columnas quedaron obsoletas
 * (valores viejos no coinciden con el índice actual -> dispara el legacy solo).
 *
 * OBSERVABILIDAD: ambos entry points loguean SIEMPRE la rama tomada. El camino
 * feliz silencioso de la primera versión fue justamente lo que ocultó el problema
 * de arriba hasta que se midió el governance.
 *
 * Casos que caen al legacy por diseño: DELETE (no aplica), XEDIT (newRecord es
 * parcial, la sublist no está disponible), y cualquier contexto donde SuiteTax
 * todavía no haya armado taxdetails al momento del beforeSubmit.
 *
 * LÍMITE CONOCIDO: la guarda detecta "vacío o incompleto", NO "poblado pero
 * obsoleto" al momento de escribir. Ese escenario se validó empíricamente con el
 * script de diagnóstico customscript_l598_diag_stc_a1 (9/9 snapshots beforeSubmit
 * idénticos a afterSubmit, incluyendo edición con cambio de artículo, transformaciones
 * y edición de vendorcredit). Mantener el diagnóstico desplegado en paralelo.
 *
 * PENDIENTE DE CARACTERIZACIÓN: en la rama inline NO se ejecuta desaplicarYAplicarNC
 * — es un workaround del segundo save, que en esa rama no existe. **Todavía sin probar:**
 * la corrida del 2026-08-20 sobre vendorcredit 15227 terminó ejecutando el legacy, así
 * que la sublist `apply` bajo la rama inline pura sigue sin caracterizar.
 *
 * ----------------------------------------------------------------------------
 * STC-A2 — Fallo silencioso del save (aprobado por Tekiio, 2026-09-07)
 * ----------------------------------------------------------------------------
 * Problema: el catch del afterSubmit sólo escribía en el log. Si el save de la
 * rama legacy falla, la transacción ya quedó guardada por el sistema SIN las
 * columnas de impuesto — el usuario ve un guardado exitoso y el CFE sale mal
 * formado. Los Script Execution Logs se purgan, así que la evidencia desaparece.
 *
 * Aprobado: Alternativa 2 + Alternativa 1, reutilizando la estructura de LOG del
 * proceso de Facturación Electrónica en lugar de un campo custom de cabecera.
 *
 *   Alt 1  el catch registra ETAPA + error.name + error.message + contexto, en vez
 *          de un mensaje genérico que confundía "falló el save" con "no encontré
 *          taxdetails". Se emite PRIMERO: log.error no consume governance, así que
 *          es la única evidencia que sobrevive si el fallo fue por unidades agotadas.
 *   Alt 2  se graba una cabecera (customrecord_l598_fact_elec_log) + un detalle
 *          (customrecord_l598_fact_elec_dlog) con custrecord_..._dlog_rtrans
 *          apuntando a la transacción. Marca permanente y consultable por Saved
 *          Search para interceptar la transacción antes de la emisión del CFE.
 *
 * Se escribe con record.create() directo, NO invocando los scripts
 * "Grabar Cabecera/Detalle LOG Proceso FE": esos son Restlets (@NScriptType Restlet,
 * expuestos por post) que el middleware consume por HTTP. Desde un User Event
 * llamarlos exigiría un N/https dentro del guardado — latencia y un punto de fallo
 * de red extra. Se reutiliza la ESTRUCTURA DE DATOS, no el transporte, y se copia
 * campo por campo lo que hacen esos Restlets (incluida la fecha formateada como
 * DATETIMETZ en AMERICA_BUENOS_AIRES y el recorte del detalle a 3997 caracteres).
 *
 * Descartadas por Tekiio: Alt 0 (riesgo fiscal), Alt 3 (un throw en afterSubmit
 * muestra el error pero NO revierte el guardado) y Alt 4 (bloqueo operativo).
 *
 * ⚠ LÍMITE CONOCIDO — governance agotado: si el save falló porque no quedan
 * unidades, el record.create()+save() de la marca también va a fallar. Ese caso
 * queda cubierto sólo por el log.error de la Alt 1, que se purga. La marca cubre
 * los fallos por validación, permisos y campo bloqueado — la mayoría.
 *
 * ⚠ ALCANCE DELIBERADO: se marca ante EXCEPCIÓN del camino legacy. Una línea que
 * queda sin tax code por falta de taxdetailsreference NO lanza excepción y hoy sólo
 * deja un log.error en setearColumnasConTaxDetails. Extender la marca a ese caso es
 * una decisión aparte, no cubierta por la aprobación de STC-A2.
 *
 * ⚠ PENDIENTE DE DATO (ver LOG_FE más abajo): los códigos de estado y de mensaje
 * deben existir en customrecord_l598_fe_est_log / customrecord_l598_msg_log. Con
 * LOG_FE.CODIGO_ESTADO vacío o no encontrado, el detalle se graba SIN cabecera pero
 * CON la referencia a la transacción — la intercepción por Saved Search funciona igual.
 *
 * NO incluido — requiere aprobación de Tekiio (ver docs/registro-aprobaciones.md):
 *   STC-A3  múltiples taxdetails por línea (se conserva el comportamiento actual: primer match).
 *
 * NO tocado (cambiaría comportamiento): isEmpty local (reglas propias sobre arrays/strings),
 *   desaplicarYAplicarNC (workaround de negocio en NC, se conserva en la rama legacy).
 * ============================================================================
 */
define(["N/record", "N/runtime", "N/search", "N/format"], function (record, runtime, search, format) {
	/* global define log */
	/* eslint-disable quotes */

	const SUBLISTS_DESTINO = ["item", "expense"];

	const STC_A2 = "STC-A2";

	/**
	 * STC-A2 — estructura de LOG del proceso de Facturación Electrónica reutilizada
	 * para marcar la transacción cuando el camino legacy no pudo completarse.
	 *
	 * ⚠ CODIGO_ESTADO y CODIGO_MENSAJE son DATOS de la cuenta, no código: deben
	 * existir en customrecord_l598_fe_est_log.custrecord_l598_fe_est_log_codigo y en
	 * customrecord_l598_msg_log.custrecord_l598_msg_log_codigo respectivamente.
	 * Mientras estén vacíos o no se encuentren, el marcado degrada sin romper:
	 *   sin estado  -> detalle huérfano (sin cabecera), con referencia a la transacción.
	 *   sin mensaje -> detalle sin el campo msg, con la descripción libre prefijada
	 *                  con "STC-A2" para poder filtrarla por Saved Search igual.
	 */
	const LOG_FE = {
		RECORD_CABECERA: "customrecord_l598_fact_elec_log",
		RECORD_DETALLE: "customrecord_l598_fact_elec_dlog",
		RECORD_ESTADO: "customrecord_l598_fe_est_log",
		RECORD_MENSAJE: "customrecord_l598_msg_log",
		CODIGO_ESTADO: "",
		CODIGO_MENSAJE: ""
	};

	/**
	 * @param {UserEventContext.beforeSubmit} context
	 */
	const beforeSubmit = (context) => {

		const proceso = "beforeSubmit";

		try {
			if (context.type == context.UserEventType.DELETE) {
				return;
			}

			const objRecord = context.newRecord;
			const taxDetailsByRef = indexarTaxDetails(objRecord);
			const completitud = evaluarCompletitud(objRecord, taxDetailsByRef);

			if (!completitud.completo) {
				log.audit(proceso, `STC-A1 rama=legacy motivo=${completitud.motivo} ${contextoLog(context, objRecord)}`);
				return;
			}

			SUBLISTS_DESTINO.forEach((tipoLista) => setearColumnasConTaxDetails(tipoLista, objRecord, taxDetailsByRef));

			// desaplicarYAplicarNC NO se ejecuta acá: es un workaround del segundo save,
			// que en esta rama no existe (ver cabecera, PENDIENTE DE CARACTERIZACIÓN).

			log.audit(proceso, `STC-A1 rama=inline lineas=${completitud.lineasResueltas} ${contextoLog(context, objRecord)}`);

		} catch (error) {
			// Un fallo acá jamás debe romper el guardado del usuario: se cae al legacy.
			log.error(proceso, `STC-A1 rama=legacy motivo=excepcion error=${error.name}: ${error.message}`);
		}
	};

	/**
	 * @param {UserEventContext.afterSubmit} context
	 */
	const afterSubmit = (context) => {

		const proceso = "afterSubmit";

		// STC-A2 (Alt 1): etapa alcanzada, para que el catch diga QUÉ falló y no sólo que algo falló.
		let etapa = "verificacion";

		try {
			if (context.type == context.UserEventType.DELETE) {
				return;
			}

			// Decisión por lectura del registro (0 GU), nunca por estado de módulo.
			const verificacion = columnasYaCorrectas(context.newRecord);

			if (verificacion.correctas) {
				log.audit(proceso, `STC-A1 rama=inline-ok verificadas=${verificacion.verificadas} ${contextoLog(context, context.newRecord)}`);
				return;
			}

			log.audit(proceso, `STC-A1 rama=legacy motivo=${verificacion.motivo} ${contextoLog(context, context.newRecord)}`);

			// ----- Camino legacy: comportamiento original, sin cambios -----
			etapa = "load";
			const objRecord = record.load({
				type: context.newRecord.type,
				id: context.newRecord.id,
			});

			etapa = "indexado-taxdetails";
			const taxDetailsByRef = indexarTaxDetails(objRecord);

			etapa = "seteo-columnas";
			SUBLISTS_DESTINO.forEach((tipoLista) => setearColumnasConTaxDetails(tipoLista, objRecord, taxDetailsByRef));

			etapa = "desaplicar-aplicar-nc";
			desaplicarYAplicarNC(context.newRecord.type, objRecord);

			etapa = "save";
			objRecord.save();

			log.audit(proceso, `STC-A1 rama=legacy resultado=ok`);

		} catch (error) {

			// STC-A2 (Alt 1) — diagnóstico específico, PRIMERO: log.error no consume
			// governance, así que sobrevive incluso si el fallo fue por unidades agotadas.
			log.error(proceso, `${STC_A2} fallo etapa=${etapa} error=${error.name}: ${error.message} ${contextoLog(context, context.newRecord)}`);

			// STC-A2 (Alt 2) — marca permanente. Se graba SIEMPRE que el afterSubmit
			// termine en excepción: la transacción ya está guardada y las columnas de
			// impuesto pueden haber quedado incompletas, que es el riesgo fiscal.
			registrarFalloEnLogFE({
				etapa: etapa,
				error: error,
				idTransaccion: context.newRecord.id,
				contexto: contextoLog(context, context.newRecord)
			});
		}
	};

	/**
	 * Índice taxdetailsreference -> { taxCode, taxRate }. "Primer match gana",
	 * misma semántica que el filter(...)[0] original, pero en O(1).
	 * @param {*} objRecord
	 * @returns {Map<string, {taxDetailReference:*, taxCode:*, taxRate:*}>}
	 */
	function indexarTaxDetails(objRecord) {

		const taxDetailsByRef = new Map();
		const taxDetailsQuantity = objRecord.getLineCount({ sublistId: "taxdetails" });

		for (let i = 0; i < taxDetailsQuantity; i++) {
			const ref = objRecord.getSublistValue("taxdetails", "taxdetailsreference", i);
			const key = String(ref);
			if (!taxDetailsByRef.has(key)) {
				taxDetailsByRef.set(key, {
					taxDetailReference: ref,
					taxCode: objRecord.getSublistValue("taxdetails", "taxcode", i),
					taxRate: objRecord.getSublistValue("taxdetails", "taxrate", i)
				});
			}
		}

		return taxDetailsByRef;
	}

	/**
	 * Guarda de completitud de STC-A1: ¿se puede resolver TODO lo que hay que resolver
	 * con la taxdetails que tenemos en la mano, ahora mismo?
	 *
	 * Criterio: toda línea de item/expense que trae un taxdetailsreference no vacío
	 * — es decir, a la que SuiteTax ya le asignó un detalle — debe tener su entrada en
	 * el índice, con taxCode no vacío. Las líneas sin referencia (encabezados de grupo,
	 * descripciones, descuentos) son exactamente las que el original tampoco resuelve
	 * por índice: no son evidencia de que la sublist no esté lista y no se exigen acá.
	 *
	 * @param {*} objRecord
	 * @param {Map<string, {taxCode:*, taxRate:*}>} taxDetailsByRef
	 * @returns {{completo:boolean, motivo:string, lineasResueltas:number}}
	 */
	function evaluarCompletitud(objRecord, taxDetailsByRef) {

		if (taxDetailsByRef.size === 0) {
			return { completo: false, motivo: "taxdetails-vacia", lineasResueltas: 0 };
		}

		let lineasEsperadas = 0;
		let lineasResueltas = 0;

		for (const tipoLista of SUBLISTS_DESTINO) {

			const listaQuantity = objRecord.getLineCount({ sublistId: tipoLista });

			for (let i = 0; i < listaQuantity; i++) {

				const ref = objRecord.getSublistValue(tipoLista, "taxdetailsreference", i);
				if (isEmpty(ref)) {
					continue;
				}

				lineasEsperadas++;
				const td = taxDetailsByRef.get(String(ref));

				if (!td || isEmpty(td.taxCode)) {
					return { completo: false, motivo: `linea-sin-taxdetail:${tipoLista}[${i}]`, lineasResueltas: lineasResueltas };
				}

				lineasResueltas++;
			}
		}

		if (lineasEsperadas === 0) {
			return { completo: false, motivo: "sin-lineas-con-referencia", lineasResueltas: 0 };
		}

		return { completo: true, motivo: "", lineasResueltas: lineasResueltas };
	}

	/**
	 * Verificación de resultado en afterSubmit: ¿el registro guardado YA tiene en sus
	 * columnas los valores que corresponden a su propia sublist taxdetails?
	 *
	 * Lee context.newRecord — sin load, 0 GU. Verifica el RESULTADO, no quién lo escribió:
	 * por eso también detecta columnas obsoletas de una edición anterior y las manda al
	 * camino legacy. Ante cualquier duda devuelve false (el legacy siempre es correcto).
	 *
	 * @param {*} objRecord
	 * @returns {{correctas:boolean, motivo:string, verificadas:number}}
	 */
	function columnasYaCorrectas(objRecord) {

		try {
			const taxDetailsByRef = indexarTaxDetails(objRecord);

			if (taxDetailsByRef.size === 0) {
				return { correctas: false, motivo: "taxdetails-vacia", verificadas: 0 };
			}

			let verificadas = 0;

			for (const tipoLista of SUBLISTS_DESTINO) {

				const listaQuantity = objRecord.getLineCount({ sublistId: tipoLista });

				for (let i = 0; i < listaQuantity; i++) {

					const ref = objRecord.getSublistValue(tipoLista, "taxdetailsreference", i);
					const codigo = objRecord.getSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i);
					const tasa = objRecord.getSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i);

					if (!isEmpty(ref)) {
						const td = taxDetailsByRef.get(String(ref));
						if (!td || isEmpty(td.taxCode)) {
							return { correctas: false, motivo: `linea-sin-taxdetail:${tipoLista}[${i}]`, verificadas: verificadas };
						}
						if (!mismoValor(codigo, td.taxCode) || !mismoValor(tasa, td.taxRate)) {
							return { correctas: false, motivo: `columna-difiere:${tipoLista}[${i}]`, verificadas: verificadas };
						}
						verificadas++;
						continue;
					}

					// Línea de descuento: hereda de la anterior, misma regla que la escritura.
					const itemType = objRecord.getSublistValue(tipoLista, "itemtype", i);
					if (itemType == "Discount" && i > 0) {
						const codigoPrevio = objRecord.getSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i - 1);
						const tasaPrevia = objRecord.getSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i - 1);
						if (!mismoValor(codigo, codigoPrevio) || !mismoValor(tasa, tasaPrevia)) {
							return { correctas: false, motivo: `descuento-difiere:${tipoLista}[${i}]`, verificadas: verificadas };
						}
					}
				}
			}

			if (verificadas === 0) {
				return { correctas: false, motivo: "sin-lineas-con-referencia", verificadas: 0 };
			}

			return { correctas: true, motivo: "", verificadas: verificadas };

		} catch (error) {
			log.error("columnasYaCorrectas", `No se pudo verificar, se ejecuta el legacy - detalles: ${error.message}`);
			return { correctas: false, motivo: "excepcion-verificacion", verificadas: 0 };
		}
	}

	/**
	 * Comparación tolerante al formato con que NetSuite devuelve cada campo
	 * (la tasa puede volver como 22, "22.0" o "22.0%" según el tipo de columna).
	 * Un falso negativo acá sólo cuesta el camino legacy, nunca corrección.
	 */
	function mismoValor(a, b) {
		if (isEmpty(a) && isEmpty(b)) {
			return true;
		}
		if (isEmpty(a) || isEmpty(b)) {
			return false;
		}
		const na = aNumero(a);
		const nb = aNumero(b);
		if (na !== null && nb !== null) {
			return Math.abs(na - nb) < 0.0001;
		}
		return String(a).trim() === String(b).trim();
	}

	function aNumero(valor) {
		const limpio = String(valor).replace("%", "").replace(",", ".").trim();
		if (limpio === "") {
			return null;
		}
		const numero = Number(limpio);
		return isNaN(numero) ? null : numero;
	}

	function contextoLog(context, objRecord) {
		let ejecucion = "desconocido";
		try {
			ejecucion = runtime.executionContext;
		} catch (error) {
			ejecucion = "desconocido";
		}
		return `eventType=${context.type} executionContext=${ejecucion} recordType=${objRecord.type}`;
	}

	/**
	 * Propaga taxCode/taxRate de los taxdetails a las columnas custom de la sublist indicada.
	 * @param {"item" | "expense"} tipoLista
	 * @param {*} objRecord
	 * @param {Map<string, {taxDetailReference:*, taxCode:*, taxRate:*}>} taxDetailsByRef
	 */
	function setearColumnasConTaxDetails(tipoLista, objRecord, taxDetailsByRef) {
		const proceso = "setearColumnasConTaxDetails";

		if (taxDetailsByRef.size === 0) {
			log.error(proceso, `No se encuentra resultado de tax details en la transaccion, verifique por favor.`);
			return;
		}

		const listaQuantity = objRecord.getLineCount({
			sublistId: tipoLista
		});

		for (let i = 0; i < listaQuantity; i++) {

			const taxDetailReferenceItem = objRecord.getSublistValue(tipoLista, "taxdetailsreference", i);
			const itemInGroup = objRecord.getSublistValue(tipoLista, "ingroup", i);
			const itemType = objRecord.getSublistValue(tipoLista, "itemtype", i);
			const td = taxDetailsByRef.get(String(taxDetailReferenceItem));

			if (td) {

				objRecord.setSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i, td.taxCode);
				objRecord.setSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i, td.taxRate);

				if (!isEmpty(itemInGroup) && (itemInGroup == "T" || itemInGroup == true)) {

					const beforeLine = i - 1;
					const itemTypeItemBefore = objRecord.getSublistValue(tipoLista, "itemtype", beforeLine);

					if (itemTypeItemBefore == "Group") {
						objRecord.setSublistValue(tipoLista, "custcol_l598_codigo_impuesto", beforeLine, td.taxCode);
						objRecord.setSublistValue(tipoLista, "custcol_l598_tasa_impuesto", beforeLine, td.taxRate);
					}
				}
			} else if (itemType == "Discount" && i > 0) {
				// El descuento no se refleja en los taxdetails: hereda código/tasa de la línea anterior.
				const taxCodeLineItemBefore = objRecord.getSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i - 1);
				const taxRateLineItemBefore = objRecord.getSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i - 1);

				objRecord.setSublistValue(tipoLista, "custcol_l598_codigo_impuesto", i, taxCodeLineItemBefore);
				objRecord.setSublistValue(tipoLista, "custcol_l598_tasa_impuesto", i, taxRateLineItemBefore);

			} else {
				log.error(proceso, `No se encuentra resultado de tax reference y tax code en la linea de articulos nro: ${i} / taxDetailsReference: ${taxDetailReferenceItem}, verifique por favor.`);
			}
		}
	}

	function isEmpty(val) {
		return val === "" || val === undefined || val === "undefined" || val === null || val === "null" || (val.length === 0) || (typeof val == "object" && Object.keys(val).length === 0);
	}

	function desaplicarYAplicarNC(recType, objRecord) {
		const idTransApply = [];
		if (recType == "creditmemo" || recType == "vendorcredit") {
			const cantidadItems = objRecord.getLineCount({ sublistId: "apply" });
			for (let j = 0; j < cantidadItems; j++) {
				const aplicado = objRecord.getSublistValue({ sublistId: "apply", fieldId: "apply", line: j });
				if (aplicado == "T" || aplicado == true) {
					const internalIdLine = objRecord.getSublistValue({ sublistId: "apply", fieldId: "internalid", line: j });
					idTransApply.push({
						internalId: internalIdLine,
						line: j
					});
					objRecord.setSublistValue({ sublistId: "apply", fieldId: "apply", line: j, value: false });
				}
			}

			if (idTransApply && idTransApply.length > 0) {
				for (let j = 0; j < idTransApply.length; j++) {
					objRecord.setSublistValue({ sublistId: "apply", fieldId: "apply", line: idTransApply[j].line, value: true });
				}
			}
		}
	}

	// =======================================================================
	// STC-A2 — Marcado del fallo en la estructura de LOG de FE (Alternativa 2)
	// =======================================================================

	/**
	 * Graba cabecera + detalle de LOG de FE apuntando a la transacción afectada.
	 * Nunca propaga: un fallo del marcado no debe enmascarar el error original
	 * (que ya se logueó antes de llegar acá) ni agregar ruido al flujo del usuario.
	 *
	 * Costo de governance: acotado y sólo en el camino de fallo — hasta 2 búsquedas
	 * de código + 2 create/save de custom record.
	 *
	 * @param {{etapa:string, error:Error, idTransaccion:*, contexto:string}} datos
	 * @returns {boolean} true si quedó marcada de forma consultable
	 */
	function registrarFalloEnLogFE(datos) {

		const proceso = "registrarFalloEnLogFE";

		try {
			const idCabecera = crearCabeceraLogFE();
			const idDetalle = crearDetalleLogFE(idCabecera, datos);

			log.audit(proceso, `${STC_A2} transaccion marcada idTransaccion=${datos.idTransaccion} cabecera=${isEmpty(idCabecera) ? "sin-cabecera" : idCabecera} detalle=${idDetalle}`);
			return true;

		} catch (error) {
			// Caso típico: governance agotado — el mismo motivo por el que falló el save.
			log.error(proceso, `${STC_A2} NO se pudo marcar la transaccion idTransaccion=${datos.idTransaccion}. El unico registro del fallo es el log.error previo, que se purga. Detalles: ${error.name}: ${error.message}`);
			return false;
		}
	}

	/**
	 * Cabecera de LOG. Mismos campos que "Grabar Cabecera LOG Proceso FE".
	 * Devuelve "" si no hay código de estado configurado o resoluble: en ese caso el
	 * detalle se graba huérfano, que sigue siendo interceptable por Saved Search.
	 * @returns {string}
	 */
	function crearCabeceraLogFE() {

		const proceso = "crearCabeceraLogFE";

		if (isEmpty(LOG_FE.CODIGO_ESTADO)) {
			log.error(proceso, `${STC_A2} LOG_FE.CODIGO_ESTADO sin configurar: se graba solo el detalle, sin cabecera. Definir el codigo en ${LOG_FE.RECORD_ESTADO}.`);
			return "";
		}

		const idEstado = buscarInternalIdPorCodigo(LOG_FE.RECORD_ESTADO, "custrecord_l598_fe_est_log_codigo", LOG_FE.CODIGO_ESTADO);

		if (isEmpty(idEstado)) {
			log.error(proceso, `${STC_A2} no se encontro el estado de log con codigo="${LOG_FE.CODIGO_ESTADO}" en ${LOG_FE.RECORD_ESTADO}: se graba solo el detalle, sin cabecera.`);
			return "";
		}

		const recordLog = record.create({ type: LOG_FE.RECORD_CABECERA });

		recordLog.setValue({ fieldId: "custrecord_l598_fact_elec_log_fecha", value: fechaLogFE() });
		recordLog.setValue({ fieldId: "custrecord_l598_fact_elec_log_estado", value: idEstado });

		return recordLog.save();
	}

	/**
	 * Detalle de LOG. Mismos campos que "Grabar Detalle LOG Proceso FE", incluida la
	 * opcionalidad del campo de mensaje (ese Restlet también graba sin resolverlo).
	 * @param {string} idCabecera
	 * @param {{etapa:string, error:Error, idTransaccion:*, contexto:string}} datos
	 * @returns {string}
	 */
	function crearDetalleLogFE(idCabecera, datos) {

		const proceso = "crearDetalleLogFE";
		const recordDetalle = record.create({ type: LOG_FE.RECORD_DETALLE });

		recordDetalle.setValue({ fieldId: "custrecord_l598_fact_elec_dlog_fecha", value: fechaLogFE() });

		if (!isEmpty(idCabecera)) {
			recordDetalle.setValue({ fieldId: "custrecord_l598_fact_elec_dlog_rlog", value: idCabecera });
		}

		if (!isEmpty(datos.idTransaccion)) {
			recordDetalle.setValue({ fieldId: "custrecord_l598_fact_elec_dlog_rtrans", value: datos.idTransaccion });
		}

		if (!isEmpty(LOG_FE.CODIGO_MENSAJE)) {
			const idMensaje = buscarInternalIdPorCodigo(LOG_FE.RECORD_MENSAJE, "custrecord_l598_msg_log_codigo", LOG_FE.CODIGO_MENSAJE);
			if (isEmpty(idMensaje)) {
				log.error(proceso, `${STC_A2} no se encontro el mensaje de log con codigo="${LOG_FE.CODIGO_MENSAJE}" en ${LOG_FE.RECORD_MENSAJE}: el detalle se graba sin mensaje.`);
			} else {
				recordDetalle.setValue({ fieldId: "custrecord_l598_fact_elec_dlog_msg", value: idMensaje });
			}
		} else {
			log.error(proceso, `${STC_A2} LOG_FE.CODIGO_MENSAJE sin configurar: el detalle se graba sin mensaje. Definir el codigo en ${LOG_FE.RECORD_MENSAJE}.`);
		}

		// El prefijo STC-A2 permite filtrar por Saved Search aun sin codigo de mensaje.
		const descripcion = `${STC_A2} fallo etapa=${datos.etapa} error=${datos.error.name}: ${datos.error.message} ${datos.contexto}`;
		recordDetalle.setValue({ fieldId: "custrecord_l598_fact_elec_dlog_det", value: descripcion.substring(0, 3997) });

		return recordDetalle.save();
	}

	/**
	 * Resuelve el internalid de un custom record por su campo de código.
	 * @returns {string} "" si no hay resultado
	 */
	function buscarInternalIdPorCodigo(recordType, campoCodigo, valorCodigo) {

		const resultados = search.create({
			type: recordType,
			columns: ["internalid"],
			filters: [[campoCodigo, "is", valorCodigo]]
		}).run().getRange({ start: 0, end: 1 });

		return (resultados && resultados.length > 0) ? resultados[0].getValue("internalid") : "";
	}

	/**
	 * Fecha con el mismo formato que usan los Restlets de LOG de FE: DATETIMETZ
	 * formateado en AMERICA_BUENOS_AIRES. Se replica tal cual para no introducir una
	 * segunda convención de fecha en la misma tabla.
	 * @returns {string}
	 */
	function fechaLogFE() {
		return format.format({
			value: new Date(),
			type: format.Type.DATETIMETZ,
			timezone: format.Timezone.AMERICA_BUENOS_AIRES
		});
	}

	return {
		beforeSubmit: beforeSubmit,
		afterSubmit: afterSubmit
	};
});
