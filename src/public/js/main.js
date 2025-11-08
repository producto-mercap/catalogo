// Funcionalidades globales de la aplicación

console.log('✅ Aplicación Catálogo cargada');

// Cambiar vista (lista/tarjetas)
function cambiarVista(vista) {
    const params = new URLSearchParams(window.location.search);
    params.set('vista', vista);
    window.location.search = params.toString();
}

// Búsqueda
function buscar(event) {
    if (event) event.preventDefault();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const params = new URLSearchParams(window.location.search);
        params.set('busqueda', searchInput.value);
        window.location.search = params.toString();
    }
}

// Filtrar por sección
function filtrarPorSeccion(seccion) {
    const params = new URLSearchParams(window.location.search);
    params.set('seccion', seccion);
    window.location.search = params.toString();
}

// Ordenar
function ordenar(campo) {
    const params = new URLSearchParams(window.location.search);
    const ordenActual = params.get('orden');
    const direccionActual = params.get('direccion');
    
    if (ordenActual === campo) {
        // Cambiar dirección
        params.set('direccion', direccionActual === 'asc' ? 'desc' : 'asc');
    } else {
        params.set('orden', campo);
        params.set('direccion', 'desc');
    }
    
    window.location.search = params.toString();
}

// Ver detalle de funcionalidad
function verDetalle(id) {
    window.location.href = `/funcionalidades/${id}`;
}

// Eliminar funcionalidad
async function eliminarFuncionalidad(id) {
    if (!confirm('¿Estás seguro de eliminar esta funcionalidad?')) {
        return;
    }
    
    try {
        const response = await fetch(`/funcionalidades/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Funcionalidad eliminada exitosamente');
            window.location.reload();
        } else {
            alert('Error al eliminar: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar la funcionalidad');
    }
}

// Score Calculator
class ScoreCalculator {
    constructor() {
        this.criterios = {};
        this.pesos = {
            origen: 40,
            facturacion: 20,
            urgencia: 20,
            facturacion_potencial: 20,
            impacto_cliente: 33.33,
            esfuerzo: 33.33,
            incertidumbre: 33.33,
            riesgo: 33.33
        };
    }
    
    init() {
        // Escuchar cambios en los sliders
        document.querySelectorAll('.criterio-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                this.actualizarCriterio(e.target.dataset.criterio, e.target.value);
            });
        });
    }
    
    actualizarCriterio(criterio, valor) {
        this.criterios[criterio] = parseInt(valor);
        
        // Actualizar el display del valor
        const valueDisplay = document.querySelector(`[data-value="${criterio}"]`);
        if (valueDisplay) {
            valueDisplay.textContent = valor;
        }
        
        this.calcularScore();
    }
    
    calcularScore() {
        let score = 0;
        
        for (const [key, value] of Object.entries(this.criterios)) {
            const peso = this.pesos[key] || 0;
            score += (value * peso / 100);
        }
        
        // Actualizar display del score
        const scoreDisplay = document.getElementById('scoreTotal');
        if (scoreDisplay) {
            scoreDisplay.textContent = score.toFixed(2);
        }
        
        return score;
    }
    
    async guardarScore(funcionalidadId) {
        try {
            const response = await fetch(`/score/${funcionalidadId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.criterios)
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Score guardado exitosamente');
                return data.score;
            } else {
                alert('Error al guardar: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar el score');
        }
    }
}

// Mapa de clientes
class MapaClientes {
    constructor() {
        this.estadosComerciales = [
            'En Desarrollo',
            'Implementado',
            'Planificado',
            'Cancelado'
        ];
    }
    
    async actualizarEstado(clienteId, funcionalidadId, estado) {
        try {
            const response = await fetch(`/mapa/estado/${clienteId}/${funcionalidadId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    estado_comercial: estado
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Actualizar la celda visualmente
                const cell = document.querySelector(`[data-cliente="${clienteId}"][data-funcionalidad="${funcionalidadId}"]`);
                if (cell) {
                    this.actualizarCeldaEstado(cell, estado);
                }
                return true;
            } else {
                alert('Error al actualizar: ' + data.error);
                return false;
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al actualizar el estado');
            return false;
        }
    }
    
    actualizarCeldaEstado(cell, estado) {
        // Remover clases anteriores
        cell.classList.remove('estado-implementado', 'estado-desarrollo', 'estado-planificado', 'estado-cancelado');
        
        // Agregar nueva clase
        const claseEstado = this.getClaseEstado(estado);
        cell.classList.add(claseEstado);
        
        // Actualizar texto
        cell.textContent = estado;
    }
    
    getClaseEstado(estado) {
        const map = {
            'Implementado': 'estado-implementado',
            'En Desarrollo': 'estado-desarrollo',
            'Planificado': 'estado-planificado',
            'Cancelado': 'estado-cancelado'
        };
        return map[estado] || '';
    }
    
    mostrarModalEstado(clienteId, funcionalidadId, estadoActual) {
        // Crear modal simple
        const opciones = this.estadosComerciales.map(estado => 
            `<button class="btn" onclick="mapa.actualizarEstado(${clienteId}, ${funcionalidadId}, '${estado}')">${estado}</button>`
        ).join('');
        
        // Aquí podrías mostrar un modal más elaborado
        const nuevoEstado = prompt(`Estado actual: ${estadoActual}\n\nNuevo estado:\n1. En Desarrollo\n2. Implementado\n3. Planificado\n4. Cancelado\n\nElige una opción (1-4):`);
        
        if (nuevoEstado) {
            const estados = ['En Desarrollo', 'Implementado', 'Planificado', 'Cancelado'];
            const estadoIndex = parseInt(nuevoEstado) - 1;
            if (estadoIndex >= 0 && estadoIndex < estados.length) {
                this.actualizarEstado(clienteId, funcionalidadId, estados[estadoIndex]);
            }
        }
    }
}

// Inicializar en DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar calculadora de score si existe
    if (document.querySelector('.score-calculator')) {
        window.scoreCalculator = new ScoreCalculator();
        window.scoreCalculator.init();
    }
    
    // Inicializar mapa de clientes si existe
    if (document.querySelector('.mapa-grid')) {
        window.mapa = new MapaClientes();
    }
    
    // Búsqueda en tiempo real (opcional)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                // Podrías hacer búsqueda en tiempo real aquí
            }, 300);
        });
    }
});

// Formatear moneda
function formatMoney(amount) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    }).format(amount);
}

// Formatear fecha
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
}

// Get color de score
function getScoreColor(score) {
    if (score >= 4) return 'score-high';
    if (score >= 2.5) return 'score-medium';
    return 'score-low';
}

