/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/error', 'N/search', 'L598/utilities', 'N/runtime', 'N/format'],

    (record, error, search, utilidades, runtime, format) => {

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
                    log.audit(proceso, 'Ingreso a seteo de campo de JE de beneficio fiscal en null.');
                    let objRecord = scriptContext.newRecord;
                    let recType = scriptContext.newRecord.type;
                    objRecord.setValue('custbody_l598_journal_entry_desc_lit_e', '');
                    objRecord.setValue('custbody_l598_total_consum_beneficio', '');
                    let createdfrom = objRecord.getValue('createdfrom');

                    // if (recType == 'creditmemo' && !utilidades.isEmpty(createdfrom)) {

                    /* Elimino la adenda anterior del beneficio*/
                    let adendaAnteriorBeneficio = objRecord.getValue('custbody_l598_adenda_beneficios_descue');
                    let adendaTransaccion = objRecord.getValue('custbody_l598_adenda');
                    if (!utilidades.isEmpty(adendaAnteriorBeneficio) && !utilidades.isEmpty(adendaTransaccion) && adendaTransaccion.includes(adendaAnteriorBeneficio)) {
                        adendaTransaccion = adendaTransaccion.replace(adendaAnteriorBeneficio, '');
                    }

                    objRecord.setValue('custbody_l598_adenda', adendaTransaccion);
                    objRecord.setValue('custbody_l598_adenda_beneficios_descue', '');
                    // }
                }

                log.audit(proceso, 'FIN - BEFORELOAD ' + scriptContext.type);
            } catch (error) {
                log.error(proceso, 'Ocurrio un error mientras se seteaba en null los campos de literal E, detalles: ' + error.message);
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

            let proceso = 'afterSubmit - Descuento Beneficio Cliente';

            try {
                log.audit(proceso, 'INICIO - AFTERSUBMIT ' + scriptContext.type);

                if (scriptContext.type != scriptContext.UserEventType.DELETE) {
                    let recId = scriptContext.newRecord.id;
                    let recType = scriptContext.newRecord.type;
                    let type = scriptContext.type;
                    let currentScript = runtime.getCurrentScript();
                    let parametroEstadoAprobado = currentScript.getParameter('custscript_l598_desc_ben_cli_est_apro_je');
                    let parametroIDFormularioJE = currentScript.getParameter('custscript_l598_desc_ben_cli_id_form_je');
                    let parametroSetearKSName = currentScript.getParameter('custscript_l598_desc_ben_cli_set_ksname');
                    log.debug(proceso, 'Valor de recId: ' + recId + ' - RECTYPE: ' + recType + ' - TYPE: ' + type);

                    if (!utilidades.isEmpty(recId) && !utilidades.isEmpty(recType) && recId > 0) {

                        let objRecord = record.load({
                            type: recType,
                            id: recId
                        });

                        let adendaTransaccion = objRecord.getValue('custbody_l598_adenda');
                        let entity = objRecord.getValue('entity');
                        log.debug(proceso, 'entity id: ' + entity);
                        let beneficio = objRecord.getValue('custbody_l598_tipo_beneficio_fiscal');
                        let totalTransaccion = Math.abs(parseFloat(objRecord.getValue('total')));
                        let isOneWorld = utilidades.l598esOneworld();
                        let subsidiary = isOneWorld ? objRecord.getValue('subsidiary') : null;
                        let trandate = objRecord.getValue('trandate');
                        let nroCAE = objRecord.getValue('custbody_l598_cae');
                        let esCuentaAjena = objRecord.getValue('custbody_l598_transac_cuenta_ajena');
                        log.debug(proceso, 'esCuentaAjena: ' + esCuentaAjena + ' - totalTransaccion: ' + totalTransaccion);
                        let journalEntryDescBeneficio = objRecord.getValue('custbody_l598_journal_entry_desc_lit_e');
                        let currency = objRecord.getValue('currency');
                        let exchangerate = parseFloat(objRecord.getValue('exchangerate'), 10);
                        let department = objRecord.getValue('department');
                        let location = objRecord.getValue('location');
                        let clase = objRecord.getValue('class');
                        let idAccount = objRecord.getValue('account');
                        let tranID = objRecord.getValue('tranid');
                        let period = objRecord.getValue('postingperiod');

                        /* Verifico si aplica a generacion de asiento de reclasificacion y si es LITERAL E o descuento por 750.000 UI */
                        if (!utilidades.isEmpty(beneficio) && (utilidades.isEmpty(esCuentaAjena) || esCuentaAjena == "F" || esCuentaAjena == false)) {
                            // if (!utilidades.isEmpty(beneficio)) {
                            if (utilidades.isEmpty(nroCAE)) {

                                let obtDatBenFiscales = obtenerDatosConfigBeneficios(subsidiary, trandate, beneficio);

                                if (!obtDatBenFiscales.error) {

                                    let datosConfigBeneficios = obtDatBenFiscales.datosConfigBeneficios;
                                    let aplicaJEReclasificacion = datosConfigBeneficios.aplicaJEReclasificacion;
                                    let adendaBeneficio = datosConfigBeneficios.adendaBeneficio;
                                    let tipoCambioUI = parseFloat(datosConfigBeneficios.tipoCambioUI, 10);
                                    let cantidadUICreditos = parseFloat(datosConfigBeneficios.cantidadUICreditos, 10);
                                    let datosUIConsumidas = obtenerUIConsumidasPeriodo(subsidiary, entity, period, recId, beneficio);
                                    log.debug(proceso, 'datosUIConsumidas por periodo: ' + JSON.stringify(datosUIConsumidas));
                                    let idCuentaPagoCliente = datosConfigBeneficios.idCuentaPagoCliente;
                                    let aplicaAlNeto = !utilidades.isEmpty(datosConfigBeneficios.aplicaAlNeto) && (datosConfigBeneficios.aplicaAlNeto == true || datosConfigBeneficios.aplicaAlNeto == 'T') ? true : false;
                                    let aplicaAlBruto = !utilidades.isEmpty(datosConfigBeneficios.aplicaAlBruto) && (datosConfigBeneficios.aplicaAlBruto == true || datosConfigBeneficios.aplicaAlBruto == 'T') ? true : false;
                                    let idCuentaBeneficio = datosConfigBeneficios.idCuentaBeneficio;
                                    let aplicaLiteralE = datosConfigBeneficios.aplicaLiteralE;
                                    log.debug(proceso, 'datosUIConsumidas: ' + JSON.stringify(datosUIConsumidas));
                                    let importeTotalBeneficioEnPesos = parseInt(parseFloat(cantidadUICreditos, 10) * parseFloat(tipoCambioUI, 10), 10);
                                    log.debug(proceso, 'importeTotalBeneficioEnPesos importe total del beneficio en pesos: ' + importeTotalBeneficioEnPesos);

                                    if (!datosUIConsumidas.error && !isNaN(tipoCambioUI) && parseFloat(tipoCambioUI, 10) > 0) {

                                        /* INICIO transformo a UI el total neto acumulado */
                                        let totalNetoAcumulado = parseFloat(datosUIConsumidas.totalNetoAcumulado, 10);
                                        log.debug(proceso, 'totalNetoAcumulado: ' + totalNetoAcumulado + ' / tipo cambio unidad indexada beneficios fiscales: ' + tipoCambioUI);
                                        // let totalNetoAcumUIPeriodo = parseFloat(totalNetoAcumulado / tipoCambioUI, 10);
                                        let totalNetoAcumUIPeriodo = parseFloat(totalNetoAcumulado, 10);
                                        log.debug(proceso, 'total neto acumulado final en UI: ' + totalNetoAcumUIPeriodo);
                                        /* FIN transformo a UI el total neto acumulado */


                                        /* INICIO transformo a UI el total neto acumulado */
                                        let totalBrutoAcumulado = parseFloat(datosUIConsumidas.totalBrutoAcumulado, 10);
                                        log.debug(proceso, 'totalBrutoAcumulado: ' + totalBrutoAcumulado + ' / tipo cambio unidad indexada beneficios fiscales: ' + tipoCambioUI);
                                        // let totalBrutoAcumUIPeriodo = parseFloat(totalBrutoAcumulado / tipoCambioUI, 10);
                                        let totalBrutoAcumUIPeriodo = parseFloat(totalBrutoAcumulado, 10);
                                        log.debug(proceso, 'total bruto acumulado final en UI: ' + totalBrutoAcumUIPeriodo);
                                        /* FIN transformo a UI el total neto acumulado */

                                        let datosTotalesTransaccion = obtenerTotalesTransaccion(recId);
                                        log.debug(proceso, 'datosTotalesTransaccion actual: ' + JSON.stringify(datosTotalesTransaccion));

                                        if (!datosTotalesTransaccion.error) {

                                            if ((!isNaN(datosTotalesTransaccion.totalBrutoTransaccion) && parseFloat(datosTotalesTransaccion.totalBrutoTransaccion, 10) != 0) || (!isNaN(datosTotalesTransaccion.totalNetoTransaccion) && parseFloat(datosTotalesTransaccion.totalNetoTransaccion, 10) != 0)) {

                                                /* INICIO transformo el total bruto del comprobante en UI */
                                                let totalBrutoTransaccion = datosTotalesTransaccion.totalBrutoTransaccion;
                                                log.debug(proceso, 'totalBrutoTransaccion: ' + totalBrutoTransaccion + ' / tipo cambio unidad indexada beneficios fiscales: ' + tipoCambioUI);
                                                // let totalTransBrutoUI = parseFloat(totalBrutoTransaccion / tipoCambioUI, 10); // Total Bruto transaccion en UI
                                                let totalTransBrutoUI = parseFloat(totalBrutoTransaccion, 10); // Total Bruto transaccion en UI
                                                /* let totalBrutoUIAux = parseFloat(totalBrutoTransaccion / tipoCambioUI, 10); // Total Bruto transaccion en UI
                                                let totalTransBrutoUI = parseInt(totalBrutoUIAux, 10); */
                                                log.debug(proceso, 'total bruto transaccion UI (totalTransBrutoUI) truncado sin decimal: ' + totalTransBrutoUI + ' - cantidad maxima de UI para descuentos: ' + cantidadUICreditos);
                                                /* FIN transformo el total bruto del comprobante en UI */


                                                /* INICIO transformo el total neto del comprobante en UI */
                                                let totalNetoTransaccion = datosTotalesTransaccion.totalNetoTransaccion;
                                                log.debug(proceso, 'totalNetoTransaccion: ' + totalNetoTransaccion + ' / tipo cambio unidad indexada beneficios fiscales: ' + tipoCambioUI);
                                                // let totalTransNetoUI = parseFloat(totalNetoTransaccion / tipoCambioUI, 10); // Total Neto transaccion en UI
                                                let totalTransNetoUI = parseFloat(totalNetoTransaccion, 10); // Total Neto transaccion en UI
                                                /* let totalNetoUITransAux = parseFloat(totalNetoTransaccion / tipoCambioUI, 10); // Total Neto transaccion en UI
                                                let totalTransNetoUI = parseInt(totalNetoUITransAux, 10); */
                                                log.debug(proceso, 'total neto transaccion UI: ' + totalTransNetoUI + ' - cantidad maxima de UI para descuentos: ' + cantidadUICreditos);
                                                /* FIN transformo el total neto del comprobante en UI */


                                                let restaTotalNetoUIAcum = 0.00;
                                                let restaTotalBrutoUIAcum = 0.00;
                                                let acumuladoNegativo = false;

                                                if (recType == 'invoice' && (totalNetoAcumUIPeriodo < 0 || totalBrutoAcumUIPeriodo < 0)) {
                                                    acumuladoNegativo = true;
                                                    restaTotalNetoUIAcum = totalTransNetoUI - Math.abs(totalNetoAcumUIPeriodo); // resta lo que se factura menos el acumulado negativo
                                                    restaTotalBrutoUIAcum = totalTransBrutoUI - Math.abs(totalBrutoAcumUIPeriodo); // resta lo que se factura menos el acumulado negativo;
                                                } else if (recType == 'creditmemo') {
                                                    restaTotalNetoUIAcum = totalNetoAcumUIPeriodo - Math.abs(totalTransNetoUI);
                                                    restaTotalBrutoUIAcum = totalBrutoAcumUIPeriodo - Math.abs(totalTransBrutoUI);
                                                }

                                                log.debug(proceso, 'rectype: ' + recType + ' / restaTotalNetoUIAcum: ' + restaTotalNetoUIAcum + ' - restaTotalBrutoUIAcum: ' + restaTotalBrutoUIAcum + ' - importeTotalBeneficioEnPesos: ' + importeTotalBeneficioEnPesos + ' - cantidadUICreditos: ' + cantidadUICreditos);

                                                // if (parseFloat(totalNetoAcumUIPeriodo, 10) < parseFloat(cantidadUICreditos, 10) || parseFloat(totalBrutoAcumUIPeriodo, 10) < parseFloat(cantidadUICreditos, 10) || (recType == 'creditmemo' && (parseFloat(restaTotalNetoUIAcum, 10) < parseFloat(cantidadUICreditos, 10) || parseFloat(restaTotalBrutoUIAcum, 10) < parseFloat(cantidadUICreditos, 10)))) {
                                                if (parseFloat(totalNetoAcumUIPeriodo, 10) < parseFloat(importeTotalBeneficioEnPesos, 10) || parseFloat(totalBrutoAcumUIPeriodo, 10) < parseFloat(importeTotalBeneficioEnPesos, 10) || (recType == 'creditmemo' && (parseFloat(restaTotalNetoUIAcum, 10) < parseFloat(importeTotalBeneficioEnPesos, 10) || parseFloat(restaTotalBrutoUIAcum, 10) < parseFloat(importeTotalBeneficioEnPesos, 10)))) {

                                                    let totalRestanteCreditosUI = 0;
                                                    let totalAcumUIFinalTransaccion = 0;
                                                    let totalMonedaFinalDescuento = 0;

                                                    // Se realizan validaciones sobre NC
                                                    let errorValidacionNC = false;
                                                    if (recType == 'creditmemo') {
                                                        if (aplicaAlNeto) {
                                                            if ((totalNetoAcumUIPeriodo > 0)) {
                                                                if (restaTotalNetoUIAcum <= 0 && totalNetoAcumUIPeriodo > importeTotalBeneficioEnPesos) {
                                                                    totalMonedaFinalDescuento = parseFloat(Math.abs(importeTotalBeneficioEnPesos), 10);
                                                                } else {
                                                                    if (restaTotalNetoUIAcum <= 0 && totalNetoAcumUIPeriodo <= importeTotalBeneficioEnPesos) {
                                                                        totalMonedaFinalDescuento = parseFloat(Math.abs(totalNetoAcumUIPeriodo), 10);
                                                                    } else {
                                                                        if (totalNetoAcumUIPeriodo > importeTotalBeneficioEnPesos && restaTotalNetoUIAcum < importeTotalBeneficioEnPesos) {
                                                                            totalMonedaFinalDescuento = parseFloat(Math.abs(importeTotalBeneficioEnPesos - restaTotalNetoUIAcum), 10);
                                                                        } else {
                                                                            if (totalNetoAcumUIPeriodo <= importeTotalBeneficioEnPesos && restaTotalNetoUIAcum > 0) {
                                                                                totalMonedaFinalDescuento = parseFloat(Math.abs(totalTransNetoUI), 10);
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                errorValidacionNC = true;

                                                                if (totalNetoAcumUIPeriodo <= 0) {
                                                                    log.error(proceso, 'No se calculara asiento de reclasificacion porque el neto acumulado es menor o igual a 0 y no hay impuesto a reclasificar.');
                                                                }
                                                            }
                                                        } else if (aplicaAlBruto) {
                                                            if ((totalBrutoAcumUIPeriodo > 0)) {
                                                                if (restaTotalBrutoUIAcum <= 0 && totalBrutoAcumUIPeriodo > importeTotalBeneficioEnPesos) {
                                                                    totalMonedaFinalDescuento = parseFloat(Math.abs(importeTotalBeneficioEnPesos), 10);
                                                                } else {
                                                                    if (restaTotalBrutoUIAcum <= 0 && totalBrutoAcumUIPeriodo <= importeTotalBeneficioEnPesos) {
                                                                        totalMonedaFinalDescuento = parseFloat(Math.abs(totalBrutoAcumUIPeriodo), 10);
                                                                    } else {
                                                                        if (totalBrutoAcumUIPeriodo > importeTotalBeneficioEnPesos && restaTotalBrutoUIAcum < importeTotalBeneficioEnPesos) {
                                                                            totalMonedaFinalDescuento = parseFloat(Math.abs(importeTotalBeneficioEnPesos - restaTotalBrutoUIAcum), 10);
                                                                        } else {
                                                                            if (totalBrutoAcumUIPeriodo <= importeTotalBeneficioEnPesos && restaTotalBrutoUIAcum > 0) {
                                                                                totalMonedaFinalDescuento = parseFloat(Math.abs(totalTransBrutoUI), 10);
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                errorValidacionNC = true;

                                                                if (totalBrutoAcumUIPeriodo <= 0) {
                                                                    log.error(proceso, 'No se calculara asiento de reclasificacion porque el neto acumulado es menor o igual a 0 y no hay impuesto a reclasificar.');
                                                                }
                                                            }
                                                        }
                                                    } else {
                                                        if (aplicaAlNeto) {
                                                            if ((restaTotalNetoUIAcum == 0 && !acumuladoNegativo) || (restaTotalNetoUIAcum > 0 && acumuladoNegativo)) {

                                                                // si es acumulado negativo entonces se setea el neto acumulado en 0 porque la deuda ya fue saldada con la transaccion actual
                                                                totalNetoAcumUIPeriodo = acumuladoNegativo ? 0.00 : totalNetoAcumUIPeriodo;
                                                                // si es acumulado negativo entonces se setea el neto de la transaccion como el total de la resta de la transaccion actual - el acumulado
                                                                totalTransNetoUI = acumuladoNegativo ? restaTotalNetoUIAcum : totalTransNetoUI;


                                                                // totalRestanteCreditosUI = parseFloat(cantidadUICreditos - totalNetoAcumUIPeriodo, 10); // Verifico cuantas UI quedan restantes para credito fiscal
                                                                totalRestanteCreditosUI = parseFloat(importeTotalBeneficioEnPesos - Math.abs(totalNetoAcumUIPeriodo), 10); // Verifico cuantas UI quedan restantes para credito fiscal
                                                                // log.debug(proceso, 'cantidadUICreditos: ' + cantidadUICreditos + ' - totalNetoAcumUIPeriodo: ' + totalNetoAcumUIPeriodo + ' - totalRestanteCreditosUI: ' + totalRestanteCreditosUI)
                                                                log.debug(proceso, 'importeTotalBeneficioEnPesos: ' + importeTotalBeneficioEnPesos + ' - totalNetoAcumUIPeriodo: ' + totalNetoAcumUIPeriodo + ' - totalRestanteCreditosUI: ' + totalRestanteCreditosUI)
                                                                totalAcumUIFinalTransaccion = (totalRestanteCreditosUI >= totalTransNetoUI) ? totalTransNetoUI : totalRestanteCreditosUI; // Si el credito restante en UI es mayor o igual al NETO en UI de la transaccion, se hace el credito por el total
                                                            } else {
                                                                log.error(proceso, 'El monto total neto acumulado es menor o igual a 0, por tal motivo no se puede generar el asiento de reclasificacion.');
                                                            }
                                                        } else if (aplicaAlBruto) {

                                                            if ((restaTotalBrutoUIAcum == 0 && !acumuladoNegativo) || (restaTotalBrutoUIAcum > 0 && acumuladoNegativo)) {

                                                                // si es acumulado negativo entonces se setea el neto acumulado en 0 porque la deuda ya fue saldada con la transaccion actual
                                                                totalBrutoAcumUIPeriodo = acumuladoNegativo ? 0.00 : totalBrutoAcumUIPeriodo;
                                                                // si es acumulado negativo entonces se setea el neto de la transaccion como el total de la resta de la transaccion actual - el acumulado
                                                                totalTransBrutoUI = acumuladoNegativo ? restaTotalBrutoUIAcum : totalTransBrutoUI;


                                                                /* totalRestanteCreditosUI = parseFloat(cantidadUICreditos - totalBrutoAcumUIPeriodo, 10); // Verifico cuantas UI quedan restantes para credito fiscal
                                                                log.debug(proceso, 'cantidadUICreditos: ' + cantidadUICreditos + ' - totalBrutoAcumUIPeriodo: ' + totalBrutoAcumUIPeriodo + ' - totalRestanteCreditosUI: ' + totalRestanteCreditosUI) */
                                                                totalRestanteCreditosUI = parseFloat(importeTotalBeneficioEnPesos - Math.abs(totalBrutoAcumUIPeriodo), 10); // Verifico cuantas UI quedan restantes para credito fiscal
                                                                log.debug(proceso, 'importeTotalBeneficioEnPesos: ' + importeTotalBeneficioEnPesos + ' - totalBrutoAcumUIPeriodo: ' + totalBrutoAcumUIPeriodo + ' - totalRestanteCreditosUI: ' + totalRestanteCreditosUI)
                                                                totalAcumUIFinalTransaccion = (totalRestanteCreditosUI >= totalTransBrutoUI) ? totalTransBrutoUI : totalRestanteCreditosUI; // Si el credito restante en UI es mayor o igual al NETO en UI de la transaccion, se hace el credito por el total
                                                            } else {
                                                                log.error(proceso, 'El monto total bruto acumulado es menor o igual a 0, por tal motivo no se puede generar el asiento de reclasificacion.');
                                                            }
                                                        }

                                                        log.debug(proceso, 'totalAcumUIFinalTransaccion: ' + totalAcumUIFinalTransaccion);
                                                        totalMonedaFinalDescuento = totalAcumUIFinalTransaccion;
                                                    }

                                                    if (!utilidades.isEmpty(totalMonedaFinalDescuento) && !isNaN(totalMonedaFinalDescuento) && totalMonedaFinalDescuento > 0) {

                                                        log.debug(proceso, 'totalMonedaFinalDescuento en unidad indexada: ' + totalMonedaFinalDescuento);
                                                        // totalMonedaFinalDescuento = parseFloat(parseFloat(totalMonedaFinalDescuento, 10) * tipoCambioUI, 10);
                                                        totalMonedaFinalDescuento = parseFloat(totalMonedaFinalDescuento, 10);
                                                        log.debug(proceso, 'totalMonedaFinalDescuento en moneda de pesos: ' + totalMonedaFinalDescuento);
                                                        let impDescTransPesosUru = parseInt(totalMonedaFinalDescuento, 10);
                                                        totalMonedaFinalDescuento = parseFloat(parseFloat(totalMonedaFinalDescuento, 10) / exchangerate, 10).toFixedOK(2); // Transformo el importe a la moneda base de la transaccion
                                                        log.debug(proceso, 'totalMonedaFinalDescuento en moneda de la transaccion: ' + totalMonedaFinalDescuento);
                                                        totalMonedaFinalDescuento = parseInt(totalMonedaFinalDescuento, 10);
                                                        log.debug(proceso, 'totalMonedaFinalDescuento truncado a parte entera sin decimales: ' + totalMonedaFinalDescuento);
                                                        // Se realizan validaciones sobre NC

                                                        if (!errorValidacionNC) {
                                                            if (!utilidades.isEmpty(aplicaJEReclasificacion) && !utilidades.isEmpty(aplicaLiteralE) && (aplicaJEReclasificacion == 'T' || aplicaJEReclasificacion == true) && (aplicaLiteralE == true || aplicaLiteralE == 'T')) {

                                                                let idJE = null;
                                                                let diferenciaEntreMontos = true;

                                                                if (!utilidades.isEmpty(idCuentaBeneficio)) {
                                                                    if (utilidades.isEmpty(journalEntryDescBeneficio)) {

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

                                                                        objRecordJE.setValue('custbody_l598_transac_aso_desc_ben_fis', recId);

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
                                                                        objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: idCuentaBeneficio });

                                                                        if (recType == 'creditmemo') {
                                                                            objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: parseFloat(totalMonedaFinalDescuento, 10) });
                                                                        } else {
                                                                            objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: parseFloat(totalMonedaFinalDescuento, 10) });
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
                                                                            objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: parseFloat(totalMonedaFinalDescuento, 10) });
                                                                        } else {
                                                                            objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: parseFloat(totalMonedaFinalDescuento, 10) });
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
                                                                            objRecord.setValue('custbody_l598_journal_entry_desc_lit_e', idJE);
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
                                                                            id: journalEntryDescBeneficio,
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
                                                                                    objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: totalMonedaFinalDescuento, ignoreFieldChange: false });
                                                                                } else {
                                                                                    objRecordJE.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: totalMonedaFinalDescuento, ignoreFieldChange: false });
                                                                                }
    
                                                                                objRecordJE.commitLine({ sublistId: 'line' }); */

                                                                                let credito = objRecordJE.getSublistValue({ sublistId: 'line', fieldId: 'credit', line: i });
                                                                                let debito = objRecordJE.getSublistValue({ sublistId: 'line', fieldId: 'debit', line: i });

                                                                                if ((!utilidades.isEmpty(credito) && !isNaN(credito) && parseFloat(credito, 10) != 0 && credito != totalMonedaFinalDescuento) || (!utilidades.isEmpty(debito) && !isNaN(debito) && parseFloat(debito, 10) != 0 && debito != totalMonedaFinalDescuento)) {
                                                                                    if (!utilidades.isEmpty(credito) && !isNaN(credito) && parseFloat(credito, 10) > 0) {
                                                                                        objRecordJE.setSublistValue({ sublistId: 'line', fieldId: 'credit', line: i, value: totalMonedaFinalDescuento });
                                                                                    } else {
                                                                                        objRecordJE.setSublistValue({ sublistId: 'line', fieldId: 'debit', line: i, value: totalMonedaFinalDescuento });
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

                                                                        let totalPagar = parseFloat(parseFloat(totalTransaccion, 10).toFixedOK(2) - parseInt(totalMonedaFinalDescuento, 10), 10).toFixedOK(2);
                                                                        let re = /XXXX/gi;
                                                                        let adendaBeneficioAux = adendaBeneficio.replace(re, totalPagar.toString());
                                                                        let reTotalFactura = /TotalFactura/gi;
                                                                        adendaBeneficioAux = adendaBeneficioAux.replace(reTotalFactura, totalTransaccion.toString());
                                                                        let reTotalCreditoFiscal = /YYYY/gi;
                                                                        adendaBeneficio = adendaBeneficioAux.replace(reTotalCreditoFiscal, parseInt(totalMonedaFinalDescuento, 10).toString());

                                                                        /* Elimino la adenda anterior del beneficio*/
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

                                                                    objRecordNew.setValue('custbody_l598_total_consum_beneficio', totalMonedaFinalDescuento);
                                                                    objRecordNew.save();
                                                                    log.debug(proceso, 'recID: ' + recId + ' - idJE: ' + idJE + ' - tranID: ' + tranID);

                                                                    /* Procedo a crear el pago de cliente */
                                                                    if (!utilidades.isEmpty(idJE) && recType == 'invoice' && diferenciaEntreMontos) {
                                                                        let datosCustPayment = applyJEtoInvoice(recId, idJE, tranID, idCuentaPagoCliente, totalMonedaFinalDescuento);

                                                                        log.debug(proceso, 'datosCustPayment: ' + JSON.stringify(datosCustPayment));
                                                                        if (!datosCustPayment.error) {
                                                                            log.debug(proceso, 'Creacion de JE, aplicacion de pago de cliente y finalizacion del proceso de manera existosa.');
                                                                        } else {
                                                                            log.error(proceso, datosCustPayment.mensaje);
                                                                        }
                                                                    }
                                                                } else {
                                                                    log.error(proceso, 'El cliente aplica a descuento por cuenta ajena pero no existe una cuenta contable definida en los datos impositivos de la empresa para aplicar el descuento por venta de cuenta ajena.');
                                                                    totalMonedaFinalDescuento = 0.00;

                                                                    objRecord.setValue('custbody_l598_total_consum_beneficio', totalMonedaFinalDescuento);
                                                                    objRecord.save();
                                                                }
                                                            } else {

                                                                log.debug(proceso, 'El beneficio no aplica a asiento de reclasificacion, solo se procede a validar si es credito por 750.000 UI.');
                                                                let aplicaDesc750000UI = datosConfigBeneficios.aplicaDesc750000UI;

                                                                if (!utilidades.isEmpty(aplicaDesc750000UI) && (aplicaDesc750000UI == 'T' || aplicaDesc750000UI == true)) {

                                                                    if (!utilidades.isEmpty(adendaBeneficio) && recType != 'creditmemo') {
                                                                        let re = /XXXX/gi;
                                                                        let importeDescBeneficioFiscalPesos = parseInt(importeTotalBeneficioEnPesos, 10).toString() + ' pesos uruguayos';
                                                                        let adendaBeneficioAux = adendaBeneficio.replace(re, importeDescBeneficioFiscalPesos);
                                                                        let reTotalCreditoFiscal = /YYYY/gi;
                                                                        let totalAcumuladoPesos = aplicaAlNeto ? totalNetoAcumulado : totalBrutoAcumulado;
                                                                        let totalConsumidoFinalPesos = parseInt(totalAcumuladoPesos + impDescTransPesosUru, 10);
                                                                        log.debug(proceso, 'totalConsumidoFinalPesos: ' + totalConsumidoFinalPesos + ' / totalAcumuladoPesos antes de esta transaccion: ' + totalAcumuladoPesos + ' / impDescTransPesosUru: ' + impDescTransPesosUru);
                                                                        adendaBeneficio = adendaBeneficioAux.replace(reTotalCreditoFiscal, totalConsumidoFinalPesos.toString());

                                                                        /* Elimino la adenda anterior del beneficio*/
                                                                        let adendaAnteriorBeneficio = objRecord.getValue('custbody_l598_adenda_beneficios_descue');
                                                                        if (!utilidades.isEmpty(adendaAnteriorBeneficio) && !utilidades.isEmpty(adendaTransaccion) && adendaTransaccion.includes(adendaAnteriorBeneficio)) {
                                                                            adendaTransaccion = adendaTransaccion.replace(adendaAnteriorBeneficio, '');
                                                                        }

                                                                        if (utilidades.isEmpty(adendaTransaccion) || (!utilidades.isEmpty(adendaTransaccion) && !adendaTransaccion.includes(adendaBeneficio))) {
                                                                            adendaTransaccion = utilidades.isEmpty(adendaTransaccion) ? adendaBeneficio : adendaTransaccion + '\n' + adendaBeneficio;
                                                                            objRecord.setValue('custbody_l598_adenda', adendaTransaccion);
                                                                            objRecord.setValue('custbody_l598_adenda_beneficios_descue', adendaBeneficio);
                                                                        }
                                                                    }
                                                                } else {
                                                                    log.debug(proceso, 'El beneficio no aplica a descuento por beneficio de 750000, no se seteara nada en la adenda');
                                                                    totalMonedaFinalDescuento = 0.00;
                                                                }

                                                                objRecord.setValue('custbody_l598_total_consum_beneficio', totalMonedaFinalDescuento);
                                                                objRecord.save();
                                                            }
                                                        } else {
                                                            log.error(proceso, 'No se calculara el asiento de reclasificacion porque el total acumulado del mes es menor o igual a 0');
                                                        }
                                                    } else {
                                                        log.error(proceso, 'No se genera asiento de reclasificación porque el importe total de beneficio fiscal no es válido, su valor es: ' + totalMonedaFinalDescuento);
                                                    }
                                                } else {
                                                    log.error(proceso, 'No se genera asiento de reclasificacion por beneficio fiscal porque ya se consumieron todas las UI permitidas.');
                                                }
                                            } else {
                                                log.error(proceso, 'No existen importes que apliquen a generacion de asiento de descuento por beneficio fiscal, ningún artículo de la transacción aplica a beneficio fiscal.');
                                            }
                                        } else {
                                            log.error(proceso, datosTotalesTransaccion.mensaje);
                                        }
                                    } else {
                                        if (!datosUIConsumidas.error) {
                                            log.error(proceso, datosUIConsumidas.mensaje);
                                        } else {
                                            log.error(proceso, 'No se puede generar asiento de reclasificación porque el tipo de cambio de la UI es 0 o no es número válido.');
                                        }
                                    }
                                } else {
                                    log.error(proceso, obtDatBenFiscales.mensaje);
                                }
                            } else {
                                log.debug(proceso, 'La transaccion posee CAE, no se procede a validar si aplica a algun beneficio.');
                            }
                        } else {
                            log.debug(proceso, 'No aplica a ningun beneficio o la transacción es de cuenta ajena, no se creara asiento de reclasificacion.');
                        }
                    }
                }
            } catch (error) {
                log.error(proceso, 'Ocurrió un error en el proceso de creación del asiento contable para beneficios por crreditos fiscales, detalles: ' + error.message);
            }
        }

        let obtenerUIConsumidasPeriodo = (subsidiary, entity, period, idInterno, beneficio) => {

            let proceso = 'obtenerUIConsumidasPeriodo';
            let response = { error: false, mensaje: '', totalNetoAcumulado: 0, totalBrutoAcumulado: 0 };

            try {
                log.debug(proceso, 'INICIO obtenerUIConsumidasPeriodo');

                let filtros = [];

                if (!utilidades.isEmpty(subsidiary)) {
                    let filtro2 = {
                        name: 'subsidiary',
                        operator: 'ANYOF',
                        values: subsidiary
                    };
                    filtros.push(filtro2);
                }

                if (!utilidades.isEmpty(entity)) {
                    let filtro3 = {
                        name: 'entity',
                        operator: 'ANYOF',
                        values: entity
                    }
                    filtros.push(filtro3);
                }

                if (!utilidades.isEmpty(period)) {
                    let filtro5 = {
                        name: 'postingperiod',
                        operator: 'EQUALTO',
                        values: period
                    }
                    filtros.push(filtro5);
                }

                if (!utilidades.isEmpty(idInterno)) {
                    let filtro6 = {
                        name: 'internalid',
                        operator: 'NONEOF',
                        values: idInterno
                    }
                    filtros.push(filtro6);
                }

                if (!utilidades.isEmpty(beneficio)) {
                    let filtro7 = {
                        name: 'custbody_l598_tipo_beneficio_fiscal',
                        operator: 'ANYOF',
                        values: beneficio
                    }
                    filtros.push(filtro7);
                }

                // log.debug(proceso, 'filters SS: ' + JSON.stringify(filtros));
                let objResultSet = utilidades.searchSavedPro('customsearch_l598_tot_trans_cli_per_benf', filtros);
                // log.debug(proceso, 'objResultSet: ' + JSON.stringify(objResultSet));

                if (objResultSet.error) {
                    response.error = true;
                    response.mensaje = 'Error Consultando SS: "URU - Obtener UI Consumidas por Cliente/Periodo", detalles: ' + objResultSet.descripcion;
                    log.error(proceso, response.mensaje);
                } else {
                    let resultSet = objResultSet.objRsponseFunction.result;
                    let resultSearch = objResultSet.objRsponseFunction.search;

                    if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
                        response.totalNetoAcumulado = resultSet[0].getValue({ name: resultSearch.columns[4] });
                        response.totalBrutoAcumulado = resultSet[0].getValue({ name: resultSearch.columns[6] });
                    } else {
                        response.mensaje = 'No se encontro ningun resultado de transacciones para el cliente: ' + entity + ', subsidiaria: ' + subsidiary + ' y periodo: ' + period + ' recibidos por parametros, el acumulado del mes son 0 unidades consumidas';
                        log.debug(proceso, response.mensaje);
                    }
                }

                log.debug(proceso, 'FIN obtenerUIConsumidasPeriodo');
            } catch (error) {
                response.error = true;
                response.mensaje = 'Ocurrio un error mientras se obtenian las unidades consumidas en el periodo, detalles: ' + error.message;
                log.error(proceso, response.mensaje);
            }
            return response;
        }

        let obtenerTotalesTransaccion = (idInterno) => {

            let proceso = 'obtenerTotalesTransaccion';
            let response = { error: false, mensaje: '', totalNetoTransaccion: 0, totalBrutoTransaccion: 0 };

            try {
                log.debug(proceso, 'INICIO - obtenerTotalesTransaccion');

                let filtros = [];

                if (!utilidades.isEmpty(idInterno)) {
                    let filtro1 = {
                        name: 'internalid',
                        operator: 'ANYOF',
                        values: idInterno
                    }
                    filtros.push(filtro1);
                }

                // log.debug(proceso, 'filters SS: ' + JSON.stringify(filtros));
                let objResultSet = utilidades.searchSavedPro('customsearch_l598_tot_trans_cli_per_benf', filtros);
                // log.debug(proceso, 'objResultSet: ' + JSON.stringify(objResultSet));

                if (objResultSet.error) {
                    response.error = true;
                    response.mensaje = 'Error Consultando SS: "URU - Obtener UI Consumidas por Cliente/Periodo" para transaccion actual, detalles: ' + objResultSet.descripcion;
                    log.error(proceso, response.mensaje);
                } else {
                    let resultSet = objResultSet.objRsponseFunction.result;
                    let resultSearch = objResultSet.objRsponseFunction.search;

                    if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
                        response.totalNetoTransaccion = resultSet[0].getValue({ name: resultSearch.columns[4] });
                        response.totalBrutoTransaccion = resultSet[0].getValue({ name: resultSearch.columns[6] });
                    } else {
                        response.mensaje = 'No se encontro ningun resultado de transacciones para la factura actual, el neto y el bruto es igual a 0.';
                        log.debug(proceso, response.mensaje);
                    }
                }

                log.debug(proceso, 'FIN - obtenerTotalesTransaccion');
            } catch (error) {
                response.error = true;
                response.mensaje = 'Ocurrio un error mientras se obtenian las unidades consumidas en el periodo, detalles: ' + error.message;
                log.error(proceso, response.mensaje);
            }
            return response;
        }

        let obtenerDatosConfigBeneficios = (subsidiary, trandate, beneficio) => {

            let proceso = 'obtenerDatosConfigBeneficios';
            let response = { error: false, mensaje: '', datosConfigBeneficios: '' };

            try {
                log.debug(proceso, 'INICIO obtenerDatosConfigBeneficios');

                let filtros = [];
                let filtro1 = {
                    name: 'isinactive',
                    operator: 'IS',
                    values: 'F'
                };
                filtros.push(filtro1);

                if (!utilidades.isEmpty(subsidiary)) {
                    let filtro2 = {
                        name: 'custrecord_l598_ben_config_subsidiaria',
                        operator: 'ANYOF',
                        values: subsidiary
                    };
                    filtros.push(filtro2);
                }

                trandate = format.format({
                    value: trandate,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO // Montevideo - Uruguay
                });

                if (!utilidades.isEmpty(trandate)) {
                    let filtro3 = {
                        name: 'startdate',
                        join: 'custrecord_l598_ben_config_anio',
                        operator: 'ONORBEFORE',
                        values: trandate
                    }
                    filtros.push(filtro3);

                    let filtro4 = {
                        name: 'enddate',
                        join: 'custrecord_l598_ben_config_anio_fin',
                        operator: 'ONORAFTER',
                        values: trandate
                    }
                    filtros.push(filtro4);
                }

                if (!utilidades.isEmpty(beneficio)) {
                    let filtro5 = {
                        name: 'custrecord_l598_ben_config_ben',
                        operator: 'ANYOF',
                        values: beneficio
                    }
                    filtros.push(filtro5);
                }

                let objResultSet = utilidades.searchSavedPro('customsearch_l598_obt_dat_ben_fisc_confi', filtros);

                if (objResultSet.error) {
                    response.error = true;
                    response.mensaje = 'Error Consultando SS: "URU - Obtener Datos Beneficios Fiscales Configuración", detalles: ' + objResultSet.descripcion;
                    log.error(proceso, response.mensaje);
                } else {
                    let resultSet = objResultSet.objRsponseFunction.result;
                    let resultSearch = objResultSet.objRsponseFunction.search;

                    if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
                        response.datosConfigBeneficios = {};
                        response.datosConfigBeneficios.cantidadUICreditos = resultSet[0].getValue({ name: resultSearch.columns[3] });
                        response.datosConfigBeneficios.tipoCambioUI = resultSet[0].getValue({ name: resultSearch.columns[4] });
                        response.datosConfigBeneficios.idCuentaBeneficio = resultSet[0].getValue({ name: resultSearch.columns[5] });
                        response.datosConfigBeneficios.adendaBeneficio = resultSet[0].getValue({ name: resultSearch.columns[6] });
                        response.datosConfigBeneficios.aplicaLiteralE = resultSet[0].getValue({ name: resultSearch.columns[7] });
                        response.datosConfigBeneficios.aplicaDesc750000UI = resultSet[0].getValue({ name: resultSearch.columns[8] });
                        response.datosConfigBeneficios.aplicaJEReclasificacion = resultSet[0].getValue({ name: resultSearch.columns[9] });
                        response.datosConfigBeneficios.idCuentaPagoCliente = resultSet[0].getValue({ name: resultSearch.columns[10] });
                        response.datosConfigBeneficios.aplicaAlNeto = resultSet[0].getValue({ name: resultSearch.columns[11] });
                        response.datosConfigBeneficios.aplicaAlBruto = resultSet[0].getValue({ name: resultSearch.columns[12] });
                    } else {
                        response.error = true;
                        response.mensaje = 'No se encontro configuracion de beneficios fiscales para los datos recibidos por parametros - subsidiaria: ' + subsidiary + ' - fecha: ' + trandate + ' - beneficio: ' + beneficio;
                        log.error(proceso, response.mensaje);
                    }
                }

                log.debug(proceso, 'FIN obtenerDatosConfigBeneficios');
            } catch (error) {
                response.error = true;
                response.mensaje = 'Ocurrio un error mientras se obtenian los datos de configuracion de beneficios fiscales, detalles: ' + error.message;
                log.error(proceso, response.mensaje);
            }

            return response;
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

        Number.prototype.toFixedOK = function (decimals) {
            var sign = this >= 0 ? 1 : -1;
            return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
        }

        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit
        }
    });
