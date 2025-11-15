// Servicio para consumir API de Redmine directamente
// ⚠️ SOLO PARA CONSULTAS (READ-ONLY) - NUNCA EDITAR/INSERTAR

const REDMINE_URL = process.env.REDMINE_URL;
const REDMINE_TOKEN = process.env.REDMINE_TOKEN; // API Key de Redmine

/**
 * Validar que las credenciales están configuradas
 */
function validarCredenciales() {
    if (!REDMINE_URL) {
        throw new Error('❌ REDMINE_URL no está configurado en las variables de entorno');
    }
    if (!REDMINE_TOKEN) {
        throw new Error('❌ REDMINE_TOKEN no está configurado en las variables de entorno');
    }
    console.log('✅ Credenciales de Redmine configuradas');
}

/**
 * Obtener issues de Redmine por proyecto
 * @param {Object} options - Opciones de búsqueda
 * @param {string} options.project_id - ID del proyecto (ej: 'ut-bancor')
 * @param {string} options.status_id - ID del estado ('*' para todos, '8' para específico)
 * @param {number} options.limit - Límite de resultados (max recomendado: 100 por request)
 * @param {string} options.tracker_id - ID del tracker (opcional, ej: '10' para Epic)
 * @returns {Promise<Object>} - Datos de Redmine
 */
async function obtenerIssues(options = {}) {
    validarCredenciales();

    // Si project_id es null o undefined, usar el valor por defecto
    const project_id = options.project_id || process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor';
    const status_id = options.status_id || '*';
    const limit = options.limit || 15;
    const tracker_id = options.tracker_id || null; // Opcional: si no se especifica, no filtra por tracker
    const offset = options.offset || 0;

    try {
        const params = new URLSearchParams({
            project_id,
            status_id,
            limit: limit.toString(),
            offset: offset.toString(),
            key: REDMINE_TOKEN
        });

        // Solo agregar tracker_id si se especifica explícitamente
        if (tracker_id) {
            params.set('tracker_id', tracker_id);
        }

        const url = `${REDMINE_URL}/issues.json?${params.toString()}`;
        
        // Log sin exponer el token (ocultar key)
        const urlLog = url.replace(/key=[^&]+/, 'key=***');
        console.log(`🔍 Consultando Redmine: ${urlLog}`);
        console.log(`   Proyecto: ${project_id}, Estado: ${status_id}, Límite: ${limit}${tracker_id ? `, Tracker: ${tracker_id}` : ''}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Catalogo-NodeJS/1.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error HTTP:', response.status);
            console.error('📄 Respuesta:', errorText.substring(0, 500));
            
            // Si es error 500 y tenemos tracker_id, podría ser que el tracker no existe
            if (response.status === 500 && tracker_id) {
                console.error(`⚠️ Posible causa: tracker_id=${tracker_id} no existe o no es válido para este proyecto`);
            }
            
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log(`✅ Issues obtenidos: ${data.total_count || data.issues?.length || 0}`);
        
        return data;
    } catch (error) {
        console.error('❌ Error al obtener issues de Redmine:', error.message);
        throw error;
    }
}

/**
 * Obtener todos los issues de un proyecto (con paginación automática)
 * @param {string} project_id - ID del proyecto
 * @param {string} tracker_id - ID del tracker (opcional)
 * @param {number} maxTotal - Límite máximo de issues a obtener (null = sin límite)
 * @returns {Promise<Array>} - Array de todos los issues (limitado por maxTotal)
 */
async function obtenerTodosLosIssues(project_id = null, tracker_id = null, maxTotal = null) {
    // Si project_id es null o undefined, usar el valor por defecto
    project_id = project_id || process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor';
    // Usar el límite por request desde la variable de entorno o default
    const limitPorRequest = parseInt(process.env.REDMINE_LIMIT_PER_REQUEST) || 100;
    let offset = 0;
    let allIssues = [];
    let hasMore = true;

    console.log(`📥 Obteniendo issues del proyecto: ${project_id}`);
    if (maxTotal) {
        console.log(`   ⚠️ Modo prueba: limitado a ${maxTotal} issues`);
    }

    while (hasMore) {
        // Si hay límite máximo y ya alcanzamos el límite, detener
        if (maxTotal && allIssues.length >= maxTotal) {
            console.log(`   ⚠️ Límite alcanzado: ${maxTotal} issues`);
            break;
        }

        // Calcular cuántos issues pedir en este request
        let limitActual = limitPorRequest;
        if (maxTotal) {
            const restantes = maxTotal - allIssues.length;
            if (restantes < limitPorRequest) {
                limitActual = restantes;
            }
        }

        const data = await obtenerIssues({
            project_id,
            status_id: '*',
            limit: limitActual,
            offset,
            tracker_id
        });

        const issues = data.issues || [];
        allIssues = allIssues.concat(issues);

        console.log(`   Página ${Math.floor(offset / limitPorRequest) + 1}: ${issues.length} issues (total: ${allIssues.length}${maxTotal ? `/${maxTotal}` : ''})`);

        // Verificar si hay más resultados
        hasMore = data.total_count > (offset + limitActual);
        offset += limitActual;

        // Si alcanzamos el límite máximo, detener
        if (maxTotal && allIssues.length >= maxTotal) {
            break;
        }

        // Pausa de 200ms entre requests para no saturar el servidor
        if (hasMore && (!maxTotal || allIssues.length < maxTotal)) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    // Limitar el array final por si acaso
    if (maxTotal && allIssues.length > maxTotal) {
        allIssues = allIssues.slice(0, maxTotal);
    }

    console.log(`✅ Total de issues obtenidos: ${allIssues.length}${maxTotal ? ` (limitado a ${maxTotal})` : ''}`);
    return allIssues;
}

/**
 * Extraer valor de custom field
 * @param {Array} customFields - Array de custom fields
 * @param {string} fieldName - Nombre del campo
 * @returns {string|null} - Valor del campo o null
 */
function extraerCustomField(customFields, fieldName) {
    if (!Array.isArray(customFields)) return null;
    const field = customFields.find(cf => cf.name === fieldName);
    return field?.value || null;
}

/**
 * Parsear sponsor: extraer solo la parte antes del "|"
 * Ejemplo: "UT Bancor | Mantenimiento" -> "Bancor"
 * @param {string} proyecto - Nombre completo del proyecto
 * @returns {string} - Sponsor parseado
 */
function parsearSponsor(proyecto) {
    if (!proyecto) return 'Sin proyecto';
    
    // Si contiene "|", tomar la parte antes del "|"
    if (proyecto.includes('|')) {
        const parte = proyecto.split('|')[0].trim();
        // Remover "UT " si existe al inicio
        return parte.replace(/^UT\s+/i, '').trim() || parte.trim();
    }
    
    // Si no contiene "|", remover "UT " si existe
    return proyecto.replace(/^UT\s+/i, '').trim() || proyecto.trim();
}

/**
 * Mapear issue de Redmine a formato SIMPLIFICADO (solo datos no editables)
 * @param {Object} issue - Issue de Redmine
 * @returns {Object} - Datos mapeados (solo lo esencial)
 */
function mapearIssue(issue) {
    const proyectoCompleto = issue.project?.name || 'Sin proyecto';
    
    // Extraer custom fields
    const customFields = issue.custom_fields || [];
    const fechaRealFinalizacion = customFields.find(cf => cf.id === 15)?.value || null;
    
    return {
        // ID del issue (único e inmutable)
        redmine_id: issue.id,
        
        // Datos básicos de Redmine (no editables)
        titulo: issue.subject || 'Sin título',
        proyecto: parsearSponsor(proyectoCompleto), // Sponsor parseado
        proyecto_completo: proyectoCompleto, // Nombre completo del proyecto
        fecha_creacion: issue.created_on || null,
        fecha_real_finalizacion: fechaRealFinalizacion, // Custom field id 15
        total_spent_hours: issue.total_spent_hours || null // Horas dedicadas
    };
}

/**
 * Obtener issues mapeados listos para insertar en la base de datos
 * @param {string} project_id - ID del proyecto
 * @param {string} tracker_id - ID del tracker (opcional, ej: '10' para Epic)
 * @param {number} maxTotal - Límite máximo de issues a obtener (null = sin límite)
 * @returns {Promise<Array>} - Array de issues mapeados
 */
async function obtenerIssuesMapeados(project_id = null, tracker_id = null, maxTotal = null) {
    // Si project_id es null o undefined, usar el valor por defecto
    project_id = project_id || process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor';
    try {
        // Si hay variable de entorno REDMINE_SYNC_LIMIT, usarla
        const limitFromEnv = process.env.REDMINE_SYNC_LIMIT ? parseInt(process.env.REDMINE_SYNC_LIMIT) : null;
        const limitFinal = maxTotal || limitFromEnv;

        // Log de filtros utilizados
        console.log('📋 Filtros aplicados en la consulta a Redmine:');
        console.log(`   - Project ID: ${project_id}`);
        console.log(`   - Tracker ID: ${tracker_id || 'todos'}`);
        console.log(`   - Límite: ${limitFinal || 'sin límite'}`);
        
        const issues = await obtenerTodosLosIssues(project_id, tracker_id, limitFinal);
        
        const issuesMapeados = issues.map(mapearIssue);
        
        console.log(`✅ Issues mapeados: ${issuesMapeados.length}`);
        
        return issuesMapeados;
    } catch (error) {
        console.error('❌ Error al mapear issues:', error.message);
        throw error;
    }
}

/**
 * Obtener project_id de Redmine por nombre del proyecto
 * @param {string} projectName - Nombre del proyecto (ej: "UT Mercap | Proyecto Genérico")
 * @returns {Promise<string|null>} - ID del proyecto (identifier) o null si no se encuentra
 */
async function obtenerProjectIdPorNombre(projectName) {
    validarCredenciales();
    
    try {
        const limitPorRequest = 100;
        let offset = 0;
        let allProjects = [];
        let hasMore = true;
        
        console.log(`🔍 Buscando proyecto por nombre: "${projectName}"`);
        
        // Buscar en todas las páginas si es necesario
        while (hasMore) {
            const params = new URLSearchParams({
                limit: limitPorRequest.toString(),
                offset: offset.toString(),
                key: REDMINE_TOKEN
            });
            
            const url = `${REDMINE_URL}/projects.json?${params.toString()}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Catalogo-NodeJS/1.0'
                }
            });
            
            if (!response.ok) {
                console.error(`❌ Error al buscar proyecto: ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            const projects = data.projects || [];
            allProjects = allProjects.concat(projects);
            
            console.log(`   Página ${Math.floor(offset / limitPorRequest) + 1}: ${projects.length} proyectos (total: ${allProjects.length})`);
            
            // Buscar coincidencia exacta por nombre
            const projectExacto = projects.find(p => p.name === projectName);
            if (projectExacto) {
                console.log(`✅ Proyecto encontrado (coincidencia exacta): ${projectExacto.identifier} (ID: ${projectExacto.id}, Name: ${projectExacto.name})`);
                return projectExacto.identifier;
            }
            
            // Buscar coincidencia parcial (case-insensitive, contiene el texto)
            const projectParcial = projects.find(p => 
                p.name.toLowerCase().includes(projectName.toLowerCase()) ||
                projectName.toLowerCase().includes(p.name.toLowerCase())
            );
            if (projectParcial) {
                console.log(`✅ Proyecto encontrado (coincidencia parcial): ${projectParcial.identifier} (ID: ${projectParcial.id}, Name: ${projectParcial.name})`);
                console.log(`   ⚠️ Coincidencia parcial - verifica que sea el proyecto correcto`);
                return projectParcial.identifier;
            }
            
            hasMore = data.total_count > (offset + limitPorRequest);
            offset += limitPorRequest;
            
            // Pausa entre requests
            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        // Si no se encontró, mostrar algunos proyectos similares para debugging
        console.log(`⚠️ Proyecto "${projectName}" no encontrado en ${allProjects.length} proyectos`);
        
        // Buscar proyectos que contengan palabras clave
        const palabrasClave = projectName.toLowerCase().split(/\s+/).filter(p => p.length > 2);
        const proyectosSimilares = allProjects.filter(p => {
            const nombreLower = p.name.toLowerCase();
            return palabrasClave.some(palabra => nombreLower.includes(palabra));
        });
        
        if (proyectosSimilares.length > 0) {
            console.log(`\n💡 Proyectos similares encontrados (${proyectosSimilares.length}):`);
            proyectosSimilares.slice(0, 10).forEach(p => {
                console.log(`   - "${p.name}" (identifier: ${p.identifier}, id: ${p.id})`);
            });
        }
        
        return null;
    } catch (error) {
        console.error('❌ Error al buscar proyecto por nombre:', error.message);
        return null;
    }
}

/**
 * Obtener issues de un proyecto por nombre (filtrando por project.name en la respuesta)
 * Útil cuando no se conoce el project_id pero sí el nombre del proyecto
 * @param {string} projectName - Nombre del proyecto (ej: "UT Mercap | Proyecto Genérico")
 * @param {string} tracker_id - ID del tracker (opcional)
 * @param {number} maxTotal - Límite máximo de issues (null = sin límite)
 * @returns {Promise<Array>} - Array de issues del proyecto
 */
async function obtenerIssuesPorNombreProyecto(projectName, tracker_id = null, maxTotal = null) {
    validarCredenciales();
    
    // Primero intentar obtener el project_id
    const projectId = await obtenerProjectIdPorNombre(projectName);
    
    if (!projectId) {
        // Si no se encuentra por identifier, obtener todos y filtrar por nombre
        console.log(`⚠️ No se encontró project_id, filtrando issues por project.name...`);
        
        const limitPorRequest = parseInt(process.env.REDMINE_LIMIT_PER_REQUEST) || 100;
        let offset = 0;
        let allIssues = [];
        let hasMore = true;
        
        // Obtener issues sin filtro de proyecto (o con un proyecto amplio)
        // Nota: Esto puede ser ineficiente si hay muchos proyectos
        while (hasMore && (!maxTotal || allIssues.length < maxTotal)) {
            const limitActual = maxTotal ? Math.min(limitPorRequest, maxTotal - allIssues.length) : limitPorRequest;
            
            const params = new URLSearchParams({
                status_id: '*',
                limit: limitActual.toString(),
                offset: offset.toString(),
                key: REDMINE_TOKEN
            });
            
            if (tracker_id) {
                params.set('tracker_id', tracker_id);
            }
            
            const url = `${REDMINE_URL}/issues.json?${params.toString()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Catalogo-NodeJS/1.0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const issues = data.issues || [];
            
            // Filtrar por nombre del proyecto
            const filteredIssues = issues.filter(issue => 
                issue.project?.name === projectName
            );
            
            allIssues = allIssues.concat(filteredIssues);
            
            console.log(`   Página ${Math.floor(offset / limitPorRequest) + 1}: ${filteredIssues.length} issues del proyecto "${projectName}" (total: ${allIssues.length}${maxTotal ? `/${maxTotal}` : ''})`);
            
            hasMore = data.total_count > (offset + limitActual);
            offset += limitActual;
            
            if (maxTotal && allIssues.length >= maxTotal) {
                break;
            }
            
            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        if (maxTotal && allIssues.length > maxTotal) {
            allIssues = allIssues.slice(0, maxTotal);
        }
        
        console.log(`✅ Total de issues obtenidos del proyecto "${projectName}": ${allIssues.length}`);
        return allIssues;
    }
    
    // Si se encontró el project_id, usar el método normal
    const issues = await obtenerTodosLosIssues(projectId, tracker_id, maxTotal);
    
    return issues;
}

/**
 * Obtener issues mapeados de un proyecto por nombre
 * @param {string} projectName - Nombre del proyecto (ej: "UT Mercap | Proyecto Genérico")
 * @param {string} tracker_id - ID del tracker (opcional)
 * @param {number} maxTotal - Límite máximo de issues (null = sin límite)
 * @returns {Promise<Array>} - Array de issues mapeados
 */
async function obtenerIssuesMapeadosPorNombreProyecto(projectName, tracker_id = null, maxTotal = null) {
    try {
        const limitFromEnv = process.env.REDMINE_SYNC_LIMIT ? parseInt(process.env.REDMINE_SYNC_LIMIT) : null;
        const limitFinal = maxTotal || limitFromEnv;
        
        const issues = await obtenerIssuesPorNombreProyecto(projectName, tracker_id, limitFinal);
        const issuesMapeados = issues.map(mapearIssue);
        
        console.log(`✅ Issues mapeados del proyecto "${projectName}": ${issuesMapeados.length}`);
        
        return issuesMapeados;
    } catch (error) {
        console.error(`❌ Error al mapear issues del proyecto "${projectName}":`, error.message);
        throw error;
    }
}

/**
 * Probar conexión con Redmine
 * @returns {Promise<boolean>} - true si la conexión es exitosa
 */
async function probarConexion() {
    try {
        validarCredenciales();
        
        console.log('🔄 Probando conexión con Redmine...');
        
        const data = await obtenerIssues({
            project_id: process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor',
            limit: 1
        });
        
        console.log('✅ Conexión exitosa con Redmine');
        console.log(`   Total de issues en proyecto: ${data.total_count || 0}`);
        
        return true;
    } catch (error) {
        console.error('❌ Error de conexión con Redmine:', error.message);
        return false;
    }
}

/**
 * Listar todos los proyectos disponibles en Redmine
 * Útil para encontrar el nombre exacto o identifier de un proyecto
 * @param {number} limit - Límite de proyectos a obtener (null = todos)
 * @returns {Promise<Array>} - Array de proyectos con {id, identifier, name}
 */
async function listarProyectos(limit = null) {
    validarCredenciales();
    
    try {
        const limitPorRequest = 100;
        let offset = 0;
        let allProjects = [];
        let hasMore = true;
        
        console.log('📋 Listando proyectos de Redmine...');
        
        while (hasMore && (!limit || allProjects.length < limit)) {
            const params = new URLSearchParams({
                limit: limitPorRequest.toString(),
                offset: offset.toString(),
                key: REDMINE_TOKEN
            });
            
            const url = `${REDMINE_URL}/projects.json?${params.toString()}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Catalogo-NodeJS/1.0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const projects = data.projects || [];
            allProjects = allProjects.concat(projects);
            
            hasMore = data.total_count > (offset + limitPorRequest);
            offset += limitPorRequest;
            
            if (hasMore && (!limit || allProjects.length < limit)) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        if (limit && allProjects.length > limit) {
            allProjects = allProjects.slice(0, limit);
        }
        
        console.log(`✅ ${allProjects.length} proyectos encontrados`);
        return allProjects.map(p => ({
            id: p.id,
            identifier: p.identifier,
            name: p.name
        }));
    } catch (error) {
        console.error('❌ Error al listar proyectos:', error.message);
        throw error;
    }
}

module.exports = {
    obtenerIssues,
    obtenerTodosLosIssues,
    obtenerIssuesMapeados,
    obtenerProjectIdPorNombre,
    obtenerIssuesPorNombreProyecto,
    obtenerIssuesMapeadosPorNombreProyecto,
    listarProyectos,
    mapearIssue,
    probarConexion
};
