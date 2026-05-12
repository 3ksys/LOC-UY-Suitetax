/**
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

define(['N/ui/serverWidget', 'N/xml', 'N/file', 'N/https', 'N/record', 'N/error', 'N/search', 'N/format', 'N/task', 'N/runtime', 'L598/utilities', 'N/email'],

function(serverWidget, xml, file, https, record, error, search, format, task, runtime, utilities, email) {

    var proceso = "Tipo de Cambio BCU (SuitLet)";

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
        var emailUsuario = runtime.getCurrentUser();
        try {
            var currentScript = runtime.getCurrentScript();
            var permitirCambioFecha = JSON.parse(currentScript.getParameter('custscript_l598_cambio_fecha_bcu_sl'));
            var paramMonedaDolar = currentScript.getParameter('custscript_l598_cam_bcu_mon_dolar_sl');

            var form = serverWidget.createForm({
                title: 'Consulta de Tipo de Cambio BCU'
            });

            form.clientScriptModulePath = './L598 - Integracion Tipo de Cambio BCU (Cliente).js'

            log.debug(proceso, 'INICIO Dibujando SuiteLet');

            //DIBUJAR FIELDGROUPS, TABS y SUBTABS
            var grupoFiltros = form.addFieldGroup({
                id: 'fgfiltros',
                label: 'Criterios de Busqueda'
            });             

            var tabDetalle = form.addTab({
                id: 'tabdetalle',
                label: 'Detalle'
            });

            var subTabCargos = form.addSubtab({
                id: 'subtabmonedas',
                label: 'Lista de Monedas Servicio Web BCU',
                tab: 'tabdetalle'
            });

            // DIBUJA CAMPOS
            var actionfield = form.addField({
                id: 'custpage_accion',
                label: 'Accion:',
                type: serverWidget.FieldType.TEXT,
                container: 'fgfiltros'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            var fecha = form.addField({
                id: 'custpage_fecha',
                label: 'Fecha Actual',
                type: serverWidget.FieldType.DATE,
                container: 'fgfiltros'
            });

            if (permitirCambioFecha=='F'||permitirCambioFecha==false){
              fecha.updateDisplayType({
                  displayType: serverWidget.FieldDisplayType.DISABLED
              });
            }

            if (utilities.isEmpty(context.request.parameters.custpage_fecha)){
              //Set date value for today
              fecha.defaultValue = format.format({
                  value: obtenerFechaServidor("HOY"),
                  type: format.Type.DATE
              });
            }else{
              fecha.defaultValue = context.request.parameters.custpage_fecha;
            }

            // FIN CAMPOS

            // DIBUJA SUBLISTAS
            var sublistMonedas = form.addSublist({
                id: 'listadomonedas',
                type: serverWidget.SublistType.LIST,
                label: 'Listado de Conversiones (todas las configuraciones)',
                tab: 'subtabmonedas'
            });

            // Base
            sublistMonedas.addField({
                id: 'base_iso',
                label: 'Moneda Base (ISO)',
                type: serverWidget.FieldType.TEXT
            }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });

            // Moneda destino
            sublistMonedas.addField({
                id: 'destino_iso',
                label: 'Moneda Destino',
                type: serverWidget.FieldType.TEXT
            }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });


            sublistMonedas.addField({
                id: 'tipodecambio',
                type: serverWidget.FieldType.FLOAT,
                label: 'Tipo de Cambio'
            }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });

            // FIN SUBLISTA

            //DIBUJA BOTONES
            form.addSubmitButton({
                label: 'Actualizar Tipos de Cambio'
            });

            form.addButton({
                id: 'custpage_btnconsultar',
                label: 'Consultar Tipos de Cambio BCU',
                functionName: "consultarTipoCambio"
            });
            //FIN BOTON

            if (context.request.method === 'GET') {
                log.audit(proceso, 'FIN Proceso GET');
                context.response.writePage(form);
            } else {
                var accion = utilities.isEmpty(context.request.parameters.custpage_accion) ? context.request.parameters.submitter : context.request.parameters.custpage_accion;
                
                log.debug(proceso, 'POST accion: ' + accion);
               
                var accion = utilities.isEmpty(context.request.parameters.custpage_accion) ? context.request.parameters.submitter : context.request.parameters.custpage_accion;
                log.debug(proceso, 'POST accion: ' + accion);

                if (accion == "ACTUALIZAR" || accion == "CONSULTAR") {
                    var fechaUsar = null;
                    if (permitirCambioFecha === true || permitirCambioFecha === 'T') {
                        fechaUsar = context.request.parameters.custpage_fecha;
                    }
                    var cfgs = obtenerConfiguracionBCU(paramMonedaDolar);
                    log.debug('Respuesta Configuraciones', JSON.stringify(cfgs));
                    if (cfgs.error) {
                        log.error(proceso, cfgs.mensaje);
                        enviarEmail(cfgs.mensaje, emailUsuario, proceso);
                        context.response.writePage(form);
                        return;
                    }

                    var allResults = [];
                    for (var c = 0; c < cfgs.configuraciones.length; c++) {
                        var conf = cfgs.configuraciones[c];
                        var urlservicio = conf.config.urlservicio;
                        var monedaBase  = conf.config.monedaBase;
                        var codigoISOMonedaBase = conf.config.codigoISOMonedaBase;
                        var esMonedaPrincipalDolar = conf.esMonedaPrincipalDolar;

                        var consulta = consultarServicioBCU(
                            urlservicio,
                            conf.monedas,
                            conf.strmonedas,
                            fechaUsar,
                            esMonedaPrincipalDolar,
                            monedaBase
                        );

                        if (consulta.error) {
                            log.error(proceso, consulta.mensaje);
                            enviarEmail(consulta.mensaje, emailUsuario, proceso);
                            continue;
                        }

                        (consulta.results || []).forEach(function(item){
                            item.codigoISOMonedaBase = item.codigoISOMonedaBase || codigoISOMonedaBase;
                            item._configSubsidiaria  = conf.config.subsidiaria || '';
                            item._configISOBase      = codigoISOMonedaBase || '';
                        });

                        allResults = allResults.concat(consulta.results || []);
                    }
                    
                    var accionRaw = utilities.isEmpty(context.request.parameters.custpage_accion)
                    ? (context.request.parameters.submitter || '')
                    : context.request.parameters.custpage_accion;

                    var accion = (accionRaw + '').toUpperCase().trim();
                    log.debug(proceso, 'POST accionRaw=' + accionRaw + ' | accionNorm=' + accion);

                    if (accion === "ACTUALIZAR" || accion === "ACTUALIZAR TIPOS DE CAMBIO" || accion === "SUBMITTER" || accion === "SUBMIT") {
                        if (!allResults.length){
                            var msg = 'No se obtuvieron monedas para actualizar desde ninguna configuración.';
                            log.error(proceso, msg);
                            enviarEmail(msg, emailUsuario, proceso);
                        } else {
                            var update = actualizarTipoCambio(allResults, null, fechaUsar, paramMonedaDolar, emailUsuario);
                            log.audit(proceso, 'Scheduled lanzado | taskId=' + update.taskId + ' | error=' + !!update.error + ' | msg=' + (update.mensaje||''));
                            if (update.error){
                            enviarEmail(update.mensaje, emailUsuario, proceso);
                            } 
                        }
                        } else if (accion === "CONSULTAR" || accion === "CONSULTAR TIPOS DE CAMBIO BCU") {
                        listarMonedasMultiple(sublistMonedas, allResults);
                    }

                    context.response.writePage(form);
                    return;
                }

            }
        } catch (er) {
            log.error(proceso, 'Excepcion Proceso Generacion de ' + proceso + ' - Excepcion : ' + er.message);
            enviarEmail('Excepcion Proceso Generacion de ' + proceso + ' - Excepcion : ' + er.message, emailUsuario, proceso);
            
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
        var out = { error:false, mensaje:'', configuraciones:[] };

        try {
            var rs = utilities.searchSaved('customsearch_l598_conf_monedas_bcu');
            if (rs.error){
                out.error = true;
                out.mensaje = 'Error Consultando Config Tipos de Cambio: ' + rs.descripcion;
                return out;
            }

            var rows = rs.objRsponseFunction.result;
            var cols = rs.objRsponseFunction.search.columns;
            if (utilities.isEmpty(rows) || rows.length === 0){
                out.error = true;
                out.mensaje = 'No se encontraron registros de configuración del servicio de Tipos de Cambio';
                return out;
            }

            // Key de agrupación por configuración
            var byConfig = {}; 
            rows.forEach(function(r){
                var urlservicio        = r.getValue({ name: cols[1] });
                var subsidiaria        = r.getValue({ name: cols[2] });
                var monedaBase         = r.getValue({ name: cols[3] });
                var codigoISOMonBase   = r.getValue({ name: cols[7] });

                // datos moneda
                var infoCodigoMoneda = {
                    idInterno        : r.getValue({ name: cols[5] }),
                    codigo           : r.getValue({ name: cols[6] }),
                    codigoISOMoneda  : r.getValue({ name: cols[8] }),
                    consultarEnBCU   : r.getValue({ name: cols[9] }),
                    transformadoBCU  : r.getValue({ name: cols[10] }),
                    aplicarInverso   : r.getValue({ name: cols[11] })
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
                    out.error = true;
                    out.mensaje = 'Falta URL de Servicio en alguna configuración';
                    return;
                }

                var str = '';
                (cfg.monedas || []).forEach(function(m){
                    // Enviar al BCU sólo monedas no-UYU que estén marcadas para consultar
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
                    ((!utilities.isEmpty(cfg.config.monedaBase) && (!utilities.isEmpty(paramMonedaDolar) && paramMonedaDolar == cfg.config.monedaBase)) ||
                    (!utilities.isEmpty(isoBase) && isoBase == 'USD')) ? true : false;
            });

            if (out.error) return out;

            out.configuraciones = Object.keys(byConfig).map(function(k){ return byConfig[k]; });
            return out;

        } catch (err){
            out.error = true;
            out.mensaje = err.message;
            return out;
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
    function consultarServicioBCU(urlservicio, monedasConsultar, strmonedas, fechaUsar, esMonedaPrincipalDolar, monedaBaseConfig){
        var response = { error: false, mensaje: "" };

        // Fecha para el BCU (YYYY-MM-DD). Si no hay fecha de pantalla, usar AYER.
        var fechaConsulta = formatearFecha(fechaUsar) || obtenerFechaServidor("AYER");
        var monedasActualizar = [];

        log.audit('Integracion BCU', 'Inicio consulta BCU - URL: ' + urlservicio + ' - Fecha: ' + fechaConsulta);

        try {
            var soapBody =
                '<?xml version="1.0" encoding="utf-8"?>' +
                '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
                '<soap:Body>' +
                    '<Cotizacion xmlns="http://tempuri.org/">' +
                    '<FechaDesde>' + fechaConsulta + '</FechaDesde>' +
                    '<FechaHasta>' + fechaConsulta + '</FechaHasta>' +
                    '<Grupo>0</Grupo>' +
                    '<Moneda>' + (strmonedas || '') + '</Moneda>' +
                    '</Cotizacion>' +
                '</soap:Body>' +
                '</soap:Envelope>';

            var request = https.request({
                method: https.Method.POST,
                url: urlservicio,
                headers: {
                    'cache-control': 'no-cache',
                    'Content-Type' : 'text/xml; charset=utf-8',
                    'SOAPAction'   : 'http://tempuri.org/Cotizacion'
                },
                body: soapBody
            });

            if (utilities.isEmpty(request)) {
                response.error = true;
                response.mensaje = 'No se recibió respuesta del servicio.';
                return response;
            }

            var bodyStr = String(request.body || '');
            var isHtml  = bodyStr.trim().toUpperCase().indexOf('<HTML') === 0;
            if (request.code >= 400 || isHtml) {
                response.error   = true;
                response.code    = request.code;
                response.body    = bodyStr.substring(0, 512);
                response.mensaje = 'El servicio devolvió error HTTP ' + request.code + ' (posible HTML). Verificar URL/SOAPAction/whitelist. Detalle: ' + response.body;
                return response;
            }

            log.audit('Integracion BCU', 'Respuesta cruda recibida (len=' + bodyStr.length + ')');

            // --- Parse XML ---
            var xmlRespuesta = xml.Parser.fromString({ text: bodyStr });
            if (utilities.isEmpty(xmlRespuesta)) {
                response.error = true;
                response.mensaje = 'No se pudo parsear el XML de respuesta.';
                return response;
            }

            // status
            var nodoEstado = xml.XPath.select({ node: xmlRespuesta, xpath: "//*[name()='status']" });
            if (utilities.isEmpty(nodoEstado) || utilities.isEmpty(nodoEstado[0]) || utilities.isEmpty(nodoEstado[0].textContent)) {
                response.error = true;
                response.mensaje = 'No se encontró el nodo <status> en la respuesta BCU.';
                return response;
            }

            // datos
            var informacionCotizaciones = xml.XPath.select({ node: xmlRespuesta, xpath: "//*[name()='dato']" });
            if (utilities.isEmpty(informacionCotizaciones) || !informacionCotizaciones.length) {
                response.error = true;
                response.mensaje = 'No se encontraron nodos <dato> en la respuesta.';
                return response;
            }

            var idMonedaPesoUruguayo = '';
            var arrayMonedasPrincipales = [];

            if (esMonedaPrincipalDolar) {
                arrayMonedasPrincipales.push('USD');
            } else {
                arrayMonedasPrincipales.push('UYU');
                var pesoCfgInit = (monedasConsultar || []).filter(function(m){ return m.codigoISOMoneda == 'UYU'; });
                if (pesoCfgInit && pesoCfgInit.length) {
                    idMonedaPesoUruguayo = pesoCfgInit[0].idInterno;
                }
            }

            for (var n = 0; n < arrayMonedasPrincipales.length; n++) {
                var tcvPesoUruguyoMonedaDolar = 0.0;

                for (var i = 0; i < informacionCotizaciones.length; i++) {
                    var info = {
                        idInterno: '',
                        codigo: '',
                        tipoCambioVenta: '',
                        currencyNameBcu: '',
                        esMonedaDolar: false,
                        codigoISOMonedaBase: arrayMonedasPrincipales[n],
                        monedaBase: '',
                        transformadoBCU: '',
                        aplicarInverso: '',
                        codigoISOMonedaDestino: ''
                    };

                    var dato = informacionCotizaciones[i];
                    for (var j = 0; j < dato.childNodes.length; j++) {
                        var name = dato.childNodes[j].nodeName;
                        var val  = dato.childNodes[j].textContent;

                        if (name === 'Moneda') {
                            info.codigo = val;

                            // Mapear contra configuradas
                            var match = (monedasConsultar || []).filter(function(m){ return m.codigo == info.codigo; });
                            if (!utilities.isEmpty(match) && match.length > 0) {
                                info.idInterno               = match[0].idInterno;
                                info.transformadoBCU         = match[0].transformadoBCU;
                                info.aplicarInverso          = match[0].aplicarInverso;
                                info.esMonedaDolar           = (match[0].codigoISOMoneda == 'USD');
                                info.codigoISOMonedaDestino  = match[0].codigoISOMoneda || '';
                            }
                        }

                        if (name === (esMonedaPrincipalDolar ? 'ArbAct' : 'TCV')) {
                        var valor = parseFloat(val, 10);
                        if (isNaN(valor)) valor = 0;

                        if (info.transformadoBCU === true || info.transformadoBCU === 'T') {
                            info.tipoCambioVenta = valor.toFixedOK(7);
                        } 
                        else if (info.aplicarInverso === true || info.aplicarInverso === 'T') {
                            info.tipoCambioInverso = valor.toFixedOK(7);
                            info.tipoCambioVenta   = valor ? Math.abs(1 / valor).toFixedOK(7) : 0.00;
                        } 
                        else {
                            info.tipoCambioVenta = valor.toFixedOK(7);
                        }
                    }

                        if (name === 'TCV' && info.esMonedaDolar) {
                            tcvPesoUruguyoMonedaDolar = val;
                        }

                        if (name === 'Nombre') {
                            info.currencyNameBcu = val;
                        }
                    }

                    monedasActualizar.push(info);
                }

                if (esMonedaPrincipalDolar && tcvPesoUruguyoMonedaDolar > 0) {
                    var peso = {};
                    var pesoCfg = (monedasConsultar || []).filter(function(m){ return m.codigoISOMoneda == 'UYU'; });
                    if (!utilities.isEmpty(pesoCfg) && pesoCfg.length > 0) {
                        var arbitrajeUYU = Math.abs(parseFloat(1 / tcvPesoUruguyoMonedaDolar, 10)).toFixedOK(7);

                        peso.idInterno               = pesoCfg[0].idInterno;
                        peso.codigo                  = 999;
                        peso.tipoCambioVenta         = arbitrajeUYU;
                        peso.currencyNameBcu         = 'PESOS URUGUAYOS';
                        peso.esMonedaDolar           = false;
                        peso.codigoISOMonedaBase     = arrayMonedasPrincipales[n];
                        peso.monedaBase              = pesoCfg[0].idInterno;
                        peso.aplicarInverso          = pesoCfg[0].aplicarInverso;
                        peso.codigoISOMonedaDestino  = 'UYU';

                        if (!utilities.isEmpty(peso.aplicarInverso) && (peso.aplicarInverso === true || peso.aplicarInverso === 'T')) {
                            peso.tipoCambioInverso = parseFloat(tcvPesoUruguyoMonedaDolar, 10).toFixedOK(7);
                        }

                        idMonedaPesoUruguayo = pesoCfg[0].idInterno;
                        monedasActualizar.push(peso);
                    }
                }
            }

            if (!utilities.isEmpty(monedasActualizar) && monedasActualizar.length > 0) {
                for (var m = 0; m < monedasActualizar.length; m++) {
                    monedasActualizar[m].monedaBase = monedaBaseConfig;
                }
            }

            response.results = monedasActualizar;
            return response;

        } catch (e) {
            response.error   = true;
            response.code    = 500;
            response.body    = String(e && e.message || e);
            response.mensaje = 'Excepción consultando BCU: ' + response.body;
            return response;
        }
    }


    /** 
     * @param {array}   monedasActualizar An array of objects (idInterno, codigo, tipoCambioVenta, currencyNameBcu)
     * @param {int}     monedaBase        Netsuite base currency idInterno
     * @return {string} return.taskId     Task Id
     * @return {string} return.error      True on error
     * @return {string} return.mensaje    An error message if there is any
    */
    function actualizarTipoCambio(monedasActualizar, monedaBase, fechaUsar, paramMonedaDolar, usuario){
        var response = {error:false, mensaje:''};

        try {
            if (utilities.isEmpty(monedaBase)) {
                var arr = monedasActualizar || [];
                var primera = null;
                for (var i = 0; i < arr.length; i++) {
                    if (!utilities.isEmpty(arr[i]) && !utilities.isEmpty(arr[i].monedaBase)) {
                        primera = arr[i];
                        break;
                    }
                }
                monedaBase = primera ? primera.monedaBase : '1';
            }

            var data = {
                monedasActualizar: monedasActualizar,
                monedaBase: monedaBase
            };

            var mrTask = task.create({ taskType : task.TaskType.SCHEDULED_SCRIPT });
            mrTask.scriptId     = "customscript_l598_tipodecambio_sched";
            mrTask.deploymentId = "customdeploy_l598_tipodecambio_sched";
            mrTask.params = {
                custscript_l598_params_monedas           : JSON.stringify(data),
                custscript_l598_cam_bcu_mon_dolar_sch    : paramMonedaDolar,
                custscript_l598_cam_bcu_emp_enc          : (usuario && usuario.id) ? String(usuario.id) : '',
                custscript_l598_fecha_usar_sch           : fechaUsar
            };

            var taskId = mrTask.submit();
            response.taskId = taskId;
            return response;

        } catch (e) {
            response.error = true;
            response.mensaje = "Excepcion: " + e.message;
            return response;
        }
    }


    /** 
     * @param {string}   custom    Specify the required format date (HOY [date object]| AYER[string format])
     * @return {string}  return    HOY = A Date object | AYER = A string format)
    */
    function obtenerFechaServidor(custom){
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
                    var diasRestar = 1;
                    var newDate = new Date(fechaActualUru.setDate(fechaActualUru.getDate() - diasRestar));
                    var formattedstring = formatearFecha(newDate);

                    return formattedstring;
                break;
                default: 
                    return null;
                break;
            }
        } else {
            return null;
        }
    }

    function enviarEmail( mensajeEmail, usuarioEmail, proceso) {
        log.debug('Parametros', 'mensajeEmail: ' + mensajeEmail + ' - usuarioEmail: ' + usuarioEmail +' - proceso: ' + proceso);
        if (!utilities.isEmpty(mensajeEmail) && !utilities.isEmpty(usuarioEmail)) {
            var mensaje = "<html><head></head><body><br>";
            mensaje += 'El proceso '+ proceso +' ha tenido el siguiente error:  <br>' + mensajeEmail;
            mensaje += "<br>";
            mensaje += "</body></html>";
            email.send({
                author: usuarioEmail.id,
                subject: "NetSuite - Proceso de Consulta de Tipo de Cambio BCU",
                body: mensaje,
                recipients: usuarioEmail.email
            });
        }
    }

    function formatearFecha(fechaString){
        if (!utilities.isEmpty(fechaString)){
            var f = new Date(format.parse({value:fechaString,type:format.Type.DATE}));
            var formattedstring = f.getFullYear() + "-" + utilities.padding_left((parseInt(f.getMonth(), 10) + 1), '0', 2) + "-" + utilities.padding_left(f.getDate(), '0', 2);
            return formattedstring;
        }else{
            return null;
        }
    }

    function listarMonedasMultiple(sublist, lista){
        if (utilities.isEmpty(lista) || !lista.length) return;

        lista.sort(function(a,b){
            var ab = (a.codigoISOMonedaBase || '').localeCompare(b.codigoISOMonedaBase || '');
            if (ab !== 0) return ab;
            return (a.currencyNameBcu || '').localeCompare(b.currencyNameBcu || '');
        });

        for (var i = 0; i < lista.length; i++){
            var row = lista[i];

            if (!utilities.isEmpty(row.codigoISOMonedaBase)) {
                sublist.setSublistValue({ id: 'base_iso',   line: i, value: row.codigoISOMonedaBase });
                sublist.setSublistValue({
                    id: 'base_nombre',
                    line: i,
                    value: (row.codigoISOMonedaBase == 'USD' ? 'Dólar Estadounidense' :
                            (row.codigoISOMonedaBase == 'UYU' ? 'Peso Uruguayo' : ''))
                });
            }

            if (!utilities.isEmpty(row.currencyNameBcu)) {
                sublist.setSublistValue({ id: 'moneda', line: i, value: row.currencyNameBcu });
            }

            if (!utilities.isEmpty(row.codigoISOMonedaDestino)) {
                sublist.setSublistValue({ id: 'destino_iso', line: i, value: row.codigoISOMonedaDestino });
            }

            var tc = utilities.isEmpty(row.tipoCambioVenta) ? '0' : String(row.tipoCambioVenta);
            sublist.setSublistValue({ id: 'tipodecambio', line: i, value: tc });

            if (!utilities.isEmpty(row._configSubsidiaria)) {
                sublist.setSublistValue({ id: 'config_origen', line: i, value: String(row._configSubsidiaria) });
            }
        }
    }

    Number.prototype.toFixedOK = function(decimals) {
        var sign = this >= 0 ? 1 : -1;
        return (Math.round((this*Math.pow(10,decimals))+(sign*0.001))/Math.pow(10,decimals)).toFixed(decimals);
    }

    return {
        onRequest: onRequest
    };

});   