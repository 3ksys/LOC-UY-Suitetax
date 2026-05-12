/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record', 'N/error','N/search'],
function(record, error, search) {

    function isEmpty(value)
    {
        return (typeof value == 'undefined' || value == null || value == '');
    }

    function onAction(scriptContext)
    {
        try {        
            var recTransac    = scriptContext.newRecord;
            var recType       = recTransac.type;
            var recId         = recTransac.id;
            var numRetDetalle = recTransac.getLineCount('recmachcustrecord__l598_ret_detalle_transaccion');
            var idRetencion   = recTransac.getValue('custbody_l598_link_retencion');
            var cae           = recTransac.getValue('custbody_l598_cae');
            var transtatus    = recTransac.getValue('transtatus');
            var mensaje       = '';


            //1. SI LA TRANSACCION CORRESPONDE A UNA FACTURA DE PROVEEDOR Y ESTA VINCULADA A ALGUNA URU-RETENCION
            if ((recType == 'vendorbill' || recType == 'vendorcredit') && numRetDetalle > 0)
            {
                mensaje = 'No se puede editar la transaccion porque ya fue considerada en un proceso de calculo de retenciones y por tanto tiene retenciones asociadas. Primero debe eliminar la transaccion de retencion donde esta transaccion fue considerada, para luego poder editar la misma - ID Transaccion: '+recId+' - TIPO Transaccion: '+recType;
                throw(error.create({
                            name: 'ERR001',
                            message: mensaje,
                            notifyOff: true
                            }));
            }


            //2. SI LA TRANSACCION ES UNA NOTA DE CREDITO Y NO TIENE URU-RETENCION DETALLE, PERO SI TIENE UNA TRANSACCION URU-RETENCION VINCULADA, PUEDE SER QUE DICHA TRANSACCION DIO INICIO A UNA RETENCION DE DEVOLUCION
            /* if (recType == 'vendorcredit' && !isEmpty(idRetencion))
            {
                mensaje = 'No se puede editar la nota de credito de proveedor porque ya fue considerada en un proceso de calculo de retenciones y por tanto tiene retenciones asociadas. Primero debe eliminar la transaccion de retencion donde esta transaccion fue considerada, para luego poder editar la misma - ID Transaccion: '+recId+' - TIPO Transaccion: '+recType;
                throw(error.create({
                            name: 'ERR002',
                            message: mensaje,
                            notifyOff: true
                            }));
            } */


            //3. SI LA TRANSACCION CORRESPONDE A UNA URU-RETENCION Y ESTA VINCULADA A ALGUNA TRANSACCION DE URU-RESGUARDO
            if (recType == 'customtransaction_l598_retencion' && !isEmpty(recId))
            {
                //DECLARACION DEL SAVE SEARCH A EJECUTAR
                var retencionDetalle = search.load({
                    id: 'customsearch_l598_ret_detalle_w_resg'
                });

                //FILTRO DE ID INTERNO DE URU-RETENCION
                var filtroID = search.createFilter({
                    name: 'custrecord_l598_ret_detalle_transaccion',
                    operator: search.Operator.IS,
                    values: recId
                });
                retencionDetalle.filters.push(filtroID);

                var resultSearch = retencionDetalle.run();
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0)
                {
                    mensaje = 'No se puede editar la transaccion de URU-Retencion porque ya fue considerada en una transaccion de URU-Resguardo, por lo que tiene resguardo asociadas. Primero debe eliminar la transaccion de URU-Resguardo donde esta transaccion fue considerada, para luego poder editar la misma - ID Transaccion: '+recId+' - TIPO Transaccion: URU-Retencion';
                    throw(error.create({
                                name: 'ERR003',
                                message: mensaje,
                                notifyOff: true
                                }));
                }
            }


            //4. SI LA TRANSACCION CORRESPONDE A UNA URU-RESGUARDO Y ESTA INFORMADA A LA DGI
            if (recType == 'customtransaction_l598_resguardos' && !isEmpty(cae) && transtatus=='B')
            {
                mensaje = 'No se puede editar la transaccion de URU-Resguardo porque ya fue informada a la DGI, si desea realizar alguna correccion debera generar una transaccion de URU-Resguardo de anulación - ID Transaccion: '+recId+' - TIPO Transaccion: URU-Resguardo';
                throw(error.create({
                            //name: 'ERR004',
                            message: mensaje//,
                            //notifyOff: true
                            }));
            }
        }
        catch(e)
        {
            throw e.message;
        }
    }

    return {
        onAction : onAction
    };
    
});