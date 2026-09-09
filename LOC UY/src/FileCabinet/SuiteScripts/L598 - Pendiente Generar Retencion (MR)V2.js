/**
 * @NApiVersion 2.0
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
 define(["N/record", "N/runtime", "N/file", "N/search", "N/format", "N/log", "N/config", 'L598/crear_resguardo'], function(record, runtime, fileModulo, search, format, log, config, resguardo) {
	Number.prototype.toFixedOK = function (decimals) {
		var sign = this >= 0 ? 1 : -1;
		return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
	}

	function getInputData() {
		var infoRetencion = getPendienteGenerarRetencion();
		return infoRetencion
	}

	function map(context) {
		var record = context.value;
		context.write({
			key: 1, // Puedes definir una clave de grupo según tus necesidades
			value: record
		});
	}

	function reduce(context) {
		var groupedData = {}; // Objeto para agrupar los datos
		var key;
		context.values.forEach(function(value) {
			var record = JSON.parse(value); // Suponiendo que los valores son objetos JSON
			key = record[1]; // Suponiendo que deseas agrupar por el valor en la propiedad 1
			if (!groupedData[key]) {
				// Inicializa el objeto anidado con los datos de la factura
				groupedData[key] = {
					'entity': record[34],
					'subsidiary': record[15],
					'estado': record[35],
					'transaccion': record[1],
					'trandate': record[16],
					'duedate': record[29],
					'location': record[30],
					'department': record[31],
					'class': record[32],
					'direccion': record[17],
					'currency': record[3],
					'city': record[19],
					'country': record[39],
					'codpostal': record[21],
					'recordtype': record[36],
					'tipodocumento': record[26],
					'nrodocumento': record[27],
					'razonsocial': record[28],
					'transaccioncuenta': record[37],
					'name': record[38],
          			'status': record[40],
					'hasRetencion': record[41],
					'IRPF': {},
					'IRNR': {},
					'IVA': {},
					'IRAE': {}
				};
				if (!isEmpty(record[22])) {
					groupedData[key]['IRPF']['codirpf'] = record[22];
					groupedData[key]['IRPF']['retImporte'] = record[11];
					groupedData[key]['IRPF']['codcuenta'] = record[33];
					groupedData[key]['IRPF']['internalid'] = record[0];
				}
				if (!isEmpty(record[23])) {
					groupedData[key]['IRNR']['codirnr'] = record[23];
					groupedData[key]['IRNR']['retImporte'] = record[11];
					groupedData[key]['IRNR']['codcuenta'] = record[33];
					groupedData[key]['IRNR']['internalid'] = record[0];
				}
				if (!isEmpty(record[24])) {
					groupedData[key]['IVA']['codiva'] = record[24];
					groupedData[key]['IVA']['retImporte'] = record[11];
					groupedData[key]['IVA']['codcuenta'] = record[33];
					groupedData[key]['IVA']['internalid'] = record[0];
				}
				if (!isEmpty(record[25])) {
					groupedData[key]['IRAE']['codirae'] = record[25];
					groupedData[key]['IRAE']['retImporte'] = record[11];
					groupedData[key]['IRAE']['codcuenta'] = record[33];
					groupedData[key]['IRAE']['internalid'] = record[0];
				}
			} else {
				// Agrega los campos adicionales del segundo registro al objeto existente
				if (!isEmpty(record[22])) {
					groupedData[key]['IRPF']['codirpf'] = record[22];
					groupedData[key]['IRPF']['retImporte'] = record[11];
					groupedData[key]['IRPF']['codcuenta'] = record[33];
					groupedData[key]['IRPF']['internalid'] = record[0];
				}
				if (!isEmpty(record[23])) {
					groupedData[key]['IRNR']['codirnr'] = record[23];
					groupedData[key]['IRNR']['retImporte'] = record[11];
					groupedData[key]['IRNR']['codcuenta'] = record[33];
					groupedData[key]['IRNR']['internalid'] = record[0];
				}
				if (!isEmpty(record[24])) {
					groupedData[key]['IVA']['codiva'] = record[24];
					groupedData[key]['IVA']['retImporte'] = record[11];
					groupedData[key]['IVA']['codcuenta'] = record[33];
					groupedData[key]['IVA']['internalid'] = record[0];
				}
				if (!isEmpty(record[25])) {
					groupedData[key]['IRAE']['codirae'] = record[25];
					groupedData[key]['IRAE']['retImporte'] = record[11];
					groupedData[key]['IRAE']['codcuenta'] = record[33];
					groupedData[key]['IRAE']['internalid'] = record[0];
				}
			}
			log.debug('groupedData', groupedData);
		});
		context.write({
			key: 1,
			value: groupedData
		});
	}

	function summarize(context) {
		context.output.iterator().each(function(key, value) {
			var obj = JSON.parse(value);
			var createRetencion = crearRetencion(obj);
		});
	}

	function isEmpty(value) {
		return value === '' || value === null || value === undefined || value === 'null' || value === 'undefined';
	}

	function crearRetencion(obj) {
		var esOneWorld = esOneworld();
		for (var factura in obj) {
			if (obj.hasOwnProperty(factura)) {
				var facturaData = obj[factura];
				// log.debug('facturaData',facturaData);
				log.debug('facturaData',JSON.stringify(facturaData));
				var location = facturaData.location;
				var department = facturaData.department;
				var clase = facturaData.class;	
				var trandateTransaccionOrigen = facturaData.trandate;
				var duedateTransaccionOrigen = facturaData.duedate;
				var fechaArray = trandateTransaccionOrigen.split("-");
				var year = parseInt(fechaArray[0],10);
				var month = parseInt(fechaArray[1],10) - 1;
				var day = parseInt(fechaArray[2],10);
				var fecha = new Date(year, month, day);
				var fechaArraydue = duedateTransaccionOrigen.split("-");
				var yeardue = parseInt(fechaArraydue[0],10);
				var monthdue = parseInt(fechaArraydue[1],10) - 1;
				var daydue = parseInt(fechaArraydue[2],10);
				var duefecha = new Date(yeardue, monthdue, daydue)
				var tranidTransaccionOrigen = facturaData.transaccion;
				var tipoTransaccionOriginal = facturaData.recordtype;
				var nombre = 'Retencion';
				var valores = [];
				if (!isEmpty(facturaData.IRPF.internalid)) {
					valores.push(facturaData.IRPF.internalid);
				}
				if (!isEmpty(facturaData.IRAE.internalid)) {
					valores.push(facturaData.IRAE.internalid);
				}
				if (!isEmpty(facturaData.IRNR.internalid)) {
					valores.push(facturaData.IRNR.internalid);
				}
				if (!isEmpty(facturaData.IVA.internalid)) {
					valores.push(facturaData.IVA.internalid);
				}
				if (valores.length > 0) {
					nombre += ': ' + valores.join(' - ');
				} else {
					nombre = ''; // Si no hay valores, se establece como una cadena vacía.
				}
				var pos = 0;
				if(facturaData.transaccion){
				log.debug('facturaData.transaccion',facturaData.transaccion);
				}
				if(!isEmpty(nombre)){
				log.debug('nombre',nombre);
				}

				if (!isEmpty(facturaData.IRPF.codcuenta) || !isEmpty(facturaData.IRNR.codcuenta) || !isEmpty(facturaData.IVA.codcuenta) || !isEmpty(facturaData.IRAE.codcuenta)) {
					var recRetencion = record.create({
						type: 'customtransaction_l598_retencion',
						isDynamic: false
					});
					if (esOneWorld) {
						recRetencion.setValue({
							fieldId: 'subsidiary',
							value: facturaData.subsidiary
						});
					}
					recRetencion.setValue('trandate', fecha);
					recRetencion.setText('tranid',nombre);
					recRetencion.setValue({
						fieldId: 'custbody_l598_resguardo_direccion_prov',
						value: facturaData.direccion
					});
					recRetencion.setValue({
						fieldId: 'currency',
						value: facturaData.currency
					});
					recRetencion.setValue({
						fieldId: 'custbody_l598_resguardo_ciudad',
						value: facturaData.city
					});
					recRetencion.setValue({
						fieldId: 'custbody_l598_resguardo_pais',
						value: facturaData.country
					});
					recRetencion.setValue({
						fieldId: 'custbody_l598_resguardo_cod_postal',
						value: facturaData.codpostal
					});
					recRetencion.setValue({
						fieldId: 'custbody_l598_resguardo_fact_vinculada',
						value: tranidTransaccionOrigen
					});
					recRetencion.setValue({
						fieldId: 'custbody_l598_codigo_ret_irpf',
						value: facturaData.IRPF.codirpf
					});
					recRetencion.setValue({
						fieldId: 'custbody_l598_codigo_ret_irnr',
						value: facturaData.IRNR.codirnr
					});
					recRetencion.setValue({
						fieldId: 'custbody_l598_codigo_ret_iva',
						value: facturaData.IVA.codiva
					});
					recRetencion.setValue({
						fieldId: 'custbody_l598_codigo_ret_irae',
						value: facturaData.IRAE.codirae
					});
					recRetencion.setValue({
						fieldId: 'custbody_l598_tipo_documento',
						value: facturaData.tipodocumento
					});
					recRetencion.setValue({
						fieldId: 'custbody_l598_nro_documento',
						value: facturaData.nrodocumento
					});
					recRetencion.setValue({
						fieldId: 'custbody_l598_razon_social_cliente',
						value: facturaData.razonsocial
					});
					recRetencion.setValue({
						fieldId: 'custbody_l598_resguardo_proveedor',
						value: facturaData.entity
					});
					if(!isEmpty(duedateTransaccionOrigen)){
					recRetencion.setValue('custbody_l598_fecha_venc_retenc', duefecha);
					} else {
						recRetencion.setValue('custbody_l598_fecha_venc_retenc', fecha);
					}
					recRetencion.setValue({
						fieldId: 'custbody_l598_transaccion_origen_reten',
						value: tranidTransaccionOrigen
					});
					recRetencion.setValue('custbody_l598_retencion_imp_ret_irpf', facturaData.IRPF.retImporte || 0);
					recRetencion.setValue('custbody_l598_retencion_imp_ret_irnr', facturaData.IRNR.retImporte || 0);
					recRetencion.setValue('custbody_l598_retencion_imp_ret_irae', facturaData.IRAE.retImporte || 0);
					recRetencion.setValue('custbody_l598_retencion_imp_ret_iva', facturaData.IVA.retImporte || 0);
					if (!isEmpty(facturaData.IRPF.codcuenta)) {
						var debito = 0.00;
						var credito = 0.00;
						if (tipoTransaccionOriginal == 'vendorbill') {
							debito = 0.00;
							credito = facturaData.IRPF.retImporte;
						}
						if (tipoTransaccionOriginal == 'vendorcredit') {
							debito = facturaData.IRPF.retImporte;
							credito = 0.00;
						}
						recRetencion.insertLine({
							sublistId: 'line',
							line: pos
						});
						if (!isEmpty(location)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'location',
								value: location,
								line: pos
							});
						}
						if (!isEmpty(department)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'department',
								value: department,
								line: pos
							});
						}
						if (!isEmpty(clase)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'class',
								value: clase,
								line: pos
							});
						}
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: facturaData.IRPF.codcuenta,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'debit',
							value: debito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'credit',
							value: credito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: facturaData.entity,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'memo',
							value: (facturaData.name).split('#')[1],
							line: pos
						});
						pos = pos + 1;
						recRetencion.insertLine({
							sublistId: 'line',
							line: pos
						});
						if (!isEmpty(location)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'location',
								value: location,
								line: pos
							});
						}
						if (!isEmpty(department)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'department',
								value: department,
								line: pos
							});
						}
						if (!isEmpty(clase)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'class',
								value: clase,
								line: pos
							});
						}
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: facturaData.transaccioncuenta,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'debit',
							value: credito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'credit',
							value: debito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: facturaData.entity,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'memo',
							value: (facturaData.name).split('#')[1],
							line: pos
						});
						pos = pos + 1;
					}
					if (!isEmpty(facturaData.IRNR.codcuenta)) {
						var debito = 0.00;
						var credito = 0.00;
						if (tipoTransaccionOriginal == 'vendorbill') {
							debito = 0.00;
							credito = facturaData.IRNR.retImporte;
						}
						if (tipoTransaccionOriginal == 'vendorcredit') {
							debito = facturaData.IRNR.retImporte;
							credito = 0.00;
						}
						recRetencion.insertLine({
							sublistId: 'line',
							line: pos
						});
						if (!isEmpty(location)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'location',
								value: location,
								line: pos
							});
						}
						if (!isEmpty(department)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'department',
								value: department,
								line: pos
							});
						}
						if (!isEmpty(clase)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'class',
								value: clase,
								line: pos
							});
						}
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: facturaData.IRNR.codcuenta,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'debit',
							value: debito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'credit',
							value: credito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: facturaData.entity,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'memo',
							value: (facturaData.name).split('#')[1],
							line: pos
						});
						pos = pos + 1;
						recRetencion.insertLine({
							sublistId: 'line',
							line: pos
						});
						if (!isEmpty(location)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'location',
								value: location,
								line: pos
							});
						}
						if (!isEmpty(department)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'department',
								value: department,
								line: pos
							});
						}
						if (!isEmpty(clase)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'class',
								value: clase,
								line: pos
							});
						}
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: facturaData.transaccioncuenta,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'debit',
							value: credito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'credit',
							value: debito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: facturaData.entity,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'memo',
							value: (facturaData.name).split('#')[1],
							line: pos
						});
						pos = pos + 1;
					}
					if (!isEmpty(facturaData.IRAE.codcuenta)) {
						var debito = 0.00;
						var credito = 0.00;
						if (tipoTransaccionOriginal == 'vendorbill') {
							debito = 0.00;
							credito = facturaData.IRAE.retImporte;
						}
						if (tipoTransaccionOriginal == 'vendorcredit') {
							debito = facturaData.IRAE.retImporte;
							credito = 0.00;
						}
						recRetencion.insertLine({
							sublistId: 'line',
							line: pos
						});
						if (!isEmpty(location)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'location',
								value: location,
								line: pos
							});
						}
						if (!isEmpty(department)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'department',
								value: department,
								line: pos
							});
						}
						if (!isEmpty(clase)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'class',
								value: clase,
								line: pos
							});
						}
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: facturaData.IRAE.codcuenta,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'debit',
							value: debito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'credit',
							value: credito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: facturaData.entity,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'memo',
							value: (facturaData.name).split('#')[1],
							line: pos
						});
						pos = pos + 1;
						recRetencion.insertLine({
							sublistId: 'line',
							line: pos
						});
						if (!isEmpty(location)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'location',
								value: location,
								line: pos
							});
						}
						if (!isEmpty(department)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'department',
								value: department,
								line: pos
							});
						}
						if (!isEmpty(clase)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'class',
								value: clase,
								line: pos
							});
						}
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: facturaData.transaccioncuenta,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'debit',
							value: credito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'credit',
							value: debito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: facturaData.entity,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'memo',
							value: (facturaData.name).split('#')[1],
							line: pos
						});
						pos = pos + 1;
					}
					if (!isEmpty(facturaData.IVA.codcuenta)) {
						var debito = 0.00;
						var credito = 0.00;
						if (tipoTransaccionOriginal == 'vendorbill') {
							debito = 0.00;
							credito = facturaData.IVA.retImporte;
						}
						if (tipoTransaccionOriginal == 'vendorcredit') {
							debito = facturaData.IVA.retImporte;
							credito = 0.00;
						}
						recRetencion.insertLine({
							sublistId: 'line',
							line: pos
						});
						if (!isEmpty(location)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'location',
								value: location,
								line: pos
							});
						}
						if (!isEmpty(department)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'department',
								value: department,
								line: pos
							});
						}
						if (!isEmpty(clase)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'class',
								value: clase,
								line: pos
							});
						}
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: facturaData.IVA.codcuenta,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'debit',
							value: debito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'credit',
							value: credito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: facturaData.entity,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'memo',
							value: (facturaData.name).split('#')[1],
							line: pos
						});
						pos = pos + 1;
						recRetencion.insertLine({
							sublistId: 'line',
							line: pos
						});
						if (!isEmpty(location)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'location',
								value: location,
								line: pos
							});
						}
						if (!isEmpty(department)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'department',
								value: department,
								line: pos
							});
						}
						if (!isEmpty(clase)) {
							recRetencion.setSublistValue({
								sublistId: 'line',
								fieldId: 'class',
								value: clase,
								line: pos
							});
						}
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: facturaData.transaccioncuenta,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'debit',
							value: credito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'credit',
							value: debito,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: facturaData.entity,
							line: pos
						});
						recRetencion.setSublistValue({
							sublistId: 'line',
							fieldId: 'memo',
							value: (facturaData.name).split('#')[1],
							line: pos
						});
						pos = pos + 1;
					}
					var newRetencion = recRetencion.save({
						enableSourcing: false,
						ignoreMandatoryFields: true
					});
          log.debug('RETENCION CREADA', 'newRetencion: ' + newRetencion);
					if (!isEmpty(newRetencion)) {
						if(isEmpty(facturaData.hasRetencion)){
							record.submitFields({
								type: 'vendorbill',
								id: tranidTransaccionOrigen,
								values: {
									'custbody_l598_link_retencion': newRetencion,
								},
							});
						}
						if (!isEmpty(facturaData.IRPF.codcuenta) && !isEmpty(facturaData.IRPF.internalid)) {
							record.submitFields({
								type: 'customrecord_l598_ret_detalle',
								id: facturaData.IRPF.internalid,
								values: {
									'custrecord_l598_ret_detalle_transaccion': newRetencion,
									'custrecord_l598_ret_detalle_pend_gen_ret': false
								},
							});
						}
						if (!isEmpty(facturaData.IRNR.codcuenta) && !isEmpty(facturaData.IRNR.internalid)) {
							record.submitFields({
								type: 'customrecord_l598_ret_detalle',
								id: facturaData.IRNR.internalid,
								values: {
									'custrecord_l598_ret_detalle_transaccion': newRetencion,
									'custrecord_l598_ret_detalle_pend_gen_ret': false
								},
							});
						}
						if (!isEmpty(facturaData.IRAE.codcuenta) && !isEmpty(facturaData.IRAE.internalid)) {
							record.submitFields({
								type: 'customrecord_l598_ret_detalle',
								id: facturaData.IRAE.internalid,
								values: {
									'custrecord_l598_ret_detalle_transaccion': newRetencion,
									'custrecord_l598_ret_detalle_pend_gen_ret': false
								},
							});
						}
						if (!isEmpty(facturaData.IVA.codcuenta) && !isEmpty(facturaData.IVA.internalid)) {
							record.submitFields({
								type: 'customrecord_l598_ret_detalle',
								id: facturaData.IVA.internalid,
								values: {
									'custrecord_l598_ret_detalle_transaccion': newRetencion,
									'custrecord_l598_ret_detalle_pend_gen_ret': false
								},
							});
						}
						var respuesta = calcularGenerarResguardoAutomaticamente(facturaData.subsidiary);
						if (respuesta) {
							var objDetail = new Object();
							var objRecord = record.load({
								type: 'customtransaction_l598_retencion',
								id: newRetencion
							});
							objDetail.idProveedor = objRecord.getValue('custbody_l598_resguardo_proveedor');
							objDetail.periodo = objRecord.getValue('postingperiod');
							objDetail.subsidiaria = objRecord.getValue('subsidiary');
							objDetail.moneda = objRecord.getValue('currency');
							objDetail.importeResguardo = objRecord.getValue('custbody_l598_retencion_imp_ret_irpf') + objRecord.getValue('custbody_l598_retencion_imp_ret_irnr') + objRecord.getValue('custbody_l598_retencion_imp_ret_irae') + objRecord.getValue('custbody_l598_retencion_imp_ret_iva');
							objDetail.idsRetenciones = objRecord.id;
							objDetail.sucursal = objRecord.getValue('custbody_l598_sucursal') || '';
							objDetail.tipoDocumento = objRecord.getValue('custbody_l598_tipo_documento');
							objDetail.nroDocumento = objRecord.getValue('custbody_l598_nro_documento');
							objDetail.razonSocial = objRecord.getValue('custbody_l598_razon_social_cliente');
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
							log.debug('objDetail', objDetail);
							var newResguardo = resguardo.crearResguardo(objDetail);
							log.debug('newResguardo', newResguardo);
						}
						try {
							var respuesta_aplicacion = aplicarRetencionFacturaAutomaticamente(facturaData.subsidiary)
							if (respuesta_aplicacion){
								if (facturaData.recordtype == 'vendorbill' && facturaData.status != 'paidInFull') {
									var objVendPaymtRec = record.create({
										type: 'vendorpayment',
										isDynamic: true
									});
									objVendPaymtRec.setValue({
										fieldId: 'entity',
										value: facturaData.entity
									});
									objVendPaymtRec.setValue({
										fieldId: 'currency',
										value: facturaData.currency
									});
									objVendPaymtRec.setValue({
										fieldId: 'memo',
										value: (facturaData.name).split('#')[1]
									});
									// Obtener el número de líneas de elementos de aplicaciones (apply).
									var intApplyLns = objVendPaymtRec.getLineCount({
										sublistId: 'apply'
									});
									// Iterar a través de las líneas de elementos de aplicaciones.
									var monto = 0.00;
									for (var i = 0; i < intApplyLns; i++) {
										var internalId = objVendPaymtRec.getSublistValue({
											sublistId: 'apply',
											fieldId: 'internalid',
											line: i
										});
						
										if (internalId == tranidTransaccionOrigen) {
											objVendPaymtRec.selectLine({
												sublistId: 'apply',
												line: i
											});
											objVendPaymtRec.setCurrentSublistValue({
												sublistId: 'apply',
												fieldId: 'apply',
												value: true
											});
											monto = objVendPaymtRec.getCurrentSublistValue({
												sublistId: 'apply',
												fieldId: 'due',
											});
											objVendPaymtRec.commitLine({
												sublistId: 'apply'
											});
											var montoTotalDue = 0.00;
											var final = true;
											for (var j = 0; j < intApplyLns; j++) {
												var internalIdapply = objVendPaymtRec.getSublistValue({
													sublistId: 'apply',
													fieldId: 'internalid',
													line: j
												});
												if (internalIdapply == newRetencion && final == true) {
													objVendPaymtRec.selectLine({
														sublistId: 'apply',
														line: j
													});
													var dueAmount = objVendPaymtRec.getCurrentSublistValue({
														sublistId: 'apply',
														fieldId: 'due'
													});
													var montoAnterior = montoTotalDue;
													montoTotalDue = montoTotalDue + Math.abs(dueAmount);
													if (montoTotalDue <= monto) {
														objVendPaymtRec.setCurrentSublistValue({
															sublistId: 'apply',
															fieldId: 'apply',
															value: true
														});
													} else {
														var montofinal = (monto - Math.abs(montoAnterior)) * -1;
														montofinal = montofinal.toFixedOK(2);
														objVendPaymtRec.setCurrentSublistValue({
															sublistId: 'apply',
															fieldId: 'apply',
															value: true
														});
														objVendPaymtRec.setCurrentSublistValue({
															sublistId: 'apply',
															fieldId: 'amount',
															value: montofinal
														});
														final = false;
													}
													objVendPaymtRec.commitLine({
														sublistId: 'apply'
													});
												}
											}
										}
									}
									// Guardar el registro de pago al proveedor.
									var idVendPayment = objVendPaymtRec.save({
										enableSourcing: false,
										ignoreMandatoryFields: true
									});
									log.debug('VENDOR PAYMENT CREADO', 'idVendPayment: ' + idVendPayment);
								}
							}
						} catch (e) {
							log.error({
								title: 'l598mapReduce',
								details: 'Error generando vendor payment. Exception detalles: ' + e.message
							});
						}
					}
				}
			}
		}
	}

	function calcularGenerarResguardoAutomaticamente(subsidiaria) {
		var calcularGenerarResguardo = false;
		var filters = ["isinactive", "is", "F"];
		if (!isEmpty(subsidiaria)) {
			filters.push("custrecord_l598_conf_proc_ret_subsidiari", "is", subsidiaria);
		}
		var searchObj = search.create({
			type: "customrecord_l598_conf_proc_ret",
			filters: filters,
			columns: ["custrecord_l598_conf_proc_ret_cal_res_au"]
		});
		var searchResult = searchObj.run().getRange({
			start: 0,
			end: 1
		});
		if (!isEmpty(searchResult) && searchResult.length > 0) {
			var calResAutomaticamente = searchResult[0].getValue("custrecord_l598_conf_proc_ret_cal_res_au");
			if (!isEmpty(calResAutomaticamente) && (calResAutomaticamente === "T" || calResAutomaticamente == true)) {
				calcularGenerarResguardo = true;
			}
		}
		return calcularGenerarResguardo;
	}

	function aplicarRetencionFacturaAutomaticamente(subsidiaria) {
		var aplicar_retencion_factura_automaticamente = false;
		var filters = ["isinactive", "is", "F"];
		if (!isEmpty(subsidiaria)) {
			filters.push("custrecord_l598_conf_proc_ret_subsidiari", "is", subsidiaria);
		}
		var searchObj = search.create({
			type: "customrecord_l598_conf_proc_ret",
			filters: filters,
			columns: ["custrecord_l598_conf_proc_ret_ap_ret_fac"]
		});
		var searchResult = searchObj.run().getRange({
			start: 0,
			end: 1
		});
		if (!isEmpty(searchResult) && searchResult.length > 0) {
			var busqueda = searchResult[0].getValue("custrecord_l598_conf_proc_ret_ap_ret_fac");
			if (!isEmpty(busqueda) && (busqueda === "T" || busqueda == true)) {
				aplicar_retencion_factura_automaticamente = true;
			}
		}
		return aplicar_retencion_factura_automaticamente;
	}
	function getPendienteGenerarRetencion() {
		var searchId = "customsearch_l598_pendient_gen_retencion";
		var mySearch = search.load({
			id: searchId
		});
		var columns = mySearch.columns;
		var results = [];
		var searchResults = mySearch.run();
		searchResults.each(function(result) {
			var row = {};
			for (var i = 0; i < columns.length; i++) {
				// Accede al valor de la columna utilizando el índice en lugar del nombre
				row[i] = result.getValue(columns[i]) || '';
			}
			results.push(row);
			return true;
		});
		return results;
	}

	function esOneworld() {
		var filters = [
			search.createFilter({
				name: 'isinactive',
				operator: 'is',
				values: 'F'
			}),
			search.createFilter({
				name: 'custrecord_l598_dat_imp_es_oneworld',
				operator: 'is',
				values: 'T'
			})
		];
		var customrecordSearch = search.create({
			type: 'customrecord_l598_datos_impositivos_emp',
			filters: filters
		});
		var searchResults = customrecordSearch.run().getRange(0, 1);
		if (searchResults != null && searchResults.length > 0) {
			return true;
		} else {
			return false;
		}
	}
	
	return {
		getInputData: getInputData,
		map: map,
		reduce: reduce,
		summarize: summarize,
	};
});