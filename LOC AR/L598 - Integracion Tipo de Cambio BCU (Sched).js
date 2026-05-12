/**
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 */
define(['N/https', 'N/xml', 'N/task', 'N/runtime', 'N/file', 'N/format', 'L598/utilities', 'N/email', 'N/search'],
    
function(https, xml, task, runtime, file, format, utilities, email, search) {
    
    var proceso = "Tipo de Cambio BCU (Scheduled)";

    function execute(context) {
        log.debug('una vez')
        var currentScript = runtime.getCurrentScript();
        var emailUsuario = currentScript.getParameter('custscript_l598_cam_bcu_emp_enc');
        var empleadoEncargado = null;
        try {
            //Retrieve array of objects

            var params = JSON.parse(currentScript.getParameter('custscript_l598_params_monedas'));
            var paramMonedaDolar = currentScript.getParameter('custscript_l598_cam_bcu_mon_dolar_sch');


            log.debug('params',params);
            log.debug('emailUsuario',emailUsuario);

            if(utilities.isEmpty(emailUsuario)){
                empleadoEncargado = obtenerEmpleadoEnc();
            }
            if(utilities.isEmpty(params)){
                /* 
                * ScheduledScript execution from scheduled time
                */
                var config = obtenerConfiguracionBCU(paramMonedaDolar);
                log.debug('config', config)
                if (!config.error && !utilities.isEmpty(config.configuraciones) && config.configuraciones.length > 0) {

                    var monedasActualizar = [];

                    for (var c = 0; c < config.configuraciones.length; c++) {
                        var conf = config.configuraciones[c];

                        var urlservicio            = conf.config.urlservicio;
                        var monedaBaseConfig       = conf.config.monedaBase;
                        var esMonedaPrincipalDolar = conf.esMonedaPrincipalDolar;
                        var monedas                = conf.monedas;
                        var strmonedas             = conf.strmonedas;

                        log.debug(proceso, 'Procesando configuración ' + c + ' | url=' + urlservicio + ' | monedaBase=' + monedaBaseConfig);

                        var consulta = consultarServicioBCU(
                            urlservicio,
                            monedas,
                            strmonedas,
                            esMonedaPrincipalDolar,
                            monedaBaseConfig
                        );

                        if (!consulta.error) {
                            if (!utilities.isEmpty(consulta.results) && consulta.results.length > 0) {
                                monedasActualizar = monedasActualizar.concat(consulta.results);
                            } else {
                                log.audit(proceso, 'Configuración ' + c + ' no devolvió monedas para actualizar.');
                            }
                        } else {
                            log.error(proceso, 'Error en configuración ' + c + ' : ' + consulta.mensaje);
                            if (utilities.isEmpty(emailUsuario)) {
                                enviarEmail(consulta.mensaje, empleadoEncargado, proceso);
                            }
                        }
                    }

                    if (!utilities.isEmpty(monedasActualizar) && monedasActualizar.length > 0) {
                        var monedaBase = config.configuraciones[0].config.monedaBase || '';

                        var update = actualizarMonedaNetsuite(monedasActualizar, monedaBase);
                        if(update.error){
                            log.error(proceso, update.mensaje);
                            if(utilities.isEmpty(emailUsuario)){
                                enviarEmail(update.mensaje, empleadoEncargado, proceso);
                            }

                        }
                    }else{
                        var msgNoMonedas = 'No se obtuvieron monedas para actualizar desde ninguna configuración en ejecución automática.';
                        log.error(proceso, msgNoMonedas);
                        if (utilities.isEmpty(emailUsuario)){
                            enviarEmail(msgNoMonedas, empleadoEncargado, proceso);
                        }

                    }
                } else {
                    var mensajeCfg = config.mensaje || 'Error desconocido al obtener configuraciones BCU.';
                    log.error(proceso, mensajeCfg);
                    if(utilities.isEmpty(emailUsuario)){
                        enviarEmail(mensajeCfg, empleadoEncargado, proceso);
                    }
                }
            } else {
                /* 
                * ScheduledScript was excuted from a SuitletScript process.
                * Retrieve array of objects with currencies info
                */
                var monedasActualizar = params.monedasActualizar;
                var monedaBase = params.monedaBase;
                if(monedasActualizar.length > 0 && !utilities.isEmpty(monedaBase)){
                    var resultado = actualizarMonedaNetsuite(monedasActualizar, monedaBase);
                    if(resultado.error){
                        log.error(proceso, resultado.mensaje);
                        if(utilities.isEmpty(emailUsuario)){
                            enviarEmail(resultado.mensaje, empleadoEncargado, proceso);
                        }
                    }
                }
            }
        } catch (e) {
            log.error(proceso, 'Error : ' + e.message);
            if(utilities.isEmpty(emailUsuario)){
                enviarEmail(e.message, empleadoEncargado, proceso);
            }
        }
    }

    /**
     * @return {object}  return             An object with the following properties:
     * @return {array}   return.monedas     An array of objects with all available currencies for the service
     * @return {object}  return.config      An object containing the config (urlservicio, subsidiaria, monedaBase)
     * @return {string}  return.strmonedas  A string with currencies codes required for web service
     * @return {boolean} return.error       True on error
     * @return {boolean} return.esMonedaPrincipalDolar     True on dolar currency
     * @return {string}  return.mensaje     An error message if there is any
    */
    function obtenerConfiguracionBCU(paramMonedaDolar){
        var response = {error: false, mensaje: '', configuraciones:[] };

        try {
            // INICIO Consultar URL Servicio
            var objResultSet = utilities.searchSaved('customsearch_l598_conf_monedas_bcu');
            if (objResultSet.error) {
                response.error = true;
                response.mensaje = 'Error Consultando Configucacion Tipos de Cambio - Descripcion : ' + objResultSet.descripcion;
                return response;
            }
            var rows = objResultSet.objRsponseFunction.result;
            var cols = objResultSet.objRsponseFunction.search.columns;

            if (utilities.isEmpty(rows) || rows.length === 0){
                response.error = true;
                response.mensaje = 'No se encontraron registros de configuración del servicio de Tipos de Cambio';
                return response;
            }

            var byConfig = {}; 
            rows.forEach(function(r){
                var urlservicio      = r.getValue({ name: cols[1] });
                var subsidiaria      = r.getValue({ name: cols[2] });
                var monedaBase       = r.getValue({ name: cols[3] });
                var codigoISOMonBase = r.getValue({ name: cols[7] });

                var infoCodigoMoneda = {
                    idInterno       : r.getValue({ name: cols[5] }),
                    codigo          : r.getValue({ name: cols[6] }),
                    codigoISOMoneda : r.getValue({ name: cols[8] }),
                    consultarEnBCU  : r.getValue({ name: cols[9] }),
                    transformadoBCU : r.getValue({ name: cols[10] }),
                    aplicarInverso  : r.getValue({ name: cols[11] })
                };

                var key = [urlservicio, subsidiaria, monedaBase, codigoISOMonBase].join('|');
                if (!byConfig[key]){
                    byConfig[key] = {
                        config : {
                            urlservicio: urlservicio,
                            subsidiaria: subsidiaria,
                            monedaBase : monedaBase,
                            codigoISOMonedaBase: codigoISOMonBase
                        },
                        monedas: [],
                        strmonedas: '',
                        esMonedaPrincipalDolar: false
                    };
                }
                byConfig[key].monedas.push(infoCodigoMoneda);
            });

            Object.keys(byConfig).forEach(function(k){
                var cfg = byConfig[k];

                if (utilities.isEmpty(cfg.config.urlservicio)){
                    response.error = true;
                    response.mensaje = 'Falta URL de Servicio en alguna configuración.';
                    return;
                }

                var str = '';
                (cfg.monedas || []).forEach(function(m){
                    if (!utilities.isEmpty(m.codigo) &&
                        !utilities.isEmpty(m.codigoISOMoneda) &&
                        m.codigoISOMoneda !== 'UYU' &&
                        (m.consultarEnBCU === 'T' || m.consultarEnBCU === true)) {
                        str += '<short>' + m.codigo + '<\/short>';
                    }
                });
                cfg.strmonedas = str;

                var isoBase = cfg.config.codigoISOMonedaBase;
                cfg.esMonedaPrincipalDolar =
                    ((!utilities.isEmpty(cfg.config.monedaBase) &&
                        (!utilities.isEmpty(paramMonedaDolar) && paramMonedaDolar == cfg.config.monedaBase)) ||
                    (!utilities.isEmpty(isoBase) && isoBase == 'USD')) ? true : false;
            });

            if (response.error) return response;

            response.configuraciones = Object.keys(byConfig).map(function(k){ return byConfig[k]; });
            return response;
        } catch (err) {
            response.error = true;
            response.mensaje = err.message;
            return response;
        }
    }

    /** 
     * @param {string}   urlservicio    A hyperlink specifying the webservice
     * @param {array}    monedasConsultar    An array of objects with all available currencies for the service
     * @param {string}   strmonedas     A string with currencies codes required for webservice
     * 
     * @return {object}  return         An object with the following properties
     * @return {object}  return.results An array of objects (idInterno, codigo, tipoCambioVenta, currencyNameBcu)
     * @return {boolean} return.error   True on error
     * @return {string}  return.mensaje An error message if there is any
     * @return {string}  return.body    An error message if there is any
     */
    function consultarServicioBCU(urlservicio, monedasConsultar, strmonedas, esMonedaPrincipalDolar, monedaBaseConfig){

        var response = {error: false, mensaje:""};
        var hoyDate = obtenerFechaServidor("HOY");
        var fechaConsultaFin = formatearFecha(hoyDate);
        var fechaConsultaInicio = obtenerFechaServidor("HACEXDIAS",6); 
        var monedasActualizar = [];
    
        log.audit('Integracion BCU', 'Inicio - Consulta Servicio Tipos de Cambios - URL : ' + urlservicio + ' - Fecha inicio : ' + fechaConsultaInicio + ' - Fecha fin : ' + fechaConsultaFin + ' - Monedas : ' + strmonedas);

        try {
            //Consulta tipos de cambios al servicio web
            var request = https.request({
                method: https.Method.POST,
                url: urlservicio,
                headers: {
                    'cache-control': 'no-cache',
                    'content-type': 'text/xml'
                },
                body: '<?xml version="1.0" encoding="utf-8"?>' +
                    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
                    '<soap:Body>' +
                    '<Cotizacion xmlns="http://tempuri.org/">' +
                    '<FechaDesde>' + fechaConsultaInicio + '</FechaDesde>' +
                    '<FechaHasta>' + fechaConsultaFin + '</FechaHasta>' +
                    '<Grupo>0</Grupo>' +
                    '<Moneda>' + strmonedas + '</Moneda>' +
                    '</Cotizacion>' +
                    '</soap:Body>' +
                    '</soap:Envelope>'
            });

            if (!utilities.isEmpty(request)) {
                log.audit('Integracion BCU','Consulta Servicio Tipos de Cambios - Respuesta: ' + JSON.stringify(request));
                var objResp = JSON.parse(JSON.stringify(request));
                
                if (!utilities.isEmpty(objResp)) {
                    var mensajeRespuesta = request.body;
                
                    if (!utilities.isEmpty(mensajeRespuesta)) {
                        var xmlRespuesta = xml.Parser.fromString({
                            text: mensajeRespuesta
                        });

                        if (!utilities.isEmpty(xmlRespuesta)) {
                            var nodoEstado = xml.XPath.select({
                                node: xmlRespuesta,
                                xpath: "//*[name()='status']"
                            });

                            if (!utilities.isEmpty(nodoEstado)) {
                                var estado = nodoEstado[0].textContent;
                                
                                if (!utilities.isEmpty(estado)) {
                                
                                    if (estado == 1) {
                                        var informacionCotizaciones = xml.XPath.select({
                                            node: xmlRespuesta,
                                            xpath: "//*[name()='dato']"
                                        });
                                        
                                        var fechaConsultaBCU = '';

                                        if (!utilities.isEmpty(informacionCotizaciones)) {

                                            if (!utilities.isEmpty(informacionCotizaciones) && informacionCotizaciones.length > 0) {
                                                var idMonedaPesoUruguayo = '';
                                                var arrayMonedasPrincipales = [];

                                                if (esMonedaPrincipalDolar) {
                                                    arrayMonedasPrincipales.push('USD');
                                                } else {
                                                    idMonedaPesoUruguayo = monedaBaseConfig;
                                                    arrayMonedasPrincipales.push('UYU');
                                                }

                                                for (var n = 0; n < arrayMonedasPrincipales.length; n++) {
                                                    
                                                    var tcvPesoUruguyoMonedaDolar = 0.0;
                                                
                                                    //Loop currencies
                                                    for (var i = 0; i < informacionCotizaciones.length; i++) {
                                                        var informacionMoneda = new Object();
                                                        informacionMoneda.idInterno = '';
                                                        informacionMoneda.codigo = '';
                                                        informacionMoneda.tipoCambioVenta = '';
                                                        informacionMoneda.currencyNameBcu = '';
                                                        informacionMoneda.esMonedaDolar = false;
                                                        informacionMoneda.codigoISOMonedaBase = arrayMonedasPrincipales[n];
                                                        informacionMoneda.monedaBase = '';
                                                        informacionMoneda.transformadoBCU = '';
                                                        informacionMoneda.aplicarInverso = '';

                                                        for (var j=0; j<informacionCotizaciones[i].childNodes.length; j++) {

                                                            if (informacionCotizaciones[i].childNodes[j].nodeName == 'Moneda'){
                                                                informacionMoneda.codigo = informacionCotizaciones[i].childNodes[j].textContent;
                                                                var resultadoMoneda = monedasConsultar.filter(function(obj) {
                                                                    return (obj.codigo == informacionMoneda.codigo);
                                                                });

                                                                if (!utilities.isEmpty(resultadoMoneda) && resultadoMoneda.length > 0) {
                                                                    informacionMoneda.idInterno = resultadoMoneda[0].idInterno;
                                                                    informacionMoneda.transformadoBCU = resultadoMoneda[0].transformadoBCU;
                                                                    informacionMoneda.aplicarInverso = resultadoMoneda[0].aplicarInverso;
                                                                    // Se verifica si la moneda a procesar es el dolar para extraer posteriormente el tipo de cambio del peso vs el dolar
                                                                    informacionMoneda.esMonedaDolar = resultadoMoneda[0].codigoISOMoneda == 'USD' ? true : false;
                                                                }
                                                            }
                                                            // Se Verifica si la moneda principal es el dolar
                                                            if (esMonedaPrincipalDolar && arrayMonedasPrincipales[n] == 'USD') {
                                                                // Se extrae el arbitraje
                                                                if (informacionCotizaciones[i].childNodes[j].nodeName == 'ArbAct') {
                                                                    informacionMoneda.tipoCambioVenta = informacionCotizaciones[i].childNodes[j].textContent;
                                                                    var valorArbitraje = parseFloat(informacionMoneda.tipoCambioVenta, 10);

                                                                    if (!utilities.isEmpty(informacionMoneda.transformadoBCU) && (informacionMoneda.transformadoBCU == true || informacionMoneda.transformadoBCU == 'T')) {
                                                                        informacionMoneda.tipoCambioVenta = valorArbitraje;
                                                                    } else {
                                                                        informacionMoneda.tipoCambioInverso = valorArbitraje;
                                                                        informacionMoneda.tipoCambioVenta = !utilities.isEmpty(valorArbitraje) ? Math.abs(1 / valorArbitraje) : 0.00;
                                                                    }
                                                                }
                                                                // Se consulta si la moneda que se esta procesando es el dolar para tambien extraer el tipo de cambio de venta del dolar en relacion al peso uruguayo
                                                                if (informacionMoneda.esMonedaDolar) {
                                                                    if (informacionCotizaciones[i].childNodes[j].nodeName == 'TCV') {
                                                                        tcvPesoUruguyoMonedaDolar = informacionCotizaciones[i].childNodes[j].textContent;
                                                                    }
                                                                }
                                                            } else {
                                                                if (informacionCotizaciones[i].childNodes[j].nodeName == 'TCV') {
                                                                    informacionMoneda.tipoCambioVenta = informacionCotizaciones[i].childNodes[j].textContent;
                                                                }
                                                            }

                                                            if (informacionCotizaciones[i].childNodes[j].nodeName == 'Nombre') {
                                                                informacionMoneda.currencyNameBcu = informacionCotizaciones[i].childNodes[j].textContent;
                                                            }

                                                            if (informacionCotizaciones[i].childNodes[j].nodeName == 'Fecha') {
                                                                informacionMoneda.Fecha = informacionCotizaciones[i].childNodes[j].textContent;
                                                                fechaConsultaBCU = informacionMoneda.esMonedaDolar ? informacionMoneda.Fecha : '';
                                                            }
                                                        }
                                                        monedasActualizar.push(informacionMoneda);
                                                    }

                                                    // Se realizo manipulacion del array de monedas a actualizar para incorporar al peso uruguayo si la moneda principal es el dolar
                                                    if (esMonedaPrincipalDolar && tcvPesoUruguyoMonedaDolar > 0) {
                                                        var informacionMonedaPesoUruguayo = {};
                                                        var resultadoPesoUruguayo = monedasConsultar.filter(function(obj) {
                                                            return (obj.codigoISOMoneda == 'UYU');
                                                        });

                                                        if (!utilities.isEmpty(resultadoPesoUruguayo) && resultadoPesoUruguayo.length > 0) {

                                                            var arbitrajePesosUruguayos = Math.abs(1 / parseFloat(tcvPesoUruguyoMonedaDolar, 10));

                                                            informacionMonedaPesoUruguayo.idInterno = resultadoPesoUruguayo[0].idInterno;
                                                            informacionMonedaPesoUruguayo.codigo = 999;
                                                            informacionMonedaPesoUruguayo.tipoCambioVenta = arbitrajePesosUruguayos;
                                                            informacionMonedaPesoUruguayo.currencyNameBcu = 'PESOS URUGUAYOS';
                                                            informacionMonedaPesoUruguayo.esMonedaDolar = false;
                                                            informacionMonedaPesoUruguayo.codigoISOMonedaBase = arrayMonedasPrincipales[n];
                                                            informacionMonedaPesoUruguayo.monedaBase = resultadoPesoUruguayo[0].idInterno;
                                                            informacionMonedaPesoUruguayo.Fecha = fechaConsultaBCU;

                                                            // Se extrae el id de la moneda peso uruguayo
                                                            idMonedaPesoUruguayo = resultadoPesoUruguayo[0].idInterno;
                                                            monedasActualizar.push(informacionMonedaPesoUruguayo);

                                                            if (!utilities.isEmpty(resultadoPesoUruguayo[0].aplicarInverso) && (resultadoPesoUruguayo[0].aplicarInverso == true || resultadoPesoUruguayo[0].aplicarInverso == 'T')) {
                                                                var arbitrajeDolar = parseFloat(tcvPesoUruguyoMonedaDolar, 10);
                                                                informacionMonedaPesoUruguayo.tipoCambioInverso = arbitrajeDolar;
                                                            }
                                                        }
                                                    }
                                                }

                                                if (!utilities.isEmpty(monedasActualizar) && monedasActualizar.length > 0) {
                                                    for (var m = 0; m < monedasActualizar.length; m++) {
                                                        if (monedasActualizar[m].codigoISOMonedaBase == 'UYU') {
                                                            monedasActualizar[m].monedaBase = idMonedaPesoUruguayo;
                                                        } else {
                                                            monedasActualizar[m].monedaBase = monedaBaseConfig;
                                                        }
                                                    }
                                                }

                                                log.debug('obtenerDatos', 'monedasActualizar: ' + JSON.stringify(monedasActualizar));
                                                response.results = obtenerUltimasCotizaciones(monedasActualizar);
                                            } else {
                                                response.error = true;
                                                response.mensaje = 'No se pudo acceder a los Nodos de Cotizacion de cada Moneda del XML de respuesta de Servicio Web';
                                            }
                                        } else {
                                            response.error = true;
                                            response.mensaje = 'Error obteniendo NODO de Informacion de Cotizaciones del XML de respuesta de Servicio Web'; 
                                        }
                                    } else {
                                        response.error = true;
                                        response.mensaje = 'Estado de Respuesta de BCU ERROR';  
                                    }
                                } else {
                                    response.error = true;
                                    response.mensaje = 'Error obteniendo el Estado del NODO XML en la respuesta de Servicio Web'; 
                                }
                            } else {
                                response.error = true;
                                response.mensaje = 'Error obteniendo NODO de Estado del XML de respuesta de Servicio Web';
                            }
                        } else {
                            response.error = true;
                            response.mensaje = 'Error generando XML de respuesta de Servicio Web';
                        }
                    } else {
                        response.error = true;
                        response.mensaje = 'Error Obteniendo respuesta de Servicio Web';
                    }
                } else {
                    response.error = true;
                    response.mensaje = 'Error parseando respuesta de Servicio Web';
                }
            } else {
                response.error = true;
                response.mensaje = 'No se recibio respuesta de Servicio Web'; 
            }


            return response;
        } catch(eSend){
            response.error = true;
            response.code = 500;
            response.body = 'Excepción de Host ' + eSend.message;
            response.mensaje = response.body;
            return response;
        }
    }

    /**
     * @param {array} monedasActualizar An array of objects (idInterno, codigo, tipoCambioVenta, currencyNameBcu)
     * @param {int}   monedaBase        Netsuite base currency idInterno
     */
    function actualizarMonedaNetsuite(monedasActualizar, monedaBase){

        log.debug("Actualizacion de Monedas en NT", 'Monedas a actualizar y moneda base: ' + JSON.stringify({
            monedasActualizar: monedasActualizar,monedaBase: monedaBase}));
        
        var response = {error:false, mensaje:''};

        try{
            //Set date value for today
            fechaActualImportacion = format.format({
                value: obtenerFechaServidor("HOY"),
                type: format.Type.DATE
            });

            // INICIO Actualizar Tipos de Cambio Moneda NetSuite
            var lineasCSV = '';
            for (var i = 0; i < monedasActualizar.length; i++) {
                lineasCSV = lineasCSV + monedasActualizar[i].monedaBase + ";" + monedasActualizar[i].idInterno + ";" + fechaActualImportacion + ";" + monedasActualizar[i].tipoCambioVenta + "\n";
                
                if(!utilities.isEmpty(monedasActualizar[i].aplicarInverso) && (monedasActualizar[i].aplicarInverso == true || monedasActualizar[i].aplicarInverso == 'T')){
                    log.debug('Monto Inverso',!utilities.isEmpty(monedasActualizar[i].tipoCambioInverso) );

                    var tipoCambioBase = !utilities.isEmpty(monedasActualizar[i].tipoCambioInverso) ? monedasActualizar[i].tipoCambioInverso : (1 / parseFloat(monedasActualizar[i].tipoCambioVenta));
                    lineasCSV = lineasCSV + monedasActualizar[i].idInterno + ";" + monedasActualizar[i].monedaBase + ";" + fechaActualImportacion + ";" + tipoCambioBase + "\n"
                }

            }

            log.debug('Integracion BCU', 'LINEA CSV : ' + lineasCSV);

            var fileObj = file.create({
                name: 'Importacion Tipos de Cambio Monedas.csv',
                fileType: file.Type.CSV,
                contents: "Moneda Origen;Moneda Destino;Fecha;Tipo de Cambio\n" + lineasCSV,
            });

            fileObj.folder = -15;
            var fileId = fileObj.save();

            var fileObj = file.load({
                id: fileId
            });

            var respuesta = createAndSubmitCSVJob('Actualizacion Tipo de Cambio', fileObj, 'custimport_l598_act_tip_cambios');

            if(!respuesta.error){
                response.estado = respuesta.estado.status;
            } else {
                response.error = true;
                response.mensaje = respuesta.mensaje;
            }            
        } catch(e) {
            response.error = true;
            response.mensaje = "Exception : " + e.message;
        }
        return response;
    }

    function enviarEmail( mensajeEmail, usuarioEmail, proceso) {
        try {
            log.audit('obtenerEmpleadoEnc', 'INICIO enviarEmail');
            log.audit('obtenerEmpleadoEnc', 'Parametros mensajeEmail:'+mensajeEmail+",  usuarioEmail:"+usuarioEmail);
            if (!utilities.isEmpty(mensajeEmail) && !utilities.isEmpty(usuarioEmail)) {
                log.audit('obtenerEmpleadoEnc', 'ingreso a ultima validacion');
                var mensaje = "<html><head></head><body><br>";
                mensaje += 'El siguiente proceso: '+ proceso +' ha tenido el siguiente error \n' + mensajeEmail;
                mensaje += "<br>";
                mensaje += "</body></html>";
                email.send({
                    author: usuarioEmail,
                    subject: "NetSuite - Proceso de Consulta de Tipo de Cambio BCU",
                    body: mensaje,
                    recipients: usuarioEmail
                });
            }
            log.audit('obtenerEmpleadoEnc', 'fin enviarEmail');
        } catch (error) {
            log.error("Error enviarEmail", error);
        }
        
    }


    function obtenerEmpleadoEnc(){
        try {
            log.audit('obtenerEmpleadoEnc', 'INICIO obtenerEmpleadoEnc');
            var enviarEmail = null;
            var filtroConf = [];
            filtroConf.push({
                name: "isinactive",
                operator: "is",
                values: false
            });

            var configuracionSaveSearch = search.create({
                type: "customrecord_l598_config_gral_integ_bcu",
                columns: ["custrecord_l598_config_int_emp_enc"],
                filters: filtroConf
            });

            var resultadoConf = configuracionSaveSearch.run().getRange({
                start: 0,
                end: 1
            });
            if (!utilities.isEmpty(resultadoConf) && resultadoConf.length > 0) {
                enviarEmail = resultadoConf[0].getValue("custrecord_l598_config_int_emp_enc");
            }
            log.audit('obtenerEmpleadoEnc', 'enviarEmail:' +enviarEmail);
            log.audit('obtenerEmpleadoEnc', 'FIN obtenerEmpleadoEnc');
            return enviarEmail;
        } catch (error) {
            log.error("Proceso BCU",error);
            return null;
        }

    }

    function createAndSubmitCSVJob(name, file, importacion) {
        log.audit('Integracion BCU', 'INICIO Invocacion CSV');
        var response = { error: false, mensaje: '', estado: ''};

        try {
            var mrTask = task.create({
                taskType: task.TaskType.CSV_IMPORT,
                name: name,
                importFile: file,
                mappingId: importacion,
            });
            var mrTaskId = mrTask.submit();
            var taskStatus = task.checkStatus(mrTaskId);
            log.audit('Integracion BCU', 'Estado de carga: ' + taskStatus);    
            response.estado = taskStatus;
        } catch (excepcion) {
            response.error = true;
            response.mensaje = "Excepcion Invocando A CSV - Excepcion : " + excepcion.message;
        }
        log.audit('Integracion BCU', 'FIN Invocacion CSV');

        return response;
    }

    /** 
     * @param {string}   custom    Specify the required format date (HOY [date object]| AYER[string format] HACEXDIAS[string format])
     * @param {integer}  days      Specify the number of days to substract from today's date (only for HACEXDIAS)
     * @return {string}  return    HOY = A Date object | AYER = A string format | HACEXDIAS = A string format
    */
    function obtenerFechaServidor(custom,days){
        d = new Date();
        utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        offset = -3; //TimeZone Montevideo - Uruguay GMT -3:00
        var fechaActualUru = new Date(utc + (3600000*offset));

        if(!utilities.isEmpty(fechaActualUru)){
            switch(custom.toUpperCase()){
                case "HOY":
                    return fechaActualUru;
                break;
                case "AYER":
                    var diasRestar = 1; //restando 1 dia a la fecha actual
                    var newDate = new Date(fechaActualUru.setDate(fechaActualUru.getDate() - diasRestar));
                    var formattedstring = formatearFecha(newDate);

                    return formattedstring;
                break;
                case "HACEXDIAS":
                    var diasRestar2 = days;
                    var newDate2 = new Date(fechaActualUru.setDate(fechaActualUru.getDate() - diasRestar2));
                    var formattedstring2 = formatearFecha(newDate2);

                    return formattedstring2;
                break;
                default: 
                    return null;
            }
        } else {
            return null;
        }
    }

    function formatearFecha(fechaString){
        if (!utilities.isEmpty(fechaString)){
            var f = new Date(fechaString);
            var formattedstring = f.getFullYear() + "-" + utilities.padding_left((parseInt(f.getMonth(), 10) + 1), '0', 2) + "-" + utilities.padding_left(f.getDate(), '0', 2);
            return formattedstring;
        }else{
            return null;
        }
    }

    function obtenerUltimasCotizaciones(arrCotizaciones){
    if (!utilities.isEmpty(arrCotizaciones) && arrCotizaciones.length > 0){
        var ultimasCotizaciones = [];
        var codigos = [];
        var groupedObj = {};

        for (var i = 0; i < arrCotizaciones.length; i++){
            var existeEnArray = codigos.filter(function(obj){
                return (obj.codigo == arrCotizaciones[i].codigo && obj.codigoISOMonedaBase == arrCotizaciones[i].codigoISOMonedaBase);
            });
            if (existeEnArray.length <= 0){
                var infoMoneda = { codigo: arrCotizaciones[i].codigo, codigoISOMonedaBase: arrCotizaciones[i].codigoISOMonedaBase };
                codigos.push(infoMoneda);
            }
        }

        for (var i2 = 0; i2 < codigos.length; i2++){
            var objGroup = arrCotizaciones.filter(function(obj){
                return (obj.codigo == codigos[i2].codigo && obj.codigoISOMonedaBase == codigos[i2].codigoISOMonedaBase);
            });
            groupedObj[i2] = objGroup;
        }

        log.debug('groupedObj', 'groupedObj: ' + JSON.stringify(groupedObj));

        var hoyDate = obtenerFechaServidor("HOY");
        var hoyStr = formatearFecha(hoyDate);

        for (var moneda in groupedObj){
            if (!groupedObj.hasOwnProperty(moneda)) continue;

            var lista = groupedObj[moneda];

            var seleccion = null;

            for (var k = lista.length - 1; k >= 0; k--){
                var fechaItem = formatearFecha(lista[k].Fecha);
                if (fechaItem === hoyStr) {
                    seleccion = lista[k];
                    break;
                }
            }

            if (!seleccion && lista.length > 0){
                seleccion = lista[lista.length - 1];
            }

            if (seleccion){
                ultimasCotizaciones.push(seleccion);
            }
        }

        return ultimasCotizaciones;
    } else {
        return arrCotizaciones;
    }
}


    Number.prototype.toFixedOK = function(decimals) {
        var sign = this >= 0 ? 1 : -1;
        return (Math.round((this*Math.pow(10,decimals))+(sign*0.001))/Math.pow(10,decimals)).toFixed(decimals);
    }

    return {
        execute: execute
    };
});