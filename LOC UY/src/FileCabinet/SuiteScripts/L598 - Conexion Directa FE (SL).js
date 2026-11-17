/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@NAmdConfig /SuiteScripts/configuration_l598.json
 *@NModuleScope Public
 */
define(
  [
    'N/search', 'N/record', 'N/format', 'L598/utilities', 'N/xml', 'N/file', 'N/https', 'N/runtime', 'N/encode', 'N/http', 'N/config', 'N/query'
  ],
  function (search, record, format, utilities, xml, file, https, runtime, encode, http, config, query) {

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
      'idPlantillaXML',
      'idProveedorFEComprobantesDGI',
      'tipoIntegracion',
      'idDirectorioFilesFE'
    ];

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {

      let proceso = 'onRequest';
      let script = runtime.getCurrentScript();
      let responseSuitelet = context.response;
      let message = '';
      let informacionRespuesta = {};
      informacionRespuesta.error = false;
      informacionRespuesta.mensajeError = '';
      informacionRespuesta.mensajeFinal = '';
      informacionRespuesta.objetoRespuestaWS = {};
      informacionRespuesta.objetoRespuestaWS.errorMsg = "";
      informacionRespuesta.objetoRespuestaWS.warningMsg = "";
      informacionRespuesta.objetoRespuestaWS.firmadoOK = "";
      informacionRespuesta.objetoRespuestaWS.FechaFirma = "";
      informacionRespuesta.objetoRespuestaWS.CAE = "";
      informacionRespuesta.objetoRespuestaWS.CAENROINICIAL = "";
      informacionRespuesta.objetoRespuestaWS.CAENROFINAL = "";
      informacionRespuesta.objetoRespuestaWS.CAEVencimiento = "";
      informacionRespuesta.objetoRespuestaWS.CAESERIE = "";
      informacionRespuesta.objetoRespuestaWS.CAENRO = "";
      informacionRespuesta.objetoRespuestaWS.CODSEGURIDAD = "";
      informacionRespuesta.objetoRespuestaWS.URLVERIFICACION = "";
      informacionRespuesta.objetoRespuestaWS.URLVERIFICACIONQR = "";
      informacionRespuesta.objetoRespuestaWS.RESOLUCIONIVA = "";
      informacionRespuesta.objetoRespuestaWS.CORRESPONDESOBRE = "";
      informacionRespuesta.objetoRespuestaWS.infoEnviadaAFIP = "";
      informacionRespuesta.objetoRespuestaWS.infoRespuestaAFIP = "";
      informacionRespuesta.objetoRespuestaWS.fechaSolicitudAFIP = "";
      informacionRespuesta.objetoRespuestaWS.fechaRespuestaAFIP = "";
      informacionRespuesta.objetoRespuestaWS.CAEGENERADO = "NO";
      informacionRespuesta.objetoRespuestaWS.codigoBarras = "";

      // log.debug(proceso, 'context.request.method: ' + JSON.stringify(context.request.method) + ' - context.request.parameters: ' + JSON.stringify(context.request.parameters));

      try {
        if (context.request.method == 'POST' && !utilities.isEmpty(context.request.parameters.idTransaccion) && !utilities.isEmpty(context.request.parameters.typeTransaccion)) {

          log.debug(proceso, "LINE 34 - Remaining Usage = " + script.getRemainingUsage() + ' --- time: ' + new Date());

          /// obten parametros de tipos de integracion y comparalos con los valores que viene desde el SS
          let tipoIntegracionUCFE = script.getParameter('custscript_l598_con_dir_fe_sl_t_int_ucfe');
          let tipoIntegracionTAFACE = script.getParameter('custscript_l598_con_dir_fe_sl_t_int_tafa');
          let tipoIntegracionSIGE = script.getParameter('custscript_l598_con_dir_fe_sl_t_int_sige');
          let tipoIntegracionFacturaLista = script.getParameter('custscript_l598_con_dir_fe_sl_t_int_flis');

          let infoTransaction = {
            id: context.request.parameters.idTransaccion,
            type: context.request.parameters.typeTransaccion,
            idXML: context.request.parameters.idXML,
            idJSON: context.request.parameters.idJSON
          };
          log.debug(proceso, 'INICIO - generación de CAE SL');
          log.debug(proceso, 'infoTransaction: ' + JSON.stringify(infoTransaction));

          // Load TransactionInfo
          var strSQL = "SELECT \"TRANSACTION\".custbody_l598_codigo_serie AS l598_codigo_serie, CUSTOMRECORD_L598_TIPOS_COMPROBANTES.\"ID\" AS l598_tipo_comprobante, CUSTOMRECORD_L598_TIPOS_COMPROBANTES.name AS l598_tipo_comprobante_text, \"TRANSACTION\".custbody_l598_codigo_sucursal AS l598_codigo_sucursal, \"TRANSACTION\".custbody_l598_documento_xml_fe_id AS l598_documento_xml_fe_id, \n \"TRANSACTION\".custbody_l598_caja AS l598_caja, \"TRANSACTION\".custbody_l598_informacion_json_tran_id AS l598_informacion_json_tran FROM \"TRANSACTION\",  CUSTOMRECORD_L598_TIPOS_COMPROBANTES WHERE \"TRANSACTION\".custbody_l598_tipo_comprobante = CUSTOMRECORD_L598_TIPOS_COMPROBANTES.\"ID\"(+) AND ((\"TRANSACTION\".\"RECORDTYPE\" IN ('" + infoTransaction.type + "') AND \"TRANSACTION\".\"ID\" = '" + infoTransaction.id + "'))";

          log.debug('Requested Query', strSQL);

          // Paged execution 
          var objPagedData = query.runSuiteQLPaged({
            query: strSQL,
            pageSize: 1000
          });

          // Paging 
          var recordTransaction = [];
          objPagedData.pageRanges.forEach(function (pageRange) {
            var objPage = objPagedData.fetch({ index: pageRange.index }).data;

            // Map results to columns 
            recordTransaction.push.apply(recordTransaction, objPage.asMappedResults());
          });

          log.debug('N/query SuiteQL - recordTransaction: ', JSON.stringify(recordTransaction));

          if (recordTransaction.length > 0) {

            recordTransaction = recordTransaction[0];

            let codigoSerie = recordTransaction.l598_codigo_serie; // get text
            let tipoComprobanteText = recordTransaction.l598_tipo_comprobante_text; // gest text
            let sucursalText = recordTransaction.l598_codigo_sucursal; // get text
            informacionRespuesta.mensajeError = 'ID Interno Transacción : ' + infoTransaction.id + ' - Comprobante :  ' + tipoComprobanteText.toString() + ' ' + codigoSerie.toString() + '-' + sucursalText.toString() + '-' + infoTransaction.id;

            // log.debug(proceso, 'recordTransaction: ' + JSON.stringify(recordTransaction));

            let docXML = infoTransaction.idXML;

            //New Process
            log.debug(proceso, 'LINE 134 - configuracionFE - INCIO - Date: ' + new Date());
            let configuracionFE = getConfigurationFE(infoTransaction.id, infoTransaction.type);
            log.debug(proceso, 'configuracionFE: ' + JSON.stringify(configuracionFE));
            log.debug(proceso, 'LINE 138 - configuracionFE - FIN - Date: ' + new Date());

            if (!utilities.isEmpty(configuracionFE) && !configuracionFE.error) {

              let empresaRUC = configuracionFE.informacionAdicional.empresaRUC;
              let URLGateway = configuracionFE.informacionAdicional.URLGateway;
              let URLServicioFirma = configuracionFE.informacionAdicional.URLServicioFirma;
              let URLServicioConfFirma = configuracionFE.informacionAdicional.URLServicioConfFirma;
              let URLServicioRestUCFE = configuracionFE.informacionAdicional.URLServicioRestUCFE;
              let urlServicioFirmaSIGE = configuracionFE.informacionAdicional.urlServicioFirmaSIGE;
              let urlServicioConsultaSIGE = configuracionFE.informacionAdicional.urlServicioConsultaSIGE;
              let fileTXT = file.load({ id: docXML });
              let contents = fileTXT.getContents();
              let cajaId = recordTransaction.l598_caja;
              let cajaNro = search.lookupFields({
                type: 'customrecord_l598_cajas',
                id: cajaId,
                columns: ['custrecord_l598_cajas_numero']
              });

              let cajaNroFinal = nvl(cajaNro.custrecord_l598_cajas_numero, 0);
              let sucursalNro = recordTransaction.l598_codigo_sucursal;
              sucursalNro = nvl(sucursalNro, 0);

              let headers = [];
              headers['content-type'] = 'text/xml; charset=utf-8';
              // log.debug(proceso, 'contents: ' + JSON.stringify(contents));

              log.debug(proceso, 'Tipo Integracion Parametro : ' + tipoIntegracionTAFACE + 'Tipo Integracion Configuracion : ' + configuracionFE.tipoIntegracion);
              // Inicio verificación de TAFACE
              if (tipoIntegracionTAFACE == configuracionFE.tipoIntegracion) {

                // log.debug(proceso, 'Ingreso a tipo de integración TAFACE.');

                let body = '<?xml version="1.0" encoding="UTF-8"?>' +
                  '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsdlns="TAFACE">' +
                  '<soapenv:Header/>' +
                  '<soapenv:Body>' +
                  '<WSIntegracionFirmarComprobante_0205.Execute>' +
                  '<Pempruc xmlns="TAFACE">' + empresaRUC + '</Pempruc>' +
                  '<Psucid xmlns="TAFACE">' + sucursalNro + '</Psucid>' +
                  '<Pcajaid xmlns="TAFACE">' + cajaNroFinal + '</Pcajaid>' +
                  contents +
                  '</WSIntegracionFirmarComprobante_0205.Execute>' +
                  '</soapenv:Body>' +
                  '</soapenv:Envelope>';

                let fechaSolicitudAFIP = parseDate();
                // let fechaSolicitudAFIP = new Date();
                var errorHttp = false;
                var errorHttps = false;
                let response = null;

                try {
                  response = http.post({
                    url: URLServicioFirma,
                    headers: headers,
                    body: body
                  });
                } catch (error) {
                  if (error.name == 'SSS_INVALID_URL') {
                    errorHttp = true;
                  }
                  var mensajeErrorHttp = 'Error al consultar por HTTP a URL Servicio Firma - Detalles: ' + JSON.stringify(error);
                  log.error(proceso, mensajeErrorHttp);
                }

                try {
                  if (errorHttp) {
                    response = https.post({
                      url: URLServicioFirma,
                      headers: headers,
                      body: body
                    });
                  }
                } catch (error) {
                  errorHttps = true;
                  var mensajeErrorHttp = 'Error al consultar por HTTPS a URL Servicio Firma - Detalles: ' + JSON.stringify(error);
                  log.error(proceso, mensajeErrorHttp);
                }

                let fechaRespuestaAFIP = parseDate();
                // let fechaRespuestaAFIP = new Date();

                log.debug(proceso, 'response: ' + JSON.stringify(response) + ' - fechaRespuestaAFIP: ' + fechaRespuestaAFIP + ' - fechaSolicitudAFIP: ' + fechaSolicitudAFIP);

                if (!errorHttps) {
                  if (!utilities.isEmpty(response) && !utilities.isEmpty(response.body)) {

                    let responseBody = response.body;
                    // log.debug(proceso, 'Proveedor FE response: ' + JSON.stringify(responseBody));

                    let idFileJSON = infoTransaction.idJSON;
                    let fileJSON = file.load({
                      id: idFileJSON
                    });

                    let informacionJSONTransaccionFE = JSON.parse(fileJSON.getContents());
                    // log.debug(proceso, 'informacionJSONTransaccionFE: ' + JSON.stringify(informacionJSONTransaccionFE));
                    // log.debug(proceso, 'informacionJSONTransaccionFE.informacionCliente: ' + informacionJSONTransaccionFE.informacionCliente);

                    let infoEnviadaAFIP = "Cantidad Registros : " + 1 + " - Tipo Comprobante : " + informacionJSONTransaccionFE.tipoComprobanteURU + " - Serie : " + informacionJSONTransaccionFE.serie + " - Sucursal : " + informacionJSONTransaccionFE.sucursal;
                    infoEnviadaAFIP += " - Tipo Doc : " + informacionJSONTransaccionFE.informacionCliente.clienteTipoDocumento + " - Num Doc : " + informacionJSONTransaccionFE.informacionCliente.clienteNumeroDoc;
                    infoEnviadaAFIP += " - cbt_desde : " + informacionJSONTransaccionFE.numero + " - cbt_hasta : " + informacionJSONTransaccionFE.numero;
                    infoEnviadaAFIP += " - cbt_fecha : " + informacionJSONTransaccionFE.informacionEncabezado.fechaComprobante.toString();
                    infoEnviadaAFIP += " - monto_no_gravado : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoNoGravado;
                    infoEnviadaAFIP += " - monto_exp_asim : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoExpYAsimiladas;
                    infoEnviadaAFIP += " - monto_no_fact : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.montoNoFacturable;
                    infoEnviadaAFIP += " - monto_percibido : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoRetenido;
                    infoEnviadaAFIP += " - monto_grav_iva_tasa_basica : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoIVATasaBasica;
                    infoEnviadaAFIP += " - monto_grav_iva_tasa_minima : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoIVATasaMinima;
                    infoEnviadaAFIP += " - monto_grav_iva_otra_tasa : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoIVAOtraTasa;
                    infoEnviadaAFIP += " - monto_iva_susp : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoIVASuspenso;
                    infoEnviadaAFIP += " - monto_tasa_basica : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalIVATasaBasica;
                    infoEnviadaAFIP += " - monto_tasa_minima : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalIVATasaMinima;
                    infoEnviadaAFIP += " - monto_otra_tasa : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalIVAOtraTasa;
                    infoEnviadaAFIP += " - monto_imp_perc : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoImpuestoPercibido;
                    infoEnviadaAFIP += " - monto_total_credf : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalCreditosFiscales;
                    infoEnviadaAFIP += " - monto_total : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.montoTotalAPagar;
                    infoEnviadaAFIP += " - mon_id : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.codigoMonedaTransaccion + " - mon_cotiz : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.tipoCambio;

                    informacionRespuesta.objetoRespuestaWS.infoEnviadaAFIP = infoEnviadaAFIP;
                    informacionRespuesta.objetoRespuestaWS.fechaSolicitudAFIP = fechaSolicitudAFIP.toISOString().slice(0, 19).replace("T", " ");
                    informacionRespuesta.objetoRespuestaWS.fechaRespuestaAFIP = fechaRespuestaAFIP.toISOString().slice(0, 19).replace("T", " ");

                    let respuestaXml = xml.Parser.fromString({
                      text: responseBody
                    });

                    // log.debug(proceso, 'respuestaXml: ' + JSON.stringify(respuestaXml));

                    let nodoRespuestaPxmlrespuesta = respuestaXml.getElementsByTagName({ tagName: 'Pxmlrespuesta' });
                    let nodoRespuestaPerrorreturn = respuestaXml.getElementsByTagName({ tagName: 'Perrorreturn' });
                    let nodoRespuestaPerrormessage = respuestaXml.getElementsByTagName({ tagName: 'Perrormessage' });

                    /* log.debug(proceso, 'nodoRespuestaPxmlrespuesta: ' + JSON.stringify(nodoRespuestaPxmlrespuesta));
                    log.debug(proceso, 'nodoRespuestaPerrorreturn: ' + JSON.stringify(nodoRespuestaPerrorreturn));
                    log.debug(proceso, 'nodoRespuestaPerrormessage: ' + JSON.stringify(nodoRespuestaPerrormessage));
                    log.debug(proceso, 'nodoRespuestaPerrorreturn[0].textContent: ' + nodoRespuestaPerrorreturn[0].textContent + ' - type of: ' + typeof nodoRespuestaPerrorreturn[0].textContent);
                    log.debug(proceso, 'nodoRespuestaPerrormessage[0].textContent: ' + nodoRespuestaPerrormessage[0].textContent);
                    log.debug(proceso, 'nodoRespuestaPxmlrespuesta[0].textContent ' + nodoRespuestaPxmlrespuesta[0].textContent); */

                    // if (!utilities.isEmpty(nodoRespuestaPerrorreturn) && nodoRespuestaPerrorreturn[0].textContent.toString() == 'false' && !utilities.isEmpty(nodoRespuestaPxmlrespuesta) && !utilities.isEmpty(nodoRespuestaPxmlrespuesta[0].textContent)) {
                    if (!utilities.isEmpty(nodoRespuestaPerrorreturn) && nodoRespuestaPerrorreturn[0].textContent.toString() == 'false' && !utilities.isEmpty(nodoRespuestaPerrormessage) && utilities.isEmpty(nodoRespuestaPerrormessage[0].textContent) && !utilities.isEmpty(nodoRespuestaPxmlrespuesta) && !utilities.isEmpty(nodoRespuestaPxmlrespuesta[0].textContent)) {

                      informacionRespuesta.objetoRespuestaWS.errorMsg = respuestaXml.getElementsByTagName({ tagName: 'ERRORMSG' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.warningMsg = respuestaXml.getElementsByTagName({ tagName: 'WARNINGMSG' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.firmadoOK = respuestaXml.getElementsByTagName({ tagName: 'FIRMADOOK' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.FechaFirma = respuestaXml.getElementsByTagName({ tagName: 'FIRMADOFCHHORA' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.CAE = respuestaXml.getElementsByTagName({ tagName: 'CAENRO' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.CAENROINICIAL = respuestaXml.getElementsByTagName({ tagName: 'CAENROINICIAL' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.CAENROFINAL = respuestaXml.getElementsByTagName({ tagName: 'CAENROFINAL' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.CAEVencimiento = respuestaXml.getElementsByTagName({ tagName: 'CAEVENCIMIENTO' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.CAESERIE = respuestaXml.getElementsByTagName({ tagName: 'CAESERIE' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.CAENRO = respuestaXml.getElementsByTagName({ tagName: 'CAENA' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.CODSEGURIDAD = respuestaXml.getElementsByTagName({ tagName: 'CODSEGURIDAD' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.URLVERIFICACION = respuestaXml.getElementsByTagName({ tagName: 'URLPARAVERIFICARTEXTO' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.URLVERIFICACIONQR = respuestaXml.getElementsByTagName({ tagName: 'URLPARAVERIFICARQR' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.RESOLUCIONIVA = respuestaXml.getElementsByTagName({ tagName: 'RESOLUCIONIVA' })[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.CORRESPONDESOBRE = respuestaXml.getElementsByTagName({ tagName: 'CORRESPONDESOBRE' })[0].textContent;

                      log.debug(proceso, 'informacionRespuesta.objetoRespuestaWS: ' + JSON.stringify(informacionRespuesta.objetoRespuestaWS));

                      if (utilities.isEmpty(informacionRespuesta.objetoRespuestaWS.errorMsg)) {
                        informacionRespuesta.objetoRespuestaWS.errorMsg = informacionRespuesta.objetoRespuestaWS.warningMsg;
                      } else {
                        if (!utilities.isEmpty(informacionRespuesta.objetoRespuestaWS.warningMsg)) {
                          informacionRespuesta.objetoRespuestaWS.errorMsg += " / " + informacionRespuesta.objetoRespuestaWS.warningMsg;
                        }
                      }

                      if (informacionRespuesta.objetoRespuestaWS.firmadoOK == 1 && informacionRespuesta.objetoRespuestaWS.CAE > 0) {

                        // Realizo la confirmacion del CAE
                        let bodyConfirmacionFirma = '<?xml version="1.0" encoding="UTF-8"?>' +
                          '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsdlns="TAFACE">' +
                          '<soapenv:Header/>' +
                          '<soapenv:Body>' +
                          '<WSIntegracionConfirmarFirmaComprobante_0205.Execute>' +
                          '<Pempruc xmlns="TAFACE">' + empresaRUC + '</Pempruc>' +
                          '<Psucid xmlns="TAFACE">' + sucursalNro + '</Psucid>' +
                          '<Pcajaid xmlns="TAFACE">' + cajaNroFinal + '</Pcajaid>' +
                          '<Pcaenroautorizacion xmlns="TAFACE">' + informacionRespuesta.objetoRespuestaWS.CAENRO + '</Pcaenroautorizacion>' +
                          '<Pcaeserie xmlns="TAFACE">' + informacionRespuesta.objetoRespuestaWS.CAESERIE + '</Pcaeserie>' +
                          '<Pcaenro xmlns="TAFACE">' + informacionRespuesta.objetoRespuestaWS.CAE + '</Pcaenro>' +
                          '</WSIntegracionConfirmarFirmaComprobante_0205.Execute>' +
                          '</soapenv:Body>' +
                          '</soapenv:Envelope>';

                        var errorHttp = false;
                        var errorHttps = false;
                        let response = null;

                        try {
                          response = http.post({
                            url: URLServicioConfFirma,
                            headers: headers,
                            body: bodyConfirmacionFirma
                          });
                        } catch (error) {
                          if (error.name == 'SSS_INVALID_URL') {
                            errorHttp = true;
                          }
                          var mensajeErrorHttp = 'Error al consultar por HTTP a URL Confirmación Firma - Detalles: ' + JSON.stringify(error);
                          log.error(proceso, mensajeErrorHttp);
                        }

                        try {
                          if (errorHttp) {
                            response = https.post({
                              url: URLServicioConfFirma,
                              headers: headers,
                              body: bodyConfirmacionFirma
                            });
                          }
                        } catch (error) {
                          errorHttps = true;
                          var mensajeErrorHttp = 'Error al consultar por HTTPS a URL Confirmación Firma - Detalles: ' + JSON.stringify(error);
                          log.error(proceso, mensajeErrorHttp);
                        }

                        log.debug(proceso, 'response confirmación firma TAFACE: ' + JSON.stringify(response));

                        if (!errorHttps) {
                          if (!utilities.isEmpty(response) && !utilities.isEmpty(response.body)) {

                            let responseBody = response.body;
                            // log.debug(proceso, 'Proveedor FE Confirmación Firma TAFACE - response: ' + JSON.stringify(responseBody));

                            let respuestaXml = xml.Parser.fromString({
                              text: responseBody
                            });

                            let nodoRespuestaPerrorreturn = respuestaXml.getElementsByTagName({ tagName: 'Perrorreturn' });
                            let nodoRespuestaPerrormessage = respuestaXml.getElementsByTagName({ tagName: 'Perrormessage' });

                            // log.debug(proceso, 'nodoRespuestaPerrorreturn: ' + JSON.stringify(nodoRespuestaPerrorreturn));
                            // log.debug(proceso, 'nodoRespuestaPerrormessage: ' + JSON.stringify(nodoRespuestaPerrormessage));

                            // log.debug(proceso, 'respuestaXml: ' + JSON.stringify(respuestaXml));

                            // if (!utilities.isEmpty(nodoRespuestaPerrorreturn) && nodoRespuestaPerrorreturn[0].textContent.toString() == 'false') {
                            if (!utilities.isEmpty(nodoRespuestaPerrorreturn) && nodoRespuestaPerrorreturn[0].textContent.toString() == 'false' && !utilities.isEmpty(nodoRespuestaPerrormessage) && utilities.isEmpty(nodoRespuestaPerrormessage[0].textContent)) {

                              informacionRespuesta.objetoRespuestaWS.infoRespuestaAFIP = 'OK';
                              if (informacionRespuesta.objetoRespuestaWS.errorMsg) {
                                informacionRespuesta.objetoRespuestaWS.infoRespuestaAFIP += ' / ' + informacionRespuesta.objetoRespuestaWS.errorMsg;
                              }

                              var fechaFinal = informacionRespuesta.objetoRespuestaWS.CAEVencimiento.toString().split('-');
                              if (!utilities.isEmpty(fechaFinal) && fechaFinal.length > 0 && fechaFinal.length == 3) {
                                informacionRespuesta.objetoRespuestaWS.CAEVencimiento = utilities.padding_left(fechaFinal[2], '0', 2) + "/" + utilities.padding_left(fechaFinal[1], '0', 2) + "/" + fechaFinal[0];
                              }
                              informacionRespuesta.objetoRespuestaWS.CAEGENERADO = 'SI';
                              informacionRespuesta.objetoRespuestaWS.FechaFirma = parseDate(informacionRespuesta.objetoRespuestaWS.FechaFirma).toISOString().slice(0, 19).replace("T", " ");
                              informacionRespuesta.objetoRespuestaWS.codigoBarras = informacionRespuesta.objetoRespuestaWS.URLVERIFICACIONQR;

                              informacionRespuesta.mensajeError += ' / CAE : ' + informacionRespuesta.objetoRespuestaWS.CAE;
                            } else {
                              // Error en respuesta de los nodos de confirmación de firma
                              informacionRespuesta.mensajeError += ' / No se generó CAE a la transacción, ocurrió un error al solicitar la confirmación de la firma, detalles mensaje TAFACE: ' + nodoRespuestaPerrormessage[0].textContent;
                              informacionRespuesta.objetoRespuestaWS.infoRespuestaAFIP += informacionRespuesta.mensajeError;
                              log.error(proceso, informacionRespuesta.mensajeError);
                            }
                          } else {
                            // Error en body de respuesta de confirmación de firma
                            informacionRespuesta.mensajeError += ' / No se recibió una respuesta correcta en el body de la respuesta de confirmación de firma. Error al realizar la solicitud de confirmación.';
                            log.error(proceso, informacionRespuesta.mensajeError);
                          }
                        } else {
                          informacionRespuesta.mensajeError += ' / ' + mensajeErrorHttp;
                          log.error(proceso, informacionRespuesta.mensajeError);
                        }
                      } else {
                        // Error en CAE al enviar solicitud
                        informacionRespuesta.mensajeError += ' / Error en los datos retornados para generar CAE, firmadoOK: ' + informacionRespuesta.objetoRespuestaWS.firmadoOK + ' - cae: ' + informacionRespuesta.objetoRespuestaWS.CAE;
                        log.error(proceso, informacionRespuesta.mensajeError);
                      }
                    } else {
                      // Error en respuesta de los nodos de solicitud de firma
                      informacionRespuesta.mensajeError += ' / No se generó CAE a la transacción, ocurrió un error al solicitar la firma, detalles mensaje TAFACE: ' + nodoRespuestaPerrormessage[0].textContent;
                      informacionRespuesta.objetoRespuestaWS.infoRespuestaAFIP += informacionRespuesta.mensajeError;
                      log.error(proceso, informacionRespuesta.mensajeError);
                    }
                  } else {
                    // Error en el body de respuesta de solicitud de firma
                    informacionRespuesta.mensajeError += ' / No se recibió una respuesta correcta en el body de la respuesta de solicitud de firma. Error al realizar la solicitud de firma.';
                    log.error(proceso, informacionRespuesta.mensajeError);
                  }
                } else {
                  informacionRespuesta.mensajeError += ' / ' + mensajeErrorHttp;
                  log.error(proceso, informacionRespuesta.mensajeError);
                }
              } else { // Inicio verificacion de UCFE o SIGE

                if (tipoIntegracionUCFE == configuracionFE.tipoIntegracion) {

                } else {

                  if (tipoIntegracionSIGE == configuracionFE.tipoIntegracion) {

                  } else {
                    // Inicio verificacion FacturaLista
                    if (tipoIntegracionFacturaLista == configuracionFE.tipoIntegracion) {
                      log.debug(proceso, 'Ingreso a tipo de integración FacturaLista.');

                      let body = '<?xml version="1.0" encoding="UTF-8"?>' +
                        '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://servicios/">' +
                        '<soapenv:Header/>' +
                        '<soapenv:Body>' +
                        '<ser:generarFactura>' +
                        contents +
                        '</ser:generarFactura>' +
                        '</soapenv:Body>' +
                        '</soapenv:Envelope>';

                      let fechaSolicitudAFIP = parseDate();
                      // let fechaSolicitudAFIP = new Date();
                      var errorHttp = false;
                      var errorHttps = false;
                      let response = null;

                      try {
                        response = http.post({
                          url: URLGateway,
                          headers: headers,
                          body: body
                        });
                      } catch (error) {
                        if (error.name == 'SSS_INVALID_URL') {
                          errorHttp = true;
                        }
                        var mensajeErrorHttp = 'Error al consultar por HTTP a URL Servicio Firma - Detalles: ' + JSON.stringify(error);
                        log.error(proceso, mensajeErrorHttp);
                      }

                      try {
                        if (errorHttp) {
                          response = https.post({
                            url: URLGateway,
                            headers: headers,
                            body: body
                          });
                        }
                      } catch (error) {
                        errorHttps = true;
                        var mensajeErrorHttp = 'Error al consultar por HTTPS a URL Servicio Firma - Detalles: ' + JSON.stringify(error);
                        log.error(proceso, mensajeErrorHttp);
                      }

                      let fechaRespuestaAFIP = parseDate();
                      // let fechaRespuestaAFIP = new Date();

                      log.debug(proceso, 'response: ' + JSON.stringify(response) + ' - fechaRespuestaAFIP: ' + fechaRespuestaAFIP + ' - fechaSolicitudAFIP: ' + fechaSolicitudAFIP);

                      if (!errorHttps) {
                        if (!utilities.isEmpty(response) && !utilities.isEmpty(response.body)) {

                          let responseBody = response.body;
                          // log.debug(proceso, 'Proveedor FE response: ' + JSON.stringify(responseBody));

                          let idFileJSON = recordTransaction.l598_informacion_json_tran;
                          let fileJSON = file.load({
                            id: idFileJSON
                          });

                          let informacionJSONTransaccionFE = JSON.parse(fileJSON.getContents());
                          // log.debug(proceso, 'informacionJSONTransaccionFE: ' + JSON.stringify(informacionJSONTransaccionFE));
                          // log.debug(proceso, 'informacionJSONTransaccionFE.informacionCliente: ' + informacionJSONTransaccionFE.informacionCliente);

                          let infoEnviadaAFIP = "Cantidad Registros : " + 1 + " - Tipo Comprobante : " + informacionJSONTransaccionFE.tipoComprobanteURU + " - Serie : " + informacionJSONTransaccionFE.serie + " - Sucursal : " + informacionJSONTransaccionFE.sucursal;
                          infoEnviadaAFIP += " - Tipo Doc : " + informacionJSONTransaccionFE.informacionCliente.clienteTipoDocumento + " - Num Doc : " + informacionJSONTransaccionFE.informacionCliente.clienteNumeroDoc;
                          infoEnviadaAFIP += " - cbt_desde : " + informacionJSONTransaccionFE.numero + " - cbt_hasta : " + informacionJSONTransaccionFE.numero;
                          infoEnviadaAFIP += " - cbt_fecha : " + informacionJSONTransaccionFE.informacionEncabezado.fechaComprobante.toString();
                          infoEnviadaAFIP += " - monto_no_gravado : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoNoGravado;
                          infoEnviadaAFIP += " - monto_exp_asim : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoExpYAsimiladas;
                          infoEnviadaAFIP += " - monto_no_fact : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.montoNoFacturable;
                          infoEnviadaAFIP += " - monto_percibido : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoRetenido;
                          infoEnviadaAFIP += " - monto_grav_iva_tasa_basica : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoIVATasaBasica;
                          infoEnviadaAFIP += " - monto_grav_iva_tasa_minima : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoIVATasaMinima;
                          infoEnviadaAFIP += " - monto_grav_iva_otra_tasa : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoIVAOtraTasa;
                          infoEnviadaAFIP += " - monto_iva_susp : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoIVASuspenso;
                          infoEnviadaAFIP += " - monto_tasa_basica : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalIVATasaBasica;
                          infoEnviadaAFIP += " - monto_tasa_minima : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalIVATasaMinima;
                          infoEnviadaAFIP += " - monto_otra_tasa : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalIVAOtraTasa;
                          infoEnviadaAFIP += " - monto_imp_perc : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalMontoImpuestoPercibido;
                          infoEnviadaAFIP += " - monto_total_credf : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.totalCreditosFiscales;
                          infoEnviadaAFIP += " - monto_total : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.montoTotalAPagar;
                          infoEnviadaAFIP += " - mon_id : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.codigoMonedaTransaccion + " - mon_cotiz : " + informacionJSONTransaccionFE.informacionTotalesEncabezado.tipoCambio;

                          informacionRespuesta.objetoRespuestaWS.infoEnviadaAFIP = infoEnviadaAFIP;
                          informacionRespuesta.objetoRespuestaWS.fechaSolicitudAFIP = fechaSolicitudAFIP.toISOString().slice(0, 19).replace("T", " ");
                          informacionRespuesta.objetoRespuestaWS.fechaRespuestaAFIP = fechaRespuestaAFIP.toISOString().slice(0, 19).replace("T", " ");

                          let respuestaXml = xml.Parser.fromString({
                            text: responseBody
                          });

                          // log.debug(proceso, 'respuestaXml: ' + JSON.stringify(respuestaXml));

                          var codigo = respuestaXml.getElementsByTagName({ tagName: 'codigo' });
                          var descripcion = respuestaXml.getElementsByTagName({ tagName: 'descripcion' });

                          if (!utilities.isEmpty(codigo) && codigo[0].textContent.toString() == '0') {

                            informacionRespuesta.objetoRespuestaWS.FechaFirma = respuestaXml.getElementsByTagName({ tagName: 'fechaFirma' })[0].textContent;
                            informacionRespuesta.objetoRespuestaWS.CAE = respuestaXml.getElementsByTagName({ tagName: 'numero' })[0].textContent;
                            informacionRespuesta.objetoRespuestaWS.CAENROINICIAL = respuestaXml.getElementsByTagName({ tagName: 'desde' })[0].textContent;
                            informacionRespuesta.objetoRespuestaWS.CAENROFINAL = respuestaXml.getElementsByTagName({ tagName: 'hasta' })[0].textContent;
                            informacionRespuesta.objetoRespuestaWS.CAEVencimiento = respuestaXml.getElementsByTagName({ tagName: 'fechahasta' })[0].textContent;
                            informacionRespuesta.objetoRespuestaWS.CAESERIE = respuestaXml.getElementsByTagName({ tagName: 'serie' })[0].textContent;
                            informacionRespuesta.objetoRespuestaWS.CAENRO = respuestaXml.getElementsByTagName({ tagName: 'id' })[0].textContent;
                            informacionRespuesta.objetoRespuestaWS.CODSEGURIDAD = respuestaXml.getElementsByTagName({ tagName: 'nroAutorizacionDGI' })[0].textContent;
                            informacionRespuesta.objetoRespuestaWS.URLVERIFICACIONQR = "https://www.efactura.dgi.gub.uy/consultaQR/cfe?" + respuestaXml.getElementsByTagName({ tagName: 'rucEmisor' })[0].textContent + "," + respuestaXml.getElementsByTagName({ tagName: 'tipoCFE' })[0].textContent + "," + respuestaXml.getElementsByTagName({ tagName: 'serie' })[0].textContent + "," + respuestaXml.getElementsByTagName({ tagName: 'numero' })[0].textContent + "," + respuestaXml.getElementsByTagName({ tagName: 'monto' })[0].textContent + "," + "TRANSACTIONDATE" + "," + encodeURIComponent(respuestaXml.getElementsByTagName({ tagName: 'firma' })[0].textContent);
                            log.debug(proceso, 'informacionRespuesta.objetoRespuestaWS: ' + JSON.stringify(informacionRespuesta.objetoRespuestaWS));

                            if (!utilities.isEmpty(informacionRespuesta.objetoRespuestaWS.CAE)) {

                              informacionRespuesta.objetoRespuestaWS.infoRespuestaAFIP = 'OK';
                              if (descripcion) {
                                informacionRespuesta.objetoRespuestaWS.infoRespuestaAFIP += ' / ' + descripcion[0].textContent.toString();
                              }
                              var indexFechaFinal = informacionRespuesta.objetoRespuestaWS.CAEVencimiento.toString().indexOf('T');
                              if (indexFechaFinal > 0) {
                                var fechaString = informacionRespuesta.objetoRespuestaWS.CAEVencimiento.substring(0, indexFechaFinal);
                                var fechaFinal = fechaString.toString().split('-');
                                if (!utilities.isEmpty(fechaFinal) && fechaFinal.length > 0 && fechaFinal.length == 3) {
                                  informacionRespuesta.objetoRespuestaWS.CAEVencimiento = fechaString.toString();
                                }
                                informacionRespuesta.objetoRespuestaWS.CAEGENERADO = 'SI';
                                log.debug('fecha firma', informacionRespuesta.objetoRespuestaWS.FechaFirma);
                                informacionRespuesta.objetoRespuestaWS.FechaFirma = parseDate(informacionRespuesta.objetoRespuestaWS.FechaFirma).toISOString().slice(0, 19).replace("T", " ");;
                                informacionRespuesta.objetoRespuestaWS.codigoBarras = informacionRespuesta.objetoRespuestaWS.URLVERIFICACIONQR;
                                log.debug('fecha bien', informacionRespuesta.objetoRespuestaWS.FechaFirma);
                                informacionRespuesta.mensajeError += ' / CAE : ' + informacionRespuesta.objetoRespuestaWS.CAE;
                                log.debug('finalizo bien');
                              } else {
                                informacionRespuesta.objetoRespuestaWS.CAEVencimiento = '';
                                log.error(proceso, 'No se recibió fecha de vencimiento CAE');
                              }

                            } else {
                              // Error no hay CAE
                              informacionRespuesta.mensajeError += ' / No se recibió información de CAE generado, detalles mensaje:' + descripcion[0].textContent.toString() + '- Código de error: ' + codigo[0].textContent.toString();
                              informacionRespuesta.objetoRespuestaWS.infoRespuestaAFIP += informacionRespuesta.mensajeError;
                            }

                          } else {
                            // Error no hay código o el codigo no dio 0 (OK)
                            informacionRespuesta.mensajeError += ' / No se generó CAE a la transacción, ocurrió un error al solicitar firmar comprobante, detalles mensaje: ' + descripcion[0].textContent.toString() + '- Código de error: ' + codigo[0].textContent.toString();
                            informacionRespuesta.objetoRespuestaWS.infoRespuestaAFIP += informacionRespuesta.mensajeError;
                          }
                        } else {
                          // Error en el body de respuesta de solicitud de firma
                          informacionRespuesta.mensajeError += ' / No se recibió una respuesta correcta en el body de la respuesta de solicitud de firma. Error al realizar la solicitud de firma.';
                        }
                      } else {
                        informacionRespuesta.mensajeError += ' / ' + mensajeErrorHttp;
                      }
                    }
                  }
                }
              }
            } else {
              // Error consultando configuración FE
              informacionRespuesta.mensajeError += ' / ' + configuracionFE.mensaje;
              log.error(proceso, configuracionFE.mensaje);
            }
          } else {
            log.error(proceso, "No se pudo cargar la información de la transacción.");
          }
          // log.debug(proceso, 'recordTransaction: ' + JSON.stringify(recordTransaction));
          informacionRespuesta.mensajeFinal += 'Ha finalizado el proceso de Generación de CAE, por favor recargue la transacción para que visualice el resultado del proceso.';
        }
      } catch (error) {
        informacionRespuesta.error = true;
        if (!utilities.isEmpty(informacionRespuesta.mensajeError)) {
          informacionRespuesta.mensajeError += ' / Ha ocurrido una excepción en el Suitelet de Generación de CAE, Detalles: ' + error.message;
        } else {
          informacionRespuesta.mensajeError += 'Ha ocurrido una excepción en el Suitelet de Generación de CAE, Detalles: ' + error.message;
        }
        log.error(proceso, informacionRespuesta.mensajeError);
      }

      log.debug(proceso, "LINE 366 - Remaining Usage = " + script.getRemainingUsage() + ' --- time: ' + new Date());
      log.debug(proceso, 'informacionRespuestaJSON: ' + JSON.stringify(informacionRespuesta));
      let informacionRespuestaJSON = [];
      informacionRespuestaJSON.push(informacionRespuesta);
      responseSuitelet.write({ output: JSON.stringify(informacionRespuestaJSON) });
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
    function getConfigurationFE(recId, recType) {

      let proceso = 'getConfigurationFE';
      let mensaje = '';
      let objetoRespuesta = { error: false, mensaje: '', generarCaeAutomatico: false, caeGenerado: false, codTipoIntegracion: '', idPlantillaXML: '', informacionAdicional: {}, tipoIntegracion: '', idDirectorioFilesFE: '' };

      log.debug(proceso, 'INICIO - getConfigurationFE');
      try {

        // Obtengo Punto de Venta y Letra de Transaccion
        // let esResguardo_anulacion = 'F';
        let esResguardo_anulacion = false;
        let refTransaccion = recId;

        var strSQL = "SELECT \n \"TRANSACTION\".custbody_l598_cae AS custbody_l598_cae, \n CUSTOMRECORD_L598_SERIE_COMPROBANTE.\"ID\" AS custbody_l598_serie_comprobante, \n CUSTOMRECORD_L598_SERIE_COMPROBANTE.name AS custbody_l598_serie_comprobante_text, \n CUSTOMRECORD_L598_SUCURSALES.\"ID\" AS custbody_l598_sucursal, \n CUSTOMRECORD_L598_SUCURSALES.name AS custbody_l598_sucursal_text, \n \"TRANSACTION\".custbody_l598_nd AS custbody_l598_nd, \n CUSTOMRECORD_L598_TIPOS_COMPROBANTES.\"ID\" AS custbody_l598_tipo_comprobante, \n CUSTOMRECORD_L598_TIPOS_COMPROBANTES.name AS custbody_l598_tipo_comprobante_text, \n \"TRANSACTION\".custbody_l598_cod_tipo_comprobante AS custbody_l598_cod_tipo_comprobante, \n \"TRANSACTION\".custbody_l598_link_uru_resguardo AS custbody_l598_link_uru_resguardo, \n \"TRANSACTION\".custbody_l598_anulacion_resguardo AS custbody_l598_anulacion_resguardo \nFROM \n \"TRANSACTION\", \n CUSTOMRECORD_L598_SERIE_COMPROBANTE, \n CUSTOMRECORD_L598_SUCURSALES, \n CUSTOMRECORD_L598_TIPOS_COMPROBANTES\nWHERE \n (((\"TRANSACTION\".custbody_l598_serie_comprobante = CUSTOMRECORD_L598_SERIE_COMPROBANTE.\"ID\"(+) AND \"TRANSACTION\".custbody_l598_sucursal = CUSTOMRECORD_L598_SUCURSALES.\"ID\"(+)) AND \"TRANSACTION\".custbody_l598_tipo_comprobante = CUSTOMRECORD_L598_TIPOS_COMPROBANTES.\"ID\"(+)))\n AND ((\"TRANSACTION\".\"RECORDTYPE\" IN ('" + recType + "') AND \"TRANSACTION\".\"ID\" = '" + recId + "'))\n";

        let esOneWorld = utilities.l598esOneworld();

        if (esOneWorld) {
          var strSQL = "SELECT \n \"TRANSACTION\".custbody_l598_cae AS custbody_l598_cae, \n CUSTOMRECORD_L598_SERIE_COMPROBANTE.\"ID\" AS custbody_l598_serie_comprobante, \n CUSTOMRECORD_L598_SERIE_COMPROBANTE.name AS custbody_l598_serie_comprobante_text, \n CUSTOMRECORD_L598_SUCURSALES.\"ID\" AS custbody_l598_sucursal, \n CUSTOMRECORD_L598_SUCURSALES.name AS custbody_l598_sucursal_text, \n \"TRANSACTION\".custbody_l598_nd AS custbody_l598_nd, \n CUSTOMRECORD_L598_TIPOS_COMPROBANTES.\"ID\" AS custbody_l598_tipo_comprobante, \n CUSTOMRECORD_L598_TIPOS_COMPROBANTES.name AS custbody_l598_tipo_comprobante_text, \n \"TRANSACTION\".custbody_l598_cod_tipo_comprobante AS custbody_l598_cod_tipo_comprobante, \n \"TRANSACTION\".custbody_l598_link_uru_resguardo AS custbody_l598_link_uru_resguardo, \n \"TRANSACTION\".custbody_l598_anulacion_resguardo AS custbody_l598_anulacion_resguardo, \n transactionLine.subsidiary AS subsidiary \nFROM \n \"TRANSACTION\", \n CUSTOMRECORD_L598_SERIE_COMPROBANTE, \n CUSTOMRECORD_L598_SUCURSALES, \n CUSTOMRECORD_L598_TIPOS_COMPROBANTES, transactionLine \nWHERE \n \"TRANSACTION\".\"ID\" = transactionLine.\"TRANSACTION\"\n AND (((\"TRANSACTION\".custbody_l598_serie_comprobante = CUSTOMRECORD_L598_SERIE_COMPROBANTE.\"ID\"(+) AND \"TRANSACTION\".custbody_l598_sucursal = CUSTOMRECORD_L598_SUCURSALES.\"ID\"(+)) AND \"TRANSACTION\".custbody_l598_tipo_comprobante = CUSTOMRECORD_L598_TIPOS_COMPROBANTES.\"ID\"(+)))\n AND ((\"TRANSACTION\".\"RECORDTYPE\" IN ('" + recType + "') AND \"TRANSACTION\".\"ID\" = '" + recId + "' AND transactionLine.mainline = 'T'))\n";
        }

        log.debug(proceso, "SQL: " + strSQL);

        var resultIterator = query.runSuiteQLPaged({
          query: strSQL,
          pageSize: 1000
        }).iterator();

        // Use the iterator to process each page of results
        var resultadoTransaccion = [];
        resultIterator.each(function (page) {
          var pageIterator = page.value.data.iterator();
          pageIterator.each(function (row) {
            var resultsquery = {
              custbody_l598_cae: row.value.getValue(0),
              custbody_l598_serie_comprobante: row.value.getValue(1),
              custbody_l598_serie_comprobante_text: row.value.getValue(2),
              custbody_l598_sucursal: row.value.getValue(3),
              custbody_l598_sucursal_text: row.value.getValue(4),
              custbody_l598_nd: row.value.getValue(5),
              custbody_l598_tipo_comprobante: row.value.getValue(6),
              custbody_l598_tipo_comprobante_text: row.value.getValue(7),
              custbody_l598_cod_tipo_comprobante: row.value.getValue(8),
              custbody_l598_link_uru_resguardo: row.value.getValue(9),
              custbody_l598_resguardo_anulacion: row.value.getValue(10)
            }

            if (esOneWorld) {
              resultsquery.subsidiary = row.value.getValue(11);
            }

            resultadoTransaccion.push(resultsquery);
            return true;
          });
          return true;
        });

        log.debug(proceso, 'resultadoTransaccion: ' + JSON.stringify(resultadoTransaccion));

        if (resultadoTransaccion.length > 0) {
          resultadoTransaccion = resultadoTransaccion[0];
        }

        let userObj = runtime.getCurrentUser();
        // log.debug(proceso, 'Current user email: ' + userObj.email);

        let usuarioEmail = userObj.email;
        if (utilities.isEmpty(usuarioEmail)) {
          usuarioEmail = "";
        }

        // log.debug(proceso, 'resultadoTransaccion: ' + JSON.stringify(resultadoTransaccion));

        if (utilities.isEmpty(resultadoTransaccion.custbody_l598_cae)) {
          let serie = resultadoTransaccion.custbody_l598_serie_comprobante_text;
          let sucursal = resultadoTransaccion.custbody_l598_sucursal_text;
          let esNotaDebito = resultadoTransaccion.custbody_l598_nd;
          let tipoComprobante = resultadoTransaccion.custbody_l598_tipo_comprobante;
          let tipoComprobanteText = resultadoTransaccion.custbody_l598_tipo_comprobante_text;
          let link_uru_resguardo = resultadoTransaccion.custbody_l598_link_uru_resguardo;
          esResguardo_anulacion = resultadoTransaccion.custbody_l598_resguardo_anulacion;

          if (!utilities.isEmpty(serie) && !utilities.isEmpty(sucursal) && !utilities.isEmpty(tipoComprobante)) {
            // Obtengo la subsidiaria
            let subsidiaria = "";
            if (esOneWorld) {
              subsidiaria = resultadoTransaccion.subsidiary;
              if (utilities.isEmpty(subsidiaria)) // Si no completo la Subsidiaria, envio sin Subsidiaria
                subsidiaria = "";
            }

            // Busco el ID de Transaccion de AFIP
            let idTransaccionURU = resultadoTransaccion.custbody_l598_cod_tipo_comprobante;

            if (!utilities.isEmpty(idTransaccionURU) && idTransaccionURU > 0) {

              var strSQL = "SELECT \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.id_join AS custrecordl598provfecomp, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_link AS custrecordl598provfecomp_0, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_usuario AS custrecordl598provfecomp_1, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_pasw_encriptada AS custrecordl598provfecomp_2, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_generar_cae_auto AS custrecordl598provfecomp_3, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_rol AS custrecordl598provfecomp_4, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_cuenta AS custrecordl598provfecomp_5, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_margen_error_mon AS custrecordl598provfecomp_6, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_nom_sist_fact AS custrecordl598provfecomp_7, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_razon_social AS custrecordl598provfecomp_8, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_ruc_empresa AS custrecordl598provfecomp_9, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_url_gateway AS custrecordl598provfecomp_10, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_serv_firma_comp AS custrecordl598provfecomp_11, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_url_serv_c_firma AS custrecordl598provfecomp_12, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_tipo_integracion_codigo AS custrecordl598provfecomp_13, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_cod_terminal AS custrecordl598provfecomp_14, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_cod_comercio AS custrecordl598provfecomp_15, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_url_rest AS custrecordl598provfecomp_16, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_usuario_ucfe AS custrecordl598provfecomp_17, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_password_ucfe AS custrecordl598provfecomp_18, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_usuario_sige AS custrecordl598provfecomp_19, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_password_sige AS custrecordl598provfecomp_20, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_url_firma_sige AS custrecordl598provfecomp_21, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_url_consult_sige AS custrecordl598provfecomp_22, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_tipo_negocio AS custrecordl598provfecomp_23, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_ver_sist_fact AS custrecordl598provfecomp_24, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_ruc_emisor AS custrecordl598provfecomp_25, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_r_social_emisor AS custrecordl598provfecomp_26, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_nom_comercial AS custrecordl598provfecomp_27, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_giro_negocio AS custrecordl598provfecomp_28, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_correo_elec AS custrecordl598provfecomp_29, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_domicilio_fiscal AS custrecordl598provfecomp_30, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_ciudad AS custrecordl598provfecomp_31, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_departamento AS custrecordl598provfecomp_32, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_telefono AS custrecordl598provfecomp_33, \n CUSTOMRECORD_L598_PROV_FE_COMP_DGI.custrecord_l598_prov_fe_comp_dgi_pla_id AS custrecordl598provfecomp_34 /*{custrecord_l598_prov_fe_comp_dgi_pla_id#RAW}*/, \n CUSTOMRECORD_L598_PROV_FE_COMP_DGI.\"ID\" AS idRAW /*{id#RAW}*/, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_prov_fact_elect_tip_int AS custrecordl598provfecomp_35 /*{custrecord_l598_prov_fe_comp_dgi_prov_fe.custrecord_l598_prov_fact_elect_tip_int#RAW}*/, \n CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_prov_fact_elect_dir_arch AS custrecordl598provfecomp_36 /*{custrecord_l598_prov_fe_comp_dgi_prov_fe.custrecord_l598_prov_fact_elect_dir_arch#RAW}*/\nFROM \n CUSTOMRECORD_L598_PROV_FE_COMP_DGI, \n (SELECT \n CUSTOMRECORD_L598_PROV_FACT_ELECT.\"ID\" AS \"ID\", \n CUSTOMRECORD_L598_PROV_FACT_ELECT.\"ID\" AS id_join, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_link AS custrecord_l598_conf_fe_link, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_usuario AS custrecord_l598_conf_fe_usuario, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_pasw_encriptada AS custrecord_l598_conf_fe_pasw_encriptada, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_generar_cae_auto AS custrecord_l598_conf_fe_generar_cae_auto, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_rol AS custrecord_l598_conf_fe_rol, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_cuenta AS custrecord_l598_conf_fe_cuenta, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_margen_error_mon AS custrecord_l598_conf_fe_margen_error_mon, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_nom_sist_fact AS custrecord_l598_conf_fe_nom_sist_fact, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_razon_social AS custrecord_l598_conf_fe_razon_social, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_ruc_empresa AS custrecord_l598_conf_fe_ruc_empresa, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_url_gateway AS custrecord_l598_conf_fe_url_gateway, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_serv_firma_comp AS custrecord_l598_conf_fe_serv_firma_comp, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_url_serv_c_firma AS custrecord_l598_conf_fe_url_serv_c_firma, \n CUSTOMRECORD_L598_TIPO_INTEGRACION.custrecord_l598_tipo_integracion_codigo AS custrecord_l598_tipo_integracion_codigo, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_cod_terminal AS custrecord_l598_conf_fe_cod_terminal, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_cod_comercio AS custrecord_l598_conf_fe_cod_comercio, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_url_rest AS custrecord_l598_conf_fe_url_rest, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_usuario_ucfe AS custrecord_l598_conf_fe_usuario_ucfe, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_password_ucfe AS custrecord_l598_conf_fe_password_ucfe, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_usuario_sige AS custrecord_l598_conf_fe_usuario_sige, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_password_sige AS custrecord_l598_conf_fe_password_sige, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_url_firma_sige AS custrecord_l598_conf_fe_url_firma_sige, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_url_consult_sige AS custrecord_l598_conf_fe_url_consult_sige, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_tipo_negocio AS custrecord_l598_conf_fe_tipo_negocio, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_ver_sist_fact AS custrecord_l598_conf_fe_ver_sist_fact, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_ruc_emisor AS custrecord_l598_conf_fe_ruc_emisor, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_r_social_emisor AS custrecord_l598_conf_fe_r_social_emisor, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_nom_comercial AS custrecord_l598_conf_fe_nom_comercial, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_giro_negocio AS custrecord_l598_conf_fe_giro_negocio, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_correo_elec AS custrecord_l598_conf_fe_correo_elec, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_domicilio_fiscal AS custrecord_l598_conf_fe_domicilio_fiscal, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_ciudad AS custrecord_l598_conf_fe_ciudad, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_departamento AS custrecord_l598_conf_fe_departamento, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_telefono AS custrecord_l598_conf_fe_telefono, \n CUSTOMRECORD_L598_PROV_FACT_ELECT.custrecord_l598_prov_fact_elect_tip_int AS custrecord_l598_prov_fact_elect_tip_int, \n CUSTOMRECORD_L598_PROV_FACT_ELECT.custrecord_l598_prov_fact_elect_dir_arch AS custrecord_l598_prov_fact_elect_dir_arch, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC.custrecord_l598_conf_fe_subsidiaria AS custrecord_l598_conf_fe_subsidiaria_crit\n FROM \n CUSTOMRECORD_L598_PROV_FACT_ELECT, \n CUSTOMRECORD_L598_CONF_FACTURA_ELEC, \n CUSTOMRECORD_L598_TIPO_INTEGRACION\n WHERE \n CUSTOMRECORD_L598_PROV_FACT_ELECT.custrecord_l598_prov_fact_elect_confi_fe = CUSTOMRECORD_L598_CONF_FACTURA_ELEC.\"ID\"(+)\n AND CUSTOMRECORD_L598_PROV_FACT_ELECT.custrecord_l598_prov_fact_elect_tip_int = CUSTOMRECORD_L598_TIPO_INTEGRACION.\"ID\"(+)\n ) CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB\nWHERE \n CUSTOMRECORD_L598_PROV_FE_COMP_DGI.custrecord_l598_prov_fe_comp_dgi_prov_fe = CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.\"ID\"(+)\n AND ((CUSTOMRECORD_L598_PROV_FE_COMP_DGI.custrecord_l598_prov_fe_comp_dgi_tip_com IN ('" + tipoComprobante + "') AND CUSTOMRECORD_L598_PROV_FACT_ELECT_SUB.custrecord_l598_conf_fe_subsidiaria_crit " + (esOneWorld ? ' = ' + subsidiaria : 'IS NULL') + "))\n";

              // Run the SuiteQL query as a paged query and return an iterator
              var resultIterator = query.runSuiteQLPaged({
                query: strSQL,
                pageSize: 1000
              }).iterator();

              // Use the iterator to process each page of results
              var myresults = [];
              resultIterator.each(function (page) {
                //log.debug('pageIterator', JSON.stringify(pageIterator));
                var pageIterator = page.value.data.iterator();
                pageIterator.each(function (row) {

                  myresults.push(row);

                  return true;
                });

                return true;
              });

              if (myresults.length == 0) {
                objetoRespuesta.error = true;
                objetoRespuesta.mensaje = 'Error Consultando Datos de Configuracion - No se obtuvo resultados';
                log.error(proceso, 'LINE 267 - Error: ' + objetoRespuesta.mensaje);
              } else {

                var resultSet = myresults;

                if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {

                  let recordFE = [];
                  let objInfo = {};

                  camposInfoFE.forEach(function (key, index, arr) {
                    objInfo[key] = resultSet[0].value.getValue(index);
                  });

                  recordFE.push(objInfo);
                  log.debug(proceso, 'recordFE: ' + JSON.stringify(recordFE));

                  if (!utilities.isEmpty(recordFE[0].idPlantillaXML)) {

                    objetoRespuesta.idPlantillaXML = recordFE[0].idPlantillaXML;

                    let currentScript = runtime.getCurrentScript();
                    let tipoIntegFacturaLista = currentScript.getParameter('custscript_l598_con_dir_fe_sl_t_int_flis'); // Integracion FacturaLista

                    if (((recordFE[0].middlewareURL.length != 0 || !utilities.isEmpty(recordFE[0].middlewareURL)) && !utilities.isEmpty(recordFE[0].usuario) && !utilities.isEmpty(recordFE[0].password) &&
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
                    ||//VALIDACION CUANDO LA INTEGRACION ES CON FACTURA LISTA
                    (!utilities.isEmpty(usuarioEmail) && !utilities.isEmpty(recordFE[0].razonSocial) && !utilities.isEmpty(recordFE[0].RUTEmpresa) && !utilities.isEmpty(recordFE[0].URLGateway) &&
                    !utilities.isEmpty(recordFE[0].codTipoIntegracion) && recordFE[0].tipoIntegracion == tipoIntegFacturaLista)
                        ) {

                      // log.debug(proceso, 'Información de FE correcta, se procede a generar Botón si generación de CAE automático es false - Valor de generarCaeAutomatico: ' + recordFE[0].generarCaeAutomatico);
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

                      if (recordFE[0].generarCaeAutomatico == true) {
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
                      }

                      objetoRespuesta.error = true;
                      objetoRespuesta.mensaje = mensaje;
                      log.error(proceso, 'LINE 366 - Error: ' + objetoRespuesta.mensaje);
                    }
                  } else {
                    objetoRespuesta.error = true;
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

    function nvl(valor, valorDefault) {
      return (utilities.isEmpty(valor)) ? valorDefault : valor;
    }

    function parseDate(fecha) {

      let fechaFormateada = '';
      if (!utilities.isEmpty(fecha)) {
        fechaFormateada = new Date(fecha);
      } else {
        fechaFormateada = new Date();
      }

      /* log.debug('parseDate', 'fechaFormateada: ' + fechaFormateada);
      currentDateTime = fechaFormateada;
      let companyTimeZone = config.load({ type: config.Type.COMPANY_INFORMATION }).getText({ fieldId: 'timezone' });
      let timeZoneOffSet = (companyTimeZone.indexOf('(GMT)') == 0) ? 0 : Number(companyTimeZone.substr(4, 6).replace(/\+|:00/gi, '').replace(/:30/gi, '.5'));
      let UTC = currentDateTime.getTime() + (currentDateTime.getTimezoneOffset());
      let companyDateTime = UTC + (timeZoneOffSet * 60 * 60 * 1000);
      let companyDateTime2 = UTC + timeZoneOffSet;
      log.debug('parseDate', 'companyDateTime: ' + companyDateTime + ' - companyDateTime2: ' + companyDateTime2);

      return new Date(companyDateTime2); */
      return fechaFormateada;
    }

    return {
      onRequest: onRequest
    };
  });