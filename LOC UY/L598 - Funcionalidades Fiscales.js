/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/error', 'N/search', 'L598/utilities', 'N/record', 'N/runtime', 'N/format'],


    function (error, search, utilities, record, runtime, format) {


        /***************************** FUNCIONES AUXILIARES - INICIO ********************************/

        function validarEntidades(registro) {
            const PROCESO = 'Validacion Unicidad Numero de Identificacion Fiscal';
            try {

                if (!utilities.isEmpty(registro)) {

                    let idRegistro = registro.getValue({ fieldId: 'id' });
                    let tipoRegistro = registro.getValue({ fieldId: 'type' });
                    let registroPadre = registro.getValue({ fieldId: 'parent' });
                    let subsidiaria = registro.getValue({ fieldId: 'subsidiary' });
                    let numeroIdentificacionFiscal = registro.getValue({ fieldId: 'custentity_l598_nro_documento' });

                    log.debug(PROCESO, 'INICIO - CONSULTA DE IDENTIFICACION FISCAL - NUMERO DE IDENTIFICACION REGISTRO : ' + numeroIdentificacionFiscal);

                    if (utilities.isEmpty(numeroIdentificacionFiscal)) {
                        return true;
                    }

                    var respuesta = new Object();
                    respuesta.error = false;
                    respuesta.mensaje = '';
                    respuesta.existenRegistros = false;

                    var filtros = new Array();
                    var idsExcluir = new Array();


                    var savedSearch = 'customsearch_l598_unicidad_cl';
                    if (tipoRegistro == 'employee') {
                        savedSearch = 'customsearch_l598_unicidad_em';
                    }
                    else {
                        if (tipoRegistro == 'vendor') {
                            savedSearch = 'customsearch_l598_unicidad_pr';
                        }
                    }

                    // Subsidiaria
                    if (!utilities.isEmpty(subsidiaria)) {
                        var filtroSubsidiaria = {
                            'name': 'subsidiary',
                            'operator': 'ANYOF',
                            'values': subsidiaria
                        };
                        filtros.push(filtroSubsidiaria);
                    }

                    // RUT
                    if (!utilities.isEmpty(numeroIdentificacionFiscal)) {
                        var filtroRut = {
                            'name': 'custentity_l598_nro_documento',
                            'operator': 'IS',
                            'values': numeroIdentificacionFiscal
                        };
                        filtros.push(filtroRut);
                    }


                    // Excluir Entidad Actual
                    if (!utilities.isEmpty(idRegistro)) {
                        idsExcluir.push(idRegistro);
                    }
                    // Excluir Entidad Padre
                    if (!utilities.isEmpty(registroPadre)) {
                        idsExcluir.push(registroPadre);
                    }
                    if (idsExcluir.length > 0) {
                        var filtroEntidades = {
                            'name': 'internalid',
                            'operator': 'NONEOF',
                            'values': idsExcluir
                        };
                        filtros.push(filtroEntidades);
                    }

                    // Excluir Entidades Hermanos e Hijos // solo los clientes tienen padre, con proveedor ocurrirá excepcion.
                    if (idsExcluir.length > 0 && tipoRegistro == 'customer') {
                        var filtroHermanos = {
                            'name': 'parent',
                            'operator': 'NONEOF',
                            'values': idsExcluir
                        };
                        filtros.push(filtroHermanos);
                    }

                    log.debug(PROCESO, 'Filtros de SS ' + JSON.stringify(filtros));

                    var objResultSet = utilities.searchSavedPro(savedSearch, filtros);

                    log.debug(PROCESO, 'Resultado de SS ' + JSON.stringify(objResultSet));

                    if (objResultSet.error) {
                        respuesta.error = true;
                        respuesta.mensaje = 'Error Consultando Entidades - Error : ' + objResultSet.descripcion;
                        log.debug(PROCESO, respuesta.mensaje);
                    } else {
                        var resultSet = objResultSet.objRsponseFunction.result;
                        var resultSearch = objResultSet.objRsponseFunction.search;

                        if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {
                            respuesta.existenRegistros = true;
                        }
                    }
                }
                else {
                    respuesta.error = true;
                    respuesta.mensaje = 'Error Consultando Entidades - No se recibio objeto de Entidad de NetSuite';
                    log.debug(PROCESO,respuesta.mensaje);
                }
            }
            catch (e) {
                respuesta.error = true;
                respuesta.mensaje = 'Error Consultando Entidades - Excepcion : ' + JSON.stringify(e.message);
                log.debug(PROCESO,respuesta.mensaje);
            }
            return respuesta;
        }

        function consultarNumeroFiscal(registro,paisValidacion) {
            const PROCESO = 'Consulta de Numero de Identificacion Fiscal';

            try {

                if (!utilities.isEmpty(registro) && !utilities.isEmpty(paisValidacion)) {

                    var pais = paisValidacion;

                    var idRegistro = registro.getValue({ fieldId: 'id' });

                    log.debug(PROCESO, 'INICIO - CONSULTA DE IDENTIFICACION FISCAL - ID REGISTRO : ' + idRegistro);

                    var respuesta = new Object();
                    respuesta.error = false;
                    respuesta.mensaje = '';
                    respuesta.existenRegistros = false;
                    respuesta.numeroFiscal = '';

                    let cantidadRegFiscales = registro.getLineCount('taxregistration');

                    if(!utilities.isEmpty(cantidadRegFiscales) && cantidadRegFiscales > 0){
                        for(var i=0 ; i<cantidadRegFiscales ; i++){
                            if(pais == registro.getSublistValue({sublistId: 'taxregistration',fieldId: 'nexuscountry',line: i})){
                                respuesta.numeroFiscal = registro.getSublistValue({sublistId: 'taxregistration',fieldId: 'taxregistrationnumber',line: i});
                                if(!utilities.isEmpty(respuesta.numeroFiscal)){
                                    respuesta.existenRegistros = true;
                                    break;
                                }
                            }
                        }
                        if(utilities.isEmpty(respuesta.numeroFiscal)){
                                respuesta.existenRegistros = false;
                                respuesta.error = false;
                                respuesta.mensaje = 'Error Consultando Numero Fiscal - No se encontroun registro fiscal para el pais : ' + pais +  ' en la Sublista de "Registros Fiscales" para la entidad con ID : ' + idRegistro;
                                log.debug(PROCESO,respuesta.mensaje);
                        }
                    }
                    else{
                        respuesta.existenRegistros = false;
                        respuesta.error = false;
                        respuesta.mensaje = 'Error Consultando Numero Fiscal - No existen registros fiscales en la Sublista de "Registros Fiscales" para la entidad con ID : ' + idRegistro;
                        log.debug(PROCESO,respuesta.mensaje);
                    }
                }
                else {
                    respuesta.error = true;
                    respuesta.mensaje = 'Error Consultando Numero Fiscal - No se recibio objeto de Entidad de NetSuite o Pais de Validacion';
                    log.debug(PROCESO,respuesta.mensaje);
                }
            }
            catch (e) {
                respuesta.error = true;
                respuesta.mensaje = 'Excepcion Consultando Numero Fiscal - Excepcion : ' + JSON.stringify(e.message);
                log.debug(PROCESO,respuesta.mensaje);
            }
            return respuesta;
        }

        /***************************** FUNCIONES AUXILIARES - FIN ********************************/

        return {
            validarEntidades: validarEntidades,
            consultarNumeroFiscal: consultarNumeroFiscal
        };
    });