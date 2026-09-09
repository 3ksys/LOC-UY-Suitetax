/**
 * @NApiVersion 2.0
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType WorkflowActionScript
 * @NModuleScope Public
 */
 define(['N/search', 'L598/crear_resguardo'], function(search, resguardo) {
	function onAction(context) {
		var proceso = 'Crear Resguardo';
		try {
			log.debug(proceso, 'INICIO - workflow action Crear Resguardo');
			var objRecord = context.newRecord;
			var objDetail = new Object();
			objDetail.idProveedor = objRecord.getValue('custbody_l598_resguardo_proveedor');
			objDetail.periodo = objRecord.getValue('postingperiod');
			objDetail.subsidiaria = objRecord.getValue('subsidiary');
			objDetail.moneda = objRecord.getValue('currency');
			objDetail.importeResguardo = objRecord.getValue('custbody_l598_retencion_imp_ret_irpf') + objRecord.getValue('custbody_l598_retencion_imp_ret_irnr') + objRecord.getValue('custbody_l598_retencion_imp_ret_irae') + objRecord.getValue('custbody_l598_retencion_imp_ret_iva');
			objDetail.idsRetenciones = objRecord.id;
			objDetail.sucursal = objRecord.getValue('custbody_l598_sucursal') || '';
			objDetail.tipoDocumento = objRecord.getValue('custbody_l598_tipo_documento');
			objDetail.nroDocumento = objRecord.getValue('custbody_l598_nro_documento');
			objDetail.razonSocial = objRecord.getValue('custbody_l598_razon_social_cliente');;
			var direccion_prov_transaccion = objRecord.getValue('custbody_l598_resguardo_direccion_prov');
			var proveedorID = objRecord.getValue('custbody_l598_resguardo_proveedor');
			objDetail.direccion = direccion_prov_transaccion ? direccion_prov_transaccion : (search.lookupFields({
				type: search.Type.VENDOR,
				id: proveedorID,
				columns: ['address1']
			}).address1 || [''])[0].value;
			var ciudad_transaccion = objRecord.getValue('custbody_l598_resguardo_ciudad');
			objDetail.ciudad = ciudad_transaccion ? ciudad_transaccion : (search.lookupFields({
				type: search.Type.VENDOR,
				id: proveedorID,
				columns: ['city']
			}).city || [''])[0].value;
			var country_transaccion = objRecord.getValue('custbody_l598_resguardo_pais');
			objDetail.pais = country_transaccion ? country_transaccion : (search.lookupFields({
				type: search.Type.VENDOR,
				id: proveedorID,
				columns: ['country']
			}).country || [''])[0].value;
			var codigo_transaccion = objRecord.getValue('custbody_l598_resguardo_cod_postal');
			objDetail.codigoPostal = codigo_transaccion ? codigo_transaccion : (search.lookupFields({
				type: search.Type.VENDOR,
				id: proveedorID,
				columns: ['zipcode']
			}).zipcode || [''])[0].value;
			objDetail.importeIRPF = objRecord.getValue('custbody_l598_retencion_imp_ret_irpf');
			objDetail.importeIRNR = objRecord.getValue('custbody_l598_retencion_imp_ret_irnr');
			objDetail.importeIRAE = objRecord.getValue('custbody_l598_retencion_imp_ret_irae');
			objDetail.importeIVA = objRecord.getValue('custbody_l598_retencion_imp_ret_iva');
			objDetail.fechaResguardo = objRecord.getValue('trandate');
			objDetail.fechaEmisionResguardo = objRecord.getValue('trandate');
			var transactionLookup = search.lookupFields({
				type: search.Type.TRANSACTION,
				id: objRecord.getValue('custbody_l598_transaccion_origen_reten'),
				columns: ['recordtype']
			});
			objDetail.origenRetencion = transactionLookup.recordtype;
			log.debug('objDetail.origenRetencion', objDetail.origenRetencion);
			objDetail.auxKey = 1;
			var sublistFieldIds = [];
			var fieldCount = objRecord.getLineCount({
				sublistId: 'recmachcustrecord_l598_ret_detalle_transaccion'
			});
			log.debug('fieldCount', fieldCount);
			for (var i = 0; i < fieldCount; i++) {
				var fieldId = objRecord.getSublistValue({
					sublistId: 'recmachcustrecord_l598_ret_detalle_transaccion',
					fieldId: 'id',
					line: i
				});
				sublistFieldIds.push(fieldId);
			}
			objDetail.idsRetencionesDet = sublistFieldIds.toString();
			var newResguardo = resguardo.crearResguardo(objDetail);
			log.debug('RESGUARDO CREADO', 'newResguardo: ' + newResguardo);
			log.debug(proceso, 'FIN - workflow action Crear Resguardo');
		} catch (e) {
			throw e.message;
		}
	}
	return {
		onAction: onAction
	};
});