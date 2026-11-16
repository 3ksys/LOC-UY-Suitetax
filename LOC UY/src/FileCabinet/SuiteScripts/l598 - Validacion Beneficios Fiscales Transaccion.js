/**
* @NApiVersion 2.x
* @NAmdConfig /SuiteScripts/configuration_l598.json
* @NScriptType ClientScript
* @NModuleScope Public
*/

define(['N/search', 'N/error', 'N/format', 'N/record', 'N/ui/dialog', 'N/runtime', 'L598/utilities'],
  /**
   * @param {error} error
   * @param {record} record
   * @param {search} search
   */

  function (search, error, format, record, dialog, runtime, utilities) {

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */

    const PROCESO = 'Validación Beneficios Fiscales Transacción';
    //User provided final answer from confirm box
    var finalResult = false
    //Flag to indicate if user provided final answer or not
    var finalResultSet = false;

    function saveRecord(scriptContext) {

      log.audit(PROCESO, 'INICIO - Validación Beneficios Fiscales Transacción');
      log.audit("Governance Monitoring", "Remaining Usage = " + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());

      try {

        if (!finalResultSet) {
          var objRecord = scriptContext.currentRecord;

          var executionContext = runtime.executionContext;

          log.debug('executionContext', JSON.stringify(executionContext));

          var tranCuentaAjena = objRecord.getValue('custbody_l598_transac_cuenta_ajena');

          if (utilities.isEmpty(tranCuentaAjena) || tranCuentaAjena == 'F' || tranCuentaAjena == false) {
            var beneficio = objRecord.getValue('custbody_l598_tipo_beneficio_fiscal');
            if (utilities.isEmpty(beneficio)) {
              log.debug(PROCESO, 'Al no haber Beneficios Fiscales continúa la ejecución');
              return true;
            }

            var mySearch = search.load({
              id: 'customsearch_l598_obt_dat_ben_fisc_confi'
            });

            var filtroBeneficio = search.createFilter({
              name: 'custrecord_l598_ben_config_ben',
              operator: search.Operator.ANYOF,
              values: beneficio
            });
            mySearch.filters.push(filtroBeneficio);

            var fecha = objRecord.getValue('trandate');
            fecha = format.format({
              value: fecha,
              type: format.Type.DATE,
              timezone: format.Timezone.AMERICA_MONTEVIDEO
            });

            if (!utilities.isEmpty(fecha)) {
              var filtroFechaDesde = search.createFilter({
                name: 'startdate',
                join: 'custrecord_l598_ben_config_anio',
                operator: search.Operator.ONORBEFORE,
                values: fecha
              });
              mySearch.filters.push(filtroFechaDesde);

              var filtroFechaHasta = search.createFilter({
                name: 'enddate',
                join: 'custrecord_l598_ben_config_anio_fin',
                operator: search.Operator.ONORAFTER,
                values: fecha
              });
              mySearch.filters.push(filtroFechaHasta);
            } else return false;

            var subsidiaria = objRecord.getValue('subsidiary');
            if (utilities.l598esOneworld()) {
              if (!utilities.isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                  name: 'custrecord_l598_ben_config_subsidiaria',
                  operator: search.Operator.ANYOF,
                  values: subsidiaria
                });
                mySearch.filters.push(filtroSubsidiaria);
              } else return false;
            }

            log.debug(PROCESO, 'mySearch.filters ' + JSON.stringify(mySearch.filters))
            var resultSet = mySearch.run();

            var searchResult = resultSet.getRange({
              start: 0,
              end: 1
            });

            log.debug(PROCESO, 'Resultados SS: ' + JSON.stringify(searchResult));

            if (searchResult.length <= 0) {
              
              var options = {
                title: "Atención",
                message: 'Los campos FECHA, SUBSIDIARIA y URU - TIPO DE BENEFICIO FISCAL no coinciden con una configuración de beneficios fiscales para aplicar descuentos. ¿Desea continuar y guardar la transacción?'
              };

              dialog.confirm(options).then(success).catch(failure);
            } else {
              log.debug(PROCESO, 'Se encontro un registro de configuracion de beneficio fiscal, se guarda la transaccion');
              return true;
            }
          }
          else {
            log.debug(PROCESO, 'No se realizan validaciones de beneficios fiscales porque la transacción es de cuenta ajena.');
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
          message: 'Ha ocurrido un en el proceso, detalles: ' + JSON.stringify(excepcion.message)
        });
        log.error(PROCESO, 'Netsuite Exception on execute: ' + JSON.stringify(excepcion.message));
        return false;
      }
      log.audit("Governance Monitoring", "Remaining Usage = " + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());
      log.audit(PROCESO, 'FIN - Validación Beneficios Fiscales Transacción');
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
