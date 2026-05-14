/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/error', 'N/search', 'L598/utilities', 'N/runtime'],

    (record, error, search, utilidades, runtime) => {

        /**
        * Function definition to be triggered before record is loaded.
        *
        * @param {Object} scriptContext
        * @param {Record} scriptContext.newRecord - New record
        * @param {string} scriptContext.type - Trigger type
        * @param {Form} scriptContext.form - Current form
        * @Since 2015.2
        */
        let beforeLoad = (scriptContext) => {

            let proceso = 'beforeLoad';

            try {
                log.audit(proceso, 'INICIO - BEFORELOAD ' + scriptContext.type);

                if (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.COPY) {
                    log.audit(proceso, 'Ingreso a seteo de campos de cuenta ajena en null.');
                    let objRecord = scriptContext.newRecord;
                    objRecord.setValue('custbody_l598_journal_entry_desc_cta_a', '');

                    let adendaAnteriorBeneficio = objRecord.getValue('custbody_l598_adenda_beneficios_descue');
                    let adendaTransaccion = objRecord.getValue('custbody_l598_adenda');
                    if (!utilidades.isEmpty(adendaAnteriorBeneficio) && !utilidades.isEmpty(adendaTransaccion) && adendaTransaccion.includes(adendaAnteriorBeneficio)) {
                        adendaTransaccion = adendaTransaccion.replace(adendaAnteriorBeneficio, '');
                    }

                    objRecord.setValue('custbody_l598_adenda', adendaTransaccion);
                    objRecord.setValue('custbody_l598_adenda_beneficios_descue', '');
                }

                log.audit(proceso, 'FIN - BEFORELOAD ' + scriptContext.type);
            } catch (error) {
                log.error(proceso, 'Ocurrio un error mientras se seteaba en null los campos de cuenta ajena, detalles: ' + error.message);
            }
        }

        /**
        * Function definition to be triggered before record is loaded.
        *
        * @param {Object} scriptContext
        * @param {Record} scriptContext.newRecord - New record
        * @param {string} scriptContext.type - Trigger type
        * @param {Form} scriptContext.form - Current form
        * @Since 2015.2
        */
        let beforeSubmit = (scriptContext) => {

            let proceso = 'beforeSubmit';

            try {
                log.audit(proceso, 'INICIO - beforeSubmit ' + scriptContext.type);

                if (scriptContext.type != scriptContext.UserEventType.DELETE) {
                    log.audit(proceso, 'Ingreso a verificar datos de cuenta ajena y de empresa de cuenta ajena en los articulos.');
                    let currentScript = runtime.getCurrentScript();
                    let parametroFormularioGeneralCtaAjena = currentScript.getParameter('custscript_l598_desc_cta_aje_id_f_ctaaje');
                    let objRecord = scriptContext.newRecord;
                    let cantidadLineas = objRecord.getLineCount({ sublistId: 'item' });
                    let lineasCtaAjena = 0;
                    let arrayEmpresasCtaAjena = [];

                    for (let i = 0; i < cantidadLineas; i++) {
                        let articuloCtaAjena = objRecord.getSublistValue('item', 'custcol_l598_aplica_cuenta_ajena', i);

                        if (!utilidades.isEmpty(articuloCtaAjena) && (articuloCtaAjena == true || articuloCtaAjena == 'T')) {
                            lineasCtaAjena++;
                            let objInfoEmpCtaAjena = {};
                            objInfoEmpCtaAjena.nroDocEmpresaCtaAjena = objRecord.getSublistValue('item', 'custcol_l598_nro_doc_emp_cta_ajena', i);
                            objInfoEmpCtaAjena.razonSocialCtaAjena = objRecord.getSublistValue('item', 'custcol_l598_raz_soc_cuenta_ajena', i);
                            objInfoEmpCtaAjena.paisEmpCtaAjena = objRecord.getSublistValue('item', 'custcol_l598_pais_emp_cuenta_ajena', i);
                            objInfoEmpCtaAjena.tipoDocCtaAjena = objRecord.getSublistValue('item', 'custcol_l598_tipo_doc_cuenta_ajena', i);
                            arrayEmpresasCtaAjena.push(objInfoEmpCtaAjena);
                        }
                    }

                    let empresasIguales = false;
                    if (arrayEmpresasCtaAjena.length > 0) {
                        let firstRut = arrayEmpresasCtaAjena[0].nroDocEmpresaCtaAjena;
                        empresasIguales = arrayEmpresasCtaAjena.every(obj => obj.nroDocEmpresaCtaAjena === firstRut);
                    }

                    let mensaje = '';
                    log.debug(proceso, 'cantidad de lineas de cuenta ajena: ' + lineasCtaAjena + ' / empresasIguales: ' + empresasIguales);
                    if (lineasCtaAjena > 0) {
                        if (lineasCtaAjena != cantidadLineas) {
                            mensaje = 'La transacción posee artículos que son de cuenta ajena y otros artículos que no son de cuenta ajena, para crear una transacción de cuenta ajena todos los artículos deben aplicar al beneficio, por favor verifique e intente nuevamente.';
                            throw (error.create({
                                message: mensaje
                            }));
                        } else if (!empresasIguales) {
                            mensaje = 'La transacción posee artículos que son de cuenta ajena pero que no pertenecen a la misma empresa de cuenta ajena por la cual se realiza la venta, para crear una transacción de cuenta ajena todos los artículos de la transacción deben ser de una misma empresa, por favor verifique e intente nuevamente.';
                            throw (error.create({
                                message: mensaje
                            }));
                        } else {
                            if (!utilidades.isEmpty(arrayEmpresasCtaAjena[0].razonSocialCtaAjena) && !utilidades.isEmpty(arrayEmpresasCtaAjena[0].tipoDocCtaAjena) && !utilidades.isEmpty(arrayEmpresasCtaAjena[0].nroDocEmpresaCtaAjena) && !utilidades.isEmpty(arrayEmpresasCtaAjena[0].paisEmpCtaAjena)) {
                                objRecord.setValue('custbody_l598_raz_soc_cuenta_ajena', arrayEmpresasCtaAjena[0].razonSocialCtaAjena);
                                objRecord.setValue('custbody_l598_tipo_doc_cuenta_ajena', arrayEmpresasCtaAjena[0].tipoDocCtaAjena);
                                objRecord.setValue('custbody_l598_nro_doc_emp_cta_ajena', arrayEmpresasCtaAjena[0].nroDocEmpresaCtaAjena);
                                objRecord.setValue('custbody_l598_pais_emp_cuenta_ajena', arrayEmpresasCtaAjena[0].paisEmpCtaAjena);
                                objRecord.setValue('custbody_l598_transac_cuenta_ajena', true);
                                let tipoDocumentoCliente = objRecord.getValue('custbody_l598_tipo_documento');

                                if (!utilidades.isEmpty(tipoDocumentoCliente)) {
                                    let registroTipoDoc = record.load({
                                        type: 'customrecord_l598_tipos_documentos',
                                        id: tipoDocumentoCliente
                                    });

                                    if (!utilidades.isEmpty(registroTipoDoc)) {
                                        let esRut = registroTipoDoc.getValue('custrecord_l598_tipos_documentos_es_ruc');

                                        if (!utilidades.isEmpty(esRut) && (esRut == true || esRut == 'T')) {
                                            objRecord.setValue('custbody_l598_trans_eticket', false);
                                        } else {
                                            objRecord.setValue('custbody_l598_trans_eticket', true);
                                        }
                                    }
                                }
                                objRecord.setValue('customform', parametroFormularioGeneralCtaAjena);
                            } else {
                                mensaje = 'La transacción posee artículos que son de cuenta ajena pero los datos de la empresa de cuenta ajena no están correctamente ingresados, existe algún dato vacío, por favor verifique los items de la transacción y la información de cuenta ajena de cada uno e intente nuevamente.';
                                throw (error.create({
                                    message: mensaje
                                }));
                            }
                        }
                    }
                }

                log.audit(proceso, 'FIN - beforeSubmit ' + scriptContext.type);
            } catch (error) {
                let mensajeError = error.message;
                log.error(proceso, mensajeError);
                throw mensajeError;
            }
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        let afterSubmit = (scriptContext) => {

            let proceso = 'afterSubmit - Descuento Cuenta Ajena';

            try {
                log.audit(proceso, 'INICIO - AFTERSUBMIT ' + scriptContext.type);

                if (scriptContext.type != scriptContext.UserEventType.DELETE) {
                    let recId = scriptContext.newRecord.id;
                    let recType = scriptContext.newRecord.type;
                    let type = scriptContext.type;
                    let currentScript = runtime.getCurrentScript();
                    let parametroEstadoAprobado = currentScript.getParameter('custscript_l598_desc_cta_aje_est_apro_je');
                    let parametroIDFormularioJE = currentScript.getParameter('custscript_l598_desc_cta_aje_id_form_je');
                    let parametroSetearKSName = currentScript.getParameter('custscript_l598_desc_cta_aje_set_cam_ksn');
                    let adendaBeneficio = '';
                    log.debug(proceso, 'Valor de recId: ' + recId + ' - RECTYPE: ' + recType + ' - TYPE: ' + type);


                    if (!utilidades.isEmpty(recId) && !utilidades.isEmpty(recType) && recId > 0) {

                        let objRecord = record.load({
                            type: recType,
                            id: recId
                        });
                        let entity = objRecord.getValue('entity');
                        log.debug(proceso, 'entity id: ' + entity);
                        let esCuentaAjena = objRecord.getValue('custbody_l598_transac_cuenta_ajena');
                        let aplicaDescCtaAjena = objRecord.getValue('custbody_l598_aplica_desc_cta_ajena');
                        let total = Math.abs(objRecord.getValue('total'));
                        log.debug(proceso, 'esCuentaAjena: ' + esCuentaAjena + ' - aplicaDescCtaAjena: ' + aplicaDescCtaAjena + ' - total: ' + total);
                        let journalEntryDescCtaAjena = objRecord.getValue('custbody_l598_journal_entry_desc_cta_a');
                        let currency = objRecord.getValue('currency');
                        let trandate = objRecord.getValue('trandate');
                        let exchangerate = parseFloat(objRecord.getValue('exchangerate'), 10);
                        let department = objRecord.getValue('department');
                        let location = objRecord.getValue('location');
                        let clase = objRecord.getValue('class');
                        let idAccount = objRecord.getValue('account');
                        let tranID = objRecord.getValue('tranid');
                        let isOneWorld = utilidades.l598esOneworld();
                        let subsidiary = isOneWorld ? objRecord.getValue('subsidiary') : null;
                        let nroCAE = objRecord.getValue('custbody_l598_cae');

                        if (utilidades.isEmpty(nroCAE)) {
                            if (!utilidades.isEmpty(esCuentaAjena) && (esCuentaAjena == true || esCuentaAjena == 'T')) {
                                if (!utilidades.isEmpty(aplicaDescCtaAjena) && (aplicaDescCtaAjena == true || aplicaDescCtaAjena == 'T')) {

                                    let infoConfigCtaAjena = obtenerConfigDatosCtaAjena(subsidiary);

                                    if (!utilidades.isEmpty(infoConfigCtaAjena) && !infoConfigCtaAjena.error) {

                                        let idCuentaAjena = infoConfigCtaAjena.datosCuentaAjena.idCuentaAjena;
                                        let idCuentaPagoCliente = infoConfigCtaAjena.datosCuentaAjena.idCuentaPagoCliente;
                                        adendaBeneficio = infoConfigCtaAjena.datosCuentaAjena.adenda;
                                        let porcentajeCtaAjena = infoConfigCtaAjena.datosCuentaAjena.porcentajeCtaAjena;
                                        let adendaTransaccion = objRecord.getValue('custbody_l598_adenda');
                                        let idJE = null;

                                        if (!utilidades.isEmpty(porcentajeCtaAjena)) {
                                            if (!utilidades.isEmpty(idCuentaAjena)) {

                                                let diferenciaEntreMontos = true;
                                                let descuentoTotal = parseFloat(Math.abs(parseFloat(parseFloat(porcentajeCtaAjena, 10) * parseFloat(total, 10) / 100, 10)).toFixedOK(2), 10);
                                                // let descuentoTotal = parseFloat(Math.abs(parseFloat((parseFloat(porcentajeCtaAjena, 10) * parseFloat(total, 10) / 100) * exchangerate, 10)).toFixedOK(2), 10);

                                                log.debug(proceso, 'descuentoTotal: ' + descuentoTotal);

                                                if (utilidades.isEmpty(journalEntryDescCtaAjena)) {

                                                    let objRecordJE = record.create({
                                                        type: record.Type.JOURNAL_ENTRY,
                                                        isDynamic: true
                                                    });

                                                    if (!utilidades.isEmpty(parametroIDFormularioJE)) {
                                                        objRecordJE.setValue('customform', parametroIDFormularioJE);
                                                    }
                                                    
                                                    if (!utilidades.isEmpty(parametroSetearKSName) && (parametroSetearKSName == true || parametroSetearKSName == 'T')) {
                                                        objRecordJE.setValue('custbody_ks_name', entity);
                                                    }

                                                    objRecordJE.setValue('custbody_l598_trans_asoc_desc_cta_ajen', recId);

                                                    if (!utilidades.isEmpty(subsidiary)) {
                                                        objRecordJE.setValue('subsidiary', subsidiary);
                                                    }

                                                    objRecordJE.setValue('trandate', trandate);
                                                    objRecordJE.setValue('currency', currency);
                                                    objRecordJE.setValue('exchangerate', exchangerate);
                                                    objRecordJE.setValue('approvalstatus', parametroEstadoAprobado);
                                                    objRecordJE.setValue('memo', 'Journal Entry creado para vincular con la factura #' + tranID);

                                                    //INICIO - SE AGREGA LINEA DE MONTO TOTAL (DEBITO)
                                                    objRecordJE.selectNewLine('line');
                                                    objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entity });

                                                    if (!utilidades.isEmpty(department))
                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: department });

                                                    if (!utilidades.isEmpty(location))
                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: location });

                                                    if (!utilidades.isEmpty(clase))
                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: clase });
                                                    
                                                    if (!utilidades.isEmpty(parametroSetearKSName) && (parametroSetearKSName == true || parametroSetearKSName == 'T'))
                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_ks_name', value: entity });
                                                        
                                                    objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: tranID });
                                                    objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: idCuentaAjena });

                                                    if (recType == 'creditmemo') {
                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: parseFloat(descuentoTotal, 10) });
                                                    } else {
                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: parseFloat(descuentoTotal, 10) });
                                                    }

                                                    objRecordJE.commitLine('line');
                                                    //FIN - SE AGREGA LINEA DE MONTO TOTAL (DEBITO)

                                                    //INICIO - SE AGREGA LINEA DE MONTO TOTAL (CREDITO)
                                                    objRecordJE.selectNewLine('line');
                                                    objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entity });

                                                    if (!utilidades.isEmpty(department))
                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: department });

                                                    if (!utilidades.isEmpty(location))
                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: location });

                                                    if (!utilidades.isEmpty(clase))
                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: clase });

                                                    if (!utilidades.isEmpty(parametroSetearKSName) && (parametroSetearKSName == true || parametroSetearKSName == 'T'))
                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_ks_name', value: entity });

                                                    objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: tranID });
                                                    objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: idAccount });

                                                    if (recType == 'creditmemo') {
                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: parseFloat(descuentoTotal, 10) });
                                                    } else {
                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: parseFloat(descuentoTotal, 10) });
                                                    }

                                                    objRecordJE.commitLine('line');
                                                    //FIN - SE AGREGA LINEA DE MONTO TOTAL (DEBITO)

                                                    try {
                                                        let approvalstatusJE = objRecordJE.getValue('approvalstatus');
                                                        log.debug(proceso, 'approvalstatus JE: ' + approvalstatusJE);

                                                        idJE = objRecordJE.save();
                                                        log.debug(proceso, 'SE GENERO EL JOURNALENTRY EXITOSAMENTE - ID: ' + idJE);
                                                    }
                                                    catch (e) {
                                                        log.error(proceso, 'ERROR GENERANDO JOURNALENTRY - EXCEPTION DETALLES: ' + e.message);
                                                    }

                                                    if (!utilidades.isEmpty(idJE)) {
                                                        objRecord.setValue('custbody_l598_journal_entry_desc_cta_a', idJE);
                                                    }
                                                    objRecord.save();
                                                } else {

                                                    objRecord.save();

                                                    // if (type == scriptContext.UserEventType.EDIT) {
                                                    /* 
                                                    Se procede a editar el JE generado previamente y a modificar las lineas de importes
                                                    */

                                                    let objRecordJE = record.load({
                                                        type: record.Type.JOURNAL_ENTRY,
                                                        id: journalEntryDescCtaAjena,
                                                        isDynamic: false
                                                    });

                                                    if (!utilidades.isEmpty(objRecordJE)) {

                                                        let numeroLineas = objRecordJE.getLineCount({
                                                            sublistId: 'line'
                                                        });

                                                        log.debug(proceso, 'numeroLineas JE: ' + numeroLineas);

                                                        for (let i = 0; i < numeroLineas && diferenciaEntreMontos; i++) {

                                                            /* objRecordJE.selectLine({ sublistId: 'line', line: i });
                                                            let credito = objRecordJE.getCurrentSublistValue({ sublistId: 'line', fieldId: 'credit' });

                                                            if (!utilidades.isEmpty(credito) && !isNaN(credito) && parseFloat(credito, 10) > 0) {
                                                                objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: descuentoTotal, ignoreFieldChange: false });
                                                            } else {
                                                                objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: descuentoTotal, ignoreFieldChange: false });
                                                            }

                                                            objRecordJE.commitLine({ sublistId: 'line' }); */

                                                            let credito = objRecordJE.getSublistValue({ sublistId: 'line', fieldId: 'credit', line: i });
                                                            let debito = objRecordJE.getSublistValue({ sublistId: 'line', fieldId: 'debit', line: i });

                                                            if ((!utilidades.isEmpty(credito) && !isNaN(credito) && parseFloat(credito, 10) != 0 && credito != descuentoTotal) || (!utilidades.isEmpty(debito) && !isNaN(debito) && parseFloat(debito, 10) != 0 && debito != descuentoTotal)) {
                                                                if (!utilidades.isEmpty(credito) && !isNaN(credito) && parseFloat(credito, 10) > 0) {
                                                                    objRecordJE.setSublistValue({ sublistId: 'line', fieldId: 'credit', line: i, value: descuentoTotal });
                                                                } else {
                                                                    objRecordJE.setSublistValue({ sublistId: 'line', fieldId: 'debit', line: i, value: descuentoTotal });
                                                                }
                                                            } else {
                                                                diferenciaEntreMontos = false;
                                                            }
                                                        }

                                                        if (diferenciaEntreMontos) {
                                                            objRecordJE.setValue('approvalstatus', parametroEstadoAprobado);
                                                            let approvalstatusJE = objRecordJE.getValue('approvalstatus');
                                                            log.debug(proceso, 'approvalstatus JE: ' + approvalstatusJE);
                                                            idJE = objRecordJE.save();
                                                        }
                                                    }
                                                    // }
                                                }

                                                log.debug(proceso, 'adenda transaccion: ' + adendaTransaccion + ' - adenda RT: ' + adendaBeneficio + ' - diferenciaEntreMontos: ' + diferenciaEntreMontos);

                                                let objRecordNew = record.load({
                                                    type: recType,
                                                    id: recId
                                                });

                                                if (!utilidades.isEmpty(adendaBeneficio) && recType != 'creditmemo') {
                                                    var totalPagar = parseFloat(parseFloat(total, 10).toFixedOK(2) - parseFloat(descuentoTotal, 10).toFixedOK(2), 10).toFixedOK(2);
                                                    var re = /XXXX/gi;
                                                    var adendaBeneficioAux = adendaBeneficio.replace(re, descuentoTotal.toString());
                                                    var reTotalCreditoFiscal = /YYYY/gi;
                                                    adendaBeneficio = adendaBeneficioAux.replace(reTotalCreditoFiscal, totalPagar.toString());

                                                    let adendaAnteriorBeneficio = objRecordNew.getValue('custbody_l598_adenda_beneficios_descue');
                                                    if (!utilidades.isEmpty(adendaAnteriorBeneficio) && !utilidades.isEmpty(adendaTransaccion) && adendaTransaccion.includes(adendaAnteriorBeneficio)) {
                                                        adendaTransaccion = adendaTransaccion.replace(adendaAnteriorBeneficio, '');
                                                    }

                                                    if (utilidades.isEmpty(adendaTransaccion) || (!utilidades.isEmpty(adendaTransaccion) && !adendaTransaccion.includes(adendaBeneficio))) {
                                                        adendaTransaccion = utilidades.isEmpty(adendaTransaccion) ? adendaBeneficio : adendaTransaccion + '\n' + adendaBeneficio;
                                                        objRecordNew.setValue('custbody_l598_adenda', adendaTransaccion);
                                                        objRecordNew.setValue('custbody_l598_adenda_beneficios_descue', adendaBeneficio);
                                                    }
                                                }

                                                objRecordNew.save();

                                                log.debug(proceso, 'recID: ' + recId + ' - idJE: ' + idJE + ' - tranID: ' + tranID);

                                                /* Procedo a crear el pago de cliente */
                                                if (!utilidades.isEmpty(idJE) && recType == 'invoice' && diferenciaEntreMontos) {
                                                    let datosCustPayment = applyJEtoInvoice(recId, idJE, tranID, idCuentaPagoCliente, descuentoTotal);

                                                    log.debug(proceso, 'datosCustPayment: ' + JSON.stringify(datosCustPayment));
                                                    if (!datosCustPayment.error) {
                                                        log.debug(proceso, 'Creacion de JE, aplicacion de pago de cliente y finalizacion del proceso de manera existosa.');
                                                    } else {
                                                        log.error(proceso, datosCustPayment.mensaje);
                                                    }
                                                }
                                            } else {
                                                log.error(proceso, 'El cliente aplica a descuento por cuenta ajena pero no existe una cuenta contable para el JE o una cuenta contable para el pago de cliente, definida en la configuracion de cuenta ajena para aplicar el descuento.');
                                            }
                                        } else {
                                            log.error(proceso, 'El cliente aplica a descuento por cuenta ajena pero no se encuentra configurado un porcentaje de descuento en el RT de configuracion de cuenta ajena, por lo tanto, no se calcula descuento por cuenta ajena.');
                                        }
                                    } else {
                                        log.error(proceso, infoConfigCtaAjena.mensaje);
                                    }
                                } else {
                                    log.debug(proceso, 'El cliente no aplica a descuento por cuenta ajena.');
                                }
                            } else {
                                log.debug(proceso, 'La transaccion no es de cuenta ajena, no se procede con la creacion del asiento contable.');
                            }
                        } else {
                            log.debug(proceso, 'La transaccion posee CAE, no se procede a validar si es cuenta ajena.');
                        }
                    }
                }
            } catch (error) {
                log.error(proceso, 'Ocurrió un error en el proceso de creación del asiento contable para el descuento del 70%, detalles: ' + error.message);
            }
        }

        let applyJEtoInvoice = (invoiceID, idJE, tranID, idCuentaPagoCliente, descuentoTotal) => {

            let proceso = 'applyJEtoInvoice';
            let respuesta = { error: false, mensaje: '', idCustPayment: '' };

            try {
                log.debug(proceso, 'INICIO - aplicacion de JE a invoice');

                // apply open credit memo(s) to invoice [assumption under the same AR account]
                let objCustPaymtRec = record.transform({
                    fromType: record.Type.INVOICE,
                    fromId: invoiceID,
                    toType: record.Type.CUSTOMER_PAYMENT,
                    isDynamic: false
                });

                if (!utilidades.isEmpty(objCustPaymtRec)) {
                    objCustPaymtRec.setValue('memo', 'Pago creado para vincular JE generado con la factura #' + tranID);
                    // objCustPaymtRec.setValue('undepfunds', true);
                    // objCustPaymtRec.setValue('account', idCuentaPagoCliente);

                    //assumption is that we will apply all the credit memo available
                    let intCreditLns = objCustPaymtRec.getLineCount('credit');
                    for (let i = 0; i < intCreditLns; i++) {
                        let sublistIDJE = objCustPaymtRec.getSublistValue({ sublistId: 'credit', fieldId: 'internalid', line: i });
                        if (sublistIDJE == idJE) {
                            log.debug(proceso, 'Se encontro el JE a aplicar a la invoice, internalid: ' + sublistIDJE);
                            objCustPaymtRec.setSublistValue({ sublistId: 'credit', fieldId: 'apply', line: i, value: true });
                            i = intCreditLns;
                            break;
                        }
                    }

                    let intApplyLns = objCustPaymtRec.getLineCount('apply');
                    for (let i = 0; i < intApplyLns; i++) {
                        let sublistIDInv = objCustPaymtRec.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
                        if (sublistIDInv == invoiceID) {
                            log.debug(proceso, 'Se encontro la invoice en el pago, internalid: ' + sublistIDInv);
                            objCustPaymtRec.setSublistValue({ sublistId: 'apply', fieldId: 'amount', line: i, value: descuentoTotal });
                            i = intApplyLns;
                            break;
                        }
                    }

                    //only commit the payment record if we have indeed found credit memos
                    let idCustPayment = objCustPaymtRec.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });
                    log.debug(proceso, 'Apply the Credit Memo(s) or JE: ' + idCustPayment);
                    respuesta.idCustPayment = idCustPayment;
                }

                log.debug(proceso, 'FIN - aplicacion de JE a invoice');
            } catch (error) {
                respuesta.error = true;
                respuesta.mensaje = 'Ocurrio un error mientras se procesaba el pago de cliente, detalles: ' + error.message;
                log.error(proceso, respuesta.mensaje);
            }

            //if we get here, we didn't do work
            return respuesta;
        }

        let obtenerConfigDatosCtaAjena = (subsidiary) => {

            let proceso = 'obtenerConfigDatosCtaAjena';
            let response = { error: false, mensaje: '', datosCuentaAjena: {} };

            try {
                let mySS = search.create({
                    type: 'customrecord_l598_config_datos_cta_ajena',
                    columns: ['custrecord_l598_conf_da_cta_aj_cta_co_je', 'custrecord_l598_conf_da_cta_aj_cta_co_pc', 'custrecord_l598_conf_da_cta_aj_adenda', 'custrecord_l598_conf_da_cta_aj_porc_desc']
                });

                let arraySearchParams = [];

                let objParam = new Object({});
                objParam.name = 'isinactive';
                objParam.operator = search.Operator.IS;
                objParam.values = ['F'];
                arraySearchParams.push(objParam);

                if (subsidiary) {
                    let objParam2 = new Object({});
                    objParam2.name = 'custrecord_l598_conf_da_cta_aj_subsidia';
                    objParam2.operator = search.Operator.ANYOF;
                    objParam2.values = subsidiary;
                    arraySearchParams.push(objParam2);
                }

                for (let i = 0; i < arraySearchParams.length; i++) {
                    filtro = search.createFilter({
                        name: arraySearchParams[i].name,
                        operator: arraySearchParams[i].operator,
                        values: arraySearchParams[i].values
                    });
                    mySS.filters.push(filtro);
                }

                let searchResults = mySS.run().getRange({
                    start: 0,
                    end: 1
                });

                if (!utilidades.isEmpty(searchResults) && searchResults.length > 0) {
                    response.datosCuentaAjena.idCuentaAjena = searchResults[0].getValue('custrecord_l598_conf_da_cta_aj_cta_co_je');
                    response.datosCuentaAjena.idCuentaPagoCliente = searchResults[0].getValue('custrecord_l598_conf_da_cta_aj_cta_co_pc');
                    response.datosCuentaAjena.adenda = searchResults[0].getValue('custrecord_l598_conf_da_cta_aj_adenda');
                    response.datosCuentaAjena.porcentajeCtaAjena = searchResults[0].getValue('custrecord_l598_conf_da_cta_aj_porc_desc');
                }
            } catch (error) {
                response.error = true;
                response.message = 'Ocurrió una excepción consultando los datos de cuenta ajena de la empresa, detalles: ' + error.message;
                log.error(proceso, response.message);
            }

            return response;
        }

        Number.prototype.toFixedOK = function (decimals) {
            var sign = this >= 0 ? 1 : -1;
            return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        }
    });
