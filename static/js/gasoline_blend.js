/**
 * Benzin aralashma kalkulyatori JavaScript
 * Productlarni tanlash, parametrlarni kiritish, hisoblash
 */

class GasolineBlendCalculator {
    constructor() {
        this.selectedProducts = {};
        this.selectedOctane = null;
        this.csrftoken = this.getCookie('csrftoken');
        this.initializeElements();
        this.loadFromLocalStorage();
        this.loadFromURL();
        this.attachEventListeners();
    }

    initializeElements() {
        // Asosiy elementlar
        this.productSelect = document.getElementById('product-select');
        this.selectedProductsList = document.getElementById('selected-products-list');
        this.configNameInput = document.getElementById('config-name');
        this.saveBtn = document.getElementById('save-products-btn');
        this.totalWeightInput = document.getElementById('total-weight');
        this.customOctaneInput = document.getElementById('custom-octane');
        this.customOctaneContainer = document.getElementById('custom-octane-input');
        this.calculateBtn = document.getElementById('calculate-btn');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.errorMessage = document.getElementById('error-message');
        this.resultsContainer = document.getElementById('results-container');
        this.variantsList = document.getElementById('variants-list');
        this.resultsHeader = document.getElementById('results-header');
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
        // Product tanlash
        if (this.productSelect) {
            this.productSelect.addEventListener('change', () => this.handleProductSelect());
        }

        // Oktan knopkalari
        document.querySelectorAll('.octane-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleOctaneButtonClick(e));
        });

        // Custom oktan
        const customOctaneBtn = document.getElementById('custom-octane-btn');
        if (customOctaneBtn) {
            customOctaneBtn.addEventListener('click', () => this.handleCustomOctaneClick());
        }

        if (this.customOctaneInput) {
            this.customOctaneInput.addEventListener('change', () => this.handleCustomOctaneChange());
        }

        // Saqlash
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.handleSaveConfiguration());
        }

        // Hisobla
        if (this.calculateBtn) {
            this.calculateBtn.addEventListener('click', () => this.handleCalculate());
        }
    }

    handleProductSelect() {
        const option = this.productSelect.options[this.productSelect.selectedIndex];
        if (!option.value) return;

        const productId = option.value;
        const productName = option.dataset.name;
        const productDescription = option.dataset.description || '';
        const productGost = parseFloat(option.dataset.gost) || 100;

        // Agar allaqachon qo'shilgan bo'lsa
        if (this.selectedProducts[productId]) {
            this.showNotification('Bu product allaqachon qo\'shilgan!', 'warning');
            this.productSelect.value = '';
            return;
        }

        // Productni qo'shish
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
            this.selectedProductsList.innerHTML = '<p class="text-muted text-center py-3">Hech qanday product tanlanmagan</p>';
            return;
        }

        let html = '<div class="table-responsive"><table class="table table-bordered table-hover">';
        html += '<thead class="table-light"><tr>';
        html += '<th width="25%">Product nomi</th>';
        html += '<th width="15%">GOST foizi (%)</th>';
        html += '<th width="20%">Oktan soni *</th>';
        html += '<th width="20%">Narx (so\'m/kg) *</th>';
        html += '<th width="20%">Harakatlar</th>';
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
                       class="form-control product-octane" 
                       data-product-id="${productId}"
                       placeholder="Masalan: 92"
                       value="${product.octane}"
                       min="0"
                       step="0.1"
                       required>
            </td>`;
            html += `<td>
                <input type="number" 
                       class="form-control product-price" 
                       data-product-id="${productId}"
                       placeholder="Masalan: 12000"
                       value="${product.price}"
                       min="0"
                       step="0.01"
                       required>
            </td>`;
            html += `<td>
                <button type="button" class="btn btn-sm btn-danger remove-product" data-product-id="${productId}">
                    <i class="bi bi-trash"></i> O'chirish
                </button>
            </td>`;
            html += `</tr>`;
        }

        html += '</tbody></table></div>';
        html += '<small class="text-muted">* - majburiy maydonlar</small>';

        this.selectedProductsList.innerHTML = html;

        // Event listenerlarni qo'shish
        this.attachProductInputListeners();
    }

    attachProductInputListeners() {
        // Oktan va narx inputlari
        this.selectedProductsList.querySelectorAll('.product-octane, .product-price').forEach(input => {
            input.addEventListener('input', (e) => {
                const productId = e.target.dataset.productId;
                if (e.target.classList.contains('product-octane')) {
                    this.selectedProducts[productId].octane = e.target.value;
                } else {
                    this.selectedProducts[productId].price = e.target.value;
                }
                this.saveToLocalStorage();
            });
        });

        // O'chirish knopkalari
        this.selectedProductsList.querySelectorAll('.remove-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('.remove-product').dataset.productId;
                delete this.selectedProducts[productId];
                this.updateSelectedProductsList();
                this.saveToLocalStorage();
            });
        });
    }

    handleOctaneButtonClick(event) {
        document.querySelectorAll('.octane-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
        this.selectedOctane = parseInt(event.target.dataset.targetOctane);
        if (this.customOctaneContainer) {
            this.customOctaneContainer.style.display = 'none';
        }
    }

    handleCustomOctaneClick() {
        document.querySelectorAll('.octane-btn').forEach(b => b.classList.remove('active'));
        if (this.customOctaneContainer) {
            this.customOctaneContainer.style.display = 'block';
            if (this.customOctaneInput) {
                this.customOctaneInput.focus();
            }
        }
    }

    handleCustomOctaneChange() {
        const value = parseFloat(this.customOctaneInput.value);
        if (value > 0) {
            this.selectedOctane = value;
        }
    }

    async handleSaveConfiguration() {
        if (Object.keys(this.selectedProducts).length === 0) {
            this.showNotification('Saqlash uchun kamida bitta product qo\'shing!', 'warning');
            return;
        }

        // Productlarni tayyorlash
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
            this.showNotification('Saqlash uchun kamida bitta productning oktan soni va narxini kiriting!', 'warning');
            return;
        }

        const configName = this.configNameInput.value.trim() || 
                          `Konfiguratsiya ${new Date().toLocaleDateString('ru-RU')}`;

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
                this.showNotification(result.message || 'Konfiguratsiya muvaffaqiyatli saqlandi!', 'success');
            } else {
                this.showNotification('Xatolik: ' + (result.error || 'Noma\'lum xatolik'), 'danger');
            }
        } catch (error) {
            this.showNotification('Server xatoligi: ' + error.message, 'danger');
        }
    }

    async handleCalculate() {
        if (!this.selectedOctane) {
            this.showNotification('Oktan sonini tanlang yoki kiriting!', 'warning');
            return;
        }

        // Product ma'lumotlarini yig'ish
        const productsData = {};
        let validProductsCount = 0;

        for (const [productId, product] of Object.entries(this.selectedProducts)) {
            const octane = parseFloat(product.octane);
            const price = parseFloat(product.price);

            if (octane > 0 && price > 0) {
                productsData[productId] = {
                    octane: octane,
                    price: price,
                    gost_percentage: product.gost_percentage || 100
                };
                validProductsCount++;
            }
        }

        if (validProductsCount < 2) {
            this.showNotification('Kamida 2 ta productning oktan soni va narxini kiriting!', 'warning');
            return;
        }

        // UI yangilash
        this.showLoading();

        // Ma'lumotlar yig'ish
        const totalWeight = this.totalWeightInput.value || null;

        const data = {
            target_octane: this.selectedOctane,
            variants_count: 5,
            products: productsData
        };

        if (totalWeight) {
            data.total_weight = parseFloat(totalWeight);
        }

        try {
            const response = await fetch(CALCULATE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrftoken
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            this.hideLoading();

            if (result.success) {
                this.displayResults(result);
            } else {
                this.showError(result.error || 'Xatolik yuz berdi');
            }
        } catch (error) {
            this.hideLoading();
            this.showError('Server xatoligi: ' + error.message);
        }
    }

    displayResults(result) {
        if (!this.variantsList || !this.resultsHeader) return;

        this.resultsHeader.textContent = `AI-${result.target_octane} uchun ${result.variants_count} ta variant topildi`;

        const categoryColors = {
            'eng_arzon': { bg: 'bg-success', text: 'text-white', border: 'border-success', label: 'Eng arzon' },
            'arzon': { bg: 'bg-info', text: 'text-white', border: 'border-info', label: 'Arzon' },
            'ortacha': { bg: 'bg-warning', text: 'text-dark', border: 'border-warning', label: 'O\'rtacha' },
            'qimmat': { bg: 'bg-orange', text: 'text-white', border: 'border-orange', label: 'Qimmat' },
            'juda_qimmat': { bg: 'bg-danger', text: 'text-white', border: 'border-danger', label: 'Juda qimmat' }
        };

        let html = '';

        result.variants.forEach((variant) => {
            const category = variant.category || 'ortacha';
            const categoryLabel = variant.category_label || 'O\'rtacha';
            const colors = categoryColors[category] || categoryColors['ortacha'];
            const pricePerKg = variant.final_price_per_kg || variant.final_price_per_liter || 0;

            html += `
                <div class="card mb-3 ${colors.border} border-2 shadow-sm">
                    <div class="card-header ${colors.bg} ${colors.text}">
                        <h5 class="mb-0">
                            <span class="badge ${colors.bg} ${colors.text} me-2">${categoryLabel}</span>
                            Variant ${variant.variant_number}
                            ${variant.gost_compliant ? 
                                '<span class="badge bg-success ms-2"><i class="bi bi-check-circle"></i> GOST</span>' : 
                                '<span class="badge bg-warning ms-2"><i class="bi bi-exclamation-triangle"></i> GOST emas</span>'
                            }
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <strong><i class="bi bi-123 me-1"></i>Oktan soni:</strong> 
                                <span class="fs-5 text-primary ms-2">${variant.final_octane}</span>
                                <small class="text-muted">(maqsad: ${result.target_octane})</small>
                            </div>
                            <div class="col-md-6">
                                <strong><i class="bi bi-cash-coin me-1"></i>Narx:</strong> 
                                <span class="fs-4 fw-bold text-success ms-2">${this.formatNumber(pricePerKg)} so'm/kg</span>
                            </div>
                        </div>
                        ${variant.total_price ? `
                            <div class="alert alert-info mb-3">
                                <strong>Jami narx:</strong> 
                                <span class="fs-5 ms-2">${this.formatNumber(variant.total_price)} so'm</span>
                            </div>
                        ` : ''}
                        <h6 class="mt-3 mb-2">
                            <i class="bi bi-list-ul me-2"></i>Kompozitsiya:
                        </h6>
                        <ul class="list-group">
                            ${variant.products.map(product => {
                                const productPrice = product.price_per_kg || product.price_per_liter || 0;
                                const productWeight = product.weight_kg || product.volume_liters || null;
                                
                                return `
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong>${this.escapeHtml(product.product_name)}</strong>
                                        <br>
                                        <small class="text-muted">
                                            Oktan: <strong>${product.octane}</strong> | 
                                            Foiz: <strong>${product.percentage}%</strong>
                                        </small>
                                    </div>
                                    <div class="text-end">
                                        <strong class="text-success">${this.formatNumber(productPrice)} so'm/kg</strong>
                                        ${productWeight ? 
                                            `<br><small class="text-muted">${this.formatNumber(productWeight)} kg</small>` : ''
                                        }
                                    </div>
                                </li>
                            `;
                            }).join('')}
                        </ul>
                        ${variant.gost_warnings && variant.gost_warnings.length > 0 ? `
                            <div class="alert alert-warning mt-3">
                                <strong><i class="bi bi-exclamation-triangle me-2"></i>Ogohlantirishlar:</strong>
                                <ul class="mb-0 mt-2">
                                    ${variant.gost_warnings.map(w => `<li>${this.escapeHtml(w)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        this.variantsList.innerHTML = html;
        this.resultsContainer.style.display = 'block';
        this.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showLoading() {
        if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';
        if (this.errorMessage) this.errorMessage.style.display = 'none';
        if (this.resultsContainer) this.resultsContainer.style.display = 'none';
        if (this.calculateBtn) this.calculateBtn.disabled = true;
    }

    hideLoading() {
        if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
        if (this.calculateBtn) this.calculateBtn.disabled = false;
    }

    showError(message) {
        if (this.errorMessage) {
            const errorText = this.errorMessage.querySelector('#error-text');
            if (errorText) {
                errorText.textContent = message;
            } else {
                this.errorMessage.textContent = message;
            }
            this.errorMessage.style.display = 'block';
        }
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    formatNumber(num) {
        return new Intl.NumberFormat('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        
        if (!configId) return;

        try {
            const response = await fetch(LOAD_CONFIG_URL.replace('0', configId), {
                method: 'GET',
                headers: {
                    'X-CSRFToken': this.csrftoken
                }
            });

            const result = await response.json();

            if (result.success && result.products) {
                const loadedProducts = {};

                for (const [productId, p_data] of Object.entries(result.products)) {
                    const productOption = document.querySelector(`#product-select option[value="${productId}"]`);
                    if (productOption) {
                        loadedProducts[productId] = {
                            name: productOption.dataset.name || p_data.name || 'Product',
                            description: productOption.dataset.description || '',
                            gost_percentage: p_data.gost_percentage || parseFloat(productOption.dataset.gost) || 100,
                            octane: p_data.octane ? String(p_data.octane) : '',
                            price: p_data.price ? String(p_data.price) : ''
                        };
                    }
                }

                this.selectedProducts = loadedProducts;
                if (result.name && this.configNameInput) {
                    this.configNameInput.value = result.name;
                }
                this.updateSelectedProductsList();
                this.saveToLocalStorage();

                // URL dan parametrni olib tashlash
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    }
}

// Sahifa yuklanganda ishga tushirish
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('product-select')) {
        window.gasolineBlendCalculator = new GasolineBlendCalculator();
    }
});

