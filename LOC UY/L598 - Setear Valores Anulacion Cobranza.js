/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@NAmdConfig /SuiteScripts/configuration_l598.json
 */
define(
    [
        'N/record', 'N/error', 'N/search', 'L598/utilities', 'N/runtime'
    ],
    function (record, error, search, utilities, runtime) {

        function beforeLoad(scriptContext) {

            let proceso = 'beforeLoad';

            try {
                let pagoAnulado = '';
                let textoPagoAnulado = '';

                if (scriptContext.newRecord.type == 'customtransaction_l598_anulacion_cobranz') {
                    //textoPagoAnulado = scriptContext.newRecord.getText({ fieldId: 'custbody_l598_anulacion_cob_pago_anu' });
                    pagoAnulado = scriptContext.newRecord.getValue({ fieldId: 'custbody_l598_anulacion_cob_pago_anu' });
                    log.debug(proceso, 'INICIO - beforeLoad - Es trasaccion de Anulacion. Pago Anulado: ' + pagoAnulado);
                }

                if (scriptContext.type == scriptContext.UserEventType.CREATE && scriptContext.newRecord.type == 'customtransaction_l598_anulacion_cobranz' && !utilities.isEmpty(pagoAnulado)) {
                    // Carga Cutomer Payment ANULADO
                    let recordCP = record.load({
                        type: 'customerpayment',
                        id: pagoAnulado
                    });

                    log.debug(proceso, "Pago anulado - type: " + recordCP.type + " / id: " + recordCP.id);
                    // Get Data From Customer Payment
                    let cuentasacobrar = recordCP.getValue({ fieldId: 'aracct' });
                    let cuenta = recordCP.getValue({ fieldId: 'account' });
                    let totalimporte = recordCP.getValue({ fieldId: 'payment' });
                    let cliente = recordCP.getValue({ fieldId: 'customer' });

                    // Get Current Record
                    let recordTransaction = scriptContext.newRecord;

                    let esOneWorld = utilities.l598esOneworld();
                    let subsidiaria = null;

                    if (esOneWorld) {
                        subsidiaria = recordCP.getValue({ fieldId: 'subsidiary' });
                        recordTransaction.setValue({ fieldId: 'subsidiary', value: subsidiaria });
                    }

                    recordTransaction.setValue({ fieldId: 'custbody_l598_total_pago_anulado', value: totalimporte });

                    //Create a Credit Line in Anulacion de Transaccion
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'account', line: 0, value: cuenta });
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'credit', line: 0, value: totalimporte });
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'entity', line: 0, value: cliente });
                    recordTransaction.setSublistValue({ sublistId: 'line', line: 0, fieldId: 'memo', value: 'Anulacion de pago: ' + textoPagoAnulado });

                    //Create a Debit Line in Anulacion de Transaccion
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'account', line: 1, value: cuentasacobrar });
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'debit', line: 1, value: totalimporte });
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'entity', line: 1, value: cliente });
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'memo', line: 1, value: 'Anulacion de pago: ' + textoPagoAnulado });
                }
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepcion - Detalles: ' + error.message);
            }

            return true;
        }

        function beforeSubmit(scriptContext) {

            let proceso = 'beforeSubmit';

            try {
                let pagoAnulado = '';

                if (scriptContext.newRecord.type == 'customtransaction_l598_anulacion_cobranz') {
                    pagoAnulado = scriptContext.newRecord.getValue({ fieldId: 'custbody_l598_anulacion_cob_pago_anu' });
                    log.debug(proceso, 'INICIO - beforeSubmit - Es trasaccion de Anulacion. Pago Anulado: ' + pagoAnulado);
                }

                if (scriptContext.type == scriptContext.UserEventType.CREATE && scriptContext.newRecord.type == 'customtransaction_l598_anulacion_cobranz' && !utilities.isEmpty(pagoAnulado)) {
                    // Carga Cutomer Payment ANULADO
                    let recordCP = record.load({
                        type: 'customerpayment',
                        id: pagoAnulado
                    });

                    log.debug(proceso, "Pago anulado - type: " + recordCP.type + " / id: " + recordCP.id);
                    // Get Data From Customer Payment
                    let cuentasacobrar = recordCP.getValue({ fieldId: 'aracct' });
                    let cuenta = recordCP.getValue({ fieldId: 'account' });
                    let totalimporte = recordCP.getValue({ fieldId: 'payment' });
                    let cliente = recordCP.getValue({ fieldId: 'customer' });

                    // Get Current Record
                    let recordTransaction = scriptContext.newRecord;
                    let cantidadLineas = recordTransaction.getLineCount('line');
                    log.debug(proceso, 'cantidadLineas: ' + cantidadLineas);

                    let esOneWorld = utilities.l598esOneworld();
                    let subsidiaria = null;

                    if (esOneWorld) {
                        subsidiaria = recordCP.getValue({ fieldId: 'subsidiary' });
                        recordTransaction.setValue({ fieldId: 'subsidiary', value: subsidiaria });
                    }

                    recordTransaction.setValue({ fieldId: 'custbody_l598_total_pago_anulado', value: totalimporte });

                    //Create a Credit Line in Anulacion de Transaccion
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'account', line: 0, value: cuenta });
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'credit', line: 0, value: totalimporte });
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'entity', line: 0, value: cliente });

                    //Create a Debit Line in Anulacion de Transaccion
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'account', line: 1, value: cuentasacobrar });
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'debit', line: 1, value: totalimporte });
                    recordTransaction.setSublistValue({ sublistId: 'line', fieldId: 'entity', line: 1, value: cliente });
                }
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepcion beforeSubmit - Detalles: ' + error.message);
            }
        }

        function afterSubmit(scriptContext) {

            let proceso = 'afterSubmit';

            try {
                let currentScript = runtime.getCurrentScript();

                if (scriptContext.type != scriptContext.UserEventType.DELETE) {

                    log.debug(proceso, 'INICIO afterSubmit anulacion cobranzas');
                    log.debug(proceso, "Es Transaccion de anulacion de pago");

                    var pagoanulado = scriptContext.newRecord.getValue({ fieldId: 'custbody_l598_anulacion_cob_pago_anu' });
                    let recId = scriptContext.newRecord.id;
                    // voidJournalPagosMultiples(pagoanulado);
                    UnapplyInvoices(pagoanulado, recId);

                    //Cancelar Cheques
                    /* var chequesrelacionados = getChequesByCustpayment(pagoanulado);
                    log.debug(proceso, "getChequesByCustpayment RESPONSE: " + JSON.stringify(chequesrelacionados));

                    //Loop Cheques And Change Estado
                    if (chequesrelacionados.data.length > 0) {

                        let codigoEstadoRechazado = currentScript.getParameter('custscript_l598_con_di_fe_ss_estadorecha');

                        for (var i = 0; i < chequesrelacionados.data.length; i++) {
                            //Change all the records status
                            log.debug(proceso, "Cambiar estado Rechazado, Cheque#: " + chequesrelacionados.data[i]);

                            var id = record.submitFields({
                                type: "customrecord_3k_cobranza_cheques",
                                id: chequesrelacionados.data[i],
                                values: {
                                    custrecord_3k_cobranza_chq_estado: codigoEstadoRechazado
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });
                        }
                    } */

                    log.debug(proceso, 'FIN afterSubmit anulacion cobranzas');
                }
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepcion afterSubmit - Detalles: ' + error.message);
            }
        }

        /* function voidJournalPagosMultiples(pagoAnulado){

            var proceso = 'voidJournalPagosMultiples';
            log.audit(proceso, 'INICIO - voidJournalPagosMultiples');

            try{
                log.debug(proceso, 'pagoAnulado: ' + pagoAnulado);

                var filtrosAsientos = new Array();
                var arrayAsientos = new Array();

                var filtroPago = new Object();
                filtroPago.name = 'custbody_3k_asiento_mult_cob_idcobro';
                filtroPago.operator = 'ANYOF';
                filtroPago.values = pagoAnulado;
                filtrosAsientos.push(filtroPago);

                var searchAsientos = utilities.searchSavedPro('customsearch_3k_asiento_mult_cobro_asoc', filtrosAsientos);

                if (!searchAsientos.error && !utilities.isEmpty(searchAsientos.objRsponseFunction.result) && searchAsientos.objRsponseFunction.result.length > 0) {

                    var asientosResultSet = searchAsientos.objRsponseFunction.result;
                    var asientosResultSearch = searchAsientos.objRsponseFunction.search;

                    log.debug(proceso, 'asientosResultSet.length: ' + asientosResultSet.length);

                    for (var k = 0; k < asientosResultSet.length; k++) {
                        var asientoID = asientosResultSet[k].getValue({ name: asientosResultSearch.columns[0] });
                        var asientoNombre = asientosResultSet[k].getValue({ name: asientosResultSearch.columns[1] });
                        arrayAsientos.push({
                            asientoID: asientoID,
                            asientoNombre: asientoNombre,
                            asientoTipo: 'customtransaction_3k_asiento_mult_cob'
                        });
                    }

                    log.debug(proceso, 'arrayAsientos: ' + JSON.stringify(arrayAsientos));
                    log.debug(proceso, 'arrayAsientos.length: ' + JSON.stringify(arrayAsientos.length));
                }

                //Anular Asientos Múltiples cobros
                if (!utilities.isEmpty(arrayAsientos) && arrayAsientos.length > 0) {
                    for (i = 0; i < arrayAsientos.length; i++) {
                        var asientoMultiple = arrayAsientos[i];

                        log.debug(proceso, 'asientoMultiple a Anular: ' + JSON.stringify(asientoMultiple));

                        asientoMultipleVoid = transaction.void({
                            type: asientoMultiple.asientoTipo,
                            id: asientoMultiple.asientoID
                        });

                        record.submitFields({
                            type: 'journalentry',
                            id: asientoMultipleVoid,
                            values: {
                                memo: 'Anula: ' + asientoMultiple.asientoNombre
                            }
                        });
                    }
                }
            }catch(e){
                log.error(proceso, 'Netsuite Exception: ' + e.message);
            }

            log.audit(proceso, 'FIN - voidJournalPagosMultiples');
        } */

        function UnapplyInvoices(pagoAnulado, anulacionCobranza) {

            var proceso = 'UnapplyInvoices';
            log.audit(proceso, 'INICIO - UnapplyInvoices');
            log.debug(proceso, 'pagoAnulado: ' + pagoAnulado);

            try {

                var recObject = record.load({
                    id: pagoAnulado,
                    type: record.Type.CUSTOMER_PAYMENT,
                    isDynamic: true
                });

                // Unapplied Invoices and Applied Anulacion
                var applyLines = recObject.getLineCount({ sublistId: 'apply' });
                log.debug(proceso, 'applyLines: ' + applyLines);

                for (var i = 0; i < applyLines; i++) {
                    recObject.selectLine({ sublistId: 'apply', line: i });

                    let trantype = recObject.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'trantype' });
                    let isapplied = recObject.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply' });
                    let internalid = recObject.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'internalid' });
                    // log.debug(proceso, 'Line trantype: ' + trantype);

                    if (trantype == 'CustInvc' && (isapplied === true || isapplied == 'T')) {
                        log.debug(proceso, 'Trantype is Invoice matched! Unapplying...');
                        recObject.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: false });
                    }

                    if (trantype == 'Custom' && internalid == anulacionCobranza) {
                        log.debug(proceso, 'Trantype is Anulacion! Applying...');
                        recObject.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                    }

                }

                recObject.setValue({
                    fieldId: 'custbody_l598_esta_anulado',
                    value: true
                })

                // Save Record
                recObject.save();
            } catch (e) {
                log.error(proceso, 'Netsuite Exception UnapplyInvoices - Detalles: ' + e.message);
            }

            log.audit(proceso, 'FIN - UnapplyInvoices');
        }

        /* function getChequesByCustpayment(custpayment) {
            var response = { error: false, mensaje: '', data: [] };

            try {
                var filtros = [];

                var filtro = {};
                filtro.name = 'custrecord_3k_cobranza_chq_payment_id';
                filtro.operator = 'IS';
                filtro.values = [custpayment];
                filtros.push(filtro);

                var objResultSet = utilities.searchSavedPro("customsearch_3k_cartera_chq_en_pago", filtros);
                if (!objResultSet.error) {

                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;

                    if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {

                        for (var i = 0; !utilities.isEmpty(resultSet) && i < resultSet.length; i++) {
                            var internalId = resultSet[i].getValue({ name: resultSearch.columns[0] });
                            response.data.push(internalId); //Pushes Cheques By Customer Payment
                        }
                    }
                } else {
                    response.error = true;
                    response.mensaje = 'Error Consultando searchSavedPro - customsearch_3k_cartera_chq_en_pago';
                }
            } catch (e) {
                response.error = true;
                response.mensaje = "Netsuite Excepción: " + e.message;
            }

            return response;
        } */

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        }
    });
