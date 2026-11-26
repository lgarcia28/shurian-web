document.addEventListener('DOMContentLoaded', () => {
    // --- Lógica del Menú Hamburguesa ---
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navbar = document.querySelector('.navbar');

    hamburgerMenu.addEventListener('click', () => {
        navbar.classList.toggle('active');
    });

    const navLinks = document.querySelectorAll('.navbar a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbar.classList.contains('active')) {
                navbar.classList.remove('active');
            }
        });
    });

    // --- Lógica para cargar productos del Catálogo (sincronizado desde Tiendanube) ---
    const catalogoContainer = document.getElementById('catalogo-container');
    const buscarInput = document.getElementById('catalogo-buscar');
    const categoriaSelect = document.getElementById('catalogo-categoria');
    const soloStockCheckbox = document.getElementById('catalogo-solo-stock');
    const estadoEl = document.getElementById('catalogo-estado');
    const verMasBtn = document.getElementById('catalogo-ver-mas');

    const PAGE_SIZE = 12;
    let todosLosProductos = [];
    let productosFiltrados = [];
    let mostrados = 0;

    function escaparHtml(texto) {
        const div = document.createElement('div');
        div.textContent = texto || '';
        return div.innerHTML;
    }

    function formatearPrecio(valor) {
        if (typeof valor !== 'number' || !Number.isFinite(valor)) return '';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 0
        }).format(valor);
    }

    function truncar(texto, max = 110) {
        if (!texto) return '';
        return texto.length > max ? `${texto.slice(0, max).trim()}…` : texto;
    }

    function crearTarjetaProducto(producto) {
        const card = document.createElement('div');
        card.className = 'producto-card';

        const titulo = escaparHtml(producto.name || 'Producto');
        const descripcion = escaparHtml(truncar(producto.description));
        const categoria = producto.categories && producto.categories.length > 0
            ? escaparHtml(producto.categories[0])
            : '';

        const imagenHtml = producto.image
            ? `<img src="${escaparHtml(producto.image)}" alt="${titulo}" loading="lazy">`
            : `<div class="producto-sin-imagen" aria-hidden="true"><i class="fas fa-microchip"></i></div>`;

        let precioHtml = '';
        if (producto.promotional_price && producto.price && producto.promotional_price < producto.price) {
            precioHtml = `
                <div class="producto-precio">
                    <span class="precio-anterior">${formatearPrecio(producto.price)}</span>
                    <span class="precio-actual">${formatearPrecio(producto.promotional_price)}</span>
                </div>`;
        } else if (producto.price) {
            precioHtml = `<div class="producto-precio"><span class="precio-actual">${formatearPrecio(producto.price)}</span></div>`;
        }

        const stockBadge = producto.has_stock
            ? ''
            : '<span class="producto-badge sin-stock">Sin stock</span>';

        const categoriaBadge = categoria
            ? `<span class="producto-categoria">${categoria}</span>`
            : '';

        const whatsappUrl = `https://wa.me/543417551501?text=${encodeURIComponent(`Hola, me interesa el producto: ${producto.name}`)}`;
        const tiendaBtn = producto.url
            ? `<a href="${escaparHtml(producto.url)}" class="btn-tiendanube" target="_blank" rel="noopener noreferrer">Ver en tienda</a>`
            : '';

        card.innerHTML = `
            <div class="producto-media">
                ${imagenHtml}
                ${stockBadge}
            </div>
            <div class="producto-body">
                ${categoriaBadge}
                <h3>${titulo}</h3>
                ${precioHtml}
                ${descripcion ? `<p>${descripcion}</p>` : ''}
            </div>
            <div class="producto-acciones">
                <a href="${whatsappUrl}" class="btn-consultar" target="_blank" rel="noopener noreferrer">Consultar</a>
                ${tiendaBtn}
            </div>
        `;
        return card;
    }

    function renderizarSiguientes() {
        const siguientes = productosFiltrados.slice(mostrados, mostrados + PAGE_SIZE);
        for (const producto of siguientes) {
            catalogoContainer.appendChild(crearTarjetaProducto(producto));
        }
        mostrados += siguientes.length;

        if (productosFiltrados.length === 0) {
            estadoEl.textContent = 'No se encontraron productos con esos filtros.';
            verMasBtn.hidden = true;
        } else {
            estadoEl.textContent = `Mostrando ${mostrados} de ${productosFiltrados.length} productos`;
            verMasBtn.hidden = mostrados >= productosFiltrados.length;
        }
    }

    function aplicarFiltros() {
        const texto = (buscarInput?.value || '').trim().toLowerCase();
        const categoria = categoriaSelect?.value || '';
        const soloStock = soloStockCheckbox ? soloStockCheckbox.checked : true;

        productosFiltrados = todosLosProductos.filter((p) => {
            if (soloStock && !p.has_stock) return false;
            if (categoria && !(p.categories || []).includes(categoria)) return false;
            if (texto) {
                const hayMatch =
                    (p.name || '').toLowerCase().includes(texto) ||
                    (p.description || '').toLowerCase().includes(texto) ||
                    (p.categories || []).some((c) => c.toLowerCase().includes(texto));
                if (!hayMatch) return false;
            }
            return true;
        });

        catalogoContainer.innerHTML = '';
        mostrados = 0;
        renderizarSiguientes();
    }

    function poblarCategorias(productos) {
        if (!categoriaSelect) return;
        const categorias = new Set();
        for (const p of productos) {
            for (const c of p.categories || []) {
                categorias.add(c);
            }
        }
        const ordenadas = Array.from(categorias).sort((a, b) => a.localeCompare(b, 'es'));
        for (const cat of ordenadas) {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categoriaSelect.appendChild(opt);
        }
    }

    async function cargarProductos() {
        try {
            const response = await fetch('./data/catalogo.json');
            if (!response.ok) {
                throw new Error('No se pudieron cargar los productos del catálogo.');
            }
            const data = await response.json();
            todosLosProductos = Array.isArray(data.products) ? data.products : [];

            if (todosLosProductos.length === 0) {
                catalogoContainer.innerHTML = '<p>No hay productos en el catálogo en este momento. ¡Vuelve pronto!</p>';
                return;
            }

            poblarCategorias(todosLosProductos);
            aplicarFiltros();
        } catch (error) {
            console.error('Error:', error);
            catalogoContainer.innerHTML = '<p>Error al cargar el catálogo. Intenta de nuevo más tarde.</p>';
        }
    }

    if (catalogoContainer) {
        buscarInput?.addEventListener('input', aplicarFiltros);
        categoriaSelect?.addEventListener('change', aplicarFiltros);
        soloStockCheckbox?.addEventListener('change', aplicarFiltros);
        verMasBtn?.addEventListener('click', renderizarSiguientes);
        cargarProductos();
    }
});
