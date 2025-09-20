/**
 * Módulo para manejar los talleres
 */

// Renderizar la sección de talleres
function renderTalleres(container, user) {
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Crear estructura principal
    const talleresContainer = createElement('div', { className: 'space-y-6' });
    
    // Header con título y botón de nuevo taller
    const header = createElement('div', { className: 'flex flex-col md:flex-row md:justify-between md:items-center gap-4' });
    
    const headerInfo = createElement('div');
    headerInfo.innerHTML = `
        <h2 class="text-xl md:text-2xl font-bold text-gray-900">Talleres de Memoria</h2>
        <p class="text-gray-600">Gestiona los talleres de estimulación cognitiva</p>
    `;
    
    const headerActions = createElement('div', { className: 'flex flex-col sm:flex-row gap-2' });
    
    // Solo mostrar botón de nuevo taller si es admin
    if (user.rol === 'admin') {
        const newButton = createElement('button', { 
            className: 'btn btn-primary',
            id: 'new-taller-btn'
        });
        newButton.innerHTML = '<i class="fas fa-plus"></i> Nuevo Taller';
        headerActions.appendChild(newButton);
        
        // Evento para abrir modal de nuevo taller
        newButton.addEventListener('click', () => {
            openTallerModal();
        });
    }
    
    header.appendChild(headerInfo);
    header.appendChild(headerActions);
    
    // Búsqueda y filtros
    const searchContainer = createElement('div', { className: 'flex flex-col sm:flex-row gap-2' });
    
    const searchInputContainer = createElement('div', { className: 'relative flex-grow' });
    searchInputContainer.innerHTML = `
        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y
