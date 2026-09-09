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
   * @param {search} search
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

    const PROCESO = 'Unicidad Configuración de Datos Cuenta Ajena';

    function saveRecord(scriptContext) {

      log.audit(PROCESO, 'INICIO - Validar Unicidad Configuración de Datos Cuenta Ajena');
      log.audit("Governance Monitoring", "Remaining Usage = " + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());

      try {

        var objRecord = scriptContext.currentRecord;

        var executionContext = runtime.executionContext;

        log.debug('executionContext', JSON.stringify(executionContext));

        var mySearch = search.load({
          id: 'customsearch_l598_subsidiaria_cta_ajena'
        });

        var recId = scriptContext.currentRecord.id;
        if (!utilities.isEmpty(recId)) {
          var filtroId = search.createFilter({
            name: 'id',
            operator: search.Operator.NOTEQUALTO,
            values: recId
          });
          mySearch.filters.push(filtroId);
        }

        var subsidiaria = objRecord.getValue('custrecord_l598_conf_da_cta_aj_subsidia');
        if (utilities.l598esOneworld()) {
          if (!utilities.isEmpty(subsidiaria)) {
            var filtroSubsidiaria = search.createFilter({
              name: 'custrecord_l598_conf_da_cta_aj_subsidia',
              operator: search.Operator.ANYOF,
              values: subsidiaria
            });
            mySearch.filters.push(filtroSubsidiaria);
          } else return false;
        }        
      
        var resultSet = mySearch.run();
        var searchResult = resultSet.getRange({
          start: 0,
          end: 1000
        });

        if (!utilities.isEmpty(searchResult) && searchResult.length > 0) {
          dialog.alert({
            title: 'Advertencia!',
            message: 'No se puede crear mas de un registro por subsidiaria, verifique.'
          });
          return false;
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
      log.audit(PROCESO, 'FIN - Validar Unicidad Configuración de Datos Cuenta Ajena');
      return true;
    }

    return {
      saveRecord: saveRecord
    };

  });
