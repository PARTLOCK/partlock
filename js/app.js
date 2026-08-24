document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // НАЛАШТУВАННЯ КОНТАКТІВ (ЗМІНІТЬ НА СВОЇ)
    // ==========================================
    const CONFIG = {
        telegramUser: '@KEFFIR123', // Ваш юзернейм в Telegram (без @ та https://t.me/)
        viberNumber: '+380969265652'      // Ваш номер у Viber (з кодом країни +380)
    };
    // ==========================================

    let products = [];
    let currentSelectedProduct = null;

    // Спільні елементи модального вікна
    const modal = document.getElementById('orderModal');
    const closeModalBtn = document.getElementById('closeModal');
    const modalProductName = document.getElementById('modalProductName');
    const modalProductOem = document.getElementById('modalProductOem');
    const modalQuantity = document.getElementById('modalQuantity');
    const btnTg = document.getElementById('btnTg');
    const btnViber = document.getElementById('btnViber');

    // Кнопки на інших сторінках
    const customOrderTg = document.getElementById('customOrderTg');
    const customOrderViber = document.getElementById('customOrderViber');
    const contactTg = document.getElementById('contactTg');
    const contactViber = document.getElementById('contactViber');

    // Біндинг простих кнопок контактів
    const bindSimpleButton = (btn, type, text) => {
        if(btn) btn.addEventListener('click', () => {
            const msg = encodeURIComponent(text);
            if(type === 'tg') window.open(`https://t.me/${CONFIG.telegramUser}?text=${msg}`, '_blank');
            if(type === 'vb') window.open(`viber://chat?number=${CONFIG.viberNumber}&draft=${msg}`, '_blank');
        });
    };

    bindSimpleButton(customOrderTg, 'tg', 'Доброго дня! Потрібна деталь під замовлення. [Прикріпіть фото або опишіть сюди]');
    bindSimpleButton(customOrderViber, 'vb', 'Доброго дня! Потрібна деталь під замовлення. [Прикріпіть фото або опишіть сюди]');
    bindSimpleButton(contactTg, 'tg', 'Доброго дня! Маю питання щодо співпраці.');
    bindSimpleButton(contactViber, 'vb', 'Доброго дня! Маю питання щодо співпраці.');

    // Завантаження бази даних, якщо ми на сторінках каталогу або товару
    if (document.getElementById('productGrid') || document.getElementById('productContainer')) {
        fetch('data/products.json')
            .then(res => {
                if (!res.ok) throw new Error('Помилка завантаження JSON');
                return res.json();
            })
            .then(data => {
                products = data;
                if (document.getElementById('productGrid')) initCatalog();
                if (document.getElementById('productContainer')) initProductPage();
            })
            .catch(err => {
                console.error(err);
                const grid = document.getElementById('productGrid');
                if(grid) grid.innerHTML = '<p class="empty-state">Помилка завантаження бази товарів. Перевірте файл products.json.</p>';
            });
    }

    // --- Логіка Каталогу ---
    function initCatalog() {
        const grid = document.getElementById('productGrid');
        const searchInput = document.getElementById('searchInput');
        const sortSelect = document.getElementById('sortSelect');
        const resultCount = document.getElementById('resultCount');
        const brandFiltersContainer = document.getElementById('brandFilters');
        const categoryFiltersContainer = document.getElementById('categoryFilters');
        const resetFiltersBtn = document.getElementById('resetFilters');
        
        // Mobile Sidebar
        const mobileFilterBtn = document.getElementById('mobileFilterBtn');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const closeSidebarBtn = document.getElementById('closeSidebarBtn');

        // Автогенерація фільтрів
        const brands = [...new Set(products.map(p => p.brand))].sort();
        const categories = [...new Set(products.map(p => p.category))].sort();

        const createCheckbox = (value, name, container) => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" name="${name}" value="${value}"> ${value}`;
            container.appendChild(label);
        };
        brands.forEach(b => createCheckbox(b, 'brand', brandFiltersContainer));
        categories.forEach(c => createCheckbox(c, 'category', categoryFiltersContainer));

        function renderCatalog() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const activeBrands = Array.from(document.querySelectorAll('input[name="brand"]:checked')).map(cb => cb.value);
            const activeCategories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
            const sortValue = sortSelect.value;

            // Фільтрація
            let filtered = products.filter(p => {
                const searchMatch = !searchTerm || 
                    p.name.toLowerCase().includes(searchTerm) || 
                    p.oem.toLowerCase().includes(searchTerm) ||
                    p.brand.toLowerCase().includes(searchTerm) ||
                    p.category.toLowerCase().includes(searchTerm) ||
                    p.compatibility.some(c => c.toLowerCase().includes(searchTerm));

                const brandMatch = activeBrands.length === 0 || activeBrands.includes(p.brand);
                const categoryMatch = activeCategories.length === 0 || activeCategories.includes(p.category);
                return searchMatch && brandMatch && categoryMatch;
            });

            // Сортування
            if (sortValue === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
            else if (sortValue === 'price_asc') filtered.sort((a, b) => calculateUnitMinPrice(a.prices) - calculateUnitMinPrice(b.prices));
            else if (sortValue === 'new') filtered.reverse();

            // Відображення
            resultCount.innerText = `Знайдено: ${filtered.length}`;
            grid.innerHTML = '';

            if (filtered.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <h3>Нічого не знайдено</h3>
                        <p>Надішліть нам артикул — ми знайдемо деталь під замовлення.</p>
                        <a href="custom-order.html" class="btn btn-primary">Надіслати запит</a>
                    </div>`;
                return;
            }

            filtered.forEach(p => {
                const minPrice = calculateUnitMinPrice(p.prices).toFixed(2);
                const priceText = minPrice > 0 ? `від ${minPrice.replace('.', ',')} грн/шт` : 'Ціна за запитом';

                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <a href="product.html?id=${p.id}" style="text-decoration: none; color: inherit; flex-grow: 1; display: flex; flex-direction: column;">
                        <img src="${p.img}" alt="${p.name}" class="product-img">
                        <div class="product-name">${p.name}</div>
                        <div class="product-oem">${p.oem}</div>
                        <div class="product-details">
                            <p>Марка: ${p.brand}</p>
                            <p>Мін. партія: ${p.minQuantity} шт</p>
                        </div>
                        <div class="product-price">${priceText}</div>
                    </a>
                    <button class="btn btn-outline w-100 btn-ask-price" data-id="${p.id}">Запитати ціну</button>
                `;
                grid.appendChild(card);
            });

            document.querySelectorAll('.btn-ask-price').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    openModal(e.target.getAttribute('data-id'));
                });
            });
        }

        searchInput.addEventListener('input', renderCatalog);
        sortSelect.addEventListener('change', renderCatalog);
        brandFiltersContainer.addEventListener('change', renderCatalog);
        categoryFiltersContainer.addEventListener('change', renderCatalog);
        resetFiltersBtn.addEventListener('click', () => {
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            searchInput.value = '';
            sortSelect.value = 'recommended';
            renderCatalog();
        });

        const toggleSidebar = () => { sidebar.classList.toggle('open'); sidebarOverlay.classList.toggle('active'); };
        mobileFilterBtn.addEventListener('click', toggleSidebar);
        closeSidebarBtn.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);

        renderCatalog();
    }

    // --- Логіка Сторінки Товару ---
    function initProductPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        const product = products.find(p => p.id === productId);

        if (!product) {
            document.getElementById('productContainer').innerHTML = `
                <div class="empty-state">
                    <h3>Товар не знайдено</h3>
                    <a href="catalog.html" class="btn btn-primary mt-20">В каталог</a>
                </div>`;
            return;
        }

        document.title = `${product.name} ${product.oem} | PARTLOCK`;
        document.getElementById('bcCategory').innerText = product.category;
        document.getElementById('bcName').innerText = product.name;
        document.getElementById('pdImg').src = product.img;
        document.getElementById('pdName').innerText = product.name;
        document.getElementById('pdOem').innerText = product.oem;
        document.getElementById('pdBrand').innerText = product.brand;
        document.getElementById('pdCategory').innerText = product.category;
        document.getElementById('pdCompatibility').innerText = product.compatibility.join(', ');
        document.getElementById('pdMinQty').innerText = product.minQuantity;

        const pricesList = document.getElementById('pdPricesList');
        for (const [qty, total] of Object.entries(product.prices)) {
            const unitPrice = (total / parseInt(qty)).toFixed(2).replace('.', ',');
            const li = document.createElement('li');
            li.innerHTML = `<span>Від ${qty} шт</span> <strong>${unitPrice} грн/шт</strong>`;
            pricesList.appendChild(li);
        }

        document.getElementById('pdAskPriceBtn').addEventListener('click', () => openModal(product.id));
    }

    // --- Спільні функції ---
    function calculateUnitMinPrice(pricesObj) {
        let minUnitPrice = Infinity;
        for (const [qty, total] of Object.entries(pricesObj)) {
            const unit = total / parseInt(qty);
            if (unit < minUnitPrice) minUnitPrice = unit;
        }
        return minUnitPrice === Infinity ? 0 : minUnitPrice;
    }

    function openModal(id) {
        currentSelectedProduct = products.find(p => p.id === id);
        if (!currentSelectedProduct) return;
        modalProductName.innerText = currentSelectedProduct.name;
        modalProductOem.innerText = currentSelectedProduct.oem;
        modalQuantity.value = currentSelectedProduct.minQuantity;
        modal.classList.add('active');
    }

    function closeModal() {
        if(modal) modal.classList.remove('active');
        currentSelectedProduct = null;
    }

    function generateOrderMessage() {
        const qty = modalQuantity.value || currentSelectedProduct.minQuantity;
        return `Доброго дня! Цікавить ${currentSelectedProduct.name}, OEM ${currentSelectedProduct.oem}. Потрібно ${qty} шт. Прошу надати оптову ціну.`;
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    if (btnTg) btnTg.addEventListener('click', () => {
        window.open(`https://t.me/${CONFIG.telegramUser}?text=${encodeURIComponent(generateOrderMessage())}`, '_blank');
        closeModal();
    });

    if (btnViber) btnViber.addEventListener('click', () => {
        window.open(`viber://chat?number=${CONFIG.viberNumber}&draft=${encodeURIComponent(generateOrderMessage())}`, '_blank');
        closeModal();
    });
});
