/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 */
define(["N/log", "N/record"],
  /* eslint-disable no-var */
  /* global define */
  function (log, record) {
    function l598isEmpty(value) {
      if (value === "") {
        return true;
      }
      if (value === null) {
        return true;
      }
      if (value === undefined) {
        return true;
      }
      if (value === "null") {
        return true;
      }
      if (value === "undefined") {
        return true;
      }
      return false;
    }
    /**
    * Función migrada actualizarTransaccionFE(informacionTransaccion)
    */
    function doPost(requestBody) {
      /**
       * Antes se utilizaba el parametro de script custscript_l598_act_inf_trans_fe_eje_scr
       * para determinar si habia que desabilitar o no la ejecucion de otros scripts al guardar el record,
       * esto ya no es posible en las nuevas versiones.
       */
      var objetoRespuesta = {
        error: false,
        tipo: "FMSJ-1",
        mensaje: "",
        errorGeneral: false,
        transacciones: new Array(),
      };
      var tipoMensajeError = "FMSJ-32";
      var idTransaccion, CAE, CAEVencimientoFinal, codigoBarras;
      var i = 0;
      var fechaProceso = new Date();
      try {
        log.audit("URU - FE Actualizar Transacciones", "INICIO Proceso - " + fechaProceso + " Tiempo : " + fechaProceso);
        if (requestBody != null && requestBody != "") {
          log.debug("Actualizar CAE Transacciones", "INFO : " + requestBody);
          var informacion = JSON.parse(requestBody);
          if (informacion != null && informacion != "") {
            var infoCAE = informacion.infoCAE;
            var errorGlobal = false;
            if (!l598isEmpty(infoCAE) && infoCAE.length > 0) {
              //for (var i = 0; i < infoCAE.length ; i++) {
              for (i = 0; i < infoCAE.length && errorGlobal == false; i++) {
                // var errorCargaRegistro = false;
                idTransaccion = infoCAE[i].idTransaccion;
                var tipoTransaccion = infoCAE[i].tipoTransaccion;
                if (!l598isEmpty(idTransaccion) && !l598isEmpty(tipoTransaccion)) {
                  var record_transaccion;
                  try {
                    record_transaccion = record.load({
                      type: tipoTransaccion,
                      id: idTransaccion
                    });
                  } catch (e) {
                    objetoRespuesta.transacciones[i] = {};
                    objetoRespuesta.transacciones[i].error = true; // Hubo Error;
                    objetoRespuesta.transacciones[i].tipo = tipoMensajeError;
                    objetoRespuesta.transacciones[i].mensaje = "Error Cargando Transaccion con ID Interno : " + idTransaccion + " Para grabarle la Informacion del CAE Obtenido - CAE Obtenido : " + infoCAE[i].CAE + " CAE Vto : " + infoCAE[i].CAEVencimiento;
                    record_transaccion = null;
                    log.error("URU - FE Actualizar Transacciones", objetoRespuesta.transacciones[i].mensaje);
                  }
                  if (!l598isEmpty(record_transaccion)) {
                    var CAEGENERADO = false;
                    if (!l598isEmpty(infoCAE[i].CAEGENERADO) && infoCAE[i].CAEGENERADO == "SI") {
                      CAEGENERADO = true;
                    }
                    CAE = infoCAE[i].CAE;
                    var CAEVencimiento = infoCAE[i].CAEVencimiento;
                    if ((CAEGENERADO == true && !l598isEmpty(CAE) && !l598isEmpty(CAEVencimiento)) || (CAEGENERADO != true)) {
                      CAEVencimientoFinal = "";
                      if (!l598isEmpty(CAEVencimiento)) {
                        var anio = CAEVencimiento.substr(0, 4);
                        var mes = CAEVencimiento.substr(4, 2);
                        var dia = CAEVencimiento.substr(6, 2);
                        if (!l598isEmpty(anio) && !l598isEmpty(mes) && !l598isEmpty(dia)) {
                          CAEVencimientoFinal = dia + "/" + mes + "/" + anio;
                        }
                      }
                      // Obtengo Informacion de Transacicon de AFIP
                      var fechaSolicitudAFIPFinal = "";
                      var fechaRespuestaAFIPFinal = "";
                      var infoEnviadaAFIP = infoCAE[i].infoEnviadaAFIP;
                      if (l598isEmpty(infoEnviadaAFIP))
                        infoEnviadaAFIP = "";
                      var infoRespuestaAFIP = infoCAE[i].infoRespuestaAFIP;
                      if (l598isEmpty(infoRespuestaAFIP))
                        infoRespuestaAFIP = "";
                      var descripcionErrorFinal = "";
                      if (!l598isEmpty(infoRespuestaAFIP)) {
                        descripcionErrorFinal = infoRespuestaAFIP.substring(0, 3995);
                      }
                      var fechaSolicitudAFIP = infoCAE[i].fechaSolicitudAFIP;
                      if (l598isEmpty(fechaSolicitudAFIP)) {
                        fechaSolicitudAFIP = "";
                      } else {
                        fechaSolicitudAFIPFinal = fechaSolicitudAFIP.replace("T", " ");
                      }
                      var fechaRespuestaAFIP = infoCAE[i].fechaRespuestaAFIP;
                      if (l598isEmpty(fechaRespuestaAFIP)) {
                        fechaRespuestaAFIP = "";
                      } else {
                        fechaRespuestaAFIPFinal = fechaRespuestaAFIP.replace("T", " ");
                      }
                      codigoBarras = infoCAE[i].codigoBarras;
                      if (l598isEmpty(codigoBarras)) {
                        codigoBarras = "";
                      }
                      // INICIO Informacion Adicional
                      var codigoSeguridad = infoCAE[i].CODSEGURIDAD;
                      if (l598isEmpty(codigoSeguridad)) {
                        codigoSeguridad = "";
                      }
                      var urlVerificacion = infoCAE[i].URLVERIFICACION;
                      if (l598isEmpty(urlVerificacion)) {
                        urlVerificacion = "";
                      }
                      var urlVerificacionQR = infoCAE[i].URLVERIFICACIONQR;
                      if (l598isEmpty(urlVerificacionQR)) {
                        urlVerificacionQR = "";
                      }
                      var caeNumero = infoCAE[i].CAENRO;
                      if (l598isEmpty(caeNumero)) {
                        caeNumero = "";
                      }
                      var caeSerie = infoCAE[i].CAESERIE;
                      if (l598isEmpty(caeSerie)) {
                        caeSerie = "";
                      }
                      var fechaFirma = infoCAE[i].FechaFirma;
                      if (l598isEmpty(fechaFirma)) {
                        fechaFirma = "";
                      }
                      var caeNroInicial = infoCAE[i].CAENROINICIAL;
                      if (l598isEmpty(caeNroInicial)) {
                        caeNroInicial = "";
                      }
                      var caeNroFinal = infoCAE[i].CAENROFINAL;
                      if (l598isEmpty(caeNroFinal)) {
                        caeNroFinal = "";
                      }
                      var resolucionIVA = infoCAE[i].RESOLUCIONIVA;
                      if (l598isEmpty(resolucionIVA)) {
                        resolucionIVA = "";
                      }
                      var correspondeSobre = infoCAE[i].CORRESPONDESOBRE;
                      if (!l598isEmpty(correspondeSobre) && correspondeSobre == 1) {
                        correspondeSobre = true;
                      }
                      else {
                        correspondeSobre = false;
                      }
                      // FIN Informacion Adicional
                      // var numeroTransaccion = record_transaccion.getValue("tranid");
                      if (CAEGENERADO == true) {
                        if (CAE != "0" && CAE != 0) {
                          record_transaccion.setValue("custbody_l598_cae", CAE);
                          record_transaccion.setValue("custbody_l598_cae_vto", CAEVencimientoFinal);
                          // Grabo el COdigo de Barras
                          record_transaccion.setValue("custbody_l598_codigo_qr", codigoBarras);
                        }
                      }
                      record_transaccion.setValue("custbody_l598_cae_envio_dgi", infoEnviadaAFIP);
                      record_transaccion.setValue("custbody_l598_cae_respuesta_dgi", descripcionErrorFinal);
                      record_transaccion.setValue("custbody_l598_cae_fecha_hora_envio", fechaSolicitudAFIPFinal);
                      record_transaccion.setValue("custbody_l598_cae_fecha_hora_respuesta", fechaRespuestaAFIPFinal);
                      record_transaccion.setValue("custbody_l598_codigo_seguridad", codigoSeguridad);
                      record_transaccion.setValue("custbody_l598_url_verificacion", urlVerificacion);
                      record_transaccion.setValue("custbody_l598_url_verif_qr", urlVerificacionQR);
                      record_transaccion.setValue("custbody_l598_cae_nro", caeNumero);
                      record_transaccion.setValue("custbody_l598_cae_serie", caeSerie);
                      record_transaccion.setValue("custbody_l598_fecha_firma", fechaFirma);
                      record_transaccion.setValue("custbody_l598_cae_nro_inicial", caeNroInicial);
                      record_transaccion.setValue("custbody_l598_cae_nro_final", caeNroFinal);
                      record_transaccion.setValue("custbody_l598_resolucion_iva", resolucionIVA);
                      record_transaccion.setValue("custbody_l598_corresponde_sobre", correspondeSobre);
                      if (!l598isEmpty(CAE) && tipoTransaccion == "customtransaction_l598_resguardos") {
                        record_transaccion.setValue("transtatus", "B");
                        var cantDetalleRet = record_transaccion.getLineCount("recmachcustrecord_l598_ret_detalle_resguardo");
                        for (var j = 0; j < cantDetalleRet; j++) {
                          try {
                            /* record_transaccion.selectLine("recmachcustrecord_l598_ret_detalle_resguardo", j);
                            record_transaccion.setCurrentSublistValue(
                              "recmachcustrecord_l598_ret_detalle_resguardo",
                              "custrecord_l598_ret_detalle_status_resgu",
                              "B"
                            );
                            record_transaccion.commitLine("recmachcustrecord_l598_ret_detalle_resguardo"); */

                            record_transaccion.setSublistValue({
                              sublistId: "recmachcustrecord_l598_ret_detalle_resguardo",
                              fieldId: "custrecord_l598_ret_detalle_status_resgu",
                              line: j,
                              value: "B"
                            });
                            
                          } catch (e) {
                            log.error("ERROR ESTABLECIENDO ESTADO DE RESGUARDO DETALLE", e);
                          }
                        }
                      }
                      // Grabo el Record Trnasaccion
                      try {
                        var _idRT = record_transaccion.save();
                        objetoRespuesta.error = false; // No hubo Error;
                        objetoRespuesta.transacciones[i] = {};
                        objetoRespuesta.transacciones[i].error = false; // Sin Error;
                        objetoRespuesta.transacciones[i].tipo = "FMSJ-1";
                        objetoRespuesta.transacciones[i].idRegistro = idTransaccion;
                      } catch (e) {
                        log.error("URU - FE Actualizar Transacciones", "Excepcion Actualizando CAE - ID Transaccion : " + idTransaccion + " - CAE : " + CAE + "CAE Vto :" + CAEVencimientoFinal + " Codigo De Barras : " + codigoBarras + " / Excepcion : " + e.message);
                        objetoRespuesta.transacciones[i] = {};
                        objetoRespuesta.transacciones[i].error = true; // Hubo Error;
                        objetoRespuesta.transacciones[i].tipo = tipoMensajeError; //'Error Grabando CAE TRansaccion';
                        objetoRespuesta.transacciones[i].mensaje = "Excepcion Actualizando CAE de Transaccion en NetSuite - ID Interno Transaccion : " + idTransaccion + " - Excepcion : " + e.message; //'Error Grabando CAE TRansaccion';
                        objetoRespuesta.transacciones[i].idRegistro = idTransaccion;
                      }
                    } else {
                      objetoRespuesta.transacciones[i] = {};
                      objetoRespuesta.transacciones[i].error = true; // Hubo Error;
                      objetoRespuesta.transacciones[i].tipo = tipoMensajeError; //'Falta Parametro CAE y CAE Vencimiento';
                      objetoRespuesta.transacciones[i].mensaje = "No se recibio Informacion de CAE Otorgado por el proceso de Factura Electronica para la Transaccion con ID Interno : " + idTransaccion;
                      objetoRespuesta.transacciones[i].idRegistro = idTransaccion;
                      log.error("URU - FE Actualizar Transacciones", objetoRespuesta.transacciones[i].mensaje);
                    }
                  }
                } else {
                  objetoRespuesta.error = true;
                  objetoRespuesta.tipo = tipoMensajeError;
                  var mensaje = "No se recibio la informacion del ID Interno de las Transacciones A Actualizar";
                  objetoRespuesta.mensaje = mensaje;
                  log.error("URU - FE Actualizar Transacciones", mensaje);
                  errorGlobal = true;
                }
              }
            } else {
              objetoRespuesta.error = true;
              objetoRespuesta.tipo = tipoMensajeError;
              var mensaje = "No se recibio la informacion de las Transacciones A Actualizar luego de Parsear el Objeto Recibido";
              objetoRespuesta.mensaje = mensaje;
              log.error("URU - FE Actualizar Transacciones", mensaje);
            }
          } else {
            objetoRespuesta.error = true;
            objetoRespuesta.tipo = tipoMensajeError;
            var mensaje = "No se recibio la informacion de las Transacciones A Actualizar luego de Parsear el Objeto Recibido";
            objetoRespuesta.mensaje = mensaje;
            log.error("URU - FE Actualizar Transacciones", mensaje);
          }
        } else {
          objetoRespuesta.error = true;
          objetoRespuesta.tipo = tipoMensajeError;
          var mensaje = "No se recibio Objeto con la informacion de las Transacciones A Actualizar";
          objetoRespuesta.mensaje = mensaje;
          log.error("URU - FE Actualizar Transacciones", mensaje);
        }
      } catch (excepcion) {
        log.error("Actualizar CAE Transacciones", "Excepcion Actualizando CAE - ID Transaccion : " + idTransaccion + " CAE : " + CAE + "CAE Vto :" + CAEVencimientoFinal + " Codigo De Barras : " + codigoBarras + " / Excepcion : " + excepcion.message);
        objetoRespuesta.transacciones[i] = {};
        objetoRespuesta.transacciones[i].error = true; // Hubo Error;
        objetoRespuesta.transacciones[i].tipo = tipoMensajeError; //'Error Grabando CAE TRansaccion';
        objetoRespuesta.transacciones[i].mensaje = "Excepcion Actualizando CAE de Transaccion en NetSuite - ID Interno Transaccion : " + idTransaccion + " Excepcion : " + excepcion.message;
        objetoRespuesta.transacciones[i].idRegistro = idTransaccion;
      }
      var fechaProcesoFin = new Date();
      log.audit("URU - FE Actualizar Transacciones", "FIN Proceso - " + fechaProceso + " Tiempo : " + fechaProcesoFin);
      var respuestaCliente = JSON.stringify(objetoRespuesta);
      //response.setContentType('JSON');
      //response.writeLine(respuestaCliente);
      return respuestaCliente;
    }
    return {
      post: doPost
    };
  });