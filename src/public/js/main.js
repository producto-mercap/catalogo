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

// Toggle mostrar/ocultar montos
let montosOcultos = false;

function toggleMontos() {
    montosOcultos = !montosOcultos;
    const montos = document.querySelectorAll('.monto-valor');
    const eyeIcon = document.getElementById('eyeIcon');
    
    montos.forEach(monto => {
        if (montosOcultos) {
            monto.classList.add('monto-oculto');
        } else {
            monto.classList.remove('monto-oculto');
        }
    });
    
    // Cambiar ícono
    if (eyeIcon) {
        if (montosOcultos) {
            eyeIcon.innerHTML = '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>';
        } else {
            eyeIcon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
        }
    }
}

// Búsqueda con sugerencias
let funcionalidades = [];

async function cargarFuncionalidades() {
    try {
        const response = await fetch('/api/funcionalidades');
        const data = await response.json();
        if (data.success) {
            funcionalidades = data.funcionalidades;
        }
    } catch (error) {
        console.error('Error al cargar funcionalidades:', error);
    }
}

function mostrarSugerencias(query) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer || !query || query.length < 2) {
        if (suggestionsContainer) {
            suggestionsContainer.classList.remove('active');
        }
        return;
    }
    
    // Filtrar funcionalidades
    const filtradas = funcionalidades.filter(func => {
        const searchText = query.toLowerCase();
        return (
            func.titulo?.toLowerCase().includes(searchText) ||
            func.descripcion?.toLowerCase().includes(searchText) ||
            func.sponsor?.toLowerCase().includes(searchText) ||
            func.seccion?.toLowerCase().includes(searchText)
        );
    }).slice(0, 5); // Máximo 5 sugerencias
    
    if (filtradas.length === 0) {
        suggestionsContainer.classList.remove('active');
        return;
    }
    
    // Generar HTML de sugerencias
    const html = filtradas.map(func => `
        <div class="suggestion-item" onclick="verDetalle(${func.id})">
            <div class="suggestion-icon">
                ${func.titulo.substring(0, 1).toUpperCase()}
            </div>
            <div class="suggestion-text">
                <div class="suggestion-title">${func.titulo}</div>
                <div class="suggestion-subtitle">
                    ${func.seccion || 'Sin sección'} ${func.sponsor ? '• ' + func.sponsor : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    suggestionsContainer.innerHTML = html;
    suggestionsContainer.classList.add('active');
}

// Inicializar en DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Cargar funcionalidades para sugerencias
    cargarFuncionalidades();
    
    // Inicializar calculadora de score si existe
    if (document.querySelector('.score-calculator')) {
        window.scoreCalculator = new ScoreCalculator();
        window.scoreCalculator.init();
    }
    
    // Inicializar mapa de clientes si existe
    if (document.querySelector('.mapa-grid')) {
        window.mapa = new MapaClientes();
    }
    
    // Búsqueda con sugerencias en tiempo real
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                mostrarSugerencias(e.target.value);
            }, 300);
        });
        
        // Ocultar sugerencias al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                const suggestions = document.getElementById('searchSuggestions');
                if (suggestions) {
                    suggestions.classList.remove('active');
                }
            }
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

