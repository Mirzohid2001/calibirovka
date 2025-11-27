/**
 * Product Selection Page JavaScript
 * Выбор продуктов и ввод параметров
 */

class ProductSelection {
    constructor() {
        this.selectedProducts = {};
        this.csrftoken = this.getCookie('csrftoken');
        this.initializeElements();
        this.attachEventListeners();
    }
    
    async init() {
        console.log('init() вызван');
        const urlParams = new URLSearchParams(window.location.search);
        const configId = urlParams.get('load_config');
        console.log('init() - configId:', configId);
        
        if (configId) {
            console.log('configId найден, очищаем localStorage и начинаем загрузку из URL');
            // URL dan yuklashdan oldin localStorage ni tozalaymiz
            localStorage.removeItem('gasoline_blend_products');
            this.selectedProducts = {};
            
            // URL dan konfiguratsiya yuklash
            const loaded = await this.loadFromURL();
            console.log('init() - loaded:', loaded);
            if (!loaded) {
                console.log('Загрузка из URL не удалась, загружаем из localStorage');
                // Xatolik bo'lsa yoki yuklanmagan bo'lsa, localStorage dan yuklaymiz
                this.loadFromLocalStorage();
            }
        } else {
            console.log('configId не найден, загружаем из localStorage');
            // URL parametr yo'q bo'lsa, localStorage dan yuklaymiz
            this.loadFromLocalStorage();
        }
    }

    initializeElements() {
        this.productSelect = document.getElementById('product-select');
        this.selectedProductsList = document.getElementById('selected-products-list');
        this.configNameInput = document.getElementById('config-name');
        this.saveBtn = document.getElementById('save-products-btn');
        this.continueBtn = document.getElementById('continue-btn');
    }

    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    attachEventListeners() {
        if (this.productSelect) {
            this.productSelect.addEventListener('change', () => this.handleProductSelect());
        }

        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.handleSaveConfiguration());
        }

        if (this.continueBtn) {
            this.continueBtn.addEventListener('click', () => this.handleContinue());
        }
    }

    handleProductSelect() {
        const option = this.productSelect.options[this.productSelect.selectedIndex];
        if (!option.value) return;

        const productId = option.value;
        const productName = option.dataset.name;
        const productDescription = option.dataset.description || '';
        const productGost = parseFloat(option.dataset.gost) || 100;

        if (this.selectedProducts[productId]) {
            this.showNotification('Этот продукт уже добавлен!', 'warning');
            this.productSelect.value = '';
            return;
        }

        this.selectedProducts[productId] = {
            name: productName,
            description: productDescription,
            gost_percentage: productGost,
            octane: '',
            price: ''
        };

        this.updateSelectedProductsList();
        this.productSelect.value = '';
        this.saveToLocalStorage();
    }

    updateSelectedProductsList() {
        if (!this.selectedProductsList) return;

        if (Object.keys(this.selectedProducts).length === 0) {
            this.selectedProductsList.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-3 mb-0">Не выбрано ни одного продукта</p>
                    <small class="text-muted">Добавьте продукты, используя форму выше</small>
                </div>
            `;
            if (this.continueBtn) this.continueBtn.disabled = true;
            return;
        }

        // Desktop: jadval, Mobile: card layout
        // Desktop view
        let html = '<div class="d-none d-md-block"><div class="table-responsive"><table class="table table-bordered table-hover">';
        html += '<thead class="table-light"><tr>';
        html += '<th width="25%">Название продукта</th>';
        html += '<th width="15%">GOST процент (%)</th>';
        html += '<th width="20%">Октановое число *</th>';
        html += '<th width="20%">Цена (сум/кг) *</th>';
        html += '<th width="20%">Действия</th>';
        html += '</tr></thead><tbody>';

        for (const [productId, product] of Object.entries(this.selectedProducts)) {
            html += `<tr data-product-id="${productId}">`;
            html += `<td><strong>${this.escapeHtml(product.name)}</strong>`;
            if (product.description) {
                html += `<br><small class="text-muted">${this.escapeHtml(product.description)}</small>`;
            }
            html += `</td>`;
            html += `<td><span class="badge bg-info">${product.gost_percentage}%</span></td>`;
            html += `<td>
                <input type="number" 
                       class="form-control form-control-sm product-octane" 
                       data-product-id="${productId}"
                       placeholder="Например: 92"
                       value="${product.octane}"
                       min="0"
                       step="0.1"
                       required>
            </td>`;
            html += `<td>
                <input type="number" 
                       class="form-control form-control-sm product-price" 
                       data-product-id="${productId}"
                       placeholder="Например: 12000"
                       value="${product.price}"
                       min="0"
                       step="0.01"
                       required>
            </td>`;
            html += `<td>
                <button type="button" class="btn btn-sm btn-danger remove-product" data-product-id="${productId}">
                    <i class="bi bi-trash"></i> Удалить
                </button>
            </td>`;
            html += `</tr>`;
        }

        html += '</tbody></table></div></div>';
        
        // Mobile view: Card layout
        html += '<div class="d-md-none">';
        for (const [productId, product] of Object.entries(this.selectedProducts)) {
            html += `<div class="card mb-3 shadow-sm border-0 product-mobile-card" data-product-id="${productId}">`;
            html += '<div class="card-body p-3">';
            html += '<div class="d-flex justify-content-between align-items-start mb-3">';
            html += `<div class="flex-grow-1">
                <h6 class="card-title mb-1 fw-bold">${this.escapeHtml(product.name)}</h6>`;
            if (product.description) {
                html += `<small class="text-muted d-block">${this.escapeHtml(product.description)}</small>`;
            }
            html += `</div>`;
            html += `<span class="badge bg-info ms-2">${product.gost_percentage}%</span>`;
            html += `<button type="button" class="btn btn-sm btn-danger remove-product ms-2" data-product-id="${productId}">
                <i class="bi bi-trash"></i>
            </button>`;
            html += '</div>';
            
            html += '<div class="row g-3">';
            html += `<div class="col-6">
                <label class="form-label small mb-1 fw-bold">Октановое число *</label>
                <input type="number" 
                       class="form-control product-octane" 
                       data-product-id="${productId}"
                       placeholder="Например: 92"
                       value="${product.octane}"
                       min="0"
                       step="0.1"
                       required>
            </div>`;
            html += `<div class="col-6">
                <label class="form-label small mb-1 fw-bold">Цена (сум/кг) *</label>
                <input type="number" 
                       class="form-control product-price" 
                       data-product-id="${productId}"
                       placeholder="Например: 12000"
                       value="${product.price}"
                       min="0"
                       step="0.01"
                       required>
            </div>`;
            html += '</div>';
            html += '</div></div>';
        }
        html += '</div>';
        
        html += '<small class="text-muted d-block mt-2">* - обязательные поля</small>';

        this.selectedProductsList.innerHTML = html;
        this.attachProductInputListeners();
        this.checkContinueButton();
    }

    attachProductInputListeners() {
        this.selectedProductsList.querySelectorAll('.product-octane, .product-price').forEach(input => {
            input.addEventListener('input', (e) => {
                const productId = e.target.dataset.productId;
                if (e.target.classList.contains('product-octane')) {
                    this.selectedProducts[productId].octane = e.target.value;
                } else {
                    this.selectedProducts[productId].price = e.target.value;
                }
                this.saveToLocalStorage();
                this.checkContinueButton();
            });
        });

        this.selectedProductsList.querySelectorAll('.remove-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const button = e.target.closest('.remove-product');
                const productId = button.dataset.productId;
                delete this.selectedProducts[productId];
                this.updateSelectedProductsList();
                this.saveToLocalStorage();
            });
        });
    }

    checkContinueButton() {
        if (!this.continueBtn) return;

        let validProductsCount = 0;
        for (const [productId, product] of Object.entries(this.selectedProducts)) {
            const octane = parseFloat(product.octane);
            const price = parseFloat(product.price);
            if (octane > 0 && price > 0) {
                validProductsCount++;
            }
        }

        this.continueBtn.disabled = validProductsCount < 2;
    }

    handleContinue() {
        // Product ma'lumotlarini tekshirish
        let validProductsCount = 0;
        const productsData = {};

        for (const [productId, product] of Object.entries(this.selectedProducts)) {
            const octane = parseFloat(product.octane);
            const price = parseFloat(product.price);

            if (octane > 0 && price > 0) {
                productsData[productId] = {
                    octane: octane,
                    price: price,
                    gost_percentage: product.gost_percentage || 100,
                    name: product.name
                };
                validProductsCount++;
            }
        }

        if (validProductsCount < 2) {
            this.showNotification('Введите октановое число и цену хотя бы для 2 продуктов!', 'warning');
            return;
        }

        // LocalStorage ga saqlash
        this.saveToLocalStorage();

        // Kalkulyator sahifasiga o'tish
        window.location.href = CALCULATOR_URL;
    }

    async handleSaveConfiguration() {
        if (Object.keys(this.selectedProducts).length === 0) {
            this.showNotification('Для сохранения добавьте хотя бы один продукт!', 'warning');
            return;
        }

        const productsToSave = {};
        let hasValidData = false;

        for (const [productId, product] of Object.entries(this.selectedProducts)) {
            const octane = parseFloat(product.octane);
            const price = parseFloat(product.price);

            if (octane > 0 && price > 0) {
                productsToSave[productId] = {
                    octane: octane,
                    price: price,
                    gost_percentage: product.gost_percentage || 100,
                    name: product.name
                };
                hasValidData = true;
            }
        }

        if (!hasValidData) {
            this.showNotification('Для сохранения введите октановое число и цену хотя бы для одного продукта!', 'warning');
            return;
        }

        const configName = this.configNameInput.value.trim() || 
                          `Конфигурация ${new Date().toLocaleDateString('ru-RU')}`;

        const saveData = {
            name: configName,
            products: productsToSave,
            description: ''
        };

        try {
            const response = await fetch(SAVE_CONFIG_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrftoken
                },
                body: JSON.stringify(saveData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(result.message || 'Конфигурация успешно сохранена!', 'success');
            } else {
                this.showNotification('Ошибка: ' + (result.error || 'Неизвестная ошибка'), 'danger');
            }
        } catch (error) {
            this.showNotification('Ошибка сервера: ' + error.message, 'danger');
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('gasoline_blend_products', JSON.stringify(this.selectedProducts));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('gasoline_blend_products');
            if (saved) {
                this.selectedProducts = JSON.parse(saved);
                this.updateSelectedProductsList();
            } else {
                this.updateSelectedProductsList();
            }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            this.updateSelectedProductsList();
        }
    }

    async loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const configId = urlParams.get('load_config');
        
        console.log('loadFromURL вызван. URL параметры:', window.location.search);
        console.log('configId из URL:', configId);
        console.log('LOAD_CONFIG_URL:', typeof LOAD_CONFIG_URL !== 'undefined' ? LOAD_CONFIG_URL : 'не определен');
        
        if (!configId) {
            console.log('configId не найден, возвращаем false');
            return false; // URL parametr yo'q, yuklanmadi
        }

        try {
            if (typeof LOAD_CONFIG_URL === 'undefined' || !LOAD_CONFIG_URL) {
                console.error('LOAD_CONFIG_URL не определен');
                if (window.showNotification) {
                    window.showNotification('Ошибка: URL загрузки не определен', 'error');
                }
                return false;
            }
            
            const loadUrl = LOAD_CONFIG_URL.replace('0', configId);
            console.log('Сформированный URL для загрузки:', loadUrl);

            const response = await fetch(loadUrl, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': this.csrftoken
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Результат загрузки:', result);

            if (result.success && result.products) {
                const loadedProducts = {};
                let loadedCount = 0;

                for (const [productId, p_data] of Object.entries(result.products)) {
                    const productOption = document.querySelector(`#product-select option[value="${productId}"]`);
                    if (productOption) {
                        loadedProducts[productId] = {
                            name: productOption.dataset.name || p_data.name || 'Продукт',
                            description: productOption.dataset.description || '',
                            gost_percentage: p_data.gost_percentage || parseFloat(productOption.dataset.gost) || 100,
                            octane: p_data.octane ? String(p_data.octane) : '',
                            price: p_data.price ? String(p_data.price) : ''
                        };
                        loadedCount++;
                    } else {
                        console.warn(`Продукт с ID ${productId} не найден в списке продуктов`);
                    }
                }

                if (loadedCount === 0) {
                    const errorMsg = 'Ошибка: Продукты из конфигурации не найдены в системе. Возможно, продукты были удалены.';
                    console.error(errorMsg);
                    if (window.showNotification) {
                        window.showNotification(errorMsg, 'error');
                    } else {
                        alert(errorMsg);
                    }
                    // URL dan parametrni olib tashlash
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return false;
                }

                // Konfiguratsiyani yuklash - localStorage dan oldin
                this.selectedProducts = loadedProducts;
                if (result.name && this.configNameInput) {
                    this.configNameInput.value = result.name;
                }
                this.updateSelectedProductsList();
                this.saveToLocalStorage();

                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Yuklashdan keyin continue tugmasini faollashtirish
                this.checkContinueButton();
                if (window.showNotification) {
                    window.showNotification(`Конфигурация "${result.name || 'Без названия'}" успешно загружена! Загружено продуктов: ${loadedCount}`, 'success');
                }
                return true; // Muvaffaqiyatli yuklandi
            } else {
                const errorMsg = result.error || 'Неизвестная ошибка при загрузке конфигурации';
                console.error('Ошибка загрузки конфигурации:', errorMsg);
                if (window.showNotification) {
                    window.showNotification('Ошибка: ' + errorMsg, 'error');
                }
                return false;
            }
        } catch (error) {
            console.error('Ошибка загрузки конфигурации:', error);
            if (window.showNotification) {
                window.showNotification('Ошибка загрузки конфигурации: ' + error.message, 'error');
            } else {
                alert('Ошибка загрузки конфигурации: ' + error.message);
            }
            return false;
        }
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Sahifa yuklanganda ishga tushirish
document.addEventListener('DOMContentLoaded', async function() {
    if (document.getElementById('product-select')) {
        window.productSelection = new ProductSelection();
        // Konfiguratsiya yuklash (agar URL da parametr bo'lsa)
        await window.productSelection.init();
    }
});


