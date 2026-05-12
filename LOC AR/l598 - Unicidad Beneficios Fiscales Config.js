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

    const PROCESO = 'Unicidad Beneficios Fiscales Configuracion';

    function saveRecord(scriptContext) {

      log.audit(PROCESO, 'INICIO - Validar Unicidad Beneficios Fiscales Configuración');
      log.audit("Governance Monitoring", "Remaining Usage = " + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());

      try {

        var objRecord = scriptContext.currentRecord;

        var executionContext = runtime.executionContext;

        log.debug('executionContext', JSON.stringify(executionContext));

        var mySearch = search.load({
          id: 'customsearch_l598_beneficios_conf'
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

        var beneficio = objRecord.getValue('custrecord_l598_ben_config_ben');
        if (!utilities.isEmpty(beneficio)) {
          var filtroBeneficio = search.createFilter({
            name: 'custrecord_l598_ben_config_ben',
            operator: search.Operator.ANYOF,
            values: beneficio
          });
          mySearch.filters.push(filtroBeneficio);
        } else return false;

        var anio = objRecord.getValue('custrecord_l598_ben_config_anio');
        if (!utilities.isEmpty(anio)) {
          var filtroAnio = search.createFilter({
            name: 'custrecord_l598_ben_config_anio',
            operator: search.Operator.ANYOF,
            values: anio
          });
          mySearch.filters.push(filtroAnio);
        } else return false;

        var subsidiaria = objRecord.getValue('custrecord_l598_ben_config_subsidiaria');
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
          end: 1000
        });

        log.debug(PROCESO, 'Resultados SS: ' + JSON.stringify(searchResult));

        if (!utilities.isEmpty(searchResult) && searchResult.length > 0) {
          dialog.alert({
            title: 'Advertencia!',
            message: 'No se puede repetir la configuración. Verifique los campos BENEFICIO, PRIMER MES AÑO FISCAL y SUBSIDIARIA.'
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
      log.audit(PROCESO, 'FIN - Validar Unicidad Beneficios Fiscales Configuración');
      return true;
    }

    return {
      saveRecord: saveRecord
    };

  });
