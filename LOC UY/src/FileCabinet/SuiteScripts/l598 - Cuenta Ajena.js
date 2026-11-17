/**
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/search', 'N/error', 'N/record', 'N/ui/dialog', 'N/runtime', 'L598/utilities'],
  /**
   * @param {error} error
   * @param {record} record
   */

  function (search, error, record, dialog, runtime, utilities) {

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */

    const PROCESO = 'Cuenta Ajena';
    //User provided final answer from confirm box
    var finalResult = false
    //Flag to indicate if user provided final answer or not
    var finalResultSet = false;

    function saveRecord(scriptContext) {

      log.audit(PROCESO, 'INICIO - Validar articulos cuenta ajena');
      log.audit("Governance Monitoring", "Remaining Usage = " + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());

      try {

        if (!finalResultSet) {
          var objRecord = scriptContext.currentRecord;

          var executionContext = runtime.executionContext;

          log.debug('executionContext', JSON.stringify(executionContext));

          var tranCuentaAjena = objRecord.getValue('custbody_l598_transac_cuenta_ajena');

          if (!utilities.isEmpty(tranCuentaAjena) && (tranCuentaAjena == true || tranCuentaAjena == 'T')) {

            var nroDocCtaAjena = objRecord.getValue('custbody_l598_nro_doc_emp_cta_ajena');
            var razonSocialCtaAjena = objRecord.getValue('custbody_l598_raz_soc_cuenta_ajena');
            var tipoDocCtaAjena = objRecord.getValue('custbody_l598_tipo_doc_cuenta_ajena');
            var paisEmpCtaAjena = objRecord.getValue('custbody_l598_pais_emp_cuenta_ajena');

            if (utilities.isEmpty(nroDocCtaAjena) || utilities.isEmpty(razonSocialCtaAjena) || utilities.isEmpty(tipoDocCtaAjena) || utilities.isEmpty(paisEmpCtaAjena)) {
              dialog.alert({
                title: 'Advertencia!',
                message: 'La transacción a generar es de Cuenta Ajena y los siguientes campos deben tener valor de manera obligatoria: URU - NRO. DOCUMENTO EMP. CTA. AJENA, URU - RAZÓN SOCIAL CUENTA AJENA, URU - TIPO DOCUMENTO EMPRESA CUENTA AJENA, URU - PAÍS EMPRESA CUENTA AJENA; por favor verifique e intente nuevamente.'
              });
              return false;
            }

            var numLines = objRecord.getLineCount({
              sublistId: 'item'
            });

            log.debug(PROCESO, 'numero de lineas: ' + numLines);

            if (!utilities.isEmpty(numLines) && numLines > 0) {
              for (var i = 0; i < numLines; i++) {
                var esCuentaAjena = objRecord.getSublistValue({
                  sublistId: 'item',
                  fieldId: 'custcol_l598_aplica_cuenta_ajena',
                  line: i
                });

                if (esCuentaAjena == false || esCuentaAjena == 'F') {
                  dialog.alert({
                    title: 'Advertencia!',
                    message: 'La transacción a generar es de Cuenta Ajena y todos los artículos asociados a la transacción deben ser de cuenta ajena, por favor verifique e intente nuevamente.'
                  });
                  return false;
                }
              }
            }

            var aplicaDescuentoCtaAjena = objRecord.getValue('custbody_l598_aplica_desc_cta_ajena');

            if (!utilities.isEmpty(aplicaDescuentoCtaAjena) && (aplicaDescuentoCtaAjena == true || aplicaDescuentoCtaAjena == 'T')) {

              var mySearch = search.load({
                id: 'customsearch_l598_adenda_cta_ajena'
              });

              var resultSet = mySearch.run();

              var searchResult = resultSet.getRange({
                start: 0,
                end: 1
              });

              if (!utilities.isEmpty(searchResult) && searchResult.length > 0) {

                var adendaField = objRecord.getValue({
                  fieldId: 'custbody_l598_adenda'
                });

                var adendaConfigRT = searchResult[0].getValue({ name: resultSet.columns[0] });

                if (!utilities.isEmpty(adendaConfigRT)) {
                  /* if (!adendaField.includes(adendaConfigRT)) {

                    var adendaFieldValue;
                    if (utilities.isEmpty(adendaField)) {
                      adendaFieldValue = adendaConfigRT;
                    } else {
                      adendaFieldValue = adendaField + '\n' + adendaConfigRT;
                    }

                    log.debug(PROCESO, 'nuevo campo: ' + adendaFieldValue);
                    //al editar no setInterval, si el string esta incluido no setear
                    objRecord.setValue({
                      fieldId: 'custbody_l598_adenda',
                      value: adendaFieldValue,
                      ignoreFieldChange: true
                    });
                  } */

                  return true;
                }
                else {
                  var options = {
                    title: "Atención",
                    message: 'La transacción es de Cuenta Ajena y el cliente aplica a beneficio de descuento por cuenta ajena, se necesita una adenda especial a configurar en el RT "URU - Configuración Datos Cuenta Ajena", para que la misma se refleje en la transacción. ¿Desea continuar sin setear la adenda especial y guardar la transacción?'
                  };

                  dialog.confirm(options).then(success).catch(failure);
                }
              }
              else {
                var options = {
                  title: "Atención",
                  message: 'La transacción es de Cuenta Ajena y el cliente aplica a beneficio de descuento por cuenta ajena, se necesita una configuración valida de datos de Cuenta Ajena en el RT "URU - Configuración Datos Cuenta Ajena", para que se aplique el descuento correspondiente. ¿Desea continuar sin que se aplique el descuento y guardar la transacción?'
                };

                dialog.confirm(options).then(success).catch(failure);
              }
            }
            else {
              log.debug(PROCESO, 'El cliente no aplica a descuento por cuenta ajena, por lo tanto no se procede a validar adenda, generación de asiento contable ni otros procesos.');
              return true;
            }
          } else {
            log.debug(PROCESO, 'La transaccion no es de cuenta ajena, no se valida ningun datos de cuenta ajena.');
            return true;
          }
        }
        else {
          finalResultSet = false;
          return finalResult;
        }
      }
      catch (excepcion) {
        dialog.alert({
          title: 'Excepción!',
          message: 'Ha ocurrido un en el proceso de cuenta ajena, detalles: ' + JSON.stringify(excepcion.message)
        });
        log.error(PROCESO, 'Netsuite Exception on execute: ' + JSON.stringify(excepcion.message));
        return false;
      }
      log.audit("Governance Monitoring", "Remaining Usage = " + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());
      log.audit(PROCESO, 'END - Process: ');
    }

    function success(result) {
      log.debug(PROCESO, 'El usuario selecciono: ' + result);
      console.log('El usuario selecciono: ' + result);
      finalResult = result;
      finalResultSet = true;
      getNLMultiButtonByName('multibutton_submitter').onMainButtonClick(this);
    }

    function failure(reason) {
      log.error(PROCESO, 'Algo fallo al intentar ejecutar el proceso!');
      console.log('Algo fallo al intentar ejecutar el proceso!');
      return false;
    }

    return {
      saveRecord: saveRecord
    };

  });
