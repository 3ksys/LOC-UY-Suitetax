/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * ============================================================================
 * DIAGNÓSTICO STC-A1 (Mobeats) — experimento de solo lectura.
 * ----------------------------------------------------------------------------
 * Pregunta que responde: ¿la sublista `taxdetails` de SuiteTax está calculada
 * y VIGENTE en beforeSubmit, en todos los contextos de creación/edición?
 * (Propuesta: docs/propuestas/STC-A1-entrypoint-seteo-tax-codes.md §4;
 *  diseño y matriz de casos: docs/propuestas/STC-A1-experimento-diagnostico.md)
 *
 * Diseño:
 *  - beforeSubmit: fotografía `taxdetails` desde context.newRecord (candidato).
 *  - afterSubmit:  fotografía `taxdetails` vía record.load() post-guardado —
 *    exactamente lo que hoy ve el script original (verdad de referencia).
 *  - La comparación BS ≡ AS por guardado se hace offline leyendo los logs.
 *
 * Garantías:
 *  - NO modifica el registro: sin setValue, sin save. El load de afterSubmit
 *    cuesta ~10 GU por guardado durante la ventana del experimento y no
 *    re-dispara UserEvents.
 *  - Nunca lanza: todo en try/catch con log.error. Un diagnóstico jamás
 *    puede romper un guardado.
 *  - Logs estructurados (JSON) en nivel Audit, prefijo "DIAG-A1".
 * ============================================================================
 */
define(["N/record", "N/runtime"], function (record, runtime) {
	/* global define log */
	/* eslint-disable quotes */

	const MAX_LINEAS_LOG = 50;

	function fotografiarTaxDetails(rec) {
		const cantidad = rec.getLineCount({ sublistId: "taxdetails" });
		const lineas = [];
		for (let i = 0; i < cantidad && i < MAX_LINEAS_LOG; i++) {
			lineas.push({
				ref: rec.getSublistValue("taxdetails", "taxdetailsreference", i),
				taxcode: rec.getSublistValue("taxdetails", "taxcode", i),
				taxrate: rec.getSublistValue("taxdetails", "taxrate", i)
			});
		}
		return { cantidad: cantidad, lineas: lineas };
	}

	function contarLineas(rec, sublistId) {
		try {
			return rec.getLineCount({ sublistId: sublistId });
		} catch (e) {
			return "error: " + e.message;
		}
	}

	// v2 (2026-08-10): el caso CREATE mostró refs provisorias ("NEW1") en beforeSubmit.
	// Para validar el join item↔taxdetails hace falta también el lado item/expense.
	function refsDeSublista(rec, sublistId) {
		try {
			const cantidad = rec.getLineCount({ sublistId: sublistId });
			const refs = [];
			for (let i = 0; i < cantidad && i < MAX_LINEAS_LOG; i++) {
				refs.push(rec.getSublistValue(sublistId, "taxdetailsreference", i));
			}
			return refs;
		} catch (e) {
			return "error: " + e.message;
		}
	}

	function armarSnapshot(context, rec, fuente) {
		const td = fotografiarTaxDetails(rec);
		return {
			fuente: fuente,
			eventType: String(context.type),
			executionContext: runtime.executionContext,
			recordType: rec.type || context.newRecord.type,
			recordId: rec.id || context.newRecord.id,
			taxdetails: td.cantidad,
			item: contarLineas(rec, "item"),
			expense: contarLineas(rec, "expense"),
			itemRefs: refsDeSublista(rec, "item"),
			expenseRefs: refsDeSublista(rec, "expense"),
			detalle: td.lineas
		};
	}

	function beforeSubmit(context) {
		const proceso = "DIAG-A1 beforeSubmit";
		try {
			if (context.type == context.UserEventType.DELETE) return;
			const snap = armarSnapshot(context, context.newRecord, "beforeSubmit.newRecord");
			log.audit(proceso, JSON.stringify(snap));
		} catch (e) {
			log.error(proceso, "Excepcion (el guardado continúa): " + e.message);
		}
	}

	function afterSubmit(context) {
		const proceso = "DIAG-A1 afterSubmit";
		try {
			if (context.type == context.UserEventType.DELETE) return;
			// Verdad de referencia: mismo mecanismo que el script original (load post-guardado).
			const objRecord = record.load({
				type: context.newRecord.type,
				id: context.newRecord.id
			});
			const snap = armarSnapshot(context, objRecord, "afterSubmit.load");
			log.audit(proceso, JSON.stringify(snap));
		} catch (e) {
			log.error(proceso, "Excepcion (solo lectura, sin impacto): " + e.message);
		}
	}

	return {
		beforeSubmit: beforeSubmit,
		afterSubmit: afterSubmit
	};
});
