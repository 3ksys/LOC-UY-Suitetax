/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@NAmdConfig /SuiteScripts/configuration_l598.json
 *@NModuleScope Public
 *
 * ============================================================================
 * REFACTOR (Mobeats) de "L598 - Conexion Directa FE (SS)".
 * ----------------------------------------------------------------------------
 * Alcance: B (performance) + C (estandares 2.1) + D (mantenibilidad).
 * Sin Grupo A ni cambios marcados de riesgo alto. Comportamiento preservado:
 * mismos archivos JSON/XML generados, mismos campos escritos, mismas
 * condiciones y mismas excepciones en los mismos puntos.
 *
 * Unidad 1 - mecanicos:
 *   C4  se quitan del define los modulos sin uso: N/error (0 referencias
 *       reales: los 12 "error.message" son el parametro del catch, que
 *       sombrea al import) y N/transaction (solo lo usaba una de las
 *       funciones muertas de D2). N/email SE MANTIENE: su unico consumidor
 *       es envioEmail, que queda intacta por CDF-A2.
 *   C5  parseFloat(x, 10) -> parseFloat(x) en los 209 sitios: parseFloat no
 *       acepta radix y el segundo argumento se ignora. NO se toco ningun
 *       parseInt(x, 10), donde el radix si es significativo.
 *   D2  eliminadas las 4 funciones jamas invocadas (voidJournalPagosMultiples,
 *       UnapplyInvoices, setTimeout con busy-wait y getChequesByCustpayment),
 *       la segunda definicion de padding_left (byte-identica a la primera;
 *       hoy ganaba la segunda por hoisting) y los bloques comentados grandes,
 *       incluidos los restos SuiteScript 1.0 de C2 (nlapiLookupField,
 *       nlobjSearchFilter/Column, nlapiLogExecution).
 *   D4  el filtro custrecord_l598_prov_fe_comp_dgi_tip_com se empujaba dos
 *       veces seguidas a la misma busqueda; se deja uno solo (el AND de un
 *       filtro consigo mismo es idempotente).
 *   B6  eliminados los log.debug por linea dentro del loop de articulos y los
 *       JSON.stringify de objetos grandes (resultadoIndividual, objetoRespuesta
 *       y loadSearch). Los 83 log.error y los 6 log.audit se conservan
 *       textualmente.
 *   D6  en los log.debug que sobreviven se quito el marcador "LINE NNN", que
 *       ya no correspondia a ninguna linea real del archivo. No se toco el
 *       texto de ningun log.error.
 *   D7  ";;" -> ";", new Array()/new Object() -> []/{} y referenciaGloabal ->
 *       referenciaGlobal. OJO: no es un rename puro, es una FUSION. Ya existia
 *       `var referenciaGlobal` (orig. 2674, leida en 2923); `referenciaGloabal`
 *       (orig. 3376, leida en 3390/3392) se inicializaba con la misma expresion
 *       nvl(resultadoIndividual.getValue({name: columns[47]}), '') sobre el
 *       mismo resultadoIndividual, y no hay otra escritura entre medio. Las dos
 *       lecturas posteriores reciben el mismo valor que recibian.
 *
 * Unidad 2 - B + C:
 *   B3  esOneworld(): memo de modulo (esOneworldMemo) reseteado como primera
 *       sentencia de beforeLoad y afterSubmit. utilities.l598esOneworld()
 *       ejecuta una busqueda por llamada y es una constante de la cuenta.
 *   B4  parseDate cacheaba nada: hacia config.load(COMPANY_INFORMATION) en
 *       cada llamada (y lo llama grabarError, o sea cada log FE). Ahora el
 *       texto del timezone se resuelve una vez por ejecucion. Se quito el
 *       calculo companyDateTime2, que solo se logueaba.
 *   C3  Number.prototype.toFixedOK -> funcion de modulo toFixedOK(valor,
 *       decimales) con la formula byte-identica. Los 50 usos se reescribieron
 *       respetando el receptor inmediato; ninguno tenia el metodo aplicado a
 *       un operando suelto de una multiplicacion o suma sin parentesis.
 *
 * Unidad 3 - D3 (fugas al scope global):
 *   Se declararon con let, al inicio de su funcion, las variables que se
 *   asignaban sin declaracion: importeNoFacturable y cantidadLineas
 *   (afterSubmit), currentDateTime (parseDate) y columnaAcumIndFacturacion-
 *   DescRec, porcentajeParaAplicar, infoPercepcion, informacionLinea,
 *   informacionSubTotal, infoRetencion, costoEnvio y CostoManipulacion
 *   (buscarInformacionFE). En todas, la escritura precede a la lectura en
 *   todos los caminos. costoEnvio y CostoManipulacion solo reciben el let:
 *   su asignacion a "" queda textual (CDF-A5, Grupo A).
 *   NO se toco codigoMonedaTransaccion: se escribe dentro de un if y se lee
 *   fuera, asi que hoy un camino lanza ReferenceError (atrapado por el catch
 *   general) y con let devolveria undefined en silencio, cambiando el mensaje
 *   de error que se graba.
 *
 * Unidad 4 - C1 var -> const/let (PARCIAL, deliberadamente):
 *   Solo se convirtieron las declaraciones donde se pudo probar equivalencia:
 *   todas las apariciones dentro del mismo bloque de la declaracion, ninguna
 *   antes de ella y sin otra var del mismo nombre en la funcion. El resto
 *   queda como var, porque el archivo explota el hoisting (por ejemplo
 *   montoItem se logueaba antes de su var, y mensaje de un bloque se lee en
 *   otro). Preferimos menos conversiones seguras que muchas dudosas.
 *
 * Fuera de este refactor, con motivo:
 *   B1 (SuiteQL para customsearch_l598_trans_gen_cae_con_dire, 89 columnas
 *   posicionales), B5 (doble load + doble save) y D1 (division de
 *   buscarInformacionFE): requieren aprobacion y regresion completa.
 *   B2 (beforeLoad: record.load -> lookupFields): excluido. lookupFields
 *   devuelve [{value,text}] para los selects y isEmpty([]) es false; no se
 *   puede probar equivalencia sin las definiciones de campo.
 *   D5 (codigoPercEncontrado == true, linea 2298 del original): excluido.
 *   Es una correccion de bug y su caracter "sin efecto" depende de un
 *   supuesto sobre los datos.
 *   A1-A8 - registro de aprobaciones.
 * ============================================================================
 */
 define(
    [
        'N/record', 'N/search', 'L598/utilities', 'N/runtime', 'N/format', 'N/config', 'N/file', 'N/render', 'N/url', 'N/https', 'N/email'
    ],
    function (record, search, utilities, runtime, format, config, file, render, url, https, email) {

        const camposInfoFE = [
            'idInterno',
            'middlewareURL',
            'usuario',
            'password',
            'generarCaeAutomatico',
            'rol',
            'cuenta',
            'margenError',
            'nombreSistemaFacturacion',
            'razonSocial',
            'RUTEmpresa',
            'URLGateway',
            'URLServicioFirma',
            'URLServicioConfFirma',
            'codTipoIntegracion',
            'codTerminalUCFE',
            'codComercioUCFE',
            'URLServicioRestUCFE',
            'usuarioUCFE',
            'passwordUCFE',
            'usuarioSIGE',
            'passwordSIGE',
            'urlServicioFirmaSIGE',
            'urlServicioConsultaSIGE',
            'tipoNegocio',
            'versionSistFact',
            'RUCEmisor',
            'razonSocialEmisor',
            'nomComercialEmisor',
            'giroNegocioEmisor',
            'correoEmisor',
            'domicilioEmisor',
            'ciudadEmisor',
            'departamentoEmisor',
            'telefonoEmisor',
            'indicadorFacturacion',
            'conceptoFacturacion',
            'idPlantillaXML',
            'idProveedorFEComprobantesDGI',
            'tipoIntegracion',
            'idDirectorioFilesFE',
            'conceptoFacturacionAnulacion'
        ];

        // B3/B4 - memos por ejecucion; se reinician en cada entry point.
        let esOneworldMemo;
        let timezoneEmpresaMemo;

        /**
         * Devuelve si la cuenta es OneWorld, memoizado por ejecucion.
         * utilities.l598esOneworld() ejecuta una busqueda en cada llamada.
         * @return {Boolean}
         */
        function esOneworld() {
            if (esOneworldMemo === undefined) {
                esOneworldMemo = utilities.l598esOneworld();
            }
            return esOneworldMemo;
        }

        /**
         * Devuelve el texto del timezone de la empresa, memoizado por
         * ejecucion (evita un config.load por cada llamada a parseDate).
         * @return {string}
         */
        function obtenerTimezoneEmpresa() {
            if (timezoneEmpresaMemo === undefined) {
                timezoneEmpresaMemo = config.load({ type: config.Type.COMPANY_INFORMATION }).getText({ fieldId: 'timezone' });
            }
            return timezoneEmpresaMemo;
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
        function beforeLoad(scriptContext) {

            esOneworldMemo = undefined;
            timezoneEmpresaMemo = undefined;

            let proceso = 'beforeLoad';
            let currentScript = runtime.getCurrentScript();
            let codigoEstadoError = currentScript.getParameter('custscript_l598_con_dir_fe_ss_c_est_erro'); // Codigo Estado Log FE - Error (FESTADO-2)
            let codigoEstadoSinError = currentScript.getParameter('custscript_l598_con_dir_fe_ss_c_est_sine'); // Código Estado Log FE - Sin error (FESTADO-1)
            let tipoMensajeErrorConfiguracionFE = currentScript.getParameter('custscript_l598_con_dir_fe_ss_m_err_conf'); // Mensaje Log FE - Error Configuración FE
            let tipoMensajeErrorCAE = currentScript.getParameter('custscript_l598_con_dir_fe_ss_m_err_cae'); // Mensaje Log FE - Error CAE FE
            let tipoMensajeErrorInesperadoXML = currentScript.getParameter('custscript_l598_con_dir_fe_ss_m_err_xml'); // Mensaje Log FE - Error Inesperado XML
            let tipoMensajeSinError = currentScript.getParameter('custscript_l598_con_dir_fe_ss_m_sin_err'); // Mensaje Log FE - Sin error	
            let tipoMensajeErrorBoton = currentScript.getParameter('custscript_l598_con_dir_fe_ss_m_err_bot'); // Error Generando Botón de Generar CAE en la Transacción
            let tipoIntegFacturaLista = currentScript.getParameter('custscript_l598_con_dir_fe_ss_cod_fac_li'); // Integracion FacturaLista
            let mensaje = '';
            let punto_venta = '';
            let refLog = '';
            let serie = '';
            let recId = scriptContext.newRecord.id;
            let recType = scriptContext.newRecord.type;
            let formTransaction = scriptContext.form;
            let refTransaccion = recId;
            let tipoTransaccion = recType;

            try {

                if (scriptContext.type == scriptContext.UserEventType.VIEW && !utilities.isEmpty(recType) && !utilities.isEmpty(recId)) {

                    log.debug(proceso, 'INICIO - beforeLoad - Creación Botón Generar CAE - unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date() + ' - recId: ' + recId + ' - recType: ' + recType);

                    let recordTransaction = record.load({
                        type: recType,
                        id: recId
                    });

                    // revisar si es un remito y si su estado de entrega es distinto de entregado no puede proceder
                    const comprobarEstadoRemitoEnviado = currentScript.getParameter('custscript_l598_com_estado_remito_enviad');
                    if (comprobarEstadoRemitoEnviado && recType == "itemfulfillment") {
                        const estado = recordTransaction.getValue({ fieldId: "shipstatus" });
                        if (estado != "C") { // C significa enviado
                            log.audit(proceso, "no se ejecutara el beforeLoad, ya que es un remito que tiene estado distinto de enviado= " + estado);
                            return;
                        }
                    }

                    let cae = recordTransaction.getValue({ fieldId: 'custbody_l598_cae' });
                    let esTransaccionInterna = recordTransaction.getValue({ fieldId: 'custbody_l598_trans_interna' });
                    log.debug(proceso, ' esTransaccionInterna: ' + esTransaccionInterna);

                    if (utilities.isEmpty(cae) && (esTransaccionInterna == false || esTransaccionInterna == 'F' || utilities.isEmpty(esTransaccionInterna))) {

                        let configuracionFE = getConfigurationFE(recId, recType, tipoIntegFacturaLista);
                        log.debug(proceso, 'configuracionFE: ' + JSON.stringify(configuracionFE));

                        let docXML = recordTransaction.getValue({ fieldId: 'custbody_l598_documento_xml_fe' });
                        punto_venta = recordTransaction.getText({ fieldId: 'custbody_l598_sucursal' });
                        tipoTransaccion = recordTransaction.getText({ fieldId: 'custbody_l598_tipo_comprobante' });
                        serie = recordTransaction.getText({ fieldId: 'custbody_l598_serie_comprobante' });


                        if (!utilities.isEmpty(configuracionFE) && !configuracionFE.error) {
                            if (!configuracionFE.generarCaeAutomatico) {
                                if (!utilities.isEmpty(docXML)) {
                                    try {
                                        log.debug(proceso, "Se genera boton correctamente.")
                                        formTransaction.clientScriptModulePath = './L598 - Conexion Directa FE (CL).js';
                                        formTransaction.addButton({
                                            id: 'custpage_l598_boton_generar_cae_conexion_directa',
                                            label: 'Generar CAE 2.0',
                                            functionName: 'generarCAE(' + codigoEstadoError + ',' + codigoEstadoSinError + ',' + tipoMensajeErrorConfiguracionFE + ',' + tipoMensajeErrorCAE + ',' + tipoMensajeErrorInesperadoXML + ',' + tipoMensajeSinError + ',' + tipoMensajeErrorBoton + ')'
                                        });
                                    } catch (error) {
                                        mensaje = 'Excepción Agregando Botón a transacción - Generar CAE - NetSuite error: ' + error.message;
                                        log.error(proceso, 'LINE 95 - Error: ' + mensaje);
                                        grabarError(codigoEstadoError, tipoMensajeErrorBoton, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                    }
                                } else {
                                    mensaje = "La transacción no posee asociado el XML con los datos para generar CAE, proceda a editar la transacción y a guardarla nuevamente para posteriormente generar el CAE";
                                    log.error(proceso, 'LINE 135 - Error: ' + mensaje);
                                    grabarError(codigoEstadoError, tipoMensajeErrorBoton, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                }
                            } else {
                                log.debug(proceso, 'No se genera el botón de CAE porque está configurado de manera automática la generación de CAE.');
                            }
                        } else {
                            mensaje = configuracionFE.mensaje;
                            log.error(proceso, 'LINE 103 - Error: ' + mensaje);
                            grabarError(codigoEstadoError, tipoMensajeErrorConfiguracionFE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                        }
                    } else {
                        mensaje = 'La transacción ya posee CAE o es Transaccion Interna.';
                        log.error(proceso, 'LINE 129 - Error: ' + mensaje);
                    }
                    log.debug(proceso, 'FIN - beforeLoad - Creación Botón Generar CAE - unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());
                }
            } catch (error) {
                mensaje = 'Excepcion General Agregando Boton - Generar CAE - NetSuite error: ' + error.message;
                log.error(proceso, 'LINE 111 - Error: ' + mensaje);
                grabarError(codigoEstadoError, tipoMensajeErrorBoton, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
            }
            return true;
        }

        /**
         * Retorna los resultados de las validaciones necesarias para verificar que se cumplen las condiciones para generar CAE a la transacción
         * @param {string} recId - ID de la transacción
         * @param {string} recType - Tipo de Registro de la transacción
         *
         * @return {object} objetoRespuesta
         * @property {string} objetoRespuesta.mensaje - Mensaje de Respuesta.
         * @property {Boolean} objetoRespuesta.error - Verdadero si existe algún error en el proceso, falso si no existe ninguno.
         * @property {Boolean} objetoRespuesta.generarCaeAutomatico - Verdadero si está configurado el proceso de generación de CAE automático, falso si no está configurado.
         * @property {Boolean} objetoRespuesta.caeGenerado - Verdadero si existe CAE en la transacción actual, falso si no existe.
         * @property {string} objetoRespuesta.codTipoIntegracion - Código de Integración
         * @property {integer} objetoRespuesta.idPlantillaXML - ID plantilla XML
         * @property {object} objetoRespuesta.informacionAdicional - Información de emisor requerida en los datos de información FE
         * @property {object} objetoRespuesta.tipoIntegracion - Tipo de integración
         * @property {object} objetoRespuesta.idDirectorioFilesFE - ID del directorio de archivo de FE
         */
        function getConfigurationFE(recId, recType, tipoIntegFacturaLista) {

            let proceso = 'getConfigurationFE';
            let mensaje = '';
            let objetoRespuesta = { error: false, mensaje: '', generarCaeAutomatico: false, caeGenerado: false, codTipoIntegracion: '', idPlantillaXML: '', informacionAdicional: {}, tipoIntegracion: '', idDirectorioFilesFE: '' };

            log.debug(proceso, 'INICIO - getConfigurationFE');
            try {

                // Obtengo Punto de Venta y Letra de Transaccion
                // let esResguardo_anulacion = 'F';
                let esResguardo_anulacion = false;
                let refTransaccion = recId;
                let camposTransaccion = ['custbody_l598_cae', 'custbody_l598_serie_comprobante', 'custbody_l598_sucursal', 'custbody_l598_nd', 'custbody_l598_tipo_comprobante', 'custbody_l598_cod_tipo_comprobante', 'custbody_l598_link_uru_resguardo', 'custbody_l598_resguardo_anulacion'];
                let esOneWorld = esOneworld();

                if (esOneWorld) {
                    camposTransaccion = ['custbody_l598_cae', 'custbody_l598_serie_comprobante', 'custbody_l598_sucursal', 'custbody_l598_nd', 'custbody_l598_tipo_comprobante', 'subsidiary', 'custbody_l598_cod_tipo_comprobante', 'custbody_l598_link_uru_resguardo', 'custbody_l598_resguardo_anulacion'];
                }

                let userObj = runtime.getCurrentUser();
                // log.debug(proceso, 'Current user email: ' + userObj.email);

                let usuarioEmail = userObj.email;
                if (utilities.isEmpty(usuarioEmail)) {
                    usuarioEmail = "";
                }

                let resultadoTransaccion = search.lookupFields({
                    type: recType,
                    id: recId,
                    columns: camposTransaccion
                });

                log.debug(proceso, 'resultadoTransaccion: ' + JSON.stringify(resultadoTransaccion));

                if (utilities.isEmpty(resultadoTransaccion.custbody_l598_cae)) {
                    let serie = resultadoTransaccion.custbody_l598_serie_comprobante[0].text || '';
                    let sucursal = resultadoTransaccion.custbody_l598_sucursal[0].text || '';
                    let esNotaDebito = resultadoTransaccion.custbody_l598_nd;
                    let tipoComprobante = resultadoTransaccion.custbody_l598_tipo_comprobante[0].value || '';
                    let tipoComprobanteText = resultadoTransaccion.custbody_l598_tipo_comprobante[0].text || '';
                    let link_uru_resguardo = resultadoTransaccion.custbody_l598_link_uru_resguardo[0].value || '';
                    esResguardo_anulacion = resultadoTransaccion.custbody_l598_resguardo_anulacion;

                    if (!utilities.isEmpty(serie) && !utilities.isEmpty(sucursal) && !utilities.isEmpty(tipoComprobante)) {
                        // Obtengo la subsidiaria
                        let subsidiaria = "";
                        if (esOneWorld) {
                            subsidiaria = resultadoTransaccion.subsidiary[0].value;
                            if (utilities.isEmpty(subsidiaria)) // Si no completo la Subsidiaria, envio sin Subsidiaria
                                subsidiaria = "";
                        }

                        // Busco el ID de Transaccion de AFIP
                        let idTransaccionURU = resultadoTransaccion.custbody_l598_cod_tipo_comprobante;

                        if (!utilities.isEmpty(idTransaccionURU) && idTransaccionURU > 0) {

                            let filtros = [];
                            if (!utilities.isEmpty(subsidiaria)) {
                                let filtro = {};
                                filtro.name = 'custrecord_l598_prov_fact_elect_subsid';
                                filtro.operator = 'ANYOF';
                                filtro.values = subsidiaria;
                                filtros.push(filtro);
                            }

                            if (!utilities.isEmpty(tipoComprobante)) {
                                let filtro = {};
                                filtro.name = 'custrecord_l598_prov_fe_comp_dgi_tip_com';
                                filtro.join = 'custrecord_l598_prov_fe_comp_dgi_prov_fe';
                                filtro.operator = 'IS';
                                filtro.values = tipoComprobante;
                                filtros.push(filtro);
                            }

                            if (recType == 'customerpayment' || recType == 'customtransaction_l598_anulacion_cobranz' || recType == 'customerdeposit' || recType == 'customerrefund') {
                                let filtro = {};
                                filtro.name = 'custrecord_l598_prov_fe_comp_dgi_com_cob';
                                filtro.join = 'custrecord_l598_prov_fe_comp_dgi_prov_fe';
                                filtro.operator = 'IS';
                                filtro.values = 'T';
                                filtros.push(filtro);
                            } else {
                                let filtro = {};
                                filtro.name = 'custrecord_l598_prov_fe_comp_dgi_com_cob';
                                filtro.join = 'custrecord_l598_prov_fe_comp_dgi_prov_fe';
                                filtro.operator = 'IS';
                                filtro.values = 'F';
                                filtros.push(filtro);
                            }

                            let objResultSet = utilities.searchSavedPro('customsearch_l598_proveedor_fe_ss', filtros);

                            if (objResultSet.error) {
                                objetoRespuesta.error = true;
                                objetoRespuesta.mensaje = 'Error Consultando searchSavedPro - customsearch_l598_proveedor_fe_ss - Detalles del Error: ' + objResultSet.descripcion;
                                log.error(proceso, 'LINE 267 - Error: ' + objetoRespuesta.mensaje);
                            } else {

                                let resultSet = objResultSet.objRsponseFunction.result;
                                let resultSearch = objResultSet.objRsponseFunction.search;

                                if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {

                                    let recordFE = [];
                                    let objInfo = {};

                                    camposInfoFE.forEach(function (key, index, arr) {
                                        objInfo[key] = resultSet[0].getValue({ name: resultSearch.columns[index] });
                                    });

                                    recordFE.push(objInfo);

                                    if (!utilities.isEmpty(recordFE[0].indicadorFacturacion)) {
                                        const indicadorFacturacion = search.lookupFields({
                                            type: 'customrecord_l598_ind_fact_det',
                                            id: recordFE[0].indicadorFacturacion,
                                            columns: ['custrecord_l598_ind_fact_det_codigo']
                                        });

                                        recordFE[0].indicadorFacturacion = indicadorFacturacion.custrecord_l598_ind_fact_det_codigo;
                                        log.debug(proceso, 'indicadorFacturacion: ' + recordFE[0].indicadorFacturacion);
                                    }

                                    // log.debug(proceso, 'recordFE: ' + JSON.stringify(recordFE));

                                    if (!utilities.isEmpty(recordFE[0].idPlantillaXML)) {

                                        objetoRespuesta.idPlantillaXML = recordFE[0].idPlantillaXML;

                                        if (
                                            //VALIDACION CUANDO LA INTEGRACION ES CON TAFACE
                                            ((recordFE[0].middlewareURL.length != 0 || !utilities.isEmpty(recordFE[0].middlewareURL)) && !utilities.isEmpty(recordFE[0].usuario) && !utilities.isEmpty(recordFE[0].password) &&
                                                !utilities.isEmpty(recordFE[0].cuenta) && !utilities.isEmpty(recordFE[0].rol) && recordFE[0].rol > 0 && !utilities.isEmpty(recordFE[0].margenError) &&
                                                !utilities.isEmpty(usuarioEmail) && !utilities.isEmpty(recordFE[0].nombreSistemaFacturacion) && !utilities.isEmpty(recordFE[0].razonSocial) && !utilities.isEmpty(recordFE[0].RUTEmpresa) && !utilities.isEmpty(recordFE[0].URLGateway) && !utilities.isEmpty(recordFE[0].URLServicioFirma) &&
                                                !utilities.isEmpty(recordFE[0].URLServicioConfFirma) && (!utilities.isEmpty(recordFE[0].codTipoIntegracion) && recordFE[0].codTipoIntegracion == 'TAFACE') && (utilities.isEmpty(link_uru_resguardo) || (esResguardo_anulacion == true && !utilities.isEmpty(link_uru_resguardo))))

                                            ||//VALIDACION CUANDO LA INTEGRACION ES CON UCFE

                                            ((recordFE[0].middlewareURL.length != 0 || !utilities.isEmpty(recordFE[0].middlewareURL)) && !utilities.isEmpty(recordFE[0].usuario) && !utilities.isEmpty(recordFE[0].password) &&
                                                !utilities.isEmpty(recordFE[0].cuenta) && !utilities.isEmpty(recordFE[0].rol) && recordFE[0].rol > 0 && !utilities.isEmpty(recordFE[0].razonSocial) && !utilities.isEmpty(recordFE[0].RUTEmpresa) &&
                                                !utilities.isEmpty(usuarioEmail) && !utilities.isEmpty(recordFE[0].codTerminalUCFE) && !utilities.isEmpty(recordFE[0].codComercioUCFE) && !utilities.isEmpty(recordFE[0].URLServicioRestUCFE) &&
                                                !utilities.isEmpty(recordFE[0].usuarioUCFE) && !utilities.isEmpty(recordFE[0].passwordUCFE) && (!utilities.isEmpty(recordFE[0].codTipoIntegracion) && recordFE[0].codTipoIntegracion == 'UCFE') && (utilities.isEmpty(link_uru_resguardo) || (esResguardo_anulacion == true && !utilities.isEmpty(link_uru_resguardo))))

                                            ||//VALIDACION CUANDO LA INTEGRACION ES CON SIGE

                                            ((recordFE[0].middlewareURL.length != 0 || !utilities.isEmpty(recordFE[0].middlewareURL)) && !utilities.isEmpty(recordFE[0].usuario) && !utilities.isEmpty(recordFE[0].password) &&
                                                !utilities.isEmpty(recordFE[0].cuenta) && !utilities.isEmpty(recordFE[0].rol) && recordFE[0].rol > 0 && !utilities.isEmpty(recordFE[0].razonSocial) && !utilities.isEmpty(recordFE[0].RUTEmpresa) &&
                                                !utilities.isEmpty(usuarioEmail) && !utilities.isEmpty(recordFE[0].urlServicioFirmaSIGE) && !utilities.isEmpty(recordFE[0].urlServicioConsultaSIGE) &&
                                                !utilities.isEmpty(recordFE[0].usuarioSIGE) && !utilities.isEmpty(recordFE[0].passwordSIGE) && (!utilities.isEmpty(recordFE[0].codTipoIntegracion) && recordFE[0].codTipoIntegracion == 'SIGE') && (utilities.isEmpty(link_uru_resguardo) || (esResguardo_anulacion == true && !utilities.isEmpty(link_uru_resguardo))))

                                            ||//VALIDACION CUANDO LA INTEGRACION ES CON FACTURALISTA

                                            (!utilities.isEmpty(usuarioEmail) && !utilities.isEmpty(recordFE[0].razonSocial) && !utilities.isEmpty(recordFE[0].RUTEmpresa) && !utilities.isEmpty(recordFE[0].URLGateway) &&
                                                !utilities.isEmpty(recordFE[0].codTipoIntegracion) && recordFE[0].tipoIntegracion == tipoIntegFacturaLista)
                                        ) {

                                            log.debug(proceso, 'Información de FE correcta, se procede a generar Botón si generación de CAE automático es false - Valor de generarCaeAutomatico: ' + recordFE[0].generarCaeAutomatico);
                                            objetoRespuesta.codTipoIntegracion = recordFE[0].codTipoIntegracion;
                                            objetoRespuesta.tipoIntegracion = recordFE[0].tipoIntegracion;
                                            objetoRespuesta.idDirectorioFilesFE = recordFE[0].idDirectorioFilesFE;
                                            objetoRespuesta.informacionAdicional.rucEmisor = recordFE[0].RUCEmisor;
                                            objetoRespuesta.informacionAdicional.razonSocialEmisor = recordFE[0].razonSocialEmisor;
                                            objetoRespuesta.informacionAdicional.nombreComercial = recordFE[0].nomComercialEmisor;
                                            objetoRespuesta.informacionAdicional.correoElectronico = recordFE[0].correoEmisor;
                                            objetoRespuesta.informacionAdicional.domicilioFiscalEmisor = recordFE[0].domicilioEmisor;
                                            objetoRespuesta.informacionAdicional.ciudadEmisor = recordFE[0].ciudadEmisor;
                                            objetoRespuesta.informacionAdicional.departamento = recordFE[0].departamentoEmisor;
                                            objetoRespuesta.informacionAdicional.softwareFacturador = recordFE[0].nombreSistemaFacturacion;
                                            objetoRespuesta.informacionAdicional.versionSoftwareFacturador = recordFE[0].versionSistFact;
                                            objetoRespuesta.informacionAdicional.empresaRUC = recordFE[0].RUTEmpresa;
                                            objetoRespuesta.informacionAdicional.tipoNegocio = recordFE[0].tipoNegocio;
                                            objetoRespuesta.informacionAdicional.URLGateway = recordFE[0].URLGateway;
                                            objetoRespuesta.informacionAdicional.URLServicioFirma = recordFE[0].URLServicioFirma;
                                            objetoRespuesta.informacionAdicional.URLServicioConfFirma = recordFE[0].URLServicioConfFirma;
                                            objetoRespuesta.informacionAdicional.URLServicioRestUCFE = recordFE[0].URLServicioRestUCFE;
                                            objetoRespuesta.informacionAdicional.urlServicioFirmaSIGE = recordFE[0].urlServicioFirmaSIGE;
                                            objetoRespuesta.informacionAdicional.urlServicioConsultaSIGE = recordFE[0].urlServicioConsultaSIGE;
                                            objetoRespuesta.informacionAdicional.indicadorFacturacion = recordFE[0].indicadorFacturacion;
                                            objetoRespuesta.informacionAdicional.conceptoFacturacion = recordFE[0].conceptoFacturacion;
                                            objetoRespuesta.informacionAdicional.conceptoFacturacionAnulacion = recordFE[0].conceptoFacturacionAnulacion;

                                            if (recordFE[0].generarCaeAutomatico == true || recordFE[0].generarCaeAutomatico == 'T') {
                                                objetoRespuesta.generarCaeAutomatico = true;
                                                // log.debug(proceso, 'No se genera el botón de CAE porque el proceso está configurado de manera automática en la configuración de FE.');
                                            }
                                        } else {
                                            mensaje = 'No se encuentran Configurados los siguientes Campos Requeridos de la Configuración del Middleware de Factura Electrónica: ';

                                            if ((recordFE[0].middlewareURL.length == 0 || utilities.isEmpty(recordFE[0].middlewareURL)))
                                                mensaje += "URL del Middleware de Factura Electrónica / ";
                                            if (utilities.isEmpty(recordFE[0].usuario))
                                                mensaje += "Usuario Para la conexión con el Middleware de Factura Electrónica / ";
                                            if (utilities.isEmpty(recordFE[0].password))
                                                mensaje += "Password Para la conexión con el Middleware de Factura Electrónica / ";
                                            if (utilities.isEmpty(recordFE[0].cuenta))
                                                mensaje += "Cuenta de NetSuite / ";
                                            if (utilities.isEmpty(recordFE[0].rol) || recordFE[0].rol == 0)
                                                mensaje += "Rol del Usuario utilizado Para la conexión con el Middleware de Factura Electrónica / ";
                                            if (utilities.isEmpty(recordFE[0].razonSocial))
                                                mensaje += "Razón Social de la Empresa / ";
                                            if (utilities.isEmpty(recordFE[0].RUTEmpresa))
                                                mensaje += "RUT de la Empresa / ";
                                            if (utilities.isEmpty(recordFE[0].codTipoIntegracion)) {
                                                mensaje += "Tipo de Integración / ";
                                            } else {
                                                if (recordFE[0].codTipoIntegracion == 'TAFACE') {
                                                    if (utilities.isEmpty(recordFE[0].margenError))
                                                        mensaje += "Monto de Margen de Error Permitido para enviar la Transacción a la DGI / ";
                                                    if (utilities.isEmpty(recordFE[0].nombreSistemaFacturacion))
                                                        mensaje += "Nombre del Sistema de Facturación / ";
                                                    if (utilities.isEmpty(recordFE[0].URLGateway))
                                                        mensaje += "Dirección URL del Gateway TAFACE / ";
                                                    if (utilities.isEmpty(recordFE[0].URLServicioFirma))
                                                        mensaje += "Dirección URL del WebService de Firma de Comprobantes TAFACE / ";
                                                    if (utilities.isEmpty(recordFE[0].URLServicioConfFirma))
                                                        mensaje += "Dirección URL del WebService de Confirmación de Firma de Comprobantes TAFACE / ";
                                                }
                                                //NUEVOS CAMPOS PARA INTEGRACION CON UCFE
                                                if (recordFE[0].codTipoIntegracion == 'UCFE') {
                                                    if (utilities.isEmpty(recordFE[0].codTerminalUCFE))
                                                        mensaje += "Código Terminal UCFE / ";
                                                    if (utilities.isEmpty(recordFE[0].codComercioUCFE))
                                                        mensaje += "Código Comercio UCFE / ";
                                                    if (utilities.isEmpty(recordFE[0].URLServicioRestUCFE))
                                                        mensaje += "Dirección URL servicio REST UCFE / ";
                                                    if (utilities.isEmpty(recordFE[0].usuarioUCFE))
                                                        mensaje += "Usuario UCFE / ";
                                                    if (utilities.isEmpty(recordFE[0].passwordUCFE))
                                                        mensaje += "Password UCFE / ";
                                                }
                                                if (recordFE[0].codTipoIntegracion == 'SIGE') {
                                                    if (utilities.isEmpty(recordFE[0].urlServicioFirmaSIGE))
                                                        mensaje += "Dirección URL servicio Firma Comprobante SIGE / ";
                                                    if (utilities.isEmpty(recordFE[0].urlServicioConsultaSIGE))
                                                        mensaje += "Dirección URL servicio Consulta Comprobante SIGE / ";
                                                    if (utilities.isEmpty(recordFE[0].usuarioSIGE))
                                                        mensaje += "Usuario SIGE / ";
                                                    if (utilities.isEmpty(recordFE[0].passwordSIGE))
                                                        mensaje += "Password SIGE / ";
                                                }


                                                if (recordFE[0].codTipoIntegracion == tipoIntegFacturaLista) {
                                                    if (utilities.isEmpty(recordFE[0].URLGateway))
                                                        mensaje += "Dirección URL del Servicio Rest de Factura Lista / ";
                                                }
                                            }

                                            objetoRespuesta.error = true;
                                            objetoRespuesta.mensaje = mensaje;
                                            log.error(proceso, 'LINE 366 - Error: ' + objetoRespuesta.mensaje);
                                        }
                                    } else {
                                        mensaje = 'No se encuentra configurada la plantilla XML en el registro del RT URU-Proveedor FE Comprobantes DGI para el proveedor de FE.';
                                        objetoRespuesta.mensaje = mensaje;
                                        log.error(proceso, 'LINE 262 - Error: ' + objetoRespuesta.mensaje);
                                    }
                                } else {
                                    //No Se Encuentra configurado el Middleware de Factura Electronica
                                    objetoRespuesta.error = true;
                                    objetoRespuesta.mensaje = 'No se Encuentra configurado el registro del Proveedor de Facturación Electrónica (revisar RT URU-Proveedor FE Comprobantes DGI)';
                                    if (!utilities.isEmpty(tipoComprobante) && !utilities.isEmpty(tipoComprobanteText))
                                        objetoRespuesta.mensaje += ', para el Tipo de Comprobante DGI: ' + tipoComprobanteText;

                                    if (!utilities.isEmpty(subsidiaria))
                                        objetoRespuesta.mensaje += ', para la Subsidiaria con ID Interno: ' + subsidiaria;

                                    log.error(proceso, 'LINE 376 - Error: ' + objetoRespuesta.mensaje);
                                }
                            }
                        } else {
                            // Falta Configurar ID Transaccion URUGUAY en la Transaccion
                            objetoRespuesta.error = true;
                            objetoRespuesta.mensaje = 'Falta Configurar el ID de Transacción Electrónica en la Transacción (código tipo comprobante AFIP)';
                            log.error(proceso, 'LINE 384 - Error: ' + objetoRespuesta.mensaje);
                        }
                    } else {
                        // Falta Serie, Sucursal, Tipo de Comprobante DGI
                        objetoRespuesta.error = true;
                        objetoRespuesta.mensaje = "Falta Configurar la Siguiente Información: ";
                        if (utilities.isEmpty(serie)) {
                            objetoRespuesta.mensaje += "Serie, ";
                        }
                        if (utilities.isEmpty(sucursal)) {
                            objetoRespuesta.mensaje += "Sucursal, ";
                        }
                        if (utilities.isEmpty(tipoComprobante)) {
                            objetoRespuesta.mensaje += "Tipo de Comprobante DGI, ";
                        }

                        objetoRespuesta.mensaje += "para la Transacción con ID Interno: " + recId;
                        log.error(proceso, 'LINE 402 - Error: ' + objetoRespuesta.mensaje);
                    }
                } else {
                    objetoRespuesta.caeGenerado = true;
                }
            } catch (error) {
                objetoRespuesta.error = true;
                objetoRespuesta.mensaje = 'Excepción al obtener configuración de FE - Detalles del error: ' + error.message;
                log.error(proceso, 'LINE 410 - Error: ' + objetoRespuesta.mensaje);
            }

            log.debug(proceso, 'FIN - getConfigurationFE');
            return objetoRespuesta;
        }

        /**
         * Function definition to be triggered before record is submit.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {

            esOneworldMemo = undefined;
            timezoneEmpresaMemo = undefined;

            // D3 - antes se asignaban sin declarar (fuga al scope global).
            let importeNoFacturable;
            let cantidadLineas;

            let proceso = 'afterSubmit';
            let currentScript = runtime.getCurrentScript();
            let codigoEstadoError = currentScript.getParameter('custscript_l598_con_dir_fe_ss_c_est_erro'); // Codigo Estado Log FE - Error (FESTADO-2)
            let codigoEstadoSinError = currentScript.getParameter('custscript_l598_con_dir_fe_ss_c_est_sine'); // Código Estado Log FE - Sin error (FESTADO-1)
            let tipoMensajeErrorConfiguracionFE = currentScript.getParameter('custscript_l598_con_dir_fe_ss_m_err_conf'); // Mensaje Log FE - Error Configuración FE
            let tipoMensajeErrorCAE = currentScript.getParameter('custscript_l598_con_dir_fe_ss_m_err_cae'); // Mensaje Log FE - Error CAE FE
            let tipoMensajeErrorInesperadoXML = currentScript.getParameter('custscript_l598_con_dir_fe_ss_m_err_xml'); // Mensaje Log FE - Error Inesperado XML
            let tipoMensajeSinError = currentScript.getParameter('custscript_l598_con_dir_fe_ss_m_sin_err'); // Mensaje Log FE - Sin error	
            let tipoIntegFacturaLista = currentScript.getParameter('custscript_l598_con_dir_fe_ss_cod_fac_li'); // Integracion FacturaLista
            // INICIO - Gestion de agrupacion de lineas
            let realizarAgrupacion = currentScript.getParameter('custscript_l598_con_dir_fe_agrupacion'); // Indicacion de agrupación de lineas
            // FIN - Gestion de agrupacion de lineas
            let mensaje = '';
            let refLog = '';
            let infoTransaction = scriptContext.newRecord;
            let idTransaccion = infoTransaction.id;
            let recType = infoTransaction.type;
            let informacionAuxiliarCAE = '';
            let recId = idTransaccion;

            try {

                log.debug(proceso, 'INICIO - afterSubmit - Generación CAE - unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date() + ' - idTransaccion: ' + idTransaccion + ' - recType: ' + recType);

                if (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT || scriptContext.type == "ship") {

                    let recordTransaction = record.load({
                        type: recType,
                        id: idTransaccion,
                        isDynamic: true
                    });

                    // revisar si es un remito y si su estado de entrega es distinto de entregado no puede proceder
                    const comprobarEstadoRemitoEnviado = currentScript.getParameter('custscript_l598_com_estado_remito_enviad');
                    if (comprobarEstadoRemitoEnviado && recType == "itemfulfillment") {
                        const estado = recordTransaction.getValue({ fieldId: "shipstatus" });
                        if (estado != "C") { // C significa enviado
                            log.audit(proceso, "no se ejecutara el afterSubmit, ya que es un remito que tiene estado distinto de enviado= " + estado);
                            return;
                        }
                    }

                    let docXML = recordTransaction.getValue({ fieldId: 'custbody_l598_documento_xml_fe' });
                    let refTransaccion = idTransaccion;
                    let codigoSerie = recordTransaction.getText({ fieldId: 'custbody_l598_codigo_serie' });
                    let sucursalText = recordTransaction.getText({ fieldId: 'custbody_l598_codigo_sucursal' });
                    let punto_venta = recordTransaction.getText({ fieldId: 'custbody_l598_sucursal' });
                    let tipoTransaccion = recordTransaction.getText({ fieldId: 'custbody_l598_tipo_comprobante' });
                    let tipoComprobanteDGI = recordTransaction.getValue({ fieldId: 'custbody_l598_tipo_comprobante' });
                    let cae = recordTransaction.getValue({ fieldId: 'custbody_l598_cae' });
                    let serie = recordTransaction.getText({ fieldId: 'custbody_l598_serie_comprobante' });
                    let informacionTransacciones = {};
                    informacionTransacciones.error = false;
                    informacionTransacciones.idTransaccion = 0;
                    informacionTransacciones.mensajeAdicional = "";
                    informacionTransacciones.existenTransacciones = false;
                    informacionTransacciones.cantidadFE = 0;
                    informacionTransacciones.transaccionesFE = null;
                    informacionTransacciones.idRegistrosSinProcesar = "";

                    const esTransaccionInterna = recordTransaction.getValue({ fieldId: 'custbody_l598_trans_interna' });
                    log.debug(proceso, ' esTransaccionInterna: ' + esTransaccionInterna);

                    if (utilities.isEmpty(cae) && (esTransaccionInterna == false || esTransaccionInterna == 'F' || utilities.isEmpty(esTransaccionInterna))) {

                        if (!utilities.isEmpty(tipoComprobanteDGI)) {

                            let configuracionFE = getConfigurationFE(idTransaccion, recType, tipoIntegFacturaLista);
                            let oneWorld = esOneworld();
                            log.debug(proceso, 'configuracionFE : ' + JSON.stringify(configuracionFE));

                            if (!utilities.isEmpty(configuracionFE) && !configuracionFE.error) {

                                // log.debug(proceso, 'Ingreso a generación de CAE automático, se busca la información de la transacción para generar el XML que se enviará al proveedor de FE.');
                                let errorGlobal = false;
                                let ultimaTransaccionFE = 0;
                                let codTipoIntegracion = configuracionFE.codTipoIntegracion;
                                let idPlantillaXML = configuracionFE.idPlantillaXML;
                                // log.debug(proceso, 'idPlantillaXML: ' + JSON.stringify(idPlantillaXML));

                                let filtros = [];
                                if (!utilities.isEmpty(idTransaccion)) {
                                    let filtro = {};
                                    filtro.name = 'internalid';
                                    filtro.operator = 'ANYOF';
                                    filtro.values = idTransaccion;
                                    filtros.push(filtro);
                                }

                                let objResultSet = utilities.searchSavedPro('customsearch_l598_trans_gen_cae_con_dire', filtros);

                                if (objResultSet.error) {
                                    mensaje = 'Error Consultando searchSavedPro - customsearch_l598_trans_gen_cae_con_dire - Detalles del Error: ' + objResultSet.descripcion;
                                    log.error(proceso, 'LINE 413 - Error: ' + mensaje);
                                    grabarError(codigoEstadoError, tipoMensajeErrorInesperadoXML, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                } else {

                                    let resultSet = objResultSet.objRsponseFunction.result;
                                    let resultSearch = objResultSet.objRsponseFunction.search;

                                    if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {

                                        log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());
                                        let unidadesDisponiblesIniciales = currentScript.getRemainingUsage();

                                        if (unidadesDisponiblesIniciales > 50) { // Valor Necesario Para Obtener Informacion Inicial

                                            informacionTransacciones.existenTransacciones = true;

                                            let idTransaccionIndividual = resultSet[0].getValue({ name: resultSearch.columns[0] });

                                            let serie = resultSet[0].getValue({ name: resultSearch.columns[4] });
                                            let sucursal = resultSet[0].getValue({ name: resultSearch.columns[5] });
                                            let esNotaDebito = resultSet[0].getValue({ name: resultSearch.columns[6] });
                                            // let recType = resultSet[0].getValue({ name: resultSearch.columns[3] });

                                            if (recType == 'customtransaction_l598_anul_resguardo') {
                                                let ncResguardo = resultSet[0].getValue({ name: resultSearch.columns[65] });
                                                idTransaccionIndividual = ncResguardo;
                                                recType = 'vendorcredit';
                                            }

                                            let idTransaccionURU = resultSet[0].getValue({ name: resultSearch.columns[8] });

                                            if (!utilities.isEmpty(serie) && !utilities.isEmpty(sucursal) && !utilities.isEmpty(idTransaccionIndividual) && !utilities.isEmpty(idTransaccionURU)) {

                                                // log.debug(proceso, 'Log de control - pasa de validaciones iniciales de serie, sucursal, entre otros.');
                                                // Verifico si hay unidades para procesar la Transaccion
                                                const cantidadLineasAProcesar = recordTransaction.getLineCount({ sublistId: 'item' });
                                                const unidadesRequeridas = parseInt((parseInt(cantidadLineasAProcesar, 10) * parseInt(10, 10)), 10) + parseInt(30, 10); //10 Unidades Consumidas por Lines , 20 Unidades Excedentes
                                                const unidadesDisponiblesActuales = currentScript.getRemainingUsage();

                                                log.debug(proceso, 'Unidades disponibles antes de buscar información FE: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date() + ' - unidades requeridas: ' + unidadesRequeridas);

                                                informacionTransacciones.transaccionesFE = {};
                                                const objetoRespuestaIndividual = buscarInformacionFE(recordTransaction, resultSet[0], resultSearch.columns, tipoMensajeErrorInesperadoXML, oneWorld, codTipoIntegracion, configuracionFE.informacionAdicional);
                                                // log.debug(proceso, 'objetoRespuestaIndividual: ' + JSON.stringify(objetoRespuestaIndividual));

                                                log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                                if (!utilities.isEmpty(objetoRespuestaIndividual) && !objetoRespuestaIndividual.error) {

                                                    // INICIO - Agrupación de Lineas
                                                    const lineasAgrupadas = [];
                                                    let existeAgrupacion = false;
                                                    if (!utilities.isEmpty(realizarAgrupacion) && realizarAgrupacion == true) {
                                                        if (!utilities.isEmpty(objetoRespuestaIndividual.detalleLineas) && objetoRespuestaIndividual.detalleLineas.length > 0) {
                                                            for (let indice = 0; indice < objetoRespuestaIndividual.detalleLineas.length; indice++) {
                                                                let indiceLinea = objetoRespuestaIndividual.detalleLineas[indice].indiceAgrupacion;
                                                                if (!utilities.isEmpty(indiceLinea) && !isNaN(indiceLinea) && parseInt(indiceLinea, 10) > 0) {
                                                                    let subIndiceLinea = objetoRespuestaIndividual.detalleLineas[indice].subIndiceAgrupacion;
                                                                    let index = lineasAgrupadas.findIndex(function (obj) {
                                                                        return obj.indiceAgrupacion == indiceLinea;
                                                                    });
                                                                    if (index >= 0) {
                                                                        if (!utilities.isEmpty(subIndiceLinea) && !isNaN(subIndiceLinea) && parseInt(subIndiceLinea, 10) > 0) {
                                                                            let subIndex = lineasAgrupadas.findIndex(function (obj) {
                                                                                return obj.indiceAgrupacion == indiceLinea && obj.subIndiceAgrupacion == subIndiceLinea;
                                                                            });
                                                                            if (subIndex >= 0) {
                                                                                index = subIndex;
                                                                                lineasAgrupadas[index].cantidad = toFixedOK((parseFloat(lineasAgrupadas[index].cantidad) + parseFloat(objetoRespuestaIndividual.detalleLineas[indice].cantidad)), 3);
                                                                            }
                                                                        }
                                                                        //lineasAgrupadas[index].cantidad = (parseFloat(lineasAgrupadas[index].cantidad,10) + parseFloat(objetoRespuestaIndividual.detalleLineas[indice].cantidad, 10)).toFixedOK(3);
                                                                        lineasAgrupadas[index].montoItem = toFixedOK((parseFloat(lineasAgrupadas[index].montoItem) + parseFloat(objetoRespuestaIndividual.detalleLineas[indice].montoItem)), 2);
                                                                        lineasAgrupadas[index].precioUnitario = toFixedOK(parseFloat((parseFloat(lineasAgrupadas[index].montoItem) / parseFloat(lineasAgrupadas[index].cantidad))), 6);
                                                                        existeAgrupacion = true;
                                                                    }
                                                                    else {
                                                                        lineasAgrupadas.push(objetoRespuestaIndividual.detalleLineas[indice]);
                                                                    }
                                                                }
                                                                else {
                                                                    lineasAgrupadas.push(objetoRespuestaIndividual.detalleLineas[indice]);
                                                                }
                                                            }
                                                            if (existeAgrupacion == true) {
                                                                objetoRespuestaIndividual.detalleLineas = lineasAgrupadas;
                                                            }
                                                        }
                                                    }

                                                    // FIN - Agrupación de Lineas

                                                    // log.debug(proceso, 'configuracionFE.informacionAdicional: ' + JSON.stringify(configuracionFE.informacionAdicional));
                                                    const fecha = recordTransaction.getValue({ fieldId: 'trandate' });
                                                    let fechaActual = parseDate(fecha);
                                                    let anio = fechaActual.getFullYear();
                                                    let mes = fechaActual.getMonth() + 1;
                                                    let dia = fechaActual.getDate();

                                                    objetoRespuestaIndividual.fechaComprobanteFinal = anio + '-' + padding_left(mes.toString(), '0', 2) + '-' + padding_left(dia.toString(), '0', 2);

                                                    // Se agregan campos de detalle para Customer Payment
                                                    if (recType == 'customerpayment' || recType == 'customtransaction_l598_anulacion_cobranz' || recType == 'customerdeposit' || recType == 'customerrefund') {

                                                        const informacionLinea = {};

                                                        if (recType == 'customerpayment' || recType == 'customerdeposit') {
                                                            var pagoImporte = toFixedOK(parseFloat(recordTransaction.getValue({ fieldId: 'payment' })), 2);
                                                            informacionLinea.nombreItem = configuracionFE.informacionAdicional.conceptoFacturacion;
                                                        } else if (recType == 'customtransaction_l598_anulacion_cobranz' || recType == 'customerrefund') {

                                                            var pagoImporte = toFixedOK(parseFloat(recordTransaction.getValue({ fieldId: 'custbody_l598_total_pago_anulado' })), 2);
                                                            informacionLinea.nombreItem = configuracionFE.informacionAdicional.conceptoFacturacionAnulacion;
                                                        }

                                                        informacionLinea.indicadorFacturacion = configuracionFE.informacionAdicional.indicadorFacturacion;
                                                        informacionLinea.precioUnitario = pagoImporte;
                                                        informacionLinea.DescripcionAdicional = "descripcionLinea";
                                                        objetoRespuestaIndividual.informacionTotalesEncabezado.montoNoFacturable = pagoImporte;
                                                        informacionLinea.indicadorAgente = "";
                                                        informacionLinea.unidadMedida = 'N/A';
                                                        informacionLinea.cantidad = 1;
                                                        informacionLinea.montoItem = pagoImporte;
                                                        informacionLinea.descuentoEnPorcentaje = 0.0;
                                                        informacionLinea.recargoEnPorcentaje = 0.0;
                                                        objetoRespuestaIndividual.detalleLineas.push(informacionLinea);

                                                        // objetoRespuesta.informacionTotalesEncabezado.montoNoFacturable = pagoImporte;
                                                        importeNoFacturable = pagoImporte;
                                                        cantidadLineas = 1;
                                                    }

                                                    log.debug(proceso, 'detalleLineas: ' + JSON.stringify(objetoRespuestaIndividual.detalleLineas));

                                                    let objetoRespuestaFinal = JSON.stringify(objetoRespuestaIndividual).toString().replace(/&/g, 'Y');

                                                    const fileFE = file.create({
                                                        name: 'InformacionFE_JSON_ID_Transaction_' + idTransaccion + '_' + new Date() + '.json',
                                                        fileType: file.Type.JSON,
                                                        contents: objetoRespuestaFinal,
                                                        folder: configuracionFE.idDirectorioFilesFE
                                                    });

                                                    const idFileJSON = fileFE.save();
                                                    log.debug(proceso, ' Que tiene el id del idFileJSON: ' + idFileJSON);
                                                    const idFileJSONOld = recordTransaction.getValue({ fieldId: 'custbody_l598_informacion_json_tran_fe' });
                                                    recordTransaction.setValue({ fieldId: 'custbody_l598_informacion_json_tran_fe', value: idFileJSON });
                                                    recordTransaction.setValue({ fieldId: 'custbody_l598_informacion_json_tran_id', value: idFileJSON.toString() });

                                                    // Elimino el archivo que ya existía en el campo de JSON de transacción
                                                    if (!utilities.isEmpty(idFileJSONOld) && parseInt(idFileJSONOld, 10) > 0) {
                                                        file.delete({
                                                            id: idFileJSONOld
                                                        });
                                                    }

                                                    if (!utilities.isEmpty(idFileJSON)) {

                                                        // log.debug(proceso, 'Se generó correctamente el JSON de información de la transacción - se procede a verificar la configuración del proveedor de FE.');

                                                        const rendererXML = render.create();

                                                        const fileXML = file.load({
                                                            id: idPlantillaXML
                                                        });

                                                        const templateXML = fileXML.getContents(); //get the contents
                                                        rendererXML.templateContent = templateXML;

                                                        // log.audit(proceso, 'rendererXML: ' + rendererXML.templateContent);

                                                        if (!utilities.isEmpty(objetoRespuestaFinal)) {
                                                            rendererXML.addCustomDataSource({
                                                                format: render.DataSource.OBJECT,
                                                                alias: "informacionTransaccion",
                                                                data: JSON.parse(objetoRespuestaFinal)
                                                            });
                                                        }

                                                        const stringXML = rendererXML.renderAsString(); // transform to string
                                                        // log.audit(proceso, 'stringXML: ' + JSON.stringify(stringXML));

                                                        const fileObj = file.create({
                                                            name: 'InformacionFE_XML_ID_Transaction_' + idTransaccion + '_' + new Date() + '.xml',
                                                            fileType: file.Type.XMLDOC,
                                                            contents: stringXML,
                                                            folder: configuracionFE.idDirectorioFilesFE
                                                        }); // creating the final XML file

                                                        const idFileXML = fileObj.save();
                                                        log.debug(proceso, ' Que tiene el id del idFileXML: ' + idFileXML);

                                                        if (!utilities.isEmpty(idFileXML)) {

                                                            // log.audit(proceso, 'Se generó correctamente el XML de envío hacia TAFACE.');
                                                            recordTransaction.setValue({ fieldId: 'custbody_l598_documento_xml_fe', value: idFileXML });
                                                            recordTransaction.setValue({ fieldId: 'custbody_l598_documento_xml_fe_id', value: idFileXML.toString() });

                                                            // Elimino el archivo que ya existía en el campo de XML de transacción
                                                            if (!utilities.isEmpty(docXML) && parseInt(docXML, 10) > 0) {
                                                                file.delete({
                                                                    id: docXML
                                                                });
                                                            }

                                                            recordTransaction.save();

                                                            log.debug(proceso, 'Antes de llamar al Suitelet - Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                                            // Se invoca al suitelet de envío de información para generar CAE, si está configurado automáticamente
                                                            if (configuracionFE.generarCaeAutomatico) {
                                                                let errorProceso = false;
                                                                let idLog;
                                                                const subsidiariaCampo = recordTransaction.getValue({ fieldId: 'subsidiary' });
                                                                let caeRecibido = '';
                                                                const new_url = url.resolveScript({
                                                                    scriptId: 'customscript_l598_conexion_directa_fe_sl',
                                                                    deploymentId: 'customdeploy1',
                                                                    returnExternalUrl: true
                                                                });

                                                                const postData = {
                                                                    idTransaccion: idTransaccion,
                                                                    typeTransaccion: recType,
                                                                    idXML: idFileXML,
                                                                    idJSON: idFileJSON
                                                                };

                                                                // log.debug(proceso, 'postData: ' + JSON.stringify(postData) + ' - url: ' + new_url);

                                                                let response = '';
                                                                const verificacionCAETransaccionDetalleLogFE = verificarCAETransaccionDetalleLogFE(recordTransaction);

                                                                log.debug(proceso, 'verificacionCAETransaccionDetalleLogFE: ' + JSON.stringify(verificacionCAETransaccionDetalleLogFE));

                                                                if (!verificacionCAETransaccionDetalleLogFE.poseeCAE && !verificacionCAETransaccionDetalleLogFE.error) {
                                                                    response = https.post({
                                                                        url: new_url,
                                                                        body: postData
                                                                    });
                                                                }

                                                                const recordTransactionFinal = record.load({
                                                                    type: recType,
                                                                    id: idTransaccion,
                                                                    isDynamic: true
                                                                });

                                                                if (!utilities.isEmpty(response) && !verificacionCAETransaccionDetalleLogFE.error && !verificacionCAETransaccionDetalleLogFE.poseeCAE) {

                                                                    let erroresRespuesta = "";
                                                                    log.debug(proceso, 'Response Suitelet: ' + JSON.stringify(response.body));
                                                                    const informacionRespuestaAux = JSON.parse(response.body);

                                                                    if (!utilities.isEmpty(informacionRespuestaAux) && informacionRespuestaAux.length > 0) {

                                                                        const informacionRespuesta = informacionRespuestaAux[0];

                                                                        if (!informacionRespuesta.error) {

                                                                            let respuestaFinal = informacionRespuesta.mensajeFinal + '\n';

                                                                            if (!utilities.isEmpty(informacionRespuesta.mensajeError)) {
                                                                                erroresRespuesta = informacionRespuesta.mensajeError;
                                                                                respuestaFinal += 'Detalles: ' + erroresRespuesta + '\n';
                                                                            }
                                                                            const informacionCAE = informacionRespuesta.objetoRespuestaWS;
                                                                            log.debug(proceso, 'informacionCAE: ' + JSON.stringify(informacionCAE));

                                                                            if (!utilities.isEmpty(informacionCAE) && !utilities.isEmpty(informacionCAE.CAEGENERADO)) {

                                                                                let CAEGENERADO = false;
                                                                                if (!utilities.isEmpty(informacionCAE.CAEGENERADO) && informacionCAE.CAEGENERADO == 'SI') {
                                                                                    CAEGENERADO = true;
                                                                                }

                                                                                let CAE = informacionCAE.CAE;
                                                                                const CAEVencimiento = informacionCAE.CAEVencimiento;

                                                                                if ((CAEGENERADO == true && !utilities.isEmpty(CAE) && !utilities.isEmpty(CAEVencimiento)) || (CAEGENERADO != true)) {

                                                                                    let CAEVencimientoFinal = '';
                                                                                    if (!utilities.isEmpty(CAEVencimiento)) {

                                                                                        CAEVencimientoFinal = CAEVencimiento.toString();
                                                                                    }

                                                                                    // Obtengo Informacion de transacción del Proveedor de FE
                                                                                    let fechaSolicitudAFIPFinal = "";
                                                                                    let fechaRespuestaAFIPFinal = "";
                                                                                    let infoEnviadaAFIP = informacionCAE.infoEnviadaAFIP;

                                                                                    if (utilities.isEmpty(infoEnviadaAFIP)) {
                                                                                        infoEnviadaAFIP = "";
                                                                                    }

                                                                                    let infoRespuestaAFIP = informacionCAE.infoRespuestaAFIP;
                                                                                    if (utilities.isEmpty(infoRespuestaAFIP)) {
                                                                                        infoRespuestaAFIP = "";
                                                                                    }

                                                                                    let descripcionErrorFinal = "";
                                                                                    if (!utilities.isEmpty(infoRespuestaAFIP)) {
                                                                                        descripcionErrorFinal = infoRespuestaAFIP.substring(0, 3995)
                                                                                    }

                                                                                    let fechaSolicitudAFIP = informacionCAE.fechaSolicitudAFIP;
                                                                                    if (utilities.isEmpty(fechaSolicitudAFIP)) {
                                                                                        fechaSolicitudAFIP = "";
                                                                                    } else {
                                                                                        fechaSolicitudAFIPFinal = fechaSolicitudAFIP;
                                                                                    }

                                                                                    let fechaRespuestaAFIP = informacionCAE.fechaRespuestaAFIP;
                                                                                    if (utilities.isEmpty(fechaRespuestaAFIP)) {
                                                                                        fechaRespuestaAFIP = "";
                                                                                    } else {
                                                                                        fechaRespuestaAFIPFinal = fechaRespuestaAFIP;
                                                                                    }

                                                                                    let codigoBarras = informacionCAE.codigoBarras;
                                                                                    if (utilities.isEmpty(codigoBarras)) {
                                                                                        codigoBarras = "";
                                                                                    }

                                                                                    // INICIO Informacion Adicional
                                                                                    let codigoSeguridad = informacionCAE.CODSEGURIDAD;
                                                                                    if (utilities.isEmpty(codigoSeguridad)) {
                                                                                        codigoSeguridad = "";
                                                                                    }

                                                                                    let urlVerificacion = informacionCAE.URLVERIFICACION;
                                                                                    if (utilities.isEmpty(urlVerificacion)) {
                                                                                        urlVerificacion = "";
                                                                                    }

                                                                                    let urlVerificacionQR = informacionCAE.URLVERIFICACIONQR;
                                                                                    if (utilities.isEmpty(urlVerificacionQR)) {
                                                                                        urlVerificacionQR = "";
                                                                                    }

                                                                                    let caeNumero = informacionCAE.CAENRO;
                                                                                    if (utilities.isEmpty(caeNumero)) {
                                                                                        caeNumero = "";
                                                                                    }

                                                                                    let caeSerie = informacionCAE.CAESERIE;
                                                                                    if (utilities.isEmpty(caeSerie)) {
                                                                                        caeSerie = "";
                                                                                    }

                                                                                    let fechaFirma = informacionCAE.FechaFirma;
                                                                                    if (utilities.isEmpty(fechaFirma)) {
                                                                                        fechaFirma = "";
                                                                                    }

                                                                                    let caeNroInicial = informacionCAE.CAENROINICIAL;
                                                                                    if (utilities.isEmpty(caeNroInicial)) {
                                                                                        caeNroInicial = "";
                                                                                    }

                                                                                    let caeNroFinal = informacionCAE.CAENROFINAL;
                                                                                    if (utilities.isEmpty(caeNroFinal)) {
                                                                                        caeNroFinal = "";
                                                                                    }

                                                                                    let resolucionIVA = informacionCAE.RESOLUCIONIVA;
                                                                                    if (utilities.isEmpty(resolucionIVA)) {
                                                                                        resolucionIVA = "";
                                                                                    }

                                                                                    let correspondeSobre = informacionCAE.CORRESPONDESOBRE;
                                                                                    if (!utilities.isEmpty(correspondeSobre) && correspondeSobre == 1) {
                                                                                        correspondeSobre = true;
                                                                                    } else {
                                                                                        correspondeSobre = false;
                                                                                    }

                                                                                    const nroCaeGenerado = '';
                                                                                    const caeVTO = '';
                                                                                    const codigoBarrasFinal = '';
                                                                                    if (!CAEGENERADO || utilities.isEmpty(CAE) || CAE == "0" || CAE == 0) {
                                                                                        CAE = '';
                                                                                        CAEVencimientoFinal = '';
                                                                                        codigoBarras = '';
                                                                                    }

                                                                                    try {

                                                                                        informacionAuxiliarCAE = agruparInformacionCAE(infoEnviadaAFIP, descripcionErrorFinal, fechaSolicitudAFIPFinal, fechaRespuestaAFIPFinal, codigoSeguridad, urlVerificacion, urlVerificacionQR, caeNumero, caeSerie, fechaFirma, caeNroInicial, caeNroFinal, resolucionIVA, correspondeSobre, CAE, CAEVencimientoFinal, codigoBarras);
                                                                                        var objGrabarDatos = grabarDatosCAE(informacionAuxiliarCAE, recType, recordTransactionFinal, CAEGENERADO, codigoEstadoSinError, tipoMensajeSinError, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionAuxiliarCAE, codigoEstadoError, tipoMensajeErrorCAE, recId);
                                                                                        idLog = objGrabarDatos.idLog;
                                                                                        caeRecibido = objGrabarDatos.cae;
                                                                                        mensaje = respuestaFinal;
                                                                                        log.debug(proceso, 'respuestaFinal: ' + respuestaFinal);
                                                                                        log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                                                                    } catch (error) {
                                                                                        mensaje = "Excepción Actualizando CAE de Transacción en NetSuite - ID Interno Transaccion : " + idTransaccion + " - Excepcion : " + error.message;
                                                                                        log.error(proceso, mensaje);
                                                                                        errorProceso = true;
                                                                                        informacionAuxiliarCAE = (!CAEGENERADO || utilities.isEmpty(CAE) || CAE == "0" || CAE == 0) ? '' : informacionAuxiliarCAE;
                                                                                        idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionAuxiliarCAE, null);
                                                                                    }
                                                                                } else {
                                                                                    mensaje = 'Error - No se complen con las condiciones para generar CAE, verifique fecha de vencimiento o el proceso de generación de CAE.';
                                                                                    log.error(proceso, mensaje);
                                                                                    errorProceso = true;
                                                                                    idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                                                                }
                                                                            } else {
                                                                                mensaje = 'Error - No se recibió información del web services para grabar el resultado de CAE.';
                                                                                errorProceso = true;
                                                                                log.error(proceso, mensaje);
                                                                                idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                                                            }
                                                                        } else {
                                                                            // Muestro los errores ocurridos
                                                                            if (!utilities.isEmpty(informacionRespuesta.mensajeError)) {
                                                                                erroresRespuesta = 'Error en el proceso de CAE - Detalles: ' + informacionRespuesta.mensajeError;
                                                                            }

                                                                            log.error(proceso, erroresRespuesta);
                                                                            errorProceso = true;
                                                                            mensaje = erroresRespuesta;
                                                                            idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                                                        }
                                                                    } else {
                                                                        mensaje = "Error obteniendo información de generación de Suitelet generador de CAE - Respuesta OBJECT: nula/vacía";
                                                                        errorProceso = true;
                                                                        log.error(proceso, 'LINE 610: ' + mensaje);
                                                                        idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                                                    }
                                                                } else if (utilities.isEmpty(response) && !verificacionCAETransaccionDetalleLogFE.error && verificacionCAETransaccionDetalleLogFE.poseeCAE) {
                                                                    try {

                                                                        const informacionCAEDetalleLog = JSON.parse(verificacionCAETransaccionDetalleLogFE.informacionCAE);
                                                                        const mensajeRespuesta = 'ID Interno Transacción : ' + refTransaccion + ' - Comprobante :  ' + tipoTransaccion.toString() + ' ' + codigoSerie.toString() + '-' + sucursalText.toString() + '-' + refTransaccion + ' / CAE: ' + informacionCAEDetalleLog.CAE;

                                                                        var objGrabarDatos = grabarDatosCAE(informacionCAEDetalleLog, recType, recordTransactionFinal, true, codigoEstadoSinError, tipoMensajeSinError, mensajeRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionCAEDetalleLog, codigoEstadoError, tipoMensajeErrorCAE, recId);
                                                                        idLog = objGrabarDatos.idLog;
                                                                        caeRecibido = objGrabarDatos.cae;
                                                                        log.debug(proceso, 'Generación de CAE OK.');
                                                                        log.debug(proceso, 'La transacción ya posee CAE generado previamente y sus datos están registrados de manera interna en los registros del RT "URU-Factura Electrónica Detalle Log" de la transacción actual, se procedió a actualizar la transacción con dichos datos. \n \n ' + mensajeRespuesta);

                                                                    } catch (error) {
                                                                        mensaje = 'La transacción ya posee CAE generado previamente y sus datos están registrados de manera interna en los registros del RT "URU-Factura Electrónica Detalle Log" de la transacción actual. \n \n Excepción Actualizando CAE de Transacción en NetSuite - ID Interno Transaccion : ' + idTransaccion + ' - Excepcion : ' + error.message;
                                                                        log.error(proceso, mensaje);
                                                                        errorProceso = true;
                                                                        idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                                                    }
                                                                } else if (verificacionCAETransaccionDetalleLogFE.error) {
                                                                    mensaje = verificacionCAETransaccionDetalleLogFE.mensaje;
                                                                    errorProceso = true;
                                                                    log.error(proceso, mensaje);
                                                                    idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                                                } else {
                                                                    mensaje = "Error obteniendo información de Suitelet generador de CAE - Respuesta JSON: nula/vacía";
                                                                    errorProceso = true;
                                                                    log.error(proceso, 'LINE 615: ' + mensaje);
                                                                    idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                                                }

                                                                if(!utilities.isEmpty(mensaje)){
                                                                    const userObj = runtime.getCurrentUser();
                                                                    // log.debug(proceso, 'Current user email: ' + userObj.email);
                                                                    envioEmail(errorProceso, caeRecibido, tipoTransaccion, codigoSerie, sucursalText, idTransaccion, subsidiariaCampo, idLog, mensaje, userObj.id);
                                                                }
                                                                
                                                            } else {
                                                                log.debug(proceso, 'No se envía a generación de CAE automático porque no está configurado de manera automática.');
                                                            }

                                                            log.debug(proceso, 'Luego de llamar al Suitelet - Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                                        } else {
                                                            mensaje = 'No se generó correctamente el XML de información de la transacción, intente nuevamente.';
                                                            log.error(proceso, 'LINE 558: ' + mensaje);
                                                            grabarError(codigoEstadoError, tipoMensajeErrorInesperadoXML, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                                        }
                                                    } else {
                                                        mensaje = 'No se generó correctamente el JSON de información de la transacción.';
                                                        log.error(proceso, 'LINE 563: ' + mensaje);
                                                        grabarError(codigoEstadoError, tipoMensajeErrorInesperadoXML, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                                    }
                                                } else {
                                                    mensaje = 'No se obtuvo una respuesta correcta de la búsqueda de información FE de la transacción  - Detalles: ' + objetoRespuestaIndividual.mensaje;
                                                    log.error(proceso, 'LINE 568: ' + mensaje);
                                                    grabarError(codigoEstadoError, tipoMensajeErrorInesperadoXML, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                                }
                                            } else {
                                                mensaje = "Falta Configurar la Siguiente Información: ";
                                                if (utilities.isEmpty(serie)) {
                                                    mensaje += "Serie, ";
                                                }
                                                if (utilities.isEmpty(sucursal)) {
                                                    mensaje += "Sucursal, ";
                                                }
                                                if (utilities.isEmpty(idTransaccionIndividual)) {
                                                    mensaje += "Id transacción, ";
                                                }
                                                if (utilities.isEmpty(idTransaccionURU)) {
                                                    mensaje += "Tipo de Comprobante DGI, ";
                                                }

                                                mensaje += "para la Transacción con ID Interno: " + recId;
                                                log.error(proceso, 'LINE 593 - Error: ' + mensaje);
                                                grabarError(codigoEstadoError, tipoMensajeErrorInesperadoXML, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                            }
                                        } else {
                                            // No Hay Unidades Disponibles para las Lineas
                                            mensaje = 'No Hay Unidades Disponibles para procesar la información de la transacción.';
                                            log.error(proceso, 'LINE 598: ' + mensaje);
                                            grabarError(codigoEstadoError, tipoMensajeErrorInesperadoXML, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                        }
                                    } else {
                                        mensaje = 'La transacción no se encuentra disponible para la generación de CAE.';
                                        log.error(proceso, 'LINE 603 - Error: ' + mensaje);
                                        grabarError(codigoEstadoError, tipoMensajeErrorInesperadoXML, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                                    }
                                }
                            } else {
                                mensaje = configuracionFE.mensaje;
                                log.error(proceso, 'LINE 614 - Error: ' + mensaje);
                                grabarError(codigoEstadoError, tipoMensajeErrorConfiguracionFE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                            }
                        } else {
                            mensaje = "La transacción no posee tipo comprobante DGI (tipo comprobante para la facturación electrónica)";
                            log.error(proceso, 'LINE 588 - Error: ' + mensaje);
                            grabarError(codigoEstadoError, tipoMensajeErrorInesperadoXML, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
                        }
                    } else {
                        mensaje = 'La transacción ya posee CAE o es Transaccion Interna.';
                        log.error(proceso, 'LINE 755 - Error: ' + mensaje);
                    }
                }
            } catch (error) {
                mensaje = 'Excepción al intentar generar XML en afterSubmit - Detalles del error: ' + error.message;
                log.error(proceso, 'LINE 632 - Error: ' + mensaje);
                // grabarError(codigoEstadoError, tipoMensajeErrorInesperadoXML, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', null);
            }

            log.debug(proceso, "Remaining Usage = " + currentScript.getRemainingUsage() + ' --- time: ' + new Date());
            log.debug(proceso, 'FIN - afterSubmit - Generación CAE - unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());
            return true;
        }

        function grabarError(codigoEstado, codigoMensaje, detalleMensaje, puntoVenta, tipoComprobante, refLog, refTransaccion, serie, informacionAuxiliarCAE, recordTransaction) {

            let proceso = 'grabarError';

            log.debug(proceso, 'INICIO PROCESO - grabarError - parámetros - codigoEstado: ' + codigoEstado + ' - codigoMensaje: ' + codigoMensaje + ' - detalleMensaje: ' + detalleMensaje + ' - puntoVenta: ' + puntoVenta + ' - tipoComprobante: ' + tipoComprobante + ' - refLog: ' + refLog + ' - refTransaccion: ' + refTransaccion + ' - serie: ' + serie + ' - informacionAuxiliarCAE: ' + informacionAuxiliarCAE);
            let idRL;
            try {
                idRL = refLog;
                let idRDL = null;
                let fechaActual = parseDate();
                let formattedDate = '';

                if (!utilities.isEmpty(recordTransaction)){
                    const fecha = recordTransaction.getValue({ fieldId: 'trandate' })
                    const date = new Date(fecha);
        
                    let day = date.getDate();
                    let month = date.getMonth() + 1;
                    const year = date.getFullYear();
        
                    day = day < 10 ? '0' + day : day;
                    month = month < 10 ? '0' + month : month;
        
                    formattedDate = day + '/' + month + '/' + year;
                }

                if (utilities.isEmpty(idRL)) {

                    let recordLog = record.create({ type: 'customrecord_l598_fact_elec_log' });

                    // Genero la Fecha
                    recordLog.setValue({ fieldId: 'custrecord_l598_fact_elec_log_fecha', value: fechaActual });

                    if (!utilities.isEmpty(codigoEstado))
                        recordLog.setValue({ fieldId: 'custrecord_l598_fact_elec_log_estado', value: codigoEstado });

                    if (!utilities.isEmpty(puntoVenta))
                        recordLog.setValue({ fieldId: 'custrecord_l598_fact_elec_log_suc', value: puntoVenta });

                    if (!utilities.isEmpty(tipoComprobante))
                        recordLog.setValue({ fieldId: 'custrecord_l598_fact_elec_log_tipo_comp', value: tipoComprobante });

                    if (!utilities.isEmpty(serie))
                        recordLog.setValue({ fieldId: 'custrecord_l598_fact_elec_log_serie', value: serie });

                    idRL = recordLog.save();
                }

                if (!utilities.isEmpty(idRL)) {

                    let recordDetalleLog = record.create({ type: 'customrecord_l598_fact_elec_dlog' });
                    recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_fecha', value: fechaActual });

                    if (!utilities.isEmpty(codigoMensaje))
                        recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_msg', value: codigoMensaje });

                    if (!utilities.isEmpty(detalleMensaje))
                        recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_det', value: detalleMensaje });

                    if (!utilities.isEmpty(idRL))
                        recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_rlog', value: idRL });

                    if (!utilities.isEmpty(refTransaccion))
                        recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_rtrans', value: refTransaccion });

                    if (!utilities.isEmpty(informacionAuxiliarCAE)) {
                        recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_datos_cae', value: (JSON.stringify(informacionAuxiliarCAE)).replace(/TRANSACTIONDATE/g, formattedDate) });
                        recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_cae_gener', value: true });
                    }

                    idRDL = recordDetalleLog.save();
                }

                log.debug(proceso, 'id log FE: ' + idRL + ' - id detalle log FE: ' + idRDL);
            } catch (error) {
                log.error(proceso, 'Excepción Grabando Log de Proceso de Factura Electrónica - Excepción: ' + error.message);
            }
            log.debug(proceso, 'FIN PROCESO - grabarError.');
            return idRL;
        }

        function envioEmail(errorProceso, CAENRO, tipoDocumento, codigoSerie, sucursal, internalId, subsidiaria, idLog, message){
            try {
                log.debug("Inicio envioEmail", "Se inicia el envioEmail");
                var filtroConf = [];
                filtroConf.push({
                    name: "isinactive",
                    operator: "is",
                    values: false
                });
                if (!utilities.isEmpty(subsidiaria)) {
                    filtroConf.push({
                    name: "custrecord_l598_conf_fe_subsidiaria",
                    operator: "is",
                    values: subsidiaria
                    });
                }

                var configuracionSaveSearch = search.create({
                    type: "customrecord_l598_conf_factura_elec",
                    columns: ["custrecord_l598_conf_fe_url_dom", "custrecord_l598_conf_fe_log", "custrecord_l598_conf_fe_enviar_email", "custrecord_l598_conf_fe_empleado_notific"],
                    filters: filtroConf
                  });

                var resultadoConf = configuracionSaveSearch.run().getRange({
                    start: 0,
                    end: 1
                });
                if (!utilities.isEmpty(resultadoConf) && resultadoConf.length > 0) {
                    var urlLog = resultadoConf[0].getValue("custrecord_l598_conf_fe_log");
                    var urlDominio = resultadoConf[0].getValue("custrecord_l598_conf_fe_url_dom");
                    var enviarEmail = resultadoConf[0].getValue("custrecord_l598_conf_fe_enviar_email");
                    var emailUsuario = resultadoConf[0].getValue("custrecord_l598_conf_fe_empleado_notific");
                    log.debug("URU - Factura Electronica", "ID Empleado : " + emailUsuario + ",urlLog:" + urlLog + ",urlDominio:" + urlDominio + ",enviarEmail: " + enviarEmail + ",emailUsuario:" + emailUsuario + "CAENRO: "+ CAENRO + "errorProceso:" + errorProceso);
                    var esquema = 'https://';
                    var host = url.resolveDomain({
                        hostType: url.HostType.APPLICATION
                    });
                    var rutaRelativa = url.resolveRecord({
                        recordType: 'customrecord_l598_fact_elec_log',
                        recordId: idLog,
                        isEditMode: false
                    });

                    var urlRT = esquema + host + rutaRelativa;
                    if (!utilities.isEmpty(enviarEmail) && enviarEmail === true) {
                        
                        var body = '';

                        if (!errorProceso && !utilities.isEmpty(CAENRO)){
                            body += '<p>Estimado(a) :</p>';
                            body += '<p>Se ha generado el número de CAE: ' + CAENRO + ' para la transacción de ' + tipoDocumento + ' con la serie ' + codigoSerie + ', Sucursal '+ sucursal +'  e Internal ID ' + internalId + '.</p>';
                            body += '<p>Puede Observar  el Detalle de las Transacciones Procesadas desde el Siguiente link.</p>';
                            body += "<a href=\"" + urlRT + "\"> Informacion Generacion de CAE </a>";
                            body += '<p>Atentamente,</p>';
                            body += '<br>';
                            body += '<p><strong>***NO RESPONDA A ESTE MENSAJE***</strong></p>';
                        } else{
                            body += '<p>Estimado(a) :</p>';
                            body += '<p>Se ha generado un error al intentar generar el CAE para la transacción de ' + tipoDocumento + ' con la serie ' + codigoSerie + ', Sucursal '+ sucursal +'  e Internal ID ' + internalId + '.</p>';
                            body += '<p>Detalles del error ocurrido: ' + message + '.</p>';
                            body += "<p>Puede Observar el Detalle de Errores desde el Siguiente link. </p> ";
                            body += "<a href=\"" + urlRT + "\"> Informacion Generacion de CAE </a>";
                            body += '<p>Atentamente,</p>';
                            body += '<br>';
                            body += '<p><strong>***NO RESPONDA A ESTE MENSAJE***</strong></p>';
                        }
                        log.debug("body", body);

                        var arrRec = [emailUsuario]
                        if (!isEmpty(userActual)) {
                            var arrRec = [emailUsuario, userActual]
                        }

                        email.send({
                            author: emailUsuario,
                            recipients: arrRec,
                            subject: "NetSuite - Proceso de generación de CAE",
                            body: body,
                        });

                    }
                }
                log.debug("Fin envioEmail", "Se termina el envioEmail");
            } catch (error) {
                log.error(proceso, 'Excepción Enviando Email Log de Proceso de Factura Electrónica - Excepción: ' + error.message);
            }
        }

        function parseDate(fecha) {

            // D3 - antes se asignaba sin declarar (fuga al scope global).
            let currentDateTime;

            if (!utilities.isEmpty(fecha)) {
                var fechaFormateada = format.parse({
                    value: fecha,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO
                });
            } else {
                var fechaFormateada = new Date();
            }

            log.debug('parseDate', 'fechaFormateada: ' + fechaFormateada);
            currentDateTime = fechaFormateada;
            const companyTimeZone = obtenerTimezoneEmpresa();
            const timeZoneOffSet = (companyTimeZone.indexOf('(GMT)') == 0) ? 0 : Number(companyTimeZone.substr(4, 6).replace(/\+|:00/gi, '').replace(/:30/gi, '.5'));
            const UTC = currentDateTime.getTime() + (currentDateTime.getTimezoneOffset() * 60000);
            const companyDateTime = UTC + (timeZoneOffSet * 60 * 60 * 1000);

            return new Date(companyDateTime);
        }

        function padding_left(s, c, n) {

            if (!s || !c || s.toString().length >= n) {
                return s;
            }
            const max = (n - s.toString().length) / c.toString().length;
            for (let i = 0; i < max; i++) {
                s = c + s;
            }
            return s;
        }

        function buscarInformacionFE(record_transaccion, resultadoIndividual, columns, tipoMensajeError, esOneWorld, codTipoIntegracion, configuracionFE) {

            const proceso = 'buscarInformacionFE';

            // D3 - antes se asignaban sin declarar (fuga al scope global).
            let columnaAcumIndFacturacionDescRec;
            let porcentajeParaAplicar;
            let infoPercepcion;
            let informacionLinea;
            let informacionSubTotal;
            let infoRetencion;
            let costoEnvio;
            let CostoManipulacion;

            var objetoRespuesta = { error: false, mensaje: '', datos: [] };

            try {
                let idTransaccion = "";

                // Busco la informacion de la Transaccion
                var currentScript = runtime.getCurrentScript();
                const unidadesDisponibles = currentScript.getRemainingUsage();

                let errorEncontrado = false;
                let mensajeError = "";

                idTransaccion = resultadoIndividual.getValue({ name: columns[0] });
                const tipoTransaccion = resultadoIndividual.getValue({ name: columns[3] });
                const sucursal = resultadoIndividual.getValue({ name: columns[5] });
                const idTipoTransaccionURU = resultadoIndividual.getValue({ name: columns[8] });
                const serie = resultadoIndividual.getValue({ name: columns[4] });
                const esNotaDebitoNS = resultadoIndividual.getValue({ name: columns[6] });
                const numeroTransaccion = resultadoIndividual.getValue({ name: columns[0] });
                const nombreSucursalDGI = resultadoIndividual.getValue({ name: columns[58] });
                const codigoSucursalDGI = resultadoIndividual.getValue({ name: columns[59] });
                const esETicketNS = resultadoIndividual.getValue({ name: columns[64] });
                let esNotaDebito = false;
                let datosDireccion = '';

                // log.debug(proceso, 'esNotaDebitoNS: ' + esNotaDebitoNS + ' - esETicketNS: ' + esETicketNS);
                if (!utilities.isEmpty(esNotaDebitoNS) && (esNotaDebitoNS == 'T' || esNotaDebitoNS == true)) {
                    esNotaDebito = true;
                }

                let esETicket = false;

                if (!utilities.isEmpty(esETicketNS) && (esETicketNS == 'T' || esETicketNS == true)) {
                    esETicket = true;
                }

                var objetoRespuesta = {};
                objetoRespuesta.error = false;
                objetoRespuesta.mensaje = "";
                objetoRespuesta.tipo = "FMSJ-1";
                objetoRespuesta.cantidadRegistros = 1;

                objetoRespuesta.idRegistro = idTransaccion;
                objetoRespuesta.tipoComprobanteNS = tipoTransaccion;
                objetoRespuesta.tipoComprobanteURU = idTipoTransaccionURU;
                objetoRespuesta.serie = serie;
                objetoRespuesta.sucursal = sucursal;
                objetoRespuesta.numero = numeroTransaccion;
                objetoRespuesta.esND = esNotaDebito;
                objetoRespuesta.esETicket = esETicket;
                objetoRespuesta.tipoComprobanteMsg = nvl(resultadoIndividual.getText({ name: columns[45] }), '');

                objetoRespuesta.nombreSucursalDGI = nvl(nombreSucursalDGI, '');
                objetoRespuesta.codigoSucursalDGI = nvl(codigoSucursalDGI, 0);

                objetoRespuesta.informacionAdicional = {};
                objetoRespuesta.informacionEncabezado = {};
                objetoRespuesta.informacionCliente = {};
                objetoRespuesta.informacionTotalesEncabezado = {};
                objetoRespuesta.informacionAdenda = {};
                objetoRespuesta.detalleLineas = [];
                objetoRespuesta.detalleSubtotales = [];
                objetoRespuesta.detalleDescyRecGlobal = [];
                objetoRespuesta.detalleFormaPago = [];
                objetoRespuesta.detalleReferencia = [];
                objetoRespuesta.detalleTotalesPercyRet = [];
                objetoRespuesta.detalleMetodosPago = [];

                //Obtener Metodos de Pago
                const metodosPago = getMetodosPago(record_transaccion);
                log.debug(proceso, 'getMetodosPago RESPONSE: ' + JSON.stringify(metodosPago));
                if (!metodosPago.error) {
                    objetoRespuesta.detalleMetodosPago = metodosPago.data;
                }

                // Obtener Informacion Adenda
                objetoRespuesta.informacionAdenda.textoAdenda = nvl(resultadoIndividual.getValue({ name: columns[63] }), '');
                objetoRespuesta.informacionAdenda.otroAdenda = '';

                // Obtener Fecha de la Transaccion
                const fechaTransaccion = nvl(resultadoIndividual.getValue({ name: columns[1] }), '');
                const entityid = record_transaccion.getValue({ fieldId: 'entity' });
                const nc_vinculada = resultadoIndividual.getValue({ name: columns[65] });
                const entityIdResguardo = record_transaccion.getValue({ fieldId: 'custbody_l598_resguardo_proveedor' });
                const indicadorMontosBrutosUCFE = resultadoIndividual.getValue({ name: columns[66] });

                objetoRespuesta.informacionAdicional.rucEmisor = configuracionFE.rucEmisor;
                objetoRespuesta.informacionAdicional.razonSocialEmisor = configuracionFE.razonSocialEmisor;
                objetoRespuesta.informacionAdicional.nombreComercial = configuracionFE.nombreComercial;
                objetoRespuesta.informacionAdicional.correoElectronico = configuracionFE.correoElectronico;
                objetoRespuesta.informacionAdicional.domicilioFiscalEmisor = configuracionFE.domicilioFiscalEmisor;
                objetoRespuesta.informacionAdicional.ciudadEmisor = configuracionFE.ciudadEmisor;
                objetoRespuesta.informacionAdicional.departamento = configuracionFE.departamento;
                objetoRespuesta.informacionAdicional.softwareFacturador = configuracionFE.softwareFacturador;
                objetoRespuesta.informacionAdicional.versionSoftwareFacturador = configuracionFE.versionSoftwareFacturador;
                objetoRespuesta.informacionAdicional.empresaRUC = configuracionFE.empresaRUC;
                objetoRespuesta.informacionAdicional.tipoNegocio = configuracionFE.tipoNegocio;

                //INICIO - Manejo para extraer el tipo de integracion
                let subsidiaria = "";
                const codIntegracion = codTipoIntegracion;
                if (esOneWorld) {
                    subsidiaria = record_transaccion.getValue({ fieldId: 'subsidiary' });
                    if (utilities.isEmpty(subsidiaria))
                        subsidiaria = "";
                }

                objetoRespuesta.codIntegracion = codIntegracion;

                if (!utilities.isEmpty(fechaTransaccion)) {

                    objetoRespuesta.fechaComprobante = fechaTransaccion; // Formato yyyyMMdd (Necesario para Ordenamiento)

                    objetoRespuesta.informacionAdicional.documentoTipo = nvl(resultadoIndividual.getValue({ name: columns[8] }), '');
                    objetoRespuesta.informacionAdicional.documentoSerie = nvl(resultadoIndividual.getValue({ name: columns[4] }), '');
                    objetoRespuesta.informacionAdicional.documentoNro = nvl(resultadoIndividual.getValue({ name: columns[0] }), 0);
                    objetoRespuesta.informacionAdicional.transaccionNro = objetoRespuesta.informacionAdicional.documentoNro;

                    objetoRespuesta.informacionAdicional.cajaNro = nvl(resultadoIndividual.getValue({ name: columns[60] }), 0);
                    objetoRespuesta.informacionAdicional.cajeroNombre = nvl(resultadoIndividual.getValue({ name: columns[61] }), '');
                    objetoRespuesta.informacionAdicional.cajeroNro = nvl(resultadoIndividual.getValue({ name: columns[62] }), 0);
                    objetoRespuesta.informacionAdicional.sucursalNro = nvl(sucursal, 0);

                    // log.debug(proceso, 'objetoRespuesta: ' + JSON.stringify(objetoRespuesta));
                    // log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                    // INICIO - Obtener Informacion del Cliente
                    if (!utilities.isEmpty(resultadoIndividual.getValue({ name: columns[65] })) && !utilities.isEmpty(resultadoIndividual.getValue({ name: columns[3] })) && (resultadoIndividual.getValue({ name: columns[3] }) == 'customtransaction_l598_anul_resguardo') && !utilities.isEmpty(nc_vinculada)) {
                        objetoRespuesta.informacionAdicional.clienteNumero = nvl(resultadoIndividual.getValue({ name: columns[9] }), 0);
                        objetoRespuesta.informacionAdicional.clienteDocumento = nvl(resultadoIndividual.getValue({ name: columns[10] }), '');
                        objetoRespuesta.informacionAdicional.clienteRazonSocial = nvl(resultadoIndividual.getValue({ name: columns[11] }), '');
                        objetoRespuesta.informacionAdicional.clienteNombre = nvl(resultadoIndividual.getValue({ name: columns[12] }), '');
                        objetoRespuesta.informacionAdicional.clienteDireccion = record_transaccion.getValue({ fieldId: 'billaddr1' });

                        ///// DUDA: Verificar funcionamiento correcto de este lookupField

                        datosDireccion = search.lookupFields({
                            type: 'vendorcredit',
                            id: nc_vinculada,
                            columns: ['billingaddress.country', 'billingaddress.city', 'billingaddress.zip']
                        });

                        objetoRespuesta.informacionAdicional.clientePais = datosDireccion.billingaddress.country;
                        // log.debug(proceso, 'datosDireccion: ' + JSON.stringify(datosDireccion) + ' - objetoRespuesta: ' + JSON.stringify(objetoRespuesta));

                    } else {
                        if (resultadoIndividual.getValue({ name: columns[3] }) == 'customtransaction_l598_resguardos' && !utilities.isEmpty(entityIdResguardo)) {
                            objetoRespuesta.informacionAdicional.clienteNumero = nvl(resultadoIndividual.getValue({ name: columns[9] }), 0);
                            objetoRespuesta.informacionAdicional.clienteDocumento = nvl(resultadoIndividual.getValue({ name: columns[10] }), '');
                            objetoRespuesta.informacionAdicional.clienteRazonSocial = nvl(resultadoIndividual.getValue({ name: columns[11] }), '');
                            objetoRespuesta.informacionAdicional.clienteNombre = nvl(resultadoIndividual.getValue({ name: columns[12] }), '');
                            objetoRespuesta.informacionAdicional.clienteDireccion = record_transaccion.getValue({ fieldId: 'custbody_l598_resguardo_direccion_prov' });
                            objetoRespuesta.informacionAdicional.clienteTelefono = nvl(resultadoIndividual.getValue({ name: columns[14] }), '');
                            objetoRespuesta.informacionAdicional.clienteEmail = nvl(resultadoIndividual.getValue({ name: columns[15] }), '');
                            objetoRespuesta.informacionAdicional.clientePais = nvl(resultadoIndividual.getValue({ name: columns[16] }), '');
                        } else {
                            objetoRespuesta.informacionAdicional.clienteNumero = nvl(resultadoIndividual.getValue({ name: columns[9] }), 0);
                            objetoRespuesta.informacionAdicional.clienteDocumento = nvl(resultadoIndividual.getValue({ name: columns[10] }), '');
                            objetoRespuesta.informacionAdicional.clienteRazonSocial = nvl(resultadoIndividual.getValue({ name: columns[11] }), '');
                            objetoRespuesta.informacionAdicional.clienteNombre = nvl(resultadoIndividual.getValue({ name: columns[12] }), '');
                            objetoRespuesta.informacionAdicional.clienteDireccion = nvl(resultadoIndividual.getValue({ name: columns[13] }), '');
                            objetoRespuesta.informacionAdicional.clienteTelefono = nvl(resultadoIndividual.getValue({ name: columns[14] }), '');
                            objetoRespuesta.informacionAdicional.clienteEmail = nvl(resultadoIndividual.getValue({ name: columns[15] }), '');
                            objetoRespuesta.informacionAdicional.clientePais = nvl(resultadoIndividual.getValue({ name: columns[16] }), '');
                        }
                    }
                    // FIN - Obtener Informacion del Cliente

                    // INICIO - Obtener Informacion del Vendedor
                    objetoRespuesta.informacionAdicional.vendedorNumero = nvl(resultadoIndividual.getValue({ name: columns[17] }), 0);
                    objetoRespuesta.informacionAdicional.vendedorNombre = nvl(resultadoIndividual.getValue({ name: columns[18] }), '');
                    // FIN - Obtener Informacion del Vendedor

                    objetoRespuesta.informacionAdicional.valorUnidadIndexada = nvl(resultadoIndividual.getValue({ name: columns[19] }), 0);

                    // Se verifica si el nro de documento es entero
                    const nroDocumentoAux = objetoRespuesta.informacionAdicional.clienteDocumento;

                    let esNroDocValido = false;
                    if (!utilities.isEmpty(nroDocumentoAux)) {
                        esNroDocValido = validarSiNumero(nroDocumentoAux);
                    }


                    // INICIO - INFORMACION DE ENCABEZADO

                    objetoRespuesta.informacionEncabezado.tipoCFE = nvl(resultadoIndividual.getValue({ name: columns[8] }), '');
                    objetoRespuesta.informacionEncabezado.fechaComprobante = nvl(fechaTransaccion, '');

                    objetoRespuesta.informacionEncabezado.tipoTraslado = nvl(resultadoIndividual.getValue({ name: columns[20] }), '');
                    objetoRespuesta.informacionEncabezado.periodoDesde = nvl(resultadoIndividual.getValue({ name: columns[21] }), '');
                    objetoRespuesta.informacionEncabezado.periodoHasta = nvl(resultadoIndividual.getValue({ name: columns[22] }), '');

                    objetoRespuesta.informacionEncabezado.indicadorMontosBrutos = nvl(resultadoIndividual.getValue({ name: columns[23] }), 0);
                    // objetoRespuesta.informacionEncabezado.indicadorMontosBrutosUCFE = nvl(resultadoIndividual.getValue({ name: columns[66] }), 1);
                    objetoRespuesta.informacionEncabezado.indicadorMontosBrutosUCFE = "";

                    objetoRespuesta.informacionEncabezado.formaPago = nvl(resultadoIndividual.getValue({ name: columns[24] }), '');

                    if (resultadoIndividual.getValue({ name: columns[3] }) == 'customtransaction_l598_resguardos') {
                        objetoRespuesta.informacionEncabezado.formaPago = 0;
                    }

                    objetoRespuesta.informacionEncabezado.nroCompraOrden = nvl(resultadoIndividual.getValue({ name: columns[85] }), '');
                  
                    objetoRespuesta.informacionEncabezado.fechaVencimiento = nvl(resultadoIndividual.getValue({ name: columns[25] }), '');

                    let esComprobanteExportacion = false;
                    const comprobanteExportacion = nvl(resultadoIndividual.getValue({ name: columns[26] }), '');
                    // log.debug(proceso, 'comprobanteExportacion: ' + comprobanteExportacion);
                    if (!utilities.isEmpty(comprobanteExportacion) && (comprobanteExportacion == 'T' || comprobanteExportacion == true)) {
                        esComprobanteExportacion = true;
                    }

                    objetoRespuesta.informacionEncabezado.clausulaDeVenta = nvl(resultadoIndividual.getValue({ name: columns[27] }), '');
                    objetoRespuesta.informacionEncabezado.modalidadDeVenta = nvl(resultadoIndividual.getValue({ name: columns[28] }), '');
                    objetoRespuesta.informacionEncabezado.viaDeTransporte = nvl(resultadoIndividual.getValue({ name: columns[29] }), '');
                    // FIN - INFORMACION DE ENCABEZADO

                    // log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                    // Inicialización de objeto de informacion cliente
                    objetoRespuesta.informacionCliente.clienteTipoDocumento = "";
                    objetoRespuesta.informacionCliente.clienteCodigoPais = "";
                    objetoRespuesta.informacionCliente.clienteNumeroDoc = "";
                    objetoRespuesta.informacionCliente.clienteNumeroDocUruguayo = "";
                    objetoRespuesta.informacionCliente.clienteNumeroDocExtranjero = "";
                    objetoRespuesta.informacionCliente.clienteNombre = "";
                    objetoRespuesta.informacionCliente.clienteDireccion = "";
                    objetoRespuesta.informacionCliente.clienteCiudad = "";
                    objetoRespuesta.informacionCliente.clientePais = "";
                    objetoRespuesta.informacionCliente.clienteProvincia = "";
                    //objetoRespuesta.informacionCliente.clienteCodigoPostal = "";
                    objetoRespuesta.informacionCliente.clienteLugarEntrega = "";
                    objetoRespuesta.informacionCliente.clienteNroIdentificacionCompra = "";

                    if (esComprobanteExportacion != true || ((esComprobanteExportacion == true) && (!utilities.isEmpty(objetoRespuesta.informacionEncabezado.clausulaDeVenta) &&
                        !utilities.isEmpty(objetoRespuesta.informacionEncabezado.modalidadDeVenta) && objetoRespuesta.informacionEncabezado.modalidadDeVenta != 0 && !utilities.isEmpty(objetoRespuesta.informacionEncabezado.viaDeTransporte) && objetoRespuesta.informacionEncabezado.viaDeTransporte != 0))) {

                        // log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                        // INICIO - Informacion RECEPTOR
                        // if (!utilities.isEmpty(resultadoIndividual.getValue({ name: columns[65] })) && !utilities.isEmpty(resultadoIndividual.getValue({ name: columns[3] })) && (resultadoIndividual.getValue({ name: columns[3] }) == 'customtransaction_l598_anul_resguardo') && !utilities.isEmpty(resultadoIndividual.getValue({ name: columns[66] }))) {
                        if (!utilities.isEmpty(resultadoIndividual.getValue({ name: columns[65] })) && !utilities.isEmpty(resultadoIndividual.getValue({ name: columns[3] })) && (resultadoIndividual.getValue({ name: columns[3] }) == 'customtransaction_l598_anul_resguardo')) {

                            /// DUDA: Consultar si esto no se puede cambiar por un campo de contenido de transacción que lea el campo de codigo tipo documento y se asigne acá.
                            const informacionCliente = search.lookupFields({
                                type: 'entity',
                                id: entityid,
                                columns: ['custentity_l598_tipo_documento']
                            });

                            // log.debug(proceso, 'informacionCliente: ' + JSON.stringify(informacionCliente));

                            if (!utilities.isEmpty(informacionCliente)) {
                                const informacionTipoDocumento = search.lookupFields({
                                    type: 'customrecord_l598_tipos_documentos',
                                    id: informacionCliente.custbody_l598_tipo_comprobante[0].value,
                                    columns: ['custrecord_l598_tipos_documentos_codigo']
                                })

                                // log.debug(proceso, 'informacionTipoDocumento: ' + JSON.stringify(informacionTipoDocumento));

                                objetoRespuesta.informacionCliente.clienteTipoDocumento = informacionTipoDocumento.custrecord_l598_tipos_documentos_codigo;
                            }
                        } else {
                            objetoRespuesta.informacionCliente.clienteTipoDocumento = nvl(resultadoIndividual.getValue({ name: columns[30] }), '');
                        }

                        // log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                        if ((esETicket == true) || (esETicket == false && !utilities.isEmpty(objetoRespuesta.informacionCliente.clienteTipoDocumento))) {

                            objetoRespuesta.informacionCliente.clienteCodigoPais = nvl(resultadoIndividual.getValue({ name: columns[31] }), '');

                            if ((esETicket == true) || !utilities.isEmpty(objetoRespuesta.informacionCliente.clienteCodigoPais) || resultadoIndividual.getValue({ name: columns[3] }) == 'customtransaction_l598_resguardos' || codIntegracion == 'SIGE') {

                                objetoRespuesta.informacionCliente.clienteNumeroDoc = nvl(resultadoIndividual.getValue({ name: columns[32] }), '');
                                objetoRespuesta.informacionCliente.clienteNumeroDocUruguayo = '';
                                objetoRespuesta.informacionCliente.clienteNumeroDocExtranjero = '';

                                if ((objetoRespuesta.informacionCliente.clienteTipoDocumento == 2 || objetoRespuesta.informacionCliente.clienteTipoDocumento == 3 || objetoRespuesta.informacionCliente.clienteTipoDocumento == 4)) {
                                    if (objetoRespuesta.informacionCliente.clienteTipoDocumento == 4) {
                                        objetoRespuesta.informacionCliente.clienteNumeroDocExtranjero = objetoRespuesta.informacionCliente.clienteNumeroDoc;
                                        objetoRespuesta.informacionCliente.clienteNumeroDocUruguayo = objetoRespuesta.informacionCliente.clienteNumeroDoc; 
                                    }
                                    if (objetoRespuesta.informacionCliente.clienteTipoDocumento != 4) {
                                        if (esNroDocValido) {
                                            objetoRespuesta.informacionCliente.clienteNumeroDocUruguayo = objetoRespuesta.informacionCliente.clienteNumeroDoc;
                                        } else {
                                            // Error en el Nro de Documento
                                            var mensaje = "El numero de documento del cliente en la transaccion contiene caracteres no numericos - ID Transaccion : " + idTransaccion;
                                            objetoRespuesta.error = true;
                                            objetoRespuesta.tipo = tipoMensajeError;
                                            objetoRespuesta.mensaje = mensaje;
                                            log.error('URU - Factura Electronica', mensaje);
                                        }
                                    }
                                } else {
                                    objetoRespuesta.informacionCliente.clienteNumeroDocExtranjero = objetoRespuesta.informacionCliente.clienteNumeroDoc;
                                }

                                log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                if (!utilities.isEmpty(resultadoIndividual.getValue({ name: columns[65] })) && !utilities.isEmpty(resultadoIndividual.getValue({ name: columns[3] })) && (resultadoIndividual.getValue({ name: columns[3] }) == 'customtransaction_l598_anul_resguardo') && !utilities.isEmpty(entityid)) {
                                    objetoRespuesta.informacionCliente.clienteNombre = nvl(resultadoIndividual.getValue({ name: columns[33] }), '');
                                    objetoRespuesta.informacionCliente.clienteDireccion = record_transaccion.getValue({ fieldId: 'billaddr1' });



                                } else {
                                    if (resultadoIndividual.getValue({ name: columns[3] }) == 'customtransaction_l598_resguardos' && !utilities.isEmpty(entityIdResguardo)) {
                                        objetoRespuesta.informacionCliente.clienteNombre = nvl(resultadoIndividual.getValue({ name: columns[33] }), '');
                                        objetoRespuesta.informacionCliente.clienteDireccion = record_transaccion.getValue({ fieldId: 'custbody_l598_resguardo_direccion_prov' });
                                        objetoRespuesta.informacionCliente.clienteCiudad = record_transaccion.getValue({ fieldId: 'custbody_l598_resguardo_ciudad' });
                                        objetoRespuesta.informacionCliente.clientePais = record_transaccion.getValue({ fieldId: 'custbody_l598_resguardo_pais' });
                                        objetoRespuesta.informacionCliente.clienteCodigoPostal = record_transaccion.getValue({ fieldId: 'custbody_l598_resguardo_cod_postal' });
                                    } else {
                                        objetoRespuesta.informacionCliente.clienteNombre = nvl(resultadoIndividual.getValue({ name: columns[33] }), '');
                                        objetoRespuesta.informacionCliente.clienteDireccion = nvl(resultadoIndividual.getValue({ name: columns[34] }), '');
                                        objetoRespuesta.informacionCliente.clienteCiudad = nvl(resultadoIndividual.getValue({ name: columns[35] }), '');
                                        objetoRespuesta.informacionCliente.clientePais = nvl(resultadoIndividual.getValue({ name: columns[37] }), '');
                                        objetoRespuesta.informacionCliente.clienteCodigoPostal = nvl(resultadoIndividual.getValue({ name: columns[38] }), '0');

                                        if (tipoTransaccion == 'customerpayment' || tipoTransaccion == 'customerdeposit' || tipoTransaccion == 'customerrefund') {
                                            // Handle Customer Payments
                                            objetoRespuesta.informacionCliente.clienteDireccion = nvl(resultadoIndividual.getValue({ name: columns[78] }), '');
                                            objetoRespuesta.informacionCliente.clienteCiudad = nvl(resultadoIndividual.getValue({ name: columns[75] }), '');
                                            objetoRespuesta.informacionCliente.clienteProvincia = nvl(resultadoIndividual.getValue({ name: columns[75] }), '');
                                            objetoRespuesta.informacionCliente.clientePais = nvl(resultadoIndividual.getValue({ name: columns[79] }), '');
                                            objetoRespuesta.informacionCliente.clienteCodigoPostal = nvl(resultadoIndividual.getValue({ name: columns[77] }), '');
                                        }

                                        if (tipoTransaccion == 'customtransaction_l598_anulacion_cobranz') {
                                            // Handle Customer Payments Anulacion
                                            objetoRespuesta.informacionCliente.clienteDireccion = nvl(resultadoIndividual.getValue({ name: columns[83] }), '');
                                            objetoRespuesta.informacionCliente.clienteCiudad = nvl(resultadoIndividual.getValue({ name: columns[80] }), '');
                                            objetoRespuesta.informacionCliente.clienteProvincia = nvl(resultadoIndividual.getValue({ name: columns[80] }), '');
                                            objetoRespuesta.informacionCliente.clientePais = nvl(resultadoIndividual.getValue({ name: columns[84] }), '');
                                            objetoRespuesta.informacionCliente.clienteCodigoPostal = nvl(resultadoIndividual.getValue({ name: columns[82] }), '');
                                        }
                                    }
                                }

                                if (!utilities.isEmpty(objetoRespuesta.informacionCliente.clienteCodigoPostal).toString()) {
                                    const clienteCodigoPostal = (objetoRespuesta.informacionCliente.clienteCodigoPostal).toString();
                                    let clienteCodigoPostalAUX = '';
                                    const expRegNumeros = /[^0-9]/gi;
                                    clienteCodigoPostalAUX = clienteCodigoPostal.replace(expRegNumeros, '').toString();

                                    if (clienteCodigoPostalAUX.length > 5) {
                                        clienteCodigoPostalAUX = '0';
                                        objetoRespuesta.informacionCliente.clienteCodigoPostal = clienteCodigoPostalAUX;
                                    } else {
                                        objetoRespuesta.informacionCliente.clienteCodigoPostal = clienteCodigoPostalAUX;
                                    }
                                } else {
                                    objetoRespuesta.informacionCliente.clienteCodigoPostal = '0';
                                }

                                if (tipoTransaccion != 'customerpayment' && tipoTransaccion != 'customerdeposit' && tipoTransaccion != 'customerrefund' && tipoTransaccion != 'customtransaction_l598_anulacion_cobranz') {
                                    objetoRespuesta.informacionCliente.clienteProvincia = nvl(resultadoIndividual.getValue({ name: columns[36] }), '');
                                }
                                objetoRespuesta.informacionCliente.clienteLugarEntrega = nvl(resultadoIndividual.getValue({ name: columns[39] }), '');
                                objetoRespuesta.informacionCliente.clienteNroIdentificacionCompra = nvl(resultadoIndividual.getValue({ name: columns[40] }), '');

                                if (resultadoIndividual.getValue({ name: columns[3] }) == 'customerpayment' && utilities.isEmpty(objetoRespuesta.informacionCliente.clienteProvincia)) {
                                    objetoRespuesta.informacionCliente.clienteProvincia = nvl(resultadoIndividual.getValue({ name: columns[75] }), '');
                                }

                                // FIN - Informacion RECEPTOR
                                //Reformat Ciudad
                                objetoRespuesta.informacionCliente.clienteDireccion = objetoRespuesta.informacionCliente.clienteDireccion.substring(0, 70);
                                objetoRespuesta.informacionAdicional.clienteDireccion = objetoRespuesta.informacionAdicional.clienteDireccion.substring(0, 70);

                                if (((esETicket == true) || (esETicket == false && (!utilities.isEmpty(objetoRespuesta.informacionCliente.clienteNombre) && !utilities.isEmpty(objetoRespuesta.informacionCliente.clienteDireccion) &&
                                    !utilities.isEmpty(objetoRespuesta.informacionCliente.clienteCiudad)))) && (esComprobanteExportacion == false ||
                                        ((esComprobanteExportacion == true) && (!utilities.isEmpty(objetoRespuesta.informacionCliente.clienteProvincia) &&
                                            !utilities.isEmpty(objetoRespuesta.informacionCliente.clientePais))))) {

                                    // INICIO - Totales Encabecado

                                    objetoRespuesta.informacionTotalesEncabezado.cantidadLineas = 0;
                                    objetoRespuesta.informacionTotalesEncabezado.monedaTransaccion = nvl(resultadoIndividual.getValue({ name: columns[41] }), '');

                                    if (!utilities.isEmpty(objetoRespuesta.informacionTotalesEncabezado.monedaTransaccion)) {
                                        if (isNaN(objetoRespuesta.informacionTotalesEncabezado.monedaTransaccion)) {
                                            codigoMonedaTransaccion = objetoRespuesta.informacionTotalesEncabezado.monedaTransaccion;
                                        } else {
                                            codigoMonedaTransaccion = resultadoIndividual.getValue({ name: columns[69] });
                                        }
                                    }

                                    // log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                    if (!utilities.isEmpty(codigoMonedaTransaccion)) {

                                        objetoRespuesta.informacionTotalesEncabezado.codigoMonedaTransaccion = codigoMonedaTransaccion;

                                        // Obtener Tipo de Cambio
                                        objetoRespuesta.informacionTotalesEncabezado.tipoCambio = nvl(resultadoIndividual.getValue({ name: columns[42] }), '');

                                        if (!utilities.isEmpty(objetoRespuesta.informacionTotalesEncabezado.tipoCambio) && !isNaN(objetoRespuesta.informacionTotalesEncabezado.tipoCambio)) {

                                            // Obtener Porcentaje Tasa Minima y Tasa Basica
                                            const tasaMinimaIVA = nvl(resultadoIndividual.getValue({ name: columns[43] }), 0);
                                            const tasaBasicaIVA = nvl(resultadoIndividual.getValue({ name: columns[44] }), 0);

                                            if (!utilities.isEmpty(tasaMinimaIVA) && !utilities.isEmpty(tasaBasicaIVA)) {

                                                const total = record_transaccion.getValue({ fieldId: 'total' });
                                                const subTotal = record_transaccion.getValue({ fieldId: 'subtotal' });
                                                var importeImpuestos = record_transaccion.getValue({ fieldId: 'taxtotal' });
                                                //var tipoCambio = utilities.isEmpty(record_transaccion.getValue({ fieldId: 'exchangerate'));
                                                //var tipoCambio = parseFloat(objetoRespuesta.informacionTotalesEncabezado.tipoCambio,10);
                                                let descuentoTotal = utilities.isEmpty(record_transaccion.getValue({ fieldId: 'discounttotal' })) ? 0 : record_transaccion.getValue({ fieldId: 'discounttotal' });

                                                if (utilities.isEmpty(descuentoTotal) || isNaN(descuentoTotal)) {
                                                    descuentoTotal = 0;
                                                }

                                                const porcentajeDescuento = utilities.isEmpty(record_transaccion.getValue({ fieldId: 'discountrate' })) ? 0 : record_transaccion.getValue({ fieldId: 'discountrate' });
                                                var importeImpuestos = 0;
                                                const importeNoGravado = 0;
                                                const importeRetenciones = 0;
                                                const importePercepciones = 0;
                                                let importeExento = 0;
                                                let importeExpYAsimiladas = 0;
                                                let importeNoFacturable = 0;

                                                let importeIVASuspenso = 0;
                                                let importeIVATasaMinima = 0;
                                                let importeIVATasaBasica = 0;
                                                let importeIVAOtraTasa = 0;

                                                let importeNetoGravadoIVASuspenso = 0;
                                                let importeNetoGravadoTasaMinima = 0;
                                                let importeNetoGravadoTasaBasica = 0;
                                                let importeNetoGravadoOtraTasa = 0;

                                                let importeRetenidoPercibido = 0;
                                                let importeCreditosFiscales = 0;

                                                let infoPercepcionyRetencion = null;

                                                /*var factorDescuento = 1;

                                                if (descuentoTotal != null && !utilities.isEmpty(descuentoTotal) && !isNaN(descuentoTotal) && parseFloat(descuentoTotal, 10) < 0) {
                                                factorDescuento = parseFloat((parseFloat(1, 10) - (parseFloat(Math.abs(descuentoTotal), 10) / parseFloat(Math.abs(subTotal)))), 10);
                                                }*/

                                                // INICIO INFORMACION DESCUENTO/RECARGO GLOBAL
                                                const importeDescuento = parseFloat((parseFloat(Math.abs(descuentoTotal))));
                                                // log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                                if (!utilities.isEmpty(importeDescuento) && !isNaN(importeDescuento) && parseFloat(importeDescuento) > 0) {

                                                    var infoDescRecGlobal = {};
                                                    infoDescRecGlobal.valor = toFixedOK(parseFloat(importeDescuento), 2);
                                                    infoDescRecGlobal.tipoMovimiento = nvl(resultadoIndividual.getValue({ name: columns[51] }), '');
                                                    infoDescRecGlobal.tipoDescRec = nvl(resultadoIndividual.getValue({ name: columns[52] }), '');
                                                    infoDescRecGlobal.codigo = nvl(resultadoIndividual.getValue({ name: columns[53] }), '');
                                                    infoDescRecGlobal.glosa = nvl(resultadoIndividual.getValue({ name: columns[54] }), '');
                                                    infoDescRecGlobal.indicadorFacturacion = nvl(resultadoIndividual.getValue({ name: columns[55] }), '');

                                                    // log.debug(proceso, 'infoDescRecGlobal: ' + JSON.stringify(infoDescRecGlobal));

                                                    columnaAcumIndFacturacionDescRec = nvl(resultadoIndividual.getValue({ name: columns[56] }), '');


                                                    // log.debug(proceso, 'columnaAcumIndFacturacionDescRec: ' + columnaAcumIndFacturacionDescRec);

                                                    if (!utilities.isEmpty(columnaAcumIndFacturacionDescRec)) {

                                                        porcentajeParaAplicar = '';

                                                        if (!utilities.isEmpty(porcentajeDescuento) && porcentajeDescuento.length > 0 && porcentajeDescuento.search('%') != -1)
                                                            porcentajeParaAplicar = porcentajeDescuento.substring(0, porcentajeDescuento.length - 1);

                                                        // log.debug(proceso, 'porcentajeParaAplicar: ' + porcentajeParaAplicar);

                                                        if (!utilities.isEmpty(porcentajeParaAplicar) && !isNaN(parseFloat(porcentajeParaAplicar)) && parseFloat(porcentajeParaAplicar) != 0.00) {

                                                            const porcentajeParaAplicarDecimal = Math.abs(parseFloat(porcentajeParaAplicar) / 100);

                                                            // log.debug(proceso, 'porcentajeParaAplicarDecimal: ' + porcentajeParaAplicarDecimal);

                                                            if (!utilities.isEmpty(porcentajeParaAplicarDecimal)) {

                                                                switch (parseInt(columnaAcumIndFacturacionDescRec, 10)) {

                                                                    case 1:
                                                                        // Extento IVA
                                                                        //abrito 28-05-2019. Nota: Se comenta ya que cuando es un descuento por porcentaje Netsuite se encarga de hacer los calculos y de aplicar el descuento como un monto, por lo cual no es necesario lo que esta abajo
                                                                        //importeExento = parseFloat((parseFloat(importeExento, 10) + parseFloat((descuentoTotal), 10)), 10);
                                                                        break;
                                                                    case 2:
                                                                        // IVA TASA Minima
                                                                        //abrito 16-06-2018. Nota: Se comenta ya que cuando es un descuento por porcentaje Netsuite se encarga de hacer los calculos y de aplicar el descuento como un monto, por lo cual no es necesario lo que esta abajo
                                                                        /*importeIVATasaMinima = parseFloat(parseFloat(importeIVATasaMinima, 10) + parseFloat(descuentoTotal * porcentajeParaAplicarDecimal), 10);
                                                                        importeNetoGravadoTasaMinima = parseFloat((parseFloat(importeNetoGravadoTasaMinima, 10) + parseFloat((descuentoTotal), 10)), 10);*/
                                                                        break;
                                                                    case 3:
                                                                        // IVA TASA Basica
                                                                        //abrito 16-06-2018. Nota: Se comenta ya que cuando es un descuento por porcentaje Netsuite se encarga de hacer los calculos y de aplicar el descuento como un monto, por lo cual no es necesario lo que esta abajo
                                                                        /*importeIVATasaBasica = parseFloat(parseFloat(importeIVATasaBasica, 10) + parseFloat(descuentoTotal * porcentajeParaAplicarDecimal), 10);
                                                                        importeNetoGravadoTasaBasica = parseFloat((parseFloat(importeNetoGravadoTasaBasica, 10) + parseFloat((descuentoTotal), 10)), 10);*/
                                                                        break;
                                                                    case 4:
                                                                        // Otra Tasa
                                                                        //abrito 28-05-2019. Nota: Se comenta ya que cuando es un descuento por porcentaje Netsuite se encarga de hacer los calculos y de aplicar el descuento como un monto, por lo cual no es necesario lo que esta abajo
                                                                        //importeIVAOtraTasa = parseFloat(parseFloat(importeIVAOtraTasa, 10) + parseFloat(descuentoTotal * porcentajeParaAplicarDecimal), 10);
                                                                        //importeNetoGravadoOtraTasa = parseFloat((parseFloat(importeNetoGravadoOtraTasa, 10) + parseFloat((descuentoTotal), 10)), 10);
                                                                        break;
                                                                    case 5:
                                                                        // Entrega Gratuita
                                                                        break;
                                                                    case 6:
                                                                        // No Facturable
                                                                        //importeNoFacturable = parseFloat(parseFloat(importeNoFacturable, 10) + parseFloat(descuentoTotal), 10);
                                                                        break;
                                                                    case 7:
                                                                        // No Facturable Negativo
                                                                        //importeNoFacturable = parseFloat((parseFloat(importeNoFacturable, 10) + parseFloat((descuentoTotal), 10)*-1), 10);
                                                                        break;
                                                                    case 8:
                                                                        // Item A Rebajar en Remito
                                                                        break;
                                                                    case 9:
                                                                        // Item A Rebajar en Resguardo
                                                                        break;
                                                                    case 10:
                                                                        // Exportacion Y Asimiladas
                                                                        //abrito 28-05-2019. Nota: Se comenta ya que cuando es un descuento por porcentaje Netsuite se encarga de hacer los calculos y de aplicar el descuento como un monto, por lo cual no es necesario lo que esta abajo
                                                                        //importeExpYAsimiladas = parseFloat((parseFloat(importeExpYAsimiladas, 10) + parseFloat((descuentoTotal), 10)), 10);
                                                                        break;
                                                                    case 11:
                                                                        // Impuesto Percibido
                                                                        //importePercepciones = parseFloat((parseFloat(importePercepciones, 10) + parseFloat(parseFloat((descuentoTotal), 10), 10)), 10);
                                                                        break;
                                                                    case 12:
                                                                        // IVA en Suspenso
                                                                        importeNetoGravadoIVASuspenso = parseFloat((parseFloat(importeNetoGravadoIVASuspenso) + parseFloat((descuentoTotal))));
                                                                        break;
                                                                    default:
                                                                        // Columna de Acumulacion Invalida
                                                                        errorEncontrado = true;
                                                                        mensajeError = "La Columna de Acumulación del Indicador de Facturación del Descuento/Recargo con Código: " + infoDescRecGlobal.indicadorFacturacion + " es Invalida";
                                                                        mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                }
                                                            }
                                                        }

                                                        if (errorEncontrado != true) {
                                                            if (!utilities.isEmpty(infoDescRecGlobal.tipoMovimiento) && !utilities.isEmpty(infoDescRecGlobal.tipoDescRec) && !utilities.isEmpty(infoDescRecGlobal.glosa) && !utilities.isEmpty(infoDescRecGlobal.indicadorFacturacion)) {
                                                                objetoRespuesta.detalleDescyRecGlobal.push(infoDescRecGlobal);
                                                            } else {
                                                                errorEncontrado = true;
                                                                mensajeError = "Falta la Siguiente Información Requerida del Descuento/Recargo Global: ";
                                                                if (utilities.isEmpty(infoDescRecGlobal.tipoMovimiento))
                                                                    mensajeError = mensajeError + "Tipo de Movimiento / ";
                                                                if (utilities.isEmpty(infoDescRecGlobal.tipoDescRec))
                                                                    mensajeError = mensajeError + "Tipo de Descuento/Recargo / ";
                                                                if (utilities.isEmpty(infoDescRecGlobal.glosa))
                                                                    mensajeError = mensajeError + "Descripción / ";
                                                                if (utilities.isEmpty(infoDescRecGlobal.indicadorFacturacion))
                                                                    mensajeError = mensajeError + "Indicador de Facturación / ";

                                                                mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                            }
                                                        }
                                                    } else {
                                                        errorEncontrado = true;
                                                        mensajeError = "Falta configurar la Columna de Acumulación del Indicador de Facturación del Descuento/Recargo";
                                                        mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                    }
                                                }
                                                // FIN INFORMACION DESCUENTO/RECARGO GLOBAL


                                                let cantidadLineas = 0;
                                                // log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());
                                                let configuracionLineasGastos = getConfigLineasGastos(subsidiaria);
                                                log.debug(proceso, 'configuracionLineasGastos: ' + JSON.stringify(configuracionLineasGastos));

                                                // INICIO - CONSIDERAR LINEAS DE TIEMPO/GASTOS
                                                const tipoSublistas = [];
                                                tipoSublistas.push('item');
                                                tipoSublistas.push('itemcost');
                                                tipoSublistas.push('expcost');
                                                tipoSublistas.push('time');
                                                let cantidadLineasAProcesar = 0;

                                                for (let countSubLists = 0; countSubLists < tipoSublistas.length; countSubLists++) {

                                                    const cantidadLineasAux = record_transaccion.getLineCount({ sublistId: tipoSublistas[countSubLists] });

                                                    if (!utilities.isEmpty(cantidadLineasAux) && cantidadLineasAux > 0) {
                                                        cantidadLineasAProcesar += cantidadLineasAux;
                                                    }
                                                }

                                                if ((esETicket && cantidadLineasAProcesar <= 700) || (!esETicket && cantidadLineasAProcesar <= 250)) {

                                                    // log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                                    let porcentajeImpuestoTasaMinima;
                                                    let porcentajeImpuestoTasaBasica;

                                                    //INICIO - Recorrido de los items
                                                    for (var subListaContador = 0; subListaContador < tipoSublistas.length && errorEncontrado == false; subListaContador++) {

                                                        var tipoSublistaConsultar = tipoSublistas[subListaContador];
                                                        const cantidadLineasArticulos = record_transaccion.getLineCount(tipoSublistaConsultar);

                                                        for (let k = 0; k < cantidadLineasArticulos && errorEncontrado == false; k++) {

                                                            // log.audit(proceso, 'INICIO - tipoSublistaConsultar: ' + tipoSublistaConsultar + ' - cantidadLineasArticulos: ' + cantidadLineasArticulos + ' - línea: ' + k);

                                                            const aplicar = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'apply', line: k });

                                                            if (tipoSublistaConsultar == 'item' || (aplicar == 'T' || aplicar == true)) {

                                                                // INICIO - Gestion de agrupacion de lineas
                                                                const indiceAgrupacion = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_indice_agrupacion', line: k });
                                                                const subIndiceAgrupacion = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_sub_indice_agrupacion', line: k });
                                                                // FIN - Gestion de agrupacion de lineas

                                                                const URUesRetencion = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_es_retencion', line: k });
                                                                const isVoided = record_transaccion.getValue({ fieldId: 'custbody_l598_transaccion_anulada' });

                                                                if (((URUesRetencion == 'T' || URUesRetencion == true) && (tipoTransaccion == 'vendorcredit' || tipoTransaccion == 'customtransaction_l598_anul_resguardo')) || (tipoTransaccion != 'vendorcredit')) {

                                                                    const esNoGravado = false;
                                                                    var esPercepcionRetCred = false;
                                                                    let esIVAExento = false;
                                                                    const tipoPercepcion = "";
                                                                    let esCreditoFiscal = false;
                                                                    let contienePercepcion = false;
                                                                    var contieneRetencion = false;

                                                                    infoPercepcion = null;
                                                                    const transImpImpuesto = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'taxamount', line: k });
                                                                    var transImporte = parseFloat(record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'amount', line: k }));
                                                                    var transCodImpuesto = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_codigo_impuesto', line: k });
                                                                    const tipoItem = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'itemtype', line: k });
                                                                    let cantidad = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'quantity', line: k });

                                                                    if (tipoSublistaConsultar == 'time') {
                                                                        cantidad = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'qty', line: k });
                                                                    }

                                                                    if (tipoSublistaConsultar == 'itemcost') {
                                                                        cantidad = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'itemcostcount', line: k });
                                                                    }

                                                                    if (tipoSublistaConsultar == 'expcost' && (isNaN(cantidad) || cantidad <= 0 || utilities.isEmpty(cantidad))) {
                                                                        if (!utilities.isEmpty(configuracionLineasGastos) && !configuracionLineasGastos.error) {

                                                                            let resultsConfigLineasGastos = configuracionLineasGastos.results;

                                                                            if (resultsConfigLineasGastos.length > 0) {
                                                                                cantidad = resultsConfigLineasGastos[0].cantidadDefault;
                                                                            } else {
                                                                                log.error(proceso, 'No existe configuracion para configurar los campos de las localizaciones en los items de gastos.');
                                                                            }
                                                                        } else {
                                                                            log.error(proceso, 'Error extrayendo informacion de la configuracion de lineas de gastos: ' + configuracionLineasGastos.mensaje);
                                                                        }
                                                                    }

                                                                    const porcentajeImpuestoParcial = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_tasa_impuesto', line: k });
                                                                    let porcentajeImpuesto = porcentajeImpuestoParcial;

                                                                    if (utilities.isEmpty(porcentajeImpuestoParcial)) {
                                                                        porcentajeImpuesto = parseFloat(0);
                                                                    }

                                                                    if (!utilities.isEmpty(porcentajeImpuestoParcial) && porcentajeImpuestoParcial.toString().search('%') != -1) {
                                                                        porcentajeImpuesto = porcentajeImpuestoParcial.substring(0, porcentajeImpuestoParcial.length - 1);
                                                                    }

                                                                    porcentajeImpuesto = parseFloat(porcentajeImpuesto) / 100;

                                                                    const contieneLineaPercepcion = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_es_perc', line: k });

                                                                    if (contieneLineaPercepcion == "T" || contieneLineaPercepcion == true)
                                                                        contienePercepcion = true;

                                                                    if (URUesRetencion == "T" || URUesRetencion == true)
                                                                        contieneRetencion = true;

                                                                    var montoImponiblePercepcion = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_monto_imp_perc', line: k });
                                                                    var alicuotaPercepcion = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_alic_perc', line: k });
                                                                    var importePercepcion = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_imp_perc', line: k });
                                                                    var codigoPercepcion = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_cod_perc_ret_cred', line: k });

                                                                    // Codigo Percepcion / Retencion / Credito Fiscal
                                                                    const esLineaCredFiscal = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_es_credito_fiscal', line: k });
                                                                    if (esLineaCredFiscal == "T" || esLineaCredFiscal == true)
                                                                        esCreditoFiscal = true;

                                                                    var codigoPercRetCred = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_cod_perc_ret_cred', line: k });
                                                                    // Base Imponible Percepcion/Retencion
                                                                    var baseImpPercepcionyRetencion = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_monto_imp_perc', line: k });
                                                                    // Alicuota Percepcion/Retencion
                                                                    const alicuotaPercepcionyRetencion = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_alicuota', line: k });

                                                                    if (tipoTransaccion == 'customtransaction_l598_anul_resguardo') {
                                                                        var indicadorFacturacion = nvl(record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_cod_fact_anul_resguardo', line: k }), 0);
                                                                        var columnaIndFacturacion = nvl(record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_col_acum_anul_resguardo', line: k }), 0);
                                                                    } else {
                                                                        var indicadorFacturacion = nvl(record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_cod_ind_facturacion', line: k }), 0);
                                                                        var columnaIndFacturacion = nvl(record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_col_acum_ind_facturacion', line: k }), 0);
                                                                    }

                                                                    const indicadorAgente = nvl(record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_cod_ind_agent_resp', line: k }), '');
                                                                    // Informacion del Articulo
                                                                    const articuloNombre = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_articulo_nombre', line: k })
                                                                    const articuloDescripcion = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_articulo_descripcion', line: k })
                                                                    var articuloCodUnidadMedida = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_articulo_unid_medida', line: k })

                                                                    // Informacion de Descuento/Recargo
                                                                    const codigoDescuentoRecargo = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_l598_tipo_desc_rec', line: k })
                                                                    const descripcionLinea = record_transaccion.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'description', line: k })

                                                                    // Excluyo Descripcion y SubTotal
                                                                    if (tipoItem != "Description") {

                                                                        if (tipoItem != "Subtotal") {

                                                                            if ((tipoItem != "Discount" && tipoItem != "Markup")) {

                                                                                if (!utilities.isEmpty(columnaIndFacturacion)) {

                                                                                    switch (parseInt(columnaIndFacturacion, 10)) {
                                                                                        case 1:
                                                                                            // Extento IVA
                                                                                            esIVAExento = true;
                                                                                            importeExento = parseFloat((parseFloat(importeExento) + parseFloat((transImporte))));
                                                                                            break;
                                                                                        case 2:
                                                                                            // IVA TASA Minima
                                                                                            importeIVATasaMinima = parseFloat(parseFloat(importeIVATasaMinima) + parseFloat((parseFloat(transImporte) * parseFloat(porcentajeImpuesto))));
                                                                                            importeNetoGravadoTasaMinima = parseFloat((parseFloat(importeNetoGravadoTasaMinima) + parseFloat((transImporte))));
                                                                                            porcentajeImpuestoTasaMinima = porcentajeImpuesto;
                                                                                            break;
                                                                                        case 3:
                                                                                            // IVA TASA Basica
                                                                                            importeIVATasaBasica = parseFloat(parseFloat(importeIVATasaBasica) + parseFloat((parseFloat(transImporte) * parseFloat(porcentajeImpuesto))));
                                                                                            importeNetoGravadoTasaBasica = parseFloat((parseFloat(importeNetoGravadoTasaBasica) + parseFloat((transImporte))));
                                                                                            porcentajeImpuestoTasaBasica = porcentajeImpuesto;
                                                                                            break;
                                                                                        case 4:
                                                                                            // Otra Tasa
                                                                                            importeIVAOtraTasa = parseFloat(parseFloat(importeIVAOtraTasa) + parseFloat((parseFloat(transImporte) * parseFloat(porcentajeImpuesto))));
                                                                                            importeNetoGravadoOtraTasa = parseFloat((parseFloat(importeNetoGravadoOtraTasa) + parseFloat((transImporte))));
                                                                                            break;
                                                                                        case 5:
                                                                                            // Entrega Gratuita
                                                                                            break;
                                                                                        case 6:
                                                                                            // No Facturable
                                                                                            //importeNoFacturable = parseFloat(parseFloat(importeNoFacturable, 10) + parseFloat(transImpImpuesto), 10);
                                                                                            importeNoFacturable = parseFloat((parseFloat(importeNoFacturable) + parseFloat((transImporte))));
                                                                                            break;
                                                                                        case 7:
                                                                                            // No Facturable Negativo
                                                                                            importeNoFacturable = parseFloat((parseFloat(importeNoFacturable) - parseFloat((Math.abs(transImporte)))));
                                                                                            transImporte = parseFloat((Math.abs(transImporte)));//Se le aplica la funcion de valor absoluto porque la linea no puede viajar con importe negativo.
                                                                                            break;
                                                                                        case 8:
                                                                                            // Item A Rebajar en Remito
                                                                                            break;
                                                                                        case 9:
                                                                                            // Item A Rebajar en Resguardo
                                                                                            break;
                                                                                        case 10:
                                                                                            // Exportacion Y Asimiladas
                                                                                            importeExpYAsimiladas = parseFloat((parseFloat(importeExpYAsimiladas) + parseFloat((transImporte))));
                                                                                            break;
                                                                                        case 11:
                                                                                            // Impuesto Percibido/Retencion/Credito Fiscal
                                                                                            esPercepcionRetCred = true;
                                                                                            //importePercepciones = parseFloat((parseFloat(importePercepciones, 10) + parseFloat(parseFloat((transImpImpuesto), 10), 10)), 10);
                                                                                            break;
                                                                                        case 12:
                                                                                            // IVA en Suspenso
                                                                                            importeIVASuspenso = parseFloat(parseFloat(importeIVASuspenso) + parseFloat((parseFloat(transImporte) * parseFloat(porcentajeImpuesto))));
                                                                                            importeNetoGravadoIVASuspenso = parseFloat((parseFloat(importeNetoGravadoIVASuspenso) + parseFloat((transImporte))));
                                                                                            break;
                                                                                        case 0:
                                                                                            // Item A Rebajar en Resguardo
                                                                                            break;
                                                                                        default:
                                                                                            // Columna de Acumulacion Invalida
                                                                                            errorEncontrado = true;
                                                                                            mensajeError = "La Columna de Acumulación del Indicador de Facturación con Código : " + indicadorFacturacion + " es Inválida para la Línea de la Transacción - Número de Línea : " + k;
                                                                                            mensajeError = mensajeError + " - ID Transacción : " + idTransaccion;
                                                                                    }
                                                                                } else {
                                                                                    // No se Encontro la Columna de Acumulacion del Indicador de Facturacion
                                                                                    errorEncontrado = true;
                                                                                    mensajeError = "Error Obteniendo Información de la Columna de Acumulación del Indicador de Facturación con Código : " + indicadorFacturacion + " Para la Línea de la Transacción - Número de Línea : " + k;
                                                                                    mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                                                                }
                                                                            }

                                                                            /* if (errorEncontrado == false) {
                                                                                if (esPercepcionRetCred == true) {
                                                                                    // Obtener Codigo de Percepcion
                                                                                    infoPercepcionyRetencion = {};
                                                                                    infoPercepcionyRetencion.codigo = codigoPercRetCred;
                                                                                    if (!utilities.isEmpty(transImpImpuesto)) {
                                                                                        infoPercepcionyRetencion.importe = parseFloat(parseFloat((transImpImpuesto), 10), 10).toFixedOK(2);
                                                                                        if (!utilities.isEmpty(baseImpPercepcionyRetencion)) {
                                                                                            // Calculo la Alicuota de Percepcion como Importe Retencion / Base Imponible
                                                                                            alicuotaPercepcionyRetencion = parseFloat(((parseFloat((transImpImpuesto), 10) / parseFloat((baseImpPercepcionyRetencion), 10)) * 100), 10);
                                                                                            infoPercepcionyRetencion.alicuota = parseFloat(alicuotaPercepcionyRetencion, 10).toFixedOK(2);
                                                                                            infoPercepcionyRetencion.baseImponible = parseFloat((baseImpPercepcionyRetencion), 10).toFixedOK(2);
                                                                                        }
                                                                                    }
                                                                                }
                                                                            } */

                                                                            if (errorEncontrado == false) {

                                                                                // INICIO - Agregar Detalle de Linea
                                                                                if (tipoItem != "Discount" && tipoItem != "Markup" && esPercepcionRetCred == false) {

                                                                                    //var montoItem = parseFloat((parseFloat(precioUnitario, 10) * parseInt(cantidad, 10)), 10);
                                                                                    var montoItem = parseFloat(transImporte);

                                                                                    if (!utilities.isEmpty(columnaIndFacturacion) && !utilities.isEmpty(indicadorFacturacion) && !utilities.isEmpty(articuloNombre) && !utilities.isEmpty(cantidad)
                                                                                        && !utilities.isEmpty(articuloCodUnidadMedida) && !utilities.isEmpty(montoItem)) {

                                                                                        var precioUnitario = parseFloat((parseFloat(montoItem) / parseFloat(cantidad)));
                                                                                        if ((URUesRetencion == 'T' || URUesRetencion == true) && (tipoTransaccion == 'vendorcredit' || tipoTransaccion == 'customtransaction_l598_anul_resguardo')) {
                                                                                            precioUnitario = parseFloat(0);
                                                                                        }

                                                                                        informacionLinea = {};
                                                                                        informacionLinea.indicadorFacturacion = indicadorFacturacion.toString();
                                                                                        informacionLinea.columnaIndFacturacion = columnaIndFacturacion.toString();
                                                                                        informacionLinea.indicadorAgente = indicadorAgente;
                                                                                        informacionLinea.nombreItem = articuloNombre;
                                                                                        //informacionLinea.DescripcionAdicional = articuloDescripcion;
                                                                                        informacionLinea.DescripcionAdicional = descripcionLinea;
                                                                                        informacionLinea.cantidad = toFixedOK(parseFloat(cantidad), 3);
                                                                                        informacionLinea.unidadMedida = articuloCodUnidadMedida;
                                                                                        informacionLinea.precioUnitario = toFixedOK(parseFloat(precioUnitario), 6);
                                                                                        informacionLinea.descuentoEnPorcentaje = 0;
                                                                                        // log.debug(proceso, 'informacionLinea.descuentoEnPorcentaje: ' + informacionLinea.descuentoEnPorcentaje);
                                                                                        informacionLinea.montoDescuento = 0;
                                                                                        informacionLinea.recargoEnPorcentaje = 0;
                                                                                        informacionLinea.montoRecargo = 0;
                                                                                        informacionLinea.montoItem = toFixedOK(parseFloat(montoItem), 2);
                                                                                        // INICIO - Informacion de Agrupacion
                                                                                        informacionLinea.indiceAgrupacion = indiceAgrupacion;
                                                                                        informacionLinea.subIndiceAgrupacion = subIndiceAgrupacion;

                                                                                        // FIN - Informacion de Agrupacion
                                                                                        objetoRespuesta.detalleLineas.push(informacionLinea);

                                                                                        // INICIO - Agregar Informacion de Percepcion
                                                                                        if ((contienePercepcion == true) || (contieneRetencion == true)) {

                                                                                            // Obtener Codigo de Percepcion
                                                                                            infoPercepcionyRetencion = {};
                                                                                            infoPercepcionyRetencion.codigo = codigoPercepcion;

                                                                                            infoPercepcionyRetencion.alicuota = toFixedOK(parseFloat(alicuotaPercepcion), 2);
                                                                                            infoPercepcionyRetencion.baseImponible = toFixedOK(parseFloat((montoImponiblePercepcion)), 2);

                                                                                            if (!utilities.isEmpty(infoPercepcionyRetencion.baseImponible) && !isNaN(parseFloat(infoPercepcionyRetencion.baseImponible)) && parseFloat(infoPercepcionyRetencion.baseImponible) > 0) {
                                                                                                if (!utilities.isEmpty(infoPercepcionyRetencion.alicuota) && !isNaN(parseFloat(infoPercepcionyRetencion.alicuota)) && parseFloat(infoPercepcionyRetencion.alicuota) > 0) {
                                                                                                    infoPercepcionyRetencion.importe = toFixedOK(parseFloat(parseFloat(parseFloat(infoPercepcionyRetencion.baseImponible) * (parseFloat(infoPercepcionyRetencion.alicuota) / 100))), 2);
                                                                                                }
                                                                                            }

                                                                                            // Agregar Detalle de Percepcion/Retencion/Credito Fiscal
                                                                                            if (infoPercepcionyRetencion != null) {

                                                                                                if (!utilities.isEmpty(infoPercepcionyRetencion.codigo) && !utilities.isEmpty(infoPercepcionyRetencion.importe) && !utilities.isEmpty(infoPercepcionyRetencion.alicuota) && !utilities.isEmpty(infoPercepcionyRetencion.baseImponible)) {

                                                                                                    //importePercepciones = parseFloat((parseFloat(importePercepciones, 10) + parseFloat(parseFloat((infoPercepcionyRetencion.importe), 10), 10)), 10).toFixedOK(2);

                                                                                                    if (esCreditoFiscal == true) {
                                                                                                        importeCreditosFiscales = parseFloat(importeCreditosFiscales) + parseFloat(infoPercepcionyRetencion.importe);
                                                                                                    } else {

                                                                                                        if ((tipoTransaccion == 'vendorcredit' || tipoTransaccion == 'customtransaction_l598_anul_resguardo') && (isVoided == 'T' || isVoided == true)) {
                                                                                                            importeRetenidoPercibido = parseFloat(parseFloat(importeRetenidoPercibido) + ((parseFloat(infoPercepcionyRetencion.importe)) * (parseFloat(-1))));
                                                                                                        } else {
                                                                                                            importeRetenidoPercibido = parseFloat((parseFloat(importeRetenidoPercibido) + parseFloat(infoPercepcionyRetencion.importe)));
                                                                                                        }
                                                                                                    }

                                                                                                    if (objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion == null) {
                                                                                                        // Genero el Array
                                                                                                        objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion = [];
                                                                                                    }
                                                                                                    objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion.push(infoPercepcionyRetencion);

                                                                                                    // Agregar A totales
                                                                                                    var indice = -1;
                                                                                                    if (objetoRespuesta.detalleTotalesPercyRet.length > 0) {
                                                                                                        //var indice = objetoRespuesta.detalleTotalesPercyRet.indexOf(infoPercepcionyRetencion.codigo);
                                                                                                        var codigoPercEncontrado = false;
                                                                                                        for (var indicePerc = 0; objetoRespuesta.detalleTotalesPercyRet != null && indicePerc < objetoRespuesta.detalleTotalesPercyRet.length && codigoPercEncontrado == false; indicePerc++) {
                                                                                                            if (objetoRespuesta.detalleTotalesPercyRet[indicePerc].codigo == infoPercepcionyRetencion.codigo) {
                                                                                                                codigoPercEncontrado == true;
                                                                                                                indice = indicePerc;
                                                                                                            }
                                                                                                        }
                                                                                                    }

                                                                                                    if (indice >= 0) {
                                                                                                        if ((tipoTransaccion == 'vendorcredit' || tipoTransaccion == 'customtransaction_l598_anul_resguardo') && (isVoided == 'T' || isVoided == true)) {
                                                                                                            objetoRespuesta.detalleTotalesPercyRet[indice].importe = parseFloat((parseFloat(objetoRespuesta.detalleTotalesPercyRet[indice].importe) + (parseFloat(infoPercepcionyRetencion.importe)) * (parseFloat(-1))));
                                                                                                        } else {
                                                                                                            objetoRespuesta.detalleTotalesPercyRet[indice].importe = parseFloat((parseFloat(objetoRespuesta.detalleTotalesPercyRet[indice].importe) + parseFloat(infoPercepcionyRetencion.importe)));
                                                                                                        }

                                                                                                    } else {
                                                                                                        var infoPercYRet = {};
                                                                                                        infoPercYRet.codigo = infoPercepcionyRetencion.codigo;
                                                                                                        //infoPercYRet.importe = parseFloat(infoPercepcionyRetencion.importe, 10);
                                                                                                        //objetoRespuesta.detalleTotalesPercyRet.push(infoPercYRet);																																																
                                                                                                        if ((tipoTransaccion == 'vendorcredit' || tipoTransaccion == 'customtransaction_l598_anul_resguardo') && (isVoided == 'T' || isVoided == true)) {
                                                                                                            infoPercYRet.importe = parseFloat(parseFloat(infoPercepcionyRetencion.importe) * (parseFloat(-1)));
                                                                                                        } else {
                                                                                                            infoPercYRet.importe = parseFloat(infoPercepcionyRetencion.importe);
                                                                                                        }
                                                                                                        objetoRespuesta.detalleTotalesPercyRet.push(infoPercYRet);
                                                                                                    }
                                                                                                } else {
                                                                                                    // Falta Información Reuquerida de la Linea de Percepcion

                                                                                                    log.error(proceso, 'infoPercepcionyRetencion.importe: ' + infoPercepcionyRetencion.importe + '. infoPercepcionyRetencion.baseImponible: ' + infoPercepcionyRetencion.baseImponible + '. infoPercepcionyRetencion.alicuota: ' + infoPercepcionyRetencion.alicuota);

                                                                                                    errorEncontrado = true;
                                                                                                    mensajeError = "Error Obteniendo la siguiente Información de la Línea de Percepcion/Retencion/Credito Fiscal: ";
                                                                                                    if (utilities.isEmpty(infoPercepcionyRetencion.codigo))
                                                                                                        mensajeError = mensajeError + " Codigo / ";
                                                                                                    if (utilities.isEmpty(infoPercepcionyRetencion.importe))
                                                                                                        mensajeError = mensajeError + " Importe / ";
                                                                                                    if (utilities.isEmpty(infoPercepcionyRetencion.alicuota))
                                                                                                        mensajeError = mensajeError + " Alicuota / ";
                                                                                                    if (utilities.isEmpty(infoPercepcionyRetencion.baseImponible))
                                                                                                        mensajeError = mensajeError + " Base de Calculo / ";
                                                                                                    mensajeError = mensajeError + " - Numero de Línea : " + k;
                                                                                                    mensajeError = mensajeError + " - ID Transacción : " + idTransaccion;

                                                                                                    log.error(proceso, mensajeError);
                                                                                                }

                                                                                            } else {
                                                                                                // Error Obteniendo Informacion de la Linea de Percepcion/Retencion/Credito Fiscal
                                                                                                errorEncontrado = true;
                                                                                                mensajeError = "Error Obteniendo Información de la Línea de Percepción/Retención/Credtio Fiscal - Número de Línea: " + k;
                                                                                                mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                                                log.error(proceso, mensajeError);
                                                                                            }

                                                                                        }

                                                                                        // FIN - Agregar Informacion de Percepcion

                                                                                        cantidadLineas++;
                                                                                    } else {
                                                                                        // Falta Informacion Obligatoria de la Linea de la Transacción
                                                                                        errorEncontrado = true;
                                                                                        mensajeError = "Falta la Siguiente Información de la Linea de la Transacción: ";
                                                                                        if (utilities.isEmpty(columnaIndFacturacion))
                                                                                            mensajeError = mensajeError + "Columna de Acumulación del Indicador de Facturación / ";
                                                                                        if (utilities.isEmpty(indicadorFacturacion))
                                                                                            mensajeError = mensajeError + "Indicador de Facturación / ";
                                                                                        if (utilities.isEmpty(articuloNombre))
                                                                                            mensajeError = mensajeError + "Nombre del Artículo / ";
                                                                                        if (utilities.isEmpty(cantidad))
                                                                                            mensajeError = mensajeError + "Cantidad del Artículo / ";
                                                                                        if (utilities.isEmpty(articuloCodUnidadMedida))
                                                                                            mensajeError = mensajeError + "Unidad de Medida del Artículo / ";
                                                                                        //if (utilities.isEmpty(precioUnitario))
                                                                                        //mensajeError = mensajeError + "Precio Unitario del Articulo / ";
                                                                                        if (utilities.isEmpty(montoItem))
                                                                                            mensajeError = mensajeError + "Monto del Artículo (Precio Unitario x Cantidad) / ";

                                                                                        mensajeError = mensajeError + "- Numero de Línea: " + k;
                                                                                        mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                                        log.error(proceso, mensajeError);
                                                                                    }

                                                                                } else {

                                                                                    // Agregar Descuento / Recargo / Percepcion a la Linea Anterior
                                                                                    if (objetoRespuesta.detalleLineas != null && objetoRespuesta.detalleLineas.length > 0) {

                                                                                        // Grabo la informacion en la Linea Anterior
                                                                                        if (esPercepcionRetCred == false) {

                                                                                            if (tipoItem == "Discount") {

                                                                                                if (!utilities.isEmpty(codigoDescuentoRecargo)) {

                                                                                                    const infoDescuento = {};
                                                                                                    infoDescuento.tipo = codigoDescuentoRecargo;
                                                                                                    //infoDescuento.valor = parseFloat((parseFloat(Math.abs(transImpImpuesto), 10) + parseFloat((Math.abs(transImporte)), 10)), 10).toFixedOK(2);
                                                                                                    infoDescuento.valor = toFixedOK(parseFloat(Math.abs(transImporte)), 2);

                                                                                                    if (objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].subDescuento == null) {
                                                                                                        // Genero el Array
                                                                                                        objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].subDescuento = [];
                                                                                                    }

                                                                                                    objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].subDescuento.push(infoDescuento);
                                                                                                    objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].descuentoEnPorcentaje = infoDescuento.tipo;
                                                                                                    //objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].descuentoEnPorcentaje = 0;

                                                                                                    // log.debug(proceso, 'informacionLinea.descuentoEnPorcentaje: ' + objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].descuentoEnPorcentaje);

                                                                                                    objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].montoDescuento = infoDescuento.valor;
                                                                                                    objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].montoItem = toFixedOK(parseFloat((parseFloat(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].montoItem) - parseFloat(infoDescuento.valor))), 2);

                                                                                                    if (!utilities.isEmpty(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].columnaIndFacturacion)) {
                                                                                                        switch (parseInt(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].columnaIndFacturacion, 10)) {
                                                                                                            case 1:
                                                                                                                // Exento IVA
                                                                                                                importeExento = parseFloat(parseFloat(importeExento) - parseFloat(Math.abs(parseFloat(transImporte), 10)));
                                                                                                                break;
                                                                                                            case 2:
                                                                                                                // IVA TASA Minima
                                                                                                                importeIVATasaMinima = parseFloat(parseFloat(importeIVATasaMinima) - parseFloat(Math.abs((parseFloat(transImporte) * parseFloat(porcentajeImpuesto)), 10)));
                                                                                                                importeNetoGravadoTasaMinima = parseFloat((parseFloat(importeNetoGravadoTasaMinima) - parseFloat((Math.abs(transImporte)))));
                                                                                                                break;
                                                                                                            case 3:
                                                                                                                // IVA TASA Basica
                                                                                                                importeIVATasaBasica = parseFloat(parseFloat(importeIVATasaBasica) - parseFloat(Math.abs((parseFloat(transImporte) * parseFloat(porcentajeImpuesto)), 10)));
                                                                                                                importeNetoGravadoTasaBasica = parseFloat((parseFloat(importeNetoGravadoTasaBasica) - parseFloat((Math.abs(transImporte)))));
                                                                                                                break;
                                                                                                            case 4:
                                                                                                                // Otra Tasa
                                                                                                                importeIVAOtraTasa = parseFloat(parseFloat(importeIVAOtraTasa) - parseFloat(Math.abs((parseFloat(transImporte) * parseFloat(porcentajeImpuesto)), 10)));
                                                                                                                importeNetoGravadoOtraTasa = parseFloat((parseFloat(importeNetoGravadoOtraTasa) - parseFloat((Math.abs(transImporte)))));
                                                                                                                break;
                                                                                                            case 6:
                                                                                                                // No Facturable
                                                                                                                importeNoFacturable = parseFloat((parseFloat(importeNoFacturable) - parseFloat((Math.abs(transImporte)))));
                                                                                                                break;
                                                                                                            case 7:
                                                                                                                // No Facturable Negativo
                                                                                                                importeNoFacturable = parseFloat((parseFloat(importeNoFacturable) + parseFloat((Math.abs(transImporte)))));
                                                                                                                break;
                                                                                                            case 10:
                                                                                                                //abrito 27/07/2018: Se agrega lo siguiente para la linea aplica un descuento de linea el importe de descuento se lo reste al importe de la linea y asi el monto motal viaje con el importe correcto.
                                                                                                                // Exportacion (Exportacion y Asimiladas)
                                                                                                                importeExpYAsimiladas = parseFloat(parseFloat(importeExpYAsimiladas) - parseFloat(Math.abs(parseFloat(transImporte), 10)));
                                                                                                                break;
                                                                                                        }
                                                                                                    }

                                                                                                } else {
                                                                                                    // Error Falta Configurar el Tipo de Descuento en la Transaccion
                                                                                                    errorEncontrado = true;
                                                                                                    mensajeError = "Error Obteniendo Información del Tipo de Descuento de la Línea de la Transacción - Número de Línea: " + k;
                                                                                                    mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                                                    log.error(proceso, mensajeError);
                                                                                                }
                                                                                            }

                                                                                            if (tipoItem == "Markup") {

                                                                                                // log.debug(proceso, 'codigoDescuentoRecargo: ' + codigoDescuentoRecargo);

                                                                                                if (!utilities.isEmpty(codigoDescuentoRecargo)) {
                                                                                                    const infoRecargo = {};
                                                                                                    infoRecargo.tipo = codigoDescuentoRecargo;
                                                                                                    //infoRecargo.valor = parseFloat((parseFloat(transImpImpuesto, 10) + parseFloat((transImporte), 10)), 10).toFixedOK(2);
                                                                                                    infoRecargo.valor = toFixedOK(parseFloat(Math.abs(transImporte)), 2);

                                                                                                    if (objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].subRecargo == null) {
                                                                                                        // Genero el Array
                                                                                                        objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].subRecargo = [];
                                                                                                    }

                                                                                                    objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].subRecargo.push(infoRecargo);

                                                                                                    objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].recargoEnPorcentaje = infoRecargo.tipo;
                                                                                                    objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].montoRecargo = infoRecargo.valor;
                                                                                                    objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].montoItem = toFixedOK(parseFloat((parseFloat(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].montoItem) + parseFloat(infoRecargo.valor))), 2);

                                                                                                    if (!utilities.isEmpty(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].columnaIndFacturacion)) {
                                                                                                        switch (parseInt(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].columnaIndFacturacion, 10)) {
                                                                                                            case 2:
                                                                                                                // IVA TASA Minima
                                                                                                                importeIVATasaMinima = parseFloat(parseFloat(importeIVATasaMinima) + parseFloat(Math.abs((parseFloat(transImporte) * parseFloat(porcentajeImpuesto)), 10)));
                                                                                                                importeNetoGravadoTasaMinima = parseFloat((parseFloat(importeNetoGravadoTasaMinima) + parseFloat((Math.abs(transImporte)))));
                                                                                                                break;
                                                                                                            case 3:
                                                                                                                // IVA TASA Basica
                                                                                                                importeIVATasaBasica = parseFloat(parseFloat(importeIVATasaBasica) + parseFloat(Math.abs((parseFloat(transImporte) * parseFloat(porcentajeImpuesto)), 10)));
                                                                                                                importeNetoGravadoTasaBasica = parseFloat((parseFloat(importeNetoGravadoTasaBasica) + parseFloat((Math.abs(transImporte)))));
                                                                                                                break;
                                                                                                            case 4:
                                                                                                                // Otra Tasa
                                                                                                                importeIVAOtraTasa = parseFloat(parseFloat(importeIVAOtraTasa) + parseFloat(Math.abs((parseFloat(transImporte) * parseFloat(porcentajeImpuesto)), 10)));
                                                                                                                importeNetoGravadoOtraTasa = parseFloat((parseFloat(importeNetoGravadoOtraTasa) + parseFloat((Math.abs(transImporte)))));
                                                                                                                break;
                                                                                                        }
                                                                                                    }
                                                                                                } else {
                                                                                                    // Error Falta Configurar el Tipo de Recargo en la Transaccion
                                                                                                    errorEncontrado = true;
                                                                                                    mensajeError = "Error Obteniendo Informacion del Tipo de Recargo de la Linea de la Transaccion - Numero de Linea : " + k;
                                                                                                    mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                                                                                    log.error(proceso, mensajeError);
                                                                                                }
                                                                                            }
                                                                                        }

                                                                                    } else {
                                                                                        // Error Grabar Descuento / Recargo / Percepcion en la primer Linea
                                                                                        errorEncontrado = true;
                                                                                        mensajeError = "Los Descuentos/Recargos/Percepciones no pueden ingresarse en la primera linea de la Transacción";
                                                                                        mensajeError = mensajeError + " - ID Transaccion: " + idTransaccion;
                                                                                        log.error(proceso, mensajeError);
                                                                                    }
                                                                                }
                                                                            }

                                                                            // FIN - Agregar Detalle de Linea

                                                                        } else {
                                                                            // Linea de Subtotal
                                                                            informacionSubTotal = {};
                                                                            if (!utilities.isEmpty(descripcionLinea) && !utilities.isEmpty(transImporte)) {
                                                                                informacionSubTotal.glosa = descripcionLinea;
                                                                                informacionSubTotal.orden = k; // Utilizar el Numero de Linea
                                                                                informacionSubTotal.valor = toFixedOK(parseFloat(parseFloat((transImporte))), 2);
                                                                                objetoRespuesta.detalleSubtotales.push(informacionSubTotal);
                                                                            } else {
                                                                                // Falta Descripcion  / Importe de la Linea de Subtotal
                                                                                errorEncontrado = true;
                                                                                mensajeError = "Falta la Siguiente Informacion de Para la Línea de Subtotal: ";
                                                                                if (utilities.isEmpty(descripcionLinea))
                                                                                    mensajeError = mensajeError + "Descripcion del Subtotal / ";
                                                                                if (utilities.isEmpty(descripcionLinea))
                                                                                    mensajeError = mensajeError + "Importe del Subtotal / ";

                                                                                mensajeError = mensajeError + " Para la Linea Numero : " + k;
                                                                                mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                                                                log.error(proceso, mensajeError);
                                                                            }
                                                                        }
                                                                    } // Del If Descuento
                                                                }
                                                            }

                                                            // log.audit(proceso, 'FIN - tipoSublistaConsultar: ' + tipoSublistaConsultar + ' - cantidadLineasArticulos: ' + cantidadLineasArticulos + ' - línea: ' + k);
                                                        } // Fin del FOR para recorrer líneas de artículos
                                                    } // Fin del FOR para recorrer sublistas
                                                    //FIN - Recorrido de los items

                                                    log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                                    //INICIO - MANEJO PARA APLICACION DE DESCUENTO GLOBAL DE MONTO
                                                    if (errorEncontrado == false) {

                                                        if (!utilities.isEmpty(infoDescRecGlobal) && infoDescRecGlobal.valor > 0 && !utilities.isEmpty(infoDescRecGlobal.indicadorFacturacion) && infoDescRecGlobal.tipoMovimiento == 'D') {

                                                            if ((!utilities.isEmpty(importeNetoGravadoTasaMinima) && importeNetoGravadoTasaMinima > 0) && (!utilities.isEmpty(importeNetoGravadoTasaBasica) && importeNetoGravadoTasaBasica > 0)) {
                                                                //Si la transaccion tiene lineas de articulos con diferentes tipos de impuesto
                                                                errorEncontrado = true;
                                                                mensajeError = "La transacción tiene artículos con diferentes codigos de impuesto por lo cual no se procede a calcular el descuento global ya que se estaría reportando en la DGI algo diferente a lo que se vizualiza en el resumen de la transacción desde Netsuite";
                                                                mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                log.error(proceso, mensajeError);
                                                            } else {
                                                                const indicadorFacturacionDRGlobal = infoDescRecGlobal.indicadorFacturacion;
                                                                const valorDRGlobal = infoDescRecGlobal.valor;

                                                                switch (parseInt(indicadorFacturacionDRGlobal, 10)) {
                                                                    case 1:
                                                                        // Extento IVA
                                                                        log.debug(proceso, 'DescGlobal - importeExento: ' + importeExento);
                                                                        importeExento = parseFloat(parseFloat(importeExento) - parseFloat(valorDRGlobal));
                                                                        log.debug(proceso, 'DescGlobal - importeExento: ' + importeExento);
                                                                        break;
                                                                    case 2:
                                                                        // IVA TASA Minima
                                                                        importeNetoGravadoTasaMinima = parseFloat(parseFloat(importeNetoGravadoTasaMinima) - parseFloat(valorDRGlobal));
                                                                        importeIVATasaMinima = parseFloat(parseFloat(importeNetoGravadoTasaMinima) * parseFloat(porcentajeImpuestoTasaMinima));
                                                                        log.debug(proceso, 'DescGlobal - ImporteNetoGravadoTasaMinima: ' + importeNetoGravadoTasaMinima + '. ImporteIVATasaMinima: ' + importeIVATasaMinima);
                                                                        break;
                                                                    case 3:
                                                                        // IVA TASA Basica
                                                                        importeNetoGravadoTasaBasica = parseFloat(parseFloat(importeNetoGravadoTasaBasica) - parseFloat(valorDRGlobal));
                                                                        importeIVATasaBasica = parseFloat(parseFloat(importeNetoGravadoTasaBasica) * parseFloat(porcentajeImpuestoTasaBasica));
                                                                        log.debug(proceso, 'DescGlobal - ImporteNetoGravadoTasaBasica: ' + importeNetoGravadoTasaBasica + '. ImporteIVATasaBasica: ' + importeIVATasaBasica);
                                                                        break;
                                                                    case 10:
                                                                        // EXPORTACION Y ASIMILADAS
                                                                        log.debug(proceso, 'DescGlobal - importeExpYAsimiladas: ' + importeExpYAsimiladas);
                                                                        importeExpYAsimiladas = parseFloat(parseFloat(importeExpYAsimiladas) - parseFloat(valorDRGlobal));
                                                                        log.debug(proceso, 'DescGlobal - importeExpYAsimiladas: ' + importeExpYAsimiladas);
                                                                        break;
                                                                    default:
                                                                        // Columna de Acumulacion Invalida
                                                                        errorEncontrado = true;
                                                                        mensajeError = "La Columna de Acumulación del Indicador de Facturación Descuento Global con Código : " + indicadorFacturacionDRGlobal + " es inválida para la aplicación del descuento global";
                                                                        mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                        log.error(proceso, mensajeError);
                                                                }
                                                            }
                                                        }
                                                    }
                                                    //FIN - MANEJO PARA APLICACION DE DESCUENTO GLOBAL DE MONTO

                                                    // log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                                    // INICIO - Verificación de transacción de resguardos
                                                    if (tipoTransaccion == 'customtransaction_l598_resguardos') {

                                                        const uruResguardoAnulacion = record_transaccion.getValue({ fieldId: 'custbody_l598_resguardo_anulacion' });
                                                        const transUruResguardo = record_transaccion.getValue({ fieldId: 'custbody_l598_link_uru_resguardo' });
                                                        const esAnulacion = false;
                                                        const sublistaResguardo = 'recmachcustrecord_l598_ret_detalle_resguardo';
                                                        var sublistaResguardoLines = record_transaccion.getLineCount({ sublistId: sublistaResguardo });
                                                        var referenciaGlobal = nvl(resultadoIndividual.getValue({ name: columns[47] }), '');
                                                        log.debug('Log 2519 flag', 'errorEncontrado:' + errorEncontrado + '  sublistaResguardoLines:' + sublistaResguardoLines);
                                                        const arrayRetencionDetalleResguardo = [];

                                                        if (sublistaResguardoLines > 0) {
                                                            log.debug("Entre if de Getsublist", "Se ingreso a la primera condicion");
                                                            for (var subListaContador = 0; subListaContador < sublistaResguardoLines && errorEncontrado == false; subListaContador++) {
                                                                var objRet = {};
                                                                objRet.codigoPercepcion = record_transaccion.getSublistValue({ sublistId: sublistaResguardo, fieldId: 'custrecord_l598_ret_detalle_cod_ret', line: subListaContador });
                                                                objRet.montoImponiblePercepcion = record_transaccion.getSublistValue({ sublistId: sublistaResguardo, fieldId: 'custrecord_l598_ret_detalle_base_cal_fin', line: subListaContador });
                                                                objRet.alicuotaPercepcion = record_transaccion.getSublistValue({ sublistId: sublistaResguardo, fieldId: 'custrecord_l598_ret_detalle_alicuota', line: subListaContador });
                                                                objRet.indicadorFacturacion = record_transaccion.getSublistValue({ sublistId: sublistaResguardo, fieldId: 'custrecord_l598_ret_detalle_ind_facturac', line: subListaContador });
                                                                arrayRetencionDetalleResguardo.push(objRet);
                                                            }
                                                        } else {

                                                            // let idResguardo = record_transaccion.save();

                                                            // record_transaccion = record.load({
                                                            //     type: 'customtransaction_l598_resguardos',
                                                            //     id: idResguardo
                                                            // });

                                                            var sublistaResguardoLines = record_transaccion.getLineCount({ sublistId: sublistaResguardo });
                                                            const detalleJsonRetencion = record_transaccion.getValue('custbody_l598_resguardo_ret_det_json');
                                                            const detalleRetencionids = record_transaccion.getValue('custbody_l598_ids_detalle_ret');
                                                            const arrayIdsRetencion = detalleRetencionids.split(',');

                                                            log.debug("Entre if de Busqueda Guardada", "Se ingreso a la segunda condicion ... Id record: " + record_transaccion.id + " / detalleRetencionids: " + detalleRetencionids + " / arrayIdsRetencion: " + JSON.stringify(arrayIdsRetencion));
                                                            const filtronuevo = search.createFilter({
                                                                name: "internalid",
                                                                operator: search.Operator.ANYOF,
                                                                values: arrayIdsRetencion
                                                            });

                                                            log.debug("Linea 2559", "filtros: " + JSON.stringify(filtronuevo));

                                                            const loadSearch = search.load({
                                                                id: "customsearch_l598_obt_inf_uru_det_ret"
                                                            });

                                                            loadSearch.filters.push(filtronuevo);
                                                            const resultadoSearch = loadSearch.run();
                                                            const searchResult = resultadoSearch.getRange({
                                                                start: 0,
                                                                end: 1000
                                                            });

                                                            log.debug("Linea 2580", "loadSearch: " + JSON.stringify(searchResult) + " / searchResult.length: " + searchResult.length);

                                                            if (searchResult != null && searchResult.length > 0) {
                                                                const columna = resultadoSearch.columns;
                                                                for (let i = 0; i < searchResult.length; i++) {
                                                                    var objRet = {};
                                                                    objRet.codigoPercepcion = searchResult[i].getValue(columna[1]);
                                                                    objRet.montoImponiblePercepcion = searchResult[i].getValue(columna[2]);
                                                                    objRet.alicuotaPercepcion = searchResult[i].getValue(columna[3]);
                                                                    objRet.indicadorFacturacion = searchResult[i].getValue(columna[4]);
                                                                    arrayRetencionDetalleResguardo.push(objRet);
                                                                }
                                                            }
                                                            //if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {

                                                            //}
                                                            // }
                                                        }
                                                        log.debug('Log 2567 flag', 'arrayRetencionDetalleResguardo: ' + JSON.stringify(arrayRetencionDetalleResguardo));
                                                        log.debug('Log 2568 flag', 'Length: ' + arrayRetencionDetalleResguardo.length);
                                                        for (var subListaContador = 0; subListaContador < arrayRetencionDetalleResguardo.length && errorEncontrado == false; subListaContador++) {

                                                            var contieneRetencion = true;
                                                            infoPercepcion = null;
                                                            var transImporte = 0
                                                            var transCodImpuesto = '';
                                                            var codigoPercepcion = arrayRetencionDetalleResguardo[subListaContador].codigoPercepcion;
                                                            var codigoPercRetCred = codigoPercepcion;
                                                            var montoImponiblePercepcion = arrayRetencionDetalleResguardo[subListaContador].montoImponiblePercepcion;
                                                            var baseImpPercepcionyRetencion = montoImponiblePercepcion;
                                                            var importePercepcion = montoImponiblePercepcion;
                                                            var alicuotaPercepcion = arrayRetencionDetalleResguardo[subListaContador].alicuotaPercepcion;
                                                            var indicadorFacturacion = arrayRetencionDetalleResguardo[subListaContador].indicadorFacturacion;
                                                            var columnaIndFacturacion = indicadorFacturacion;
                                                            var montoItem = parseFloat(transImporte);

                                                            //SI LO SIGUIENTE SE CUMPLE INDICA QUE CORRESPONDE A UNA TRANSACCION URU-RESGUARDO DE ANULACION
                                                            //POR TANTO SE CAMBIA EL INDICADOR DE FACTURACION AL CORRESPONDIENTE
                                                            log.debug('Log 2519 flag', 'columnaIndFacturacion:' + columnaIndFacturacion);

                                                            if (!utilities.isEmpty(columnaIndFacturacion) && !utilities.isEmpty(indicadorFacturacion)) {

                                                                var precioUnitario = parseFloat(0);
                                                                informacionLinea = {};
                                                                informacionLinea.indicadorFacturacion = indicadorFacturacion;
                                                                informacionLinea.columnaIndFacturacion = columnaIndFacturacion;
                                                                informacionLinea.indicadorAgente = '';
                                                                informacionLinea.nombreItem = '';
                                                                informacionLinea.DescripcionAdicional = '';
                                                                informacionLinea.cantidad = 0;
                                                                informacionLinea.unidadMedida = articuloCodUnidadMedida;
                                                                informacionLinea.precioUnitario = toFixedOK(parseFloat(precioUnitario), 2);
                                                                informacionLinea.descuentoEnPorcentaje = 0;
                                                                informacionLinea.montoDescuento = 0;
                                                                informacionLinea.recargoEnPorcentaje = 0;
                                                                informacionLinea.montoRecargo = 0;
                                                                informacionLinea.montoItem = toFixedOK(parseFloat(montoItem), 2);
                                                                objetoRespuesta.detalleLineas.push(informacionLinea);
                                                                log.debug('Log 2519 flag', 'contieneRetencion:' + contieneRetencion);
                                                                //INICIO - AGREGAR INFORMACION DE RETENCION
                                                                if (contieneRetencion) {

                                                                    //OBTENER CODIGO DE RETENCION
                                                                    infoRetencion = {};
                                                                    infoRetencion.codigo = codigoPercepcion;
                                                                    infoRetencion.alicuota = toFixedOK(parseFloat(alicuotaPercepcion), 2);
                                                                    infoRetencion.baseImponible = toFixedOK(parseFloat((montoImponiblePercepcion)), 2);

                                                                    if (!utilities.isEmpty(infoRetencion.baseImponible) && !isNaN(parseFloat(infoRetencion.baseImponible)) && parseFloat(infoRetencion.baseImponible) > 0) {
                                                                        if (!utilities.isEmpty(infoRetencion.alicuota) && !isNaN(parseFloat(infoRetencion.alicuota)) && parseFloat(infoRetencion.alicuota) > 0) {
                                                                            infoRetencion.importe = toFixedOK(parseFloat(parseFloat(parseFloat(infoRetencion.baseImponible) * (parseFloat(infoRetencion.alicuota) / 100))), 2);
                                                                            // log.debug(proceso, 'infoRetencion.importe: ' + infoRetencion.importe);
                                                                        }
                                                                    }
                                                                    log.debug('Line 2587 flag', 'infoRetencion:' + JSON.stringify(infoRetencion));

                                                                    //AGREGAR DETALLE DE RETENCION
                                                                    if (!utilities.isEmpty(infoRetencion)) {

                                                                        if (!utilities.isEmpty(infoRetencion.codigo) && !utilities.isEmpty(infoRetencion.importe) && !utilities.isEmpty(infoRetencion.alicuota) && !utilities.isEmpty(infoRetencion.baseImponible)) {
                                                                            log.debug('Line 2591 flag', 'indicadorFacturacion:' + indicadorFacturacion);
                                                                            if (indicadorFacturacion == 9) {
                                                                                importeRetenidoPercibido = toFixedOK(parseFloat(parseFloat(importeRetenidoPercibido) + ((parseFloat(infoRetencion.importe)) * (parseFloat(-1)))), 2);
                                                                            } else {
                                                                                importeRetenidoPercibido = toFixedOK(parseFloat((parseFloat(importeRetenidoPercibido) + parseFloat(infoRetencion.importe))), 2);
                                                                            }

                                                                            if (utilities.isEmpty(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion)) {
                                                                                //GENERO EL ARRAY
                                                                                objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion = [];
                                                                            }

                                                                            objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion.push(infoRetencion);

                                                                            //AGREGAR A TOTALES
                                                                            var indice = -1;
                                                                            if (objetoRespuesta.detalleTotalesPercyRet.length > 0) {
                                                                                var codigoPercEncontrado = false;
                                                                                for (var indicePerc = 0; !utilities.isEmpty(objetoRespuesta.detalleTotalesPercyRet) && indicePerc < objetoRespuesta.detalleTotalesPercyRet.length && codigoPercEncontrado == false; indicePerc++) {
                                                                                    if (objetoRespuesta.detalleTotalesPercyRet[indicePerc].codigo == infoRetencion.codigo) {
                                                                                        codigoPercEncontrado = true;
                                                                                        indice = indicePerc;
                                                                                    }
                                                                                }
                                                                            }

                                                                            if (indice >= 0) {
                                                                                if (indicadorFacturacion == 9) {
                                                                                    objetoRespuesta.detalleTotalesPercyRet[indice].importe = toFixedOK(parseFloat((parseFloat(objetoRespuesta.detalleTotalesPercyRet[indice].importe) + (parseFloat(infoRetencion.importe)) * (parseFloat(-1)))), 2);
                                                                                } else {
                                                                                    objetoRespuesta.detalleTotalesPercyRet[indice].importe = toFixedOK(parseFloat((parseFloat(objetoRespuesta.detalleTotalesPercyRet[indice].importe) + parseFloat(infoRetencion.importe))), 2);
                                                                                }
                                                                            } else {
                                                                                var infoPercYRet = {};
                                                                                infoPercYRet.codigo = infoRetencion.codigo;
                                                                                if (indicadorFacturacion == 9) {
                                                                                    infoPercYRet.importe = parseFloat(parseFloat(infoRetencion.importe) * (parseFloat(-1)));
                                                                                } else {
                                                                                    infoPercYRet.importe = parseFloat(infoRetencion.importe);
                                                                                }
                                                                                objetoRespuesta.detalleTotalesPercyRet.push(infoPercYRet);
                                                                            }

                                                                        } else {
                                                                            errorEncontrado = true;
                                                                            mensajeError = "Error obteniendo la siguiente información de la línea de URU-Detalle Retención: ";
                                                                            if (utilities.isEmpty(infoRetencion.codigo))
                                                                                mensajeError = mensajeError + " Código / ";
                                                                            if (utilities.isEmpty(infoRetencion.importe))
                                                                                mensajeError = mensajeError + " Importe / ";
                                                                            if (utilities.isEmpty(infoRetencion.alicuota))
                                                                                mensajeError = mensajeError + " Alicuota / ";
                                                                            if (utilities.isEmpty(infoRetencion.baseImponible))
                                                                                mensajeError = mensajeError + " Base de calculo / ";

                                                                            //mensajeError = mensajeError + " - Número de línea : " + k;
                                                                            mensajeError = mensajeError + " - Número de línea : " + subListaContador;
                                                                            mensajeError = mensajeError + " - ID transacción: " + idTransaccion;
                                                                            log.error(proceso, mensaje);
                                                                        }
                                                                    } else {
                                                                        // Error Obteniendo Informacion de la Linea de Percepcion/Retencion/Credito Fiscal
                                                                        errorEncontrado = true;
                                                                        mensajeError = "Error obteniendo información de la línea de retención - Número de línea: " + subListaContador;
                                                                        //mensajeError = "Error obteniendo información de la línea de retención - Número de línea: " + k;
                                                                        mensajeError = mensajeError + " - ID transacción: " + idTransaccion;
                                                                        log.error(proceso, mensaje);
                                                                    }
                                                                }
                                                                // FIN - Agregar Informacion de Percepcion
                                                                cantidadLineas++;
                                                            } else {
                                                                // Falta Informacion Obligatoria de la Linea de la Transacción
                                                                errorEncontrado = true;
                                                                mensajeError = "Falta la siguiente información de la línea de la transacción: ";
                                                                if (utilities.isEmpty(columnaIndFacturacion))
                                                                    mensajeError = mensajeError + "Columna de acumulación del indicador de facturacion / ";
                                                                if (utilities.isEmpty(indicadorFacturacion))
                                                                    mensajeError = mensajeError + "Indicador de facturación / ";

                                                                mensajeError = mensajeError + "- Numero de linea : " + subListaContador;
                                                                //mensajeError = mensajeError + "- Numero de linea : " + k;
                                                                mensajeError = mensajeError + " - ID transacción : " + idTransaccion;
                                                                log.error(proceso, mensaje);
                                                            }
                                                        } // FIN del For para verificar sublista detalles resguardos
                                                        log.debug("Line 2755", "Se termino el bucle for");
                                                        if ((!utilities.isEmpty(referenciaGlobal) && (referenciaGlobal == 'T' || referenciaGlobal == true) && tipoTransaccion == 'customtransaction_l598_resguardos') && !errorEncontrado) {

                                                            var sublistaRefCFE = 'recmachcustrecord_l598_info_referencia_transac';
                                                            let sublistaRefCFELines = record_transaccion.getLineCount(sublistaRefCFE);
                                                            var razonComprobanteReferencia = '';

                                                            //SE AGREGA ESTA VALIDACION YA QUE LA DGI PERMITE UN MAXIMO DE 40 LINEAS DE REFERENCIAS PARA LOS COMPROBANTES
                                                            if (sublistaRefCFELines > 40) {
                                                                sublistaRefCFELines = 40;
                                                            }

                                                            for (var subListaContador = 0; subListaContador < sublistaRefCFELines && !errorEncontrado; subListaContador++) {
                                                                razonComprobanteReferencia = record_transaccion.getSublistValue({ sublistId: sublistaRefCFE, fieldId: 'custrecord_l598_info_referencia_razon', line: subListaContador });

                                                                if (!utilities.isEmpty(razonComprobanteReferencia)) {
                                                                    var infoReferencia = {};
                                                                    infoReferencia.indicadorRefGlobal = 1;
                                                                    infoReferencia.razon = razonComprobanteReferencia;
                                                                    objetoRespuesta.detalleReferencia.push(infoReferencia);
                                                                }
                                                            }
                                                        }
                                                        log.debug("Line 2755", "Se termino la obtencion de referencia");
                                                    }
                                                    // FIN - Verificación de transacción de resguardos

                                                    // log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                                    // INICIO - Considerar Costos de Envio
                                                    if (errorEncontrado == false) {

                                                        costoEnvio = "";

                                                        if (costoEnvio != 0.00 && costoEnvio != 0 && costoEnvio != "") {

                                                            const porcentajeImpEnvio = record_transaccion.getValue({ fieldId: 'shippingtax1rate' });
                                                            let porcentajeImpEnvioFinal = 0;

                                                            if (!utilities.isEmpty(porcentajeImpEnvio)) {
                                                                porcentajeImpEnvioFinal = parseFloat((parseFloat(porcentajeImpEnvio) / 100));
                                                            }
                                                            const tipoImpEnvio = record_transaccion.getValue({ fieldId: 'shippingtaxcode' });

                                                            if (!utilities.isEmpty(tipoImpEnvio)) {

                                                                // Busco el Tipo de Impuesto
                                                                let indicadorFacturacionEnvio = '';
                                                                let columnaIndicadorFacturacionEnvio = '';

                                                                var filtros = [];
                                                                var filtro = {};
                                                                filtro.name = 'internalid';
                                                                filtro.operator = 'IS';
                                                                filtro.values = tipoImpEnvio;
                                                                filtros.push(filtro);

                                                                if (!utilities.isEmpty(subsidiaria)) {
                                                                    var filtro = {};
                                                                    filtro.name = 'subsidiary';
                                                                    filtro.operator = 'ANYOF';
                                                                    filtro.values = subsidiaria;
                                                                    filtros.push(filtro);
                                                                }

                                                                var objResultSet = utilities.searchSavedPro('customsearch_l598_generacion_cae_cod_imp', filtros);

                                                                if (objResultSet.error) {
                                                                    errorEncontrado = true;
                                                                    mensajeError = 'Error Consultando searchSavedPro - customsearch_l598_generacion_cae_cod_imp - Detalles del Error: ' + objResultSet.descripcion;
                                                                    mensajeError = mensajeError + " - ID Transaccion: " + idTransaccion;
                                                                    log.error(proceso, mensajeError);
                                                                } else {

                                                                    let resultSet = objResultSet.objRsponseFunction.result;
                                                                    let resultSearch = objResultSet.objRsponseFunction.search;

                                                                    if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {

                                                                        indicadorFacturacionEnvio = resultSet[0].getValue({ name: resultSearch.columns[2] });
                                                                        columnaIndicadorFacturacionEnvio = resultSet[0].getValue({ name: resultSearch.columns[3] });

                                                                        if (!utilities.isEmpty(indicadorFacturacionEnvio)) {

                                                                            if (!utilities.isEmpty(columnaIndicadorFacturacionEnvio)) {

                                                                                switch (parseInt(columnaIndicadorFacturacionEnvio, 10)) {

                                                                                    case 1:
                                                                                        // Extento IVA
                                                                                        importeExento = parseFloat((parseFloat(importeExento) + parseFloat((costoEnvio))));
                                                                                        break;
                                                                                    case 2:
                                                                                        // IVA TASA Minima
                                                                                        importeIVATasaMinima = parseFloat(parseFloat(importeIVATasaMinima) + parseFloat((parseFloat(costoEnvio) * parseFloat(porcentajeImpEnvioFinal))));
                                                                                        importeNetoGravadoTasaMinima = parseFloat((parseFloat(importeNetoGravadoTasaMinima) + parseFloat((costoEnvio))));
                                                                                        break;
                                                                                    case 3:
                                                                                        // IVA TASA Basica
                                                                                        importeIVATasaBasica = parseFloat(parseFloat(importeIVATasaBasica) + parseFloat((parseFloat(costoEnvio) * parseFloat(porcentajeImpEnvioFinal))));
                                                                                        importeNetoGravadoTasaBasica = parseFloat((parseFloat(importeNetoGravadoTasaBasica) + parseFloat((costoEnvio))));
                                                                                        break;
                                                                                    case 4:
                                                                                        // Otra Tasa
                                                                                        importeIVAOtraTasa = parseFloat(parseFloat(importeIVAOtraTasa) + parseFloat((parseFloat(costoEnvio) * parseFloat(porcentajeImpEnvioFinal))));
                                                                                        importeNetoGravadoOtraTasa = parseFloat((parseFloat(importeNetoGravadoOtraTasa) + parseFloat((costoEnvio))));
                                                                                        break;
                                                                                    case 5:
                                                                                        // Entrega Gratuita
                                                                                        break;
                                                                                    case 6:
                                                                                        // No Facturable
                                                                                        //importeNoFacturable = parseFloat(parseFloat(importeNoFacturable, 10) + parseFloat(transImpImpuesto), 10);
                                                                                        importeNoFacturable = parseFloat((parseFloat(importeNoFacturable) + parseFloat((costoEnvio))));
                                                                                        break;
                                                                                    case 7:
                                                                                        // No Facturable Negativo
                                                                                        importeNoFacturable = parseFloat((parseFloat(importeNoFacturable) - parseFloat((Math.abs(costoEnvio)))));
                                                                                        break;
                                                                                    case 8:
                                                                                        // Item A Rebajar en Remito
                                                                                        break;
                                                                                    case 9:
                                                                                        // Item A Rebajar en Resguardo
                                                                                        break;
                                                                                    case 10:
                                                                                        // Exportacion Y Asimiladas
                                                                                        importeExpYAsimiladas = parseFloat((parseFloat(importeExpYAsimiladas) + parseFloat((costoEnvio))));
                                                                                        break;
                                                                                    case 11:
                                                                                        // Impuesto Percibido/Retencion/Credito Fiscal
                                                                                        esPercepcionRetCred = true;
                                                                                        //importePercepciones = parseFloat((parseFloat(importePercepciones, 10) + parseFloat(parseFloat((transImpImpuesto), 10), 10)), 10);
                                                                                        break;
                                                                                    case 12:
                                                                                        // IVA en Suspenso
                                                                                        importeIVASuspenso = parseFloat(parseFloat(importeIVASuspenso) + parseFloat((parseFloat(costoEnvio) * parseFloat(porcentajeImpEnvioFinal))));
                                                                                        importeNetoGravadoIVASuspenso = parseFloat((parseFloat(importeNetoGravadoIVASuspenso) + parseFloat((costoEnvio))));
                                                                                        break;
                                                                                    default:
                                                                                        // Columna de Acumulacion Invalida
                                                                                        errorEncontrado = true;
                                                                                        mensajeError = "La Columna de Acumulación del Indicador de Facturación con Código: " + indicadorFacturacion + " es Inválida para el Costo de Envío";
                                                                                        mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                                        log.error(proceso, mensajeError);
                                                                                }

                                                                                if (errorEncontrado == false) {

                                                                                    informacionLinea = {};

                                                                                    let nombreCostoEnvio = record_transaccion.getValue({ fieldId: 'custbody_l598_nom_art_costo_env' });
                                                                                    if (utilities.isEmpty(nombreCostoEnvio))
                                                                                        nombreCostoEnvio = "";

                                                                                    let unidadMedidaCostoEnvio = record_transaccion.getValue({ fieldId: 'custbody_l598_cod_um_cost_env' });
                                                                                    if (utilities.isEmpty(unidadMedidaCostoEnvio))
                                                                                        unidadMedidaCostoEnvio = "";

                                                                                    informacionLinea.indicadorFacturacion = indicadorFacturacionEnvio;
                                                                                    informacionLinea.columnaIndFacturacion = columnaIndicadorFacturacionEnvio;
                                                                                    informacionLinea.indicadorAgente = '';
                                                                                    informacionLinea.nombreItem = nombreCostoEnvio;
                                                                                    informacionLinea.DescripcionAdicional = '';
                                                                                    informacionLinea.cantidad = parseInt(1, 10);
                                                                                    informacionLinea.unidadMedida = unidadMedidaCostoEnvio;
                                                                                    informacionLinea.precioUnitario = toFixedOK(parseFloat(costoEnvio), 2);
                                                                                    informacionLinea.descuentoEnPorcentaje = 0;
                                                                                    //log.debug(proceso, 'informacionLinea.descuentoEnPorcentaje: ' + informacionLinea.descuentoEnPorcentaje);
                                                                                    informacionLinea.montoDescuento = 0;
                                                                                    informacionLinea.recargoEnPorcentaje = 0;
                                                                                    informacionLinea.montoRecargo = 0;
                                                                                    informacionLinea.montoItem = toFixedOK(parseFloat(costoEnvio), 2);

                                                                                    objetoRespuesta.detalleLineas.push(informacionLinea);

                                                                                    cantidadLineas++;
                                                                                }
                                                                            } else {
                                                                                errorEncontrado = true;
                                                                                mensajeError = "Error obteniendo la Columna de Acumulación del Indicador de Facturación para el Costo de Envío";
                                                                                mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                                log.error(proceso, mensajeError);
                                                                            }
                                                                        } else {
                                                                            errorEncontrado = true;
                                                                            mensajeError = "Error obteniendo el Indicador de Facturación para el Costo de Envío";
                                                                            mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                            log.error(proceso, mensajeError);
                                                                        }
                                                                    } else {
                                                                        errorEncontrado = true;
                                                                        mensajeError = "Error obteniendo el Indicador de Facturación para el Costo de Envío";
                                                                        mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                        log.error(proceso, mensajeError);
                                                                        log.error(proceso, mensajeError);
                                                                    }
                                                                }
                                                            } else {
                                                                errorEncontrado = true;
                                                                mensajeError = "Error obteniendo el Tipo de Impuesto para el Costo de Envío";
                                                                mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                log.error(proceso, mensajeError);
                                                            }
                                                        }
                                                    }
                                                    // FIN - Considerar Costos de Envio

                                                    // INICIO - Considerar Costos de Manipulacion
                                                    if (errorEncontrado == false) {

                                                        log.debug(proceso, 'Costo de Manipulacion ');

                                                        CostoManipulacion = "";

                                                        log.debug(proceso, 'Costo de Manipulacion: ' + CostoManipulacion);

                                                        if (CostoManipulacion != 0.00 && CostoManipulacion != 0 && CostoManipulacion != "") {

                                                            const porcentajeImpManipulacion = record_transaccion.getValue({ fieldId: 'handlingtax1rate' });
                                                            let porcentajeImpManipulacionFinal = 0;

                                                            if (!utilities.isEmpty(porcentajeImpManipulacion)) {
                                                                porcentajeImpManipulacionFinal = parseFloat((parseFloat(porcentajeImpManipulacion) / 100));
                                                            }
                                                            const tipoImpManipulacion = record_transaccion.getValue({ fieldId: 'handlingtaxcode' });

                                                            if (!utilities.isEmpty(tipoImpManipulacion)) {

                                                                // Busco el Tipo de Impuesto
                                                                let indicadorFacturacionManipulacion = '';
                                                                let columnaIndicadorFacturacionManipulacion = '';

                                                                var filtros = [];
                                                                var filtro = {};
                                                                filtro.name = 'internalid';
                                                                filtro.operator = 'IS';
                                                                filtro.values = tipoImpManipulacion;
                                                                filtros.push(filtro);

                                                                if (!utilities.isEmpty(subsidiaria)) {
                                                                    var filtro = {};
                                                                    filtro.name = 'subsidiary';
                                                                    filtro.operator = 'ANYOF';
                                                                    filtro.values = subsidiaria;
                                                                    filtros.push(filtro);
                                                                }

                                                                var objResultSet = utilities.searchSavedPro('customsearch_l598_generacion_cae_cod_imp', filtros);

                                                                if (objResultSet.error) {
                                                                    errorEncontrado = true;
                                                                    mensajeError = 'Error Consultando searchSavedPro - customsearch_l598_generacion_cae_cod_imp - Detalles del Error: ' + objResultSet.descripcion;
                                                                    mensajeError = mensajeError + " - ID Transaccion: " + idTransaccion;
                                                                    log.error(proceso, mensajeError);
                                                                } else {

                                                                    let resultSet = objResultSet.objRsponseFunction.result;
                                                                    let resultSearch = objResultSet.objRsponseFunction.search;

                                                                    if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {

                                                                        indicadorFacturacionManipulacion = resultSet[0].getValue({ name: resultSearch.columns[2] });
                                                                        columnaIndicadorFacturacionManipulacion = resultSet[0].getValue({ name: resultSearch.columns[3] });

                                                                        if (!utilities.isEmpty(indicadorFacturacionManipulacion)) {

                                                                            if (!utilities.isEmpty(columnaIndicadorFacturacionManipulacion)) {

                                                                                switch (parseInt(columnaIndicadorFacturacionManipulacion, 10)) {

                                                                                    case 1:
                                                                                        // Extento IVA
                                                                                        importeExento = parseFloat((parseFloat(importeExento) + parseFloat((CostoManipulacion))));
                                                                                        break;
                                                                                    case 2:
                                                                                        // IVA TASA Minima
                                                                                        importeIVATasaMinima = parseFloat(parseFloat(importeIVATasaMinima) + parseFloat((parseFloat(CostoManipulacion) * parseFloat(porcentajeImpManipulacionFinal))));
                                                                                        importeNetoGravadoTasaMinima = parseFloat((parseFloat(importeNetoGravadoTasaMinima) + parseFloat((CostoManipulacion))));
                                                                                        break;
                                                                                    case 3:
                                                                                        // IVA TASA Basica
                                                                                        importeIVATasaBasica = parseFloat(parseFloat(importeIVATasaBasica) + parseFloat((parseFloat(CostoManipulacion) * parseFloat(porcentajeImpManipulacionFinal))));
                                                                                        importeNetoGravadoTasaBasica = parseFloat((parseFloat(importeNetoGravadoTasaBasica) + parseFloat((CostoManipulacion))));
                                                                                        break;
                                                                                    case 4:
                                                                                        // Otra Tasa
                                                                                        importeIVAOtraTasa = parseFloat(parseFloat(importeIVAOtraTasa) + parseFloat((parseFloat(CostoManipulacion) * parseFloat(porcentajeImpManipulacionFinal))));
                                                                                        importeNetoGravadoOtraTasa = parseFloat((parseFloat(importeNetoGravadoOtraTasa) + parseFloat((CostoManipulacion))));
                                                                                        break;
                                                                                    case 5:
                                                                                        // Entrega Gratuita
                                                                                        break;
                                                                                    case 6:
                                                                                        // No Facturable
                                                                                        //importeNoFacturable = parseFloat(parseFloat(importeNoFacturable, 10) + parseFloat(transImpImpuesto), 10);
                                                                                        importeNoFacturable = parseFloat((parseFloat(importeNoFacturable) + parseFloat((CostoManipulacion))));
                                                                                        break;
                                                                                    case 7:
                                                                                        // No Facturable Negativo
                                                                                        importeNoFacturable = parseFloat((parseFloat(importeNoFacturable) - parseFloat((Math.abs(CostoManipulacion)))));
                                                                                        break;
                                                                                    case 8:
                                                                                        // Item A Rebajar en Remito
                                                                                        break;
                                                                                    case 9:
                                                                                        // Item A Rebajar en Resguardo
                                                                                        break;
                                                                                    case 10:
                                                                                        // Exportacion Y Asimiladas
                                                                                        importeExpYAsimiladas = parseFloat((parseFloat(importeExpYAsimiladas) + parseFloat((CostoManipulacion))));
                                                                                        break;
                                                                                    case 11:
                                                                                        // Impuesto Percibido/Retencion/Credito Fiscal
                                                                                        esPercepcionRetCred = true;
                                                                                        break;
                                                                                    case 12:
                                                                                        // IVA en Suspenso
                                                                                        importeIVASuspenso = parseFloat(parseFloat(importeIVASuspenso) + parseFloat((parseFloat(CostoManipulacion) * parseFloat(porcentajeImpManipulacionFinal))));
                                                                                        importeNetoGravadoIVASuspenso = parseFloat((parseFloat(importeNetoGravadoIVASuspenso) + parseFloat((CostoManipulacion))));
                                                                                        break;
                                                                                    default:
                                                                                        // Columna de Acumulacion Invalida
                                                                                        errorEncontrado = true;
                                                                                        mensajeError = "La Columna de Acumulación del Indicador de Facturación con Código: " + indicadorFacturacion + " es Inválida para el Costo de Manipulación";
                                                                                        mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                                        log.error(proceso, mensajeError);
                                                                                }

                                                                                if (errorEncontrado == false) {

                                                                                    informacionLinea = {};

                                                                                    let nombreCostoManipulacion = record_transaccion.getValue({ fieldId: 'custbody_l598_nom_art_costo_man' });
                                                                                    if (utilities.isEmpty(nombreCostoManipulacion))
                                                                                        nombreCostoManipulacion = "";

                                                                                    let unidadMedidaCostoManipulacion = record_transaccion.getValue({ fieldId: 'custbody_l598_cod_um_cost_man' });
                                                                                    if (utilities.isEmpty(unidadMedidaCostoManipulacion))
                                                                                        unidadMedidaCostoManipulacion = "";

                                                                                    informacionLinea.indicadorFacturacion = indicadorFacturacionManipulacion;
                                                                                    informacionLinea.columnaIndFacturacion = columnaIndicadorFacturacionManipulacion;
                                                                                    informacionLinea.indicadorAgente = '';
                                                                                    informacionLinea.nombreItem = nombreCostoManipulacion;
                                                                                    informacionLinea.DescripcionAdicional = '';
                                                                                    informacionLinea.cantidad = parseInt(1, 10);
                                                                                    informacionLinea.unidadMedida = unidadMedidaCostoManipulacion;
                                                                                    informacionLinea.precioUnitario = toFixedOK(parseFloat(CostoManipulacion), 2);
                                                                                    informacionLinea.descuentoEnPorcentaje = 0;
                                                                                    informacionLinea.montoDescuento = 0;
                                                                                    informacionLinea.recargoEnPorcentaje = 0;
                                                                                    informacionLinea.montoRecargo = 0;
                                                                                    informacionLinea.montoItem = toFixedOK(parseFloat(CostoManipulacion), 2);

                                                                                    objetoRespuesta.detalleLineas.push(informacionLinea);

                                                                                    cantidadLineas++;
                                                                                }
                                                                            } else {
                                                                                errorEncontrado = true;
                                                                                mensajeError = "Error obteniendo la Columna de Acumulación del Indicador de Facturación para el Costo de Envío";
                                                                                mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                                log.error(proceso, mensajeError);
                                                                            }
                                                                        } else {
                                                                            errorEncontrado = true;
                                                                            mensajeError = "Error obteniendo el Indicador de Facturación para el Costo de Envío";
                                                                            mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                            log.error(proceso, mensajeError);
                                                                        }
                                                                    } else {
                                                                        errorEncontrado = true;
                                                                        mensajeError = "Error obteniendo el Indicador de Facturación para el Costo de Envío";
                                                                        mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                        log.error(proceso, mensajeError);
                                                                        log.error(proceso, mensajeError);
                                                                    }
                                                                }
                                                            } else {
                                                                errorEncontrado = true;
                                                                mensajeError = "Error obteniendo el Tipo de Impuesto para el Costo de Manipulación";
                                                                mensajeError = mensajeError + " - ID Transacción: " + idTransaccion;
                                                                log.error(proceso, mensajeError);
                                                            }
                                                        }
                                                    }
                                                    log.debug("Line 3155", "Flag para ver si se termino la zona de costo de manipulacion");
                                                    // FIN - Considerar Costos de Manipulacion

                                                    // log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());



                                                    // INICIO - Verificación de URU-INDICADOR IVA LINEAS DETALLE
                                                    // FIN - Verificación de URU-INDICADOR IVA LINEAS DETALLE

                                                    // log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                                    // INICIO - Validaciones y seteos finales

                                                    if (errorEncontrado == false) {
                                                        log.debug("Line 3187", "Flag para ver si el encontrado es false");
                                                        // Genero el Objeto de Respuesta
                                                        objetoRespuesta.informacionTotalesEncabezado.totalMontoNoGravado = toFixedOK(parseFloat((parseFloat(importeExento) + parseFloat(importeNoGravado))), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.totalMontoExpYAsimiladas = toFixedOK(parseFloat(importeExpYAsimiladas), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.totalMontoImpuestoPercibido = toFixedOK(parseFloat(importePercepciones), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.totalMontoIVASuspenso = toFixedOK(parseFloat(importeIVASuspenso), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.totalMontoIVATasaMinima = (!isNaN(importeNetoGravadoTasaMinima) && importeNetoGravadoTasaMinima > 0) ? toFixedOK(parseFloat(importeNetoGravadoTasaMinima), 2) : 0.00;
                                                        objetoRespuesta.informacionTotalesEncabezado.totalMontoIVATasaBasica = (!isNaN(importeNetoGravadoTasaBasica) && importeNetoGravadoTasaBasica > 0) ? toFixedOK(parseFloat(importeNetoGravadoTasaBasica), 2) : 0.00;
                                                        objetoRespuesta.informacionTotalesEncabezado.totalMontoIVAOtraTasa = toFixedOK(parseFloat(importeNetoGravadoOtraTasa), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.porcentajeTasaMinima = toFixedOK(parseFloat(tasaMinimaIVA), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.porcentajeTasaBasica = toFixedOK(parseFloat(tasaBasicaIVA), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.totalIVATasaMinima = toFixedOK(parseFloat(importeIVATasaMinima), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.totalIVATasaBasica = toFixedOK(parseFloat(importeIVATasaBasica), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.totalIVAOtraTasa = toFixedOK(parseFloat(importeIVAOtraTasa), 2);
                                                        const montoTransaccionTOTAL = parseFloat((parseFloat(importeExento) + parseFloat(importeNoGravado) + parseFloat(importeExpYAsimiladas) + parseFloat(importePercepciones) +
                                                            parseFloat(importeNetoGravadoIVASuspenso) + parseFloat(importeNetoGravadoTasaMinima) + parseFloat(importeNetoGravadoTasaBasica) +
                                                            parseFloat(importeNetoGravadoOtraTasa) + parseFloat(toFixedOK(parseFloat(importeIVATasaMinima), 2)) + parseFloat(toFixedOK(parseFloat(importeIVATasaBasica), 2)) + parseFloat(toFixedOK(parseFloat(importeIVAOtraTasa), 2))));
                                                        objetoRespuesta.informacionTotalesEncabezado.totalMontoTotal = toFixedOK(parseFloat(montoTransaccionTOTAL), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.totalMontoRetenido = toFixedOK(parseFloat(importeRetenidoPercibido), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.totalCreditosFiscales = toFixedOK(parseFloat(importeCreditosFiscales), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.cantidadLineas = cantidadLineas;
                                                        const montoNoFacturable = parseFloat(importeNoFacturable);
                                                        objetoRespuesta.informacionTotalesEncabezado.montoNoFacturable = toFixedOK(parseFloat(montoNoFacturable), 2);
                                                        objetoRespuesta.informacionTotalesEncabezado.montoTotalAPagar = toFixedOK(parseFloat((parseFloat(montoTransaccionTOTAL) + parseFloat(importeRetenidoPercibido) + parseFloat(montoNoFacturable))), 2);
                                                        log.debug("Line 3212", "Flag para verificacion comprobante asociado antes");
                                                        log.debug("Line 3214", "columns[47]:" + JSON.stringify(columns[47]));
                                                        log.debug("Line 3215", "columns[46]:" + JSON.stringify(columns[46]));
                                                        // Inicio para Comprobante Asociado
                                                        var referenciaGlobal = nvl(resultadoIndividual.getValue({ name: columns[47] }), '');
                                                        log.debug("Line 3215", "Flag para verificacion comprobante asociado antes");
                                                        const tipoComprobanteReferencia = nvl(resultadoIndividual.getValue({ name: columns[46] }), '');
                                                        const serieComprobanteReferencia = nvl(resultadoIndividual.getValue({ name: columns[57] }), '');
                                                        const nroComprobanteReferencia = nvl(resultadoIndividual.getValue({ name: columns[48] }), 0);
                                                        log.debug("Line 3219", "Flag para verificacion comprobante asociado antes");
                                                        const fechaComprobanteReferencia = nvl(resultadoIndividual.getValue({ name: columns[49] }), '');
                                                        const montoComprobanteReferencia = nvl(resultadoIndividual.getValue({ name: columns[86] }), 0);
                                                        const monedaComprobanteReferencia = nvl(resultadoIndividual.getValue({ name: columns[87] }), 0);
                                                        const tipocambioComprobanteReferencia = nvl(resultadoIndividual.getValue({ name: columns[88] }), 0);
                                                        var razonComprobanteReferencia = nvl(resultadoIndividual.getValue({ name: columns[50] }), '');

                                                        log.debug("Line 3220 ", "Flag de verificacion comprobante asociado");

                                                        if ((!utilities.isEmpty(referenciaGlobal) && (referenciaGlobal == 'T' || referenciaGlobal == true) && tipoTransaccion != 'customtransaction_l598_resguardos') || (!utilities.isEmpty(tipoComprobanteReferencia) && (!utilities.isEmpty(nroComprobanteReferencia) && nroComprobanteReferencia > 0))) {
                                                            var infoReferencia = {};
                                                            if ((!utilities.isEmpty(referenciaGlobal) && (referenciaGlobal == 'T' || referenciaGlobal == true))) {
                                                                infoReferencia.indicadorRefGlobal = 1;
                                                                infoReferencia.tipoCFE = '';
                                                                infoReferencia.serie = '';
                                                                infoReferencia.numero = 0;
                                                                infoReferencia.fecha = '';
                                                                infoReferencia.monto = 0;
                                                                infoReferencia.moneda = '';
                                                                infoReferencia.tipocambio = 0;
                                                                infoReferencia.razon = razonComprobanteReferencia;
                                                            } else {
                                                                infoReferencia.indicadorRefGlobal = 0;
                                                                infoReferencia.tipoCFE = tipoComprobanteReferencia;
                                                                infoReferencia.serie = serieComprobanteReferencia;
                                                                infoReferencia.numero = nroComprobanteReferencia;
                                                                const anio = fechaComprobanteReferencia.substr(0, 4);
                                                                const mes = fechaComprobanteReferencia.substr(4, 2);
                                                                const dia = fechaComprobanteReferencia.substr(6, 2);

                                                                if (!utilities.isEmpty(anio) && !utilities.isEmpty(mes) && !utilities.isEmpty(dia)) {
                                                                    infoReferencia.fecha = anio + '-' + padding_left(mes.toString(), '0', 2) + '-' + padding_left(dia.toString(), '0', 2);
                                                                }
                                                                infoReferencia.monto = montoComprobanteReferencia;
                                                                infoReferencia.moneda = monedaComprobanteReferencia;
                                                                infoReferencia.tipocambio = tipocambioComprobanteReferencia;
                                                                infoReferencia.razon = razonComprobanteReferencia;
                                                            }
                                                            objetoRespuesta.detalleReferencia.push(infoReferencia);
                                                        }
                                                        log.debug("Line 3247", "flag de verificacion de referencia Global");
                                                        if (tipoTransaccion == 'customerpayment') {
                                                            const referenciasPago = obtenerReferenciasPago(record_transaccion);
                                                            log.debug(proceso, 'obtenerReferenciasPago RESPONSE: ' + JSON.stringify(referenciasPago));

                                                            if (!referenciasPago.error) {
                                                                objetoRespuesta.detalleReferencia = referenciasPago.data;
                                                            }
                                                        }
                                                        // Fin Para Comprobante Asociado

                                                    } else {
                                                        objetoRespuesta.error = true; // Hubo Error;
                                                        objetoRespuesta.tipo = tipoMensajeError;
                                                        objetoRespuesta.mensaje = mensajeError;
                                                        log.error(proceso, mensajeError);
                                                    }
                                                    // FIN - Validaciones y seteos finales

                                                    log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                                } else {
                                                    //El tipo de transaccion que intenta enviar supera la cantidad de lineas permitidas para la misma por DGI. Cantidad de lineas permitidas: 700 0 250 de acuerdo al tipo de transaccion
                                                    const cantidadLineasPermitidas = esETicket ? 700 : 250;
                                                    var mensaje = "El tipo de transacción que intenta enviar supera la cantidad de líneas permitidas para la misma por DGI. Cantidad de líneas permitidas: " + cantidadLineasPermitidas;
                                                    objetoRespuesta.error = true;
                                                    objetoRespuesta.tipo = tipoMensajeError;
                                                    objetoRespuesta.mensaje = mensaje;
                                                    log.error(proceso, mensaje);
                                                }
                                            } else {
                                                // Falta Configurar Tasa Minima de IVA / Tasa Basica de IVA en la Transacción
                                                var mensaje = "";
                                                if (utilities.isEmpty(tasaMinimaIVA) && utilities.isEmpty(tasaBasicaIVA)) {
                                                    mensaje = "Falta Configurar La Tasa Mínima de IVA y La Tasa Básica de IVA en la Transacción";
                                                } else {
                                                    if (utilities.isEmpty(tasaMinimaIVA)) {
                                                        mensaje = "Falta Configurar La Tasa Mínima de IVA en la Transacción";
                                                    } else {
                                                        mensaje = "Falta Configurar La Tasa Básica de IVA en la Transacción";
                                                    }
                                                }

                                                mensaje = mensaje + " - ID Transacción: " + idTransaccion;

                                                objetoRespuesta.error = true;
                                                objetoRespuesta.tipo = tipoMensajeError;
                                                objetoRespuesta.mensaje = mensaje;
                                                log.error(proceso, mensaje);
                                            }
                                        } else {
                                            // Falta Configurar Tipo de Cambio de la Transacción
                                            var mensaje = "Falta Configurar El Tipo de Cambio de la Transacción - ID Transacción: " + idTransaccion;
                                            objetoRespuesta.error = true;
                                            objetoRespuesta.tipo = tipoMensajeError;
                                            objetoRespuesta.mensaje = mensaje;
                                            log.error(proceso, mensaje);
                                        }
                                    } else {
                                        // Falta Configurar Moneda de la Transacción o Codigo ISO de Moneda
                                        var mensaje = "Falta Configurar Moneda de la Transacción o el Código ISO de Moneda en la Configuración de Monedas - ID Transacción: " + idTransaccion;
                                        objetoRespuesta.error = true;
                                        objetoRespuesta.tipo = tipoMensajeError;
                                        objetoRespuesta.mensaje = mensaje;
                                        log.error(proceso, mensaje);
                                    }
                                } else {
                                    // Falta Informacion de Nombre,Direccion,Ciudad,Provincia,Pais del Cliente
                                    var mensaje = "Falta Configurar la siguiente información Requerida del Cliente: ";
                                    if (utilities.isEmpty(objetoRespuesta.informacionCliente.clienteNombre))
                                        mensaje = mensaje + " Nombre o Denominación del Cliente / ";
                                    if (utilities.isEmpty(objetoRespuesta.informacionCliente.clienteDireccion))
                                        mensaje = mensaje + " Dirección del Cliente / ";
                                    if (utilities.isEmpty(objetoRespuesta.informacionCliente.clienteCiudad))
                                        mensaje = mensaje + " Ciudad del Cliente / ";
                                    if (esComprobanteExportacion == true) {
                                        if (utilities.isEmpty(objetoRespuesta.informacionCliente.clienteProvincia))
                                            mensaje = mensaje + " Provincia del Cliente / ";
                                        if (utilities.isEmpty(objetoRespuesta.informacionCliente.clientePais))
                                            mensaje = mensaje + " País del Cliente / ";
                                    }

                                    mensaje = mensaje + " - ID Transacción: " + idTransaccion;

                                    objetoRespuesta.error = true;
                                    objetoRespuesta.tipo = tipoMensajeError;
                                    objetoRespuesta.mensaje = mensaje;
                                    log.error(proceso, mensaje);
                                }
                            } else {
                                // Falta Configurar Pais de Origen o Codigo de Pais
                                var mensaje = "Falta Configurar País de Origen o Código de Pais del Cliente  - ID Transacción: " + idTransaccion;
                                objetoRespuesta.error = true;
                                objetoRespuesta.tipo = tipoMensajeError;
                                objetoRespuesta.mensaje = mensaje;
                                log.error(proceso, mensaje);
                            }
                        } else {
                            // Falta Configurar Tipo de Documento del Cliente
                            var mensaje = "Falta Configurar Tipo de Documento del Cliente - ID Transacción: " + idTransaccion;
                            objetoRespuesta.error = true;
                            objetoRespuesta.tipo = tipoMensajeError;
                            objetoRespuesta.mensaje = mensaje;
                            log.error(proceso, mensaje);
                        }
                    } else {
                        // Falta Ingresar Clausula de Venta,Modalidad de Venta , Via de Transporte Requerido para Comprobantes de Exportacion
                        var mensaje = "Falta Ingresar la siguiente información Requerida para las Transacciones de Exportación: ";

                        if (utilities.isEmpty(objetoRespuesta.informacionEncabezado.clausulaDeVenta)) {
                            mensaje = mensaje + " Clausula de Venta / ";
                            objetoRespuesta.informacionEncabezado.clausulaDeVenta = '';
                        }
                        if (utilities.isEmpty(objetoRespuesta.informacionEncabezado.modalidadDeVenta)) {
                            mensaje = mensaje + " Modalidad de Venta / ";
                            objetoRespuesta.informacionEncabezado.modalidadDeVenta = '';
                        }
                        if (!utilities.isEmpty(objetoRespuesta.informacionEncabezado.modalidadDeVenta) && objetoRespuesta.informacionEncabezado.modalidadDeVenta == 0) {
                            mensaje = mensaje + " Modalidad de Venta (Sin Definir) Inválida para Comprobantes de Exportación / ";
                            objetoRespuesta.informacionEncabezado.modalidadDeVenta = '';
                        }
                        if (utilities.isEmpty(objetoRespuesta.informacionEncabezado.viaDeTransporte)) {
                            mensaje = mensaje + " Vía de Transporte / ";
                            objetoRespuesta.informacionEncabezado.viaDeTransporte = '';
                        }
                        if (!utilities.isEmpty(objetoRespuesta.informacionEncabezado.viaDeTransporte) && objetoRespuesta.informacionEncabezado.viaDeTransporte == 0) {
                            mensaje = mensaje + " Vía de Transporte (Sin Definir) Inválida para Comprobantes de Exportación / ";
                            objetoRespuesta.informacionEncabezado.viaDeTransporte = '';
                        }

                        mensaje = mensaje + " - ID Transacción: " + idTransaccion;

                        objetoRespuesta.error = true;
                        objetoRespuesta.tipo = tipoMensajeError;
                        objetoRespuesta.mensaje = mensaje;
                        log.error(proceso, mensaje);
                    }
                } else {
                    var mensaje = "Falta Configurar la Fecha de la Transaccion - ID Transaccion: " + idTransaccion;
                    objetoRespuesta.error = true;
                    objetoRespuesta.tipo = tipoMensajeError;
                    objetoRespuesta.mensaje = mensaje;
                    log.error(proceso, mensaje);
                }
            } catch (error) {
                objetoRespuesta.error = true;
                objetoRespuesta.tipo = tipoMensajeError;
                objetoRespuesta.mensaje = 'Excepción al buscar información de la transacción - Detalles del error: ' + error.message;
                log.error(proceso, 'LINE 639 - Error: ' + objetoRespuesta.mensaje);
            }

            log.debug(proceso, 'Unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());
            return objetoRespuesta;
        }

        function nvl(valor, valorDefault) {
            return (utilities.isEmpty(valor)) ? valorDefault : valor;
        }

        function validarSiNumero(numero) {
            if (!/^([0-9])*$/.test(numero))
                return false;
            else
                return true;
        }

        function toFixedOK(valor, decimales) {
            const sign = valor >= 0 ? 1 : -1;
            return (Math.round((valor * Math.pow(10, decimales)) + (sign * 0.001)) / Math.pow(10, decimales)).toFixed(decimales);
        }

        /**
         * Retorna los datos de la solicitud de generación de CAE
         * @param {string} infoEnviadaAFIP - Información con los datos enviado para generar CAE
         * @param {string} descripcionErrorFinal - Descripción del mensaje final
         * @param {string} fechaSolicitudAFIPFinal - Fecha de la solicitud de CAE
         * @param {string} fechaRespuestaAFIPFinal - Fecha de la respuesta de CAE
         * @param {string} codigoSeguridad - Código de seguridad de CAE
         * @param {string} urlVerificacion - URL de verificación de CAE
         * @param {string} urlVerificacionQR - URL de verificación de QR de CAE
         * @param {string} caeNumero - Número de CAE
         * @param {string} caeSerie - Número de serie de CAE
         * @param {string} fechaFirma - Fecha de la Firma de CAE
         * @param {string} caeNroInicial - Número inicial de CAE
         * @param {string} caeNroFinal - Número final de CAE
         * @param {string} resolucionIVA - Resolución IVA
         * @param {string} correspondeSobre - Datos corresponde sobre
         * @param {string} CAE - Número de CAE generado
         * @param {string} CAEVencimientoFinal - Fecha Vencimiento de CAE.
         * @param {string} codigoBarras - Código de Barras de CAE.
         *
         * @return {object} informacionCAE - Objeto con la información de CAE.
         * @property {string} informacionCAE.infoEnviadaAFIP - Información con los datos enviado para generar CAE
         * @property {string} informacionCAE.descripcionErrorFinal - Descripción del mensaje final
         * @property {string} informacionCAE.fechaSolicitudAFIPFinal - Fecha de la solicitud de CAE
         * @property {string} informacionCAE.fechaRespuestaAFIPFinal - Fecha de la respuesta de CAE
         * @property {string} informacionCAE.codigoSeguridad - Código de seguridad de CAE
         * @property {string} informacionCAE.urlVerificacion - URL de verificación de CAE
         * @property {string} informacionCAE.urlVerificacionQR - URL de verificación de QR de CAE
         * @property {string} informacionCAE.caeNumero - Número de CAE
         * @property {string} informacionCAE.caeSerie - Número de serie de CAE
         * @property {string} informacionCAE.fechaFirma - Fecha de la Firma de CAE
         * @property {string} informacionCAE.caeNroInicial - Número inicial de CAE
         * @property {string} informacionCAE.caeNroFinal - Número final de CAE
         * @property {string} informacionCAE.resolucionIVA - Resolución IVA
         * @property {string} informacionCAE.correspondeSobre - Datos corresponde sobre
         * @property {string} informacionCAE.CAE - Número de CAE generado
         * @property {string} informacionCAE.CAEVencimientoFinal - Fecha Vencimiento de CAE.
         * @property {string} informacionCAE.codigoBarras - Código de Barras de CAE.
        */
        function agruparInformacionCAE(infoEnviadaAFIP, descripcionErrorFinal, fechaSolicitudAFIPFinal, fechaRespuestaAFIPFinal, codigoSeguridad, urlVerificacion, urlVerificacionQR, caeNumero, caeSerie, fechaFirma, caeNroInicial, caeNroFinal, resolucionIVA, correspondeSobre, CAE, CAEVencimientoFinal, codigoBarras) {

            const proceso = 'agruparInformacionCAE';
            const informacionCAE = {};

            try {
                informacionCAE.infoEnviadaAFIP = infoEnviadaAFIP;
                informacionCAE.descripcionErrorFinal = descripcionErrorFinal;
                informacionCAE.fechaSolicitudAFIPFinal = fechaSolicitudAFIPFinal;
                informacionCAE.fechaRespuestaAFIPFinal = fechaRespuestaAFIPFinal;
                informacionCAE.codigoSeguridad = codigoSeguridad;
                informacionCAE.urlVerificacion = urlVerificacion;
                informacionCAE.urlVerificacionQR = urlVerificacionQR;
                informacionCAE.caeNumero = caeNumero;
                informacionCAE.caeSerie = caeSerie;
                informacionCAE.fechaFirma = fechaFirma;
                informacionCAE.caeNroInicial = caeNroInicial;
                informacionCAE.caeNroFinal = caeNroFinal;
                informacionCAE.resolucionIVA = resolucionIVA;
                informacionCAE.correspondeSobre = correspondeSobre;
                informacionCAE.CAE = CAE;
                informacionCAE.CAEVencimientoFinal = CAEVencimientoFinal;
                informacionCAE.codigoBarras = codigoBarras;
            } catch (error) {
                log.error(proceso, 'Error al agrupar información de CAE - Detalles: ' + error.message);
            }

            return informacionCAE;
        }

        /**
         * Retorna los datos de CAE del RT URU-Factura Electronica Detalle Log
         * @param {Object} recordTransaction - Record Transacción
         *
         * @return {Object} response.
         * @property {int} response.informacionCAE - Información de CAE del registro de URU-Factura Electronica Detalle Log
         * @property {Boolean} response.error - True si existe un error en el proceso / False si no existe un error en el proceso
         * @property {String} response.mensaje - Mensaje de error generado
         * @property {Boolean} response.poseeCAE - True si existe CAE generado / False si no existe CAE generado
         */
        function verificarCAETransaccionDetalleLogFE(recordTransaction) {

            const proceso = 'verificarCAETransaccionDetalleLogFE';
            const response = { error: false, mensaje: '', informacionCAE: '', poseeCAE: false };

            log.debug(proceso, 'INICIO - verificarCAETransaccionDetalleLogFE');

            try {
                const cantDetalleLog = recordTransaction.getLineCount({ sublistId: 'recmachcustrecord_l598_fact_elec_dlog_rtrans' });
                log.debug(proceso, 'cantDetalleLog: ' + cantDetalleLog);

                for (let j = 0; j < cantDetalleLog; j++) {
                    recordTransaction.selectLine({ sublistId: 'recmachcustrecord_l598_fact_elec_dlog_rtrans', line: j });
                    const datosCAE = recordTransaction.getCurrentSublistValue({ sublistId: 'recmachcustrecord_l598_fact_elec_dlog_rtrans', fieldId: 'custrecord_l598_fact_elec_dlog_datos_cae' });
                    const caeGenerado = recordTransaction.getCurrentSublistValue({ sublistId: 'recmachcustrecord_l598_fact_elec_dlog_rtrans', fieldId: 'custrecord_l598_fact_elec_dlog_cae_gener' });

                    if (!utilities.isEmpty(datosCAE) && caeGenerado) {
                        response.informacionCAE = datosCAE;
                        response.poseeCAE = true;
                        j = cantDetalleLog;
                        break;
                    }
                }
            } catch (error) {
                response.mensaje = 'Error al extraer información de CAE del RT URU-Factura Electronica Detalle Log - Detalles: ' + error.message;
                response.error = true;
                log.error(proceso, response.mensaje);
            }

            log.debug(proceso, 'FIN - verificarCAETransaccionDetalleLogFE');
            return response;
        }

        /**
         * Graba los datos de la transacción con CAE
         * @param {Object} informacionCAE - Información de CAE
         * @param {string} recType - Tipo de Registro
         * @param {string} recordTransaction - Record Transacción
         * @param {Boolean} CAEGENERADO - True si existe CAE / False si no existe
         * @param {string} codigoEstadoSinError - Código de Mensaje sin Error
         * @param {string} tipoMensajeSinError - Tipo Mensaje sin Error
         * @param {string} erroresRespuesta - Mensaje Respuesta (incluyendo errores)
         * @param {string} punto_venta - Punto de Venta Transacción
         * @param {string} tipoTransaccion - Tipo Transacción L598
         * @param {string} refLog - Referencia al Log padre
         * @param {int} refTransaccion - ID Transacción
         * @param {string} serie - Número de Serie
         * @param {Object} informacionAuxiliarCAE - Información de CAE auxiliar para grabar en el registro de detalle log
         * @param {string} codigoEstadoError - Código Estado Error en CAE
         * @param {string} tipoMensajeErrorCAE - Tipo Mensaje de Error en CAE
         * @param {int} recId - ID Transacción
         */
        function grabarDatosCAE(informacionCAE, recType, recordTransaction, CAEGENERADO, codigoEstadoSinError, tipoMensajeSinError, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionAuxiliarCAE, codigoEstadoError, tipoMensajeErrorCAE, recId) {

            const proceso = 'grabarDatosCAE';
            let idLog;
            let cae = '';
            const returnObj = {};
            log.debug(proceso, 'INICIO - grabarDatosCAE');

            if (CAEGENERADO == true && !utilities.isEmpty(informacionCAE.CAE) && informacionCAE.CAE != "0" && informacionCAE.CAE != 0) {
                log.debug(proceso, 'Generación de CAE OK.');
                cae = informacionCAE.CAE;
                idLog = grabarError(codigoEstadoSinError, tipoMensajeSinError, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionAuxiliarCAE, recordTransaction);
            } else {
                log.debug(proceso, 'Generación de CAE NULL.');
                idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
            }

            const fecha = recordTransaction.getValue({ fieldId: 'trandate' })
            const date = new Date(fecha);

            let day = date.getDate();
            let month = date.getMonth() + 1;
            const year = date.getFullYear();

            day = day < 10 ? '0' + day : day;
            month = month < 10 ? '0' + month : month;

            const formattedDate = day + '/' + month + '/' + year;

            //if (recType != 'customtransaction_l598_resguardos') {
            recordTransaction.setValue({ fieldId: 'custbody_l598_cae_envio_dgi', value: informacionCAE.infoEnviadaAFIP });
            recordTransaction.setValue({ fieldId: 'custbody_l598_cae_respuesta_dgi', value: informacionCAE.descripcionErrorFinal });
            recordTransaction.setValue({ fieldId: 'custbody_l598_cae_fecha_hora_envio', value: informacionCAE.fechaSolicitudAFIPFinal });
            recordTransaction.setValue({ fieldId: 'custbody_l598_cae_fecha_hora_respuesta', value: informacionCAE.fechaRespuestaAFIPFinal });
            recordTransaction.setValue({ fieldId: 'custbody_l598_codigo_seguridad', value: informacionCAE.codigoSeguridad });
            recordTransaction.setValue({ fieldId: 'custbody_l598_url_verificacion', value: informacionCAE.urlVerificacion });
             recordTransaction.setValue({ fieldId: 'custbody_l598_url_verif_qr', value: informacionCAE.codigoBarras.replace("TRANSACTIONDATE", formattedDate)});
            recordTransaction.setValue({ fieldId: 'custbody_l598_cae_nro', value: informacionCAE.caeNumero });
            recordTransaction.setValue({ fieldId: 'custbody_l598_cae_serie', value: informacionCAE.caeSerie });
            recordTransaction.setValue({ fieldId: 'custbody_l598_fecha_firma', value: informacionCAE.fechaFirma });
            recordTransaction.setValue({ fieldId: 'custbody_l598_cae_nro_inicial', value: informacionCAE.caeNroInicial });
            recordTransaction.setValue({ fieldId: 'custbody_l598_cae_nro_final', value: informacionCAE.caeNroFinal });
            recordTransaction.setValue({ fieldId: 'custbody_l598_resolucion_iva', value: informacionCAE.resolucionIVA });
            recordTransaction.setValue({ fieldId: 'custbody_l598_corresponde_sobre', value: informacionCAE.correspondeSobre });
            recordTransaction.setValue({ fieldId: 'custbody_l598_cae', value: informacionCAE.CAE });
            recordTransaction.setValue({ fieldId: 'custbody_l598_cae_vto', value: informacionCAE.CAEVencimientoFinal });
            recordTransaction.setValue({ fieldId: 'custbody_l598_codigo_qr', value: informacionCAE.codigoBarras.replace("TRANSACTIONDATE", formattedDate)});
            //}

            if (!utilities.isEmpty(informacionCAE.CAE) && recType == 'customtransaction_l598_resguardos') {
                recordTransaction.setValue({ fieldId: 'transtatus', value: 'B' });
                const cantDetalleRet = recordTransaction.getLineCount({ sublistId: 'recmachcustrecord_l598_ret_detalle_resguardo' });

                for (let j = 0; j < cantDetalleRet; j++) {
                    try {
                        /* recordTransaction.selectLine({ sublistId: 'recmachcustrecord_l598_ret_detalle_resguardo', line: j });
                        recordTransaction.setCurrentSublistValue({ sublistId: 'recmachcustrecord_l598_ret_detalle_resguardo', fieldId: 'custrecord_l598_ret_detalle_status_resgu', value: 'B', ignoreFieldChange: false });
                        recordTransaction.commitLine({ sublistId: 'recmachcustrecord_l598_ret_detalle_resguardo' }); */
                        recordTransaction.selectLine({ sublistId: 'recmachcustrecord_l598_ret_detalle_resguardo', line: j });
                        recordTransaction.setCurrentSublistValue({ sublistId: 'recmachcustrecord_l598_ret_detalle_resguardo', fieldId: 'custrecord_l598_ret_detalle_status_resgu', value: 'B', ignoreFieldChange: false });
                        recordTransaction.commitLine({ sublistId: 'recmachcustrecord_l598_ret_detalle_resguardo' });
                    } catch (e) {
                        log.error(proceso, 'ERROR ESTABLECIENDO ESTADO DE RESGUARDO DETALLE: ' + JSON.stringify(e));
                    }
                }
            }

            log.debug(proceso, 'Antes de grabar el Record Transaccion');

            // Grabo el Record Trnasaccion
            /* var idTransaccionFinal = recordTransaction.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            }); */
            const idTransaccionFinal = recordTransaction.save();

            log.debug(proceso, 'FIN - grabarDatosCAE - idTransaccionFinal: ' + idTransaccionFinal);
            returnObj.idLog = idLog;
            returnObj.cae = cae;

            return returnObj;
        }

        function obtenerReferenciasPago(recordCP) {
            const proceso = 'obtenerReferenciasPago';
            const response = { error: false, mensaje: '', data: [] };
            const recId = recordCP.getValue('id');
            log.debug(proceso, 'recId: ' + recId);

            try {

                let applyQ = recordCP.getLineCount({
                    sublistId: 'apply'
                });

                log.debug(proceso, 'Cant Lineas apply: ' + applyQ);

                if (applyQ > 0) {

                    let appliedInvoices = [];

                    for (let i = 0; i < applyQ; i++) {
                        recordCP.selectLine({ sublistId: 'apply', line: i });
                        let isApplied = recordCP.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply' });

                        if (isApplied) {
                            appliedInvoices.push(recordCP.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'internalid' }));
                            /*if(appliedInvoices.length >= 38){
                                break;
                            }*/
                        }
                    }

                    log.debug(proceso, 'Facturas aplicadas al pago: ' + JSON.stringify(appliedInvoices));

                    if (appliedInvoices.length > 0 && appliedInvoices.length <= 40) {

                        // Comment: Devuelve las facturas a las que aplica el pago con sus importes de pago. 
                        let respFactPag = factPagada(recId, appliedInvoices);
                        log.debug(proceso, 'Facturas aplicadas al pago - factPagada RESPONSE: ' + JSON.stringify(respFactPag));

                        if (!respFactPag.error && respFactPag.data.length > 0) {
                            response.data = respFactPag.data;
                        }
                    } else {
                        // Es Referencia Global
                        const currentScript = runtime.getCurrentScript();
                        const razonGlobal = currentScript.getParameter('custscript_l598_con_di_fe_ss_raz_glob_co');

                        var data = {};
                        data.internalid = "";
                        data.tipoCFE = 0;
                        data.serie = "";
                        data.numero = 0;
                        data.fecha = "";
                        data.monto = "";
                        data.indicadorRefGlobal = 1;
                        data.razon = razonGlobal;

                        log.debug(proceso, 'Es Referencia Global: ' + JSON.stringify(data));

                        response.data.push(data);
                    }
                }
            } catch (e) {
                response.error = true;
                response.mensaje = e.message;
            }

            return response;
        }

        function factPagada(recId, ids) {

            let proceso = 'factPagada';
            let response = { error: false, message: '', data: [] };

            try {
                if (!utilities.isEmpty(ids)) {

                    log.debug(proceso, 'IDs: ' + JSON.stringify(ids));

                    const filtros = [];
                    var filtro = {};
                    filtro.name = 'internalid';
                    filtro.operator = 'ANYOF';
                    filtro.values = ids;
                    filtros.push(filtro);

                    var filtro = {};
                    filtro.name = 'applyingtransaction';
                    filtro.operator = 'IS';
                    filtro.values = recId;
                    filtros.push(filtro);

                    const objResultSet = utilities.searchSavedPro('customsearch_l598_trans_ref_custpayment', filtros);
                    log.debug(proceso, JSON.stringify(objResultSet));

                    if (!objResultSet.error) {
                        let resultSet = objResultSet.objRsponseFunction.result;
                        let resultSearch = objResultSet.objRsponseFunction.search;

                        if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {
                            for (let i = 0; i < resultSet.length; i++) {
                                let data = {};
                                data.internalid = nvl(resultSet[i].getValue({ name: resultSearch.columns[0] }), '');
                                data.tipoCFE = nvl(resultSet[i].getValue({ name: resultSearch.columns[1] }), '');
                                data.serie = nvl(resultSet[i].getValue({ name: resultSearch.columns[2] }), '');
                                data.numero = nvl(resultSet[i].getValue({ name: resultSearch.columns[3] }), '');
                                data.fecha = formatDateDGI(resultSet[i].getValue({ name: resultSearch.columns[4] }));
                                data.monto = parseFloat(resultSet[i].getValue({ name: resultSearch.columns[5] }));
                                data.moneda =  nvl(resultSet[i].getValue({ name: resultSearch.columns[6]}), '');
                                data.tipocambio = parseFloat(resultSet[i].getValue({ name: resultSearch.columns[7] }));
                                data.indicadorRefGlobal = 0;
                                data.razon = '';

                                response.data.push(data);
                            }
                        }
                    } else {
                        response.error = true;
                        response.message = objResultSet.descripcion;
                    }
                }
            } catch (e) {
                response.error = true;
                response.message = e.message;
            }
            return response;
        }

        function formatDateDGI(fecha) {

            let fechaFormateada = '';

            try {
                if (!utilities.isEmpty(fecha)) {

                    log.debug('formatDateDGI', 'Fecha:' + fecha);

                    var fecha = format.parse({
                        value: fecha,
                        type: format.Type.DATE,
                        timezone: format.Timezone.AMERICA_MONTEVIDEO
                    });

                    const anio = fecha.getFullYear();
                    const mes = fecha.getMonth() + 1;
                    const dia = fecha.getDate();

                    if (!utilities.isEmpty(anio) && !utilities.isEmpty(mes) && !utilities.isEmpty(dia)) {
                        fechaFormateada = anio + '-' + padding_left(mes.toString(), '0', 2) + '-' + padding_left(dia.toString(), '0', 2);
                    }
                } else {
                    log.debug('formatDateDGI', 'Fecha Vacia.');
                }
            } catch (e) {
                log.error('formatDateDGI', 'Exception: ' + e.message);
            }

            return fechaFormateada;
        }

        function getMetodosPago(rec) {
            const response = { error: false, mensaje: '', data: [] }
            const sublistID = {
                efectivo: 'recmachcustrecord_3k_cobranza_efec_payment_id',
                transferencia: 'recmachcustrecord_3k_cobranza_trn_payment_id',
                tarjeta: 'recmachcustrecord_3k_cobranza_tarj_payment_id',
                cheque: 'recmachcustrecord_3k_cobranza_chq_payment_id'
            }

            try {

                const currentScript = runtime.getCurrentScript();
                const formaPagoMultiple = currentScript.getParameter('custscript_l598_con_di_fe_ss_form_pag_mu');
                const formaPago = rec.getValue({ fieldId: 'custbody_3k_forma_pago_local' });

                log.debug('getMetodosPago', 'formaPagoMultiple: ' + formaPagoMultiple + ' / formaPago: ' + formaPago);

                if (formaPagoMultiple == formaPago) {

                    // Get Metodos de Pago
                    const arrayPagosEfectivo = getPagosSublistas(sublistID.efectivo, rec);
                    log.debug('getMetodosPago', 'arrayPagosEfectivo: ' + JSON.stringify(arrayPagosEfectivo));

                    const arrayPagosTransferencias = getPagosSublistas(sublistID.transferencia, rec);
                    log.debug('getMetodosPago', 'arrayPagosTransferencias: ' + JSON.stringify(arrayPagosTransferencias));

                    const arrayPagosTarjetas = getPagosSublistas(sublistID.tarjeta, rec);
                    log.debug('getMetodosPago', 'arrayPagosTarjetas: ' + JSON.stringify(arrayPagosTarjetas));

                    const arrayPagosCheque = getPagosSublistas(sublistID.cheque, rec);
                    log.debug('getMetodosPago', 'arrayPagosCheque: ' + JSON.stringify(arrayPagosCheque));

                    response.data = arrayPagosEfectivo.concat(arrayPagosTransferencias).concat(arrayPagosTarjetas).concat(arrayPagosCheque);
                } else {
                    const obj = {};
                    obj.codigo = formaPagoNetSuite || 1;
                    obj.glosa = 'Metodo de Pago: ' + rec.getText('paymentmethod') + ' / Transaccion en moneda: ' + rec.getText('currency');
                    obj.orden = obj.codigo;
                    obj.valor = parseFloat(rec.getValue('payment'));
                    /* obj.pago = '';
                    obj.moneda = rec.getText({fieldId:'currency'}).toUpperCase();
                    obj.amount = parseFloat(rec.getValue({fieldId:'payment'}), 10);
                    obj.tipoCambio = round(parseFloat(rec.getValue({fieldId:'exchangerate'}), 10) , 4);
                    obj.originAmount = parseFloat(rec.getValue({fieldId:'payment'}), 10);

                    obj.formaPago = rec.getText({fieldId:'custbody_3k_forma_pago_local'});
                    obj.formaPagoID = rec.getValue({fieldId:'custbody_3k_forma_pago_local'}); */

                    response.data.push(obj);
                }
            } catch (e) {
                response.error = true;
                response.mensaje = e.message
                log.debug('getMetodosPago', 'Netsuite Exception: ' + e.message);
            }

            return response;
        }

        function getPagosSublistas(sublistID, rec) {

            var arrayFormasPago = [];

            try {

                let identifier = '';
                let metodo = '';
                switch (sublistID) {
                    case 'recmachcustrecord_3k_cobranza_efec_payment_id':
                        identifier = 'efec';
                        metodo = 'Efectivo';
                        break;
                    case 'recmachcustrecord_3k_cobranza_trn_payment_id':
                        identifier = 'trn';
                        metodo = 'Transferencia';
                        break;
                    case 'recmachcustrecord_3k_cobranza_tarj_payment_id':
                        identifier = 'tarj';
                        metodo = 'Tarjeta';
                        break;
                    case 'recmachcustrecord_3k_cobranza_chq_payment_id':
                        identifier = 'chq';
                        metodo = 'Cheque';
                        break;
                }

                var arrayFormasPago = [];
                const sublistLength = rec.getLineCount({ sublistId: sublistID });
                for (let i = 0; !utilities.isEmpty(sublistLength) && i < sublistLength; i++) {

                    const obj = {};
                    obj.pago = metodo;
                    obj.moneda = rec.getSublistText({ sublistId: sublistID, fieldId: 'custrecord_3k_cobranza_' + identifier + '_currency', line: i }).toUpperCase();
                    obj.amount = parseFloat(rec.getSublistValue({ sublistId: sublistID, fieldId: 'custrecord_3k_cobranza_' + identifier + '_amount', line: i }));
                    obj.tipoCambio = round(parseFloat(rec.getSublistValue({ sublistId: sublistID, fieldId: 'custrecord_3k_cobranza_' + identifier + '_tc', line: i })), 4);
                    obj.originAmount = parseFloat(rec.getSublistValue({ sublistId: sublistID, fieldId: 'custrecord_3k_cobranza_' + identifier + '_amount_orig', line: i }));

                    obj.formaPago = rec.getSublistText({ sublistId: sublistID, fieldId: 'custrecord_3k_cobranza_' + identifier + '_payment_meth', line: i });
                    obj.formaPagoID = rec.getSublistValue({ sublistId: sublistID, fieldId: 'custrecord_3k_cobranza_' + identifier + '_payment_meth', line: i });

                    arrayFormasPago.push(obj);
                }
            } catch (e) {
                log.error('getPagosSublistas', 'Netsuite Exception: ' + e.message);
            }

            return arrayFormasPago;
        }

        function round(value, decimals) {
            return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
        }

        let getConfigLineasGastos = (subsidiaria) => {

            const proceso = 'getConfigLineasGastos';
            const objetoRespuesta = { mensaje: '', error: false, results: [] };

            log.debug(proceso, 'INICIO - function getConfigLineasGastos - subsidiaria: ' + subsidiaria);

            try {

                const filtros = [];

                if (!utilities.isEmpty(subsidiaria)) {
                    const filtro = {};
                    filtro.name = 'custrecord_l598_conf_lin_gas_re_subsi';
                    filtro.operator = 'ANYOF';
                    filtro.values = subsidiaria;
                    filtros.push(filtro);
                }

                const objResultSet = utilities.searchSavedPro('customsearch_l598_config_lin_gas_refactu', filtros);

                if (objResultSet.error) {
                    objetoRespuesta.error = true;
                    objetoRespuesta.mensaje = 'Error Consultando searchSavedPro *** Script / URU-Configuración Líneas Gastos Refact. Search, DETALLES Error: ' + objResultSet.descripcion;
                    log.error(proceso, objetoRespuesta.mensaje);
                } else {

                    const resultSet = objResultSet.objRsponseFunction.result;
                    const resultSearch = objResultSet.objRsponseFunction.search;

                    if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {
                        for (let i = 0; i < resultSet.length; i++) {

                            objetoRespuesta.results[i] = {};

                            objetoRespuesta.results[i].idInterno = resultSet[i].getValue({
                                name: resultSearch.columns[0]
                            });

                            objetoRespuesta.results[i].unidadMedida = resultSet[i].getValue({
                                name: resultSearch.columns[1]
                            });

                            objetoRespuesta.results[i].codUnidadMedida = resultSet[i].getValue({
                                name: resultSearch.columns[2]
                            });

                            objetoRespuesta.results[i].setearNombreGastosItems = resultSet[i].getValue({
                                name: resultSearch.columns[3]
                            });

                            objetoRespuesta.results[i].nombreGenericoItems = resultSet[i].getValue({
                                name: resultSearch.columns[4]
                            });

                            objetoRespuesta.results[i].cantidadDefault = resultSet[i].getValue({
                                name: resultSearch.columns[5]
                            });
                        }
                    } else {
                        log.debug(proceso, 'No se encontró información para la búsqueda guardada invocada: *** Script / URU-Configuración Líneas Gastos Refact. Search.');
                    }
                }
            } catch (error) {
                objetoRespuesta.error = true;
                objetoRespuesta.mensaje = 'Error NetSuite Excepción - Error al obtener valores de la configuracion de articulos de gastos refacturables - Detalles: ' + error.message;
                log.error(proceso, objetoRespuesta.mensaje);
            }

            log.debug(proceso, 'FIN - function getConfigLineasGastos');
            return objetoRespuesta;
        }

        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit
        };
    });