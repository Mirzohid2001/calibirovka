/**
 * Gasoline Blend Calculator Page JavaScript
 * Выбор октана и расчет
 */

class GasolineBlendCalculator {
    constructor() {
        this.selectedProducts = {};
        this.selectedOctane = null;
        this.csrftoken = this.getCookie('csrftoken');
        
        console.log('GasolineBlendCalculator initialized');
        console.log('CSRF token:', this.csrftoken ? 'Found' : 'Not found');
        
        this.initializeElements();
        this.loadProductsFromLocalStorage();
        this.attachEventListeners();
    }

    initializeElements() {
        this.totalWeightInput = document.getElementById('total-weight');
        this.customOctaneInput = document.getElementById('custom-octane');
        this.customOctaneContainer = document.getElementById('custom-octane-input');
        this.calculateBtn = document.getElementById('calculate-btn');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.errorMessage = document.getElementById('error-message');
        this.resultsContainer = document.getElementById('results-container');
        this.variantsList = document.getElementById('variants-list');
        this.resultsHeader = document.getElementById('results-header');
        this.selectedProductsInfo = document.getElementById('selected-products-info');
        this.productsSummary = document.getElementById('products-summary');
        this.exportExcelBtn = document.getElementById('export-excel-btn');
        this.compareBtn = document.getElementById('compare-btn');
        this.selectedCountSpan = document.getElementById('selected-count');
        this.chartsContainer = document.getElementById('charts-container');
        this.priceOctaneChart = null; // Chart.js instance
        this.currentResult = null; // Hozirgi natijani saqlash
        this.selectedVariants = new Set(); // Tanlangan variantlarni saqlash
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
        // Excel export tugmasi
        if (this.exportExcelBtn) {
            this.exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        }
        
        // Solishtirish tugmasi
        if (this.compareBtn) {
            this.compareBtn.addEventListener('click', () => this.compareVariants());
        }
        
        // Oktan knopkalari - event delegation yoki to'g'ridan-to'g'ri event listener
        document.querySelectorAll('.octane-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleOctaneButtonClick(e);
            });
        });

        // Custom oktan
        const customOctaneBtn = document.getElementById('custom-octane-btn');
        if (customOctaneBtn) {
            customOctaneBtn.addEventListener('click', () => this.handleCustomOctaneClick());
        }

        if (this.customOctaneInput) {
            this.customOctaneInput.addEventListener('change', () => this.handleCustomOctaneChange());
        }

        // Hisobla
        if (this.calculateBtn) {
            this.calculateBtn.addEventListener('click', () => this.handleCalculate());
        }
    }

    loadProductsFromLocalStorage() {
        try {
            const saved = localStorage.getItem('gasoline_blend_products');
            console.log('Loading products from localStorage:', saved ? 'Found' : 'Not found');
            
            if (saved) {
                this.selectedProducts = JSON.parse(saved);
                console.log('Loaded products:', this.selectedProducts);
                this.displaySelectedProducts();
            } else {
                console.warn('No products found in localStorage');
                // Agar productlar yo'q bo'lsa, product selection sahifasiga yo'naltirish
                this.showNotification('Сначала выберите продукты!', 'warning');
                setTimeout(() => {
                    window.location.href = PRODUCT_SELECTION_URL || '/gasoline-blend/products/';
                }, 2000);
            }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            this.showError('Ошибка загрузки продуктов: ' + e.message);
        }
    }

    displaySelectedProducts() {
        if (!this.selectedProductsInfo || !this.productsSummary) return;

        const productCount = Object.keys(this.selectedProducts).length;
        if (productCount === 0) {
            this.selectedProductsInfo.style.display = 'none';
            return;
        }

        let validProductsCount = 0;
        let html = '<div class="table-responsive"><table class="table table-sm table-bordered">';
        html += '<thead class="table-light"><tr>';
        html += '<th>Продукт</th><th>GOST %</th><th>Октан</th><th>Цена (сум/кг)</th>';
        html += '</tr></thead><tbody>';

        for (const [productId, product] of Object.entries(this.selectedProducts)) {
            const octane = parseFloat(product.octane);
            const price = parseFloat(product.price);

            if (octane > 0 && price > 0) {
                html += '<tr>';
                html += `<td><strong>${this.escapeHtml(product.name)}</strong></td>`;
                html += `<td><span class="badge bg-info">${product.gost_percentage}%</span></td>`;
                html += `<td><span class="badge bg-secondary">${octane}</span></td>`;
                html += `<td class="text-success fw-bold">${this.formatNumber(price)}</td>`;
                html += '</tr>';
                validProductsCount++;
            }
        }

        html += '</tbody></table></div>';
        html += `<p class="mb-0 mt-2"><small class="text-muted">Всего: ${validProductsCount} продуктов выбрано</small></p>`;

        this.productsSummary.innerHTML = html;
        this.selectedProductsInfo.style.display = 'block';

        if (validProductsCount < 2) {
            this.showNotification('Введите октановое число и цену хотя бы для 2 продуктов!', 'warning');
        }
    }

    handleOctaneButtonClick(event) {
        // Tugmani topish (agar span ga bosilgan bo'lsa, parent tugmani olamiz)
        const button = event.currentTarget || event.target.closest('.octane-btn') || event.target;
        
        if (!button || !button.dataset || !button.dataset.targetOctane) {
            console.error('Button not found or missing data-target-octane attribute');
            return;
        }
        
        document.querySelectorAll('.octane-btn').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        
        const octaneValue = button.dataset.targetOctane;
        this.selectedOctane = parseInt(octaneValue);
        
        if (!this.selectedOctane || isNaN(this.selectedOctane)) {
            console.error('Invalid octane value:', octaneValue);
            return;
        }
        
        if (this.customOctaneContainer) {
            this.customOctaneContainer.style.display = 'none';
        }
        if (this.customOctaneInput) {
            this.customOctaneInput.value = '';
        }
        
        console.log('Selected octane:', this.selectedOctane);
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

    async handleCalculate() {
        console.log('Calculate button clicked');
        console.log('Selected octane:', this.selectedOctane);
        console.log('Selected products:', this.selectedProducts);

        if (!this.selectedOctane) {
            this.showNotification('Выберите или введите октановое число!', 'warning');
            return;
        }

        // Product ma'lumotlarini yig'ish
        const productsData = {};
        let validProductsCount = 0;

        for (const [productId, product] of Object.entries(this.selectedProducts)) {
            const octane = parseFloat(product.octane);
            const price = parseFloat(product.price);

            console.log(`Product ${productId}: octane=${octane}, price=${price}`);

            if (octane > 0 && price > 0) {
                productsData[productId] = {
                    octane: octane,
                    price: price,
                    gost_percentage: product.gost_percentage || 100
                };
                validProductsCount++;
            }
        }

        console.log('Valid products count:', validProductsCount);
        console.log('Products data:', productsData);

        if (validProductsCount < 2) {
            this.showNotification('Введите октановое число и цену хотя бы для 2 продуктов!', 'warning');
            return;
        }

        // UI yangilash
        this.showLoading();

        // Ma'lumotlar yig'ish
        const totalWeight = this.totalWeightInput ? this.totalWeightInput.value : null;

        const data = {
            target_octane: this.selectedOctane,
            variants_count: 5,
            products: productsData
        };

        if (totalWeight && totalWeight.trim() !== '') {
            const weight = parseFloat(totalWeight);
            if (!isNaN(weight) && weight > 0) {
                data.total_weight = weight;
            }
        }

        console.log('Sending calculation request:', data);
        console.log('CALCULATE_URL:', typeof CALCULATE_URL !== 'undefined' ? CALCULATE_URL : 'NOT DEFINED');

        if (typeof CALCULATE_URL === 'undefined') {
            this.showError('URL калькулятора не найден. Обновите страницу.');
            this.hideLoading();
            return;
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

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Calculation result:', result);
            
            this.hideLoading();

            if (result.success) {
                this.displayResults(result);
            } else {
                this.showError(result.error || 'Произошла ошибка');
            }
        } catch (error) {
            console.error('Calculation error:', error);
            this.hideLoading();
            this.showError('Ошибка сервера: ' + error.message);
        }
    }

    displayResults(result) {
        if (!this.variantsList || !this.resultsHeader) return;

        // Natijani saqlash (export uchun)
        this.currentResult = result;

        this.resultsHeader.textContent = `Для AI-${result.target_octane} найдено ${result.variants_count} вариантов`;

        const categoryColors = {
            'eng_arzon': { bg: 'bg-success', text: 'text-white', border: 'border-success', label: 'Самый дешевый' },
            'arzon': { bg: 'bg-info', text: 'text-white', border: 'border-info', label: 'Дешевый' },
            'ortacha': { bg: 'bg-warning', text: 'text-dark', border: 'border-warning', label: 'Средний' },
            'qimmat': { bg: 'bg-orange', text: 'text-white', border: 'border-orange', label: 'Дорогой' },
            'juda_qimmat': { bg: 'bg-danger', text: 'text-white', border: 'border-danger', label: 'Очень дорогой' }
        };

        let html = '';

        result.variants.forEach((variant, idx) => {
            const category = variant.category || 'ortacha';
            const categoryLabel = variant.category_label || 'Средний';
            const colors = categoryColors[category] || categoryColors['ortacha'];
            const pricePerKg = variant.final_price_per_kg || variant.final_price_per_liter || 0;
            const variantId = variant.variant_number || `variant-${idx}`;

            html += `
                <div class="card mb-3 ${colors.border} border-2 shadow-sm variant-card" data-variant-id="${variantId}">
                    <div class="card-header ${colors.bg} ${colors.text} d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <div class="form-check form-check-inline">
                                <input class="form-check-input variant-checkbox" type="checkbox" 
                                       id="variant-${variantId}" 
                                       value="${variantId}"
                                       data-variant-index="${idx}">
                                <label class="form-check-label text-white" for="variant-${variantId}">
                                    <span class="badge ${colors.bg} ${colors.text} me-2">${categoryLabel}</span>
                                    Variant ${variant.variant_number}
                                    ${variant.gost_compliant ? 
                                        '<span class="badge bg-success ms-2"><i class="bi bi-check-circle"></i> GOST</span>' : 
                                        '<span class="badge bg-warning ms-2"><i class="bi bi-exclamation-triangle"></i> Не соответствует ГОСТ</span>'
                                    }
                                </label>
                            </div>
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <strong><i class="bi bi-123 me-1"></i>Октановое число:</strong> 
                                <span class="fs-5 text-primary ms-2">${variant.final_octane}</span>
                                <small class="text-muted">(цель: ${result.target_octane})</small>
                            </div>
                            <div class="col-md-6">
                                <strong><i class="bi bi-cash-coin me-1"></i>Цена:</strong> 
                                <span class="fs-4 fw-bold text-success ms-2">${this.formatNumber(pricePerKg)} сум/кг</span>
                            </div>
                        </div>
                        ${variant.total_price ? `
                            <div class="alert alert-info mb-3">
                                <strong>Общая цена:</strong> 
                                <span class="fs-5 ms-2">${this.formatNumber(variant.total_price)} сум</span>
                            </div>
                        ` : ''}
                        <h6 class="mt-3 mb-2">
                            <i class="bi bi-list-ul me-2"></i>Состав:
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
                                            Октан: <strong>${product.octane}</strong> | 
                                            Процент: <strong>${product.percentage}%</strong>
                                        </small>
                                    </div>
                                    <div class="text-end">
                                        <strong class="text-success">${this.formatNumber(productPrice)} сум/кг</strong>
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
                                <strong><i class="bi bi-exclamation-triangle me-2"></i>Предупреждения:</strong>
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
        
        // Checkbox event listeners qo'shish
        this.attachVariantCheckboxListeners(result.variants);
        
        // Grafiklarni yaratish
        this.renderCharts(result.variants, result.target_octane);
        
        this.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    renderCharts(variants, targetOctane) {
        if (!variants || variants.length === 0 || typeof Chart === 'undefined') {
            return;
        }

        // Chart.js ma'lumotlarini tayyorlash
        const chartData = {
            labels: variants.map((v, idx) => `Variant ${v.variant_number || idx + 1}`),
            datasets: []
        };

        // Kategoriya ranglari
        const categoryColors = {
            'eng_arzon': { bg: 'rgba(40, 167, 69, 0.7)', border: 'rgba(40, 167, 69, 1)', label: 'Самый дешевый' },
            'arzon': { bg: 'rgba(23, 162, 184, 0.7)', border: 'rgba(23, 162, 184, 1)', label: 'Дешевый' },
            'ortacha': { bg: 'rgba(255, 193, 7, 0.7)', border: 'rgba(255, 193, 7, 1)', label: 'Средний' },
            'qimmat': { bg: 'rgba(255, 140, 0, 0.7)', border: 'rgba(255, 140, 0, 1)', label: 'Дорогой' },
            'juda_qimmat': { bg: 'rgba(220, 53, 69, 0.7)', border: 'rgba(220, 53, 69, 1)', label: 'Очень дорогой' }
        };

        // Oktan sonlari dataset
        const octaneData = {
            label: 'Октановое число',
            data: variants.map(v => v.final_octane || 0),
            backgroundColor: variants.map(v => {
                const category = v.category || 'ortacha';
                return categoryColors[category]?.bg || categoryColors['ortacha'].bg;
            }),
            borderColor: variants.map(v => {
                const category = v.category || 'ortacha';
                return categoryColors[category]?.border || categoryColors['ortacha'].border;
            }),
            borderWidth: 2,
            yAxisID: 'y'
        };

        // Narxlar dataset
        const priceData = {
            label: 'Цена (сум/кг)',
            data: variants.map(v => v.final_price_per_kg || v.final_price_per_liter || 0),
            backgroundColor: variants.map(v => {
                const category = v.category || 'ortacha';
                return categoryColors[category]?.bg || categoryColors['ortacha'].bg;
            }),
            borderColor: variants.map(v => {
                const category = v.category || 'ortacha';
                return categoryColors[category]?.border || categoryColors['ortacha'].border;
            }),
            borderWidth: 2,
            yAxisID: 'y1',
            type: 'line',
            tension: 0.1
        };

        // Eski grafikni yo'q qilish
        if (this.priceOctaneChart) {
            this.priceOctaneChart.destroy();
        }

        // Yangi grafik yaratish
        const ctx = document.getElementById('price-octane-chart');
        if (!ctx) {
            console.error('Chart canvas not found');
            return;
        }

        this.priceOctaneChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Variantlar',
                    data: variants.map((v, idx) => {
                        const octane = v.final_octane || 0;
                        const price = v.final_price_per_kg || v.final_price_per_liter || 0;
                        const category = v.category || 'ortacha';
                        return {
                            x: octane,
                            y: price,
                            variantNumber: v.variant_number || idx + 1,
                            category: category,
                            categoryLabel: v.category_label || 'Средний'
                        };
                    }),
                    backgroundColor: variants.map(v => {
                        const category = v.category || 'ortacha';
                        return categoryColors[category]?.bg || categoryColors['ortacha'].bg;
                    }),
                    borderColor: variants.map(v => {
                        const category = v.category || 'ortacha';
                        return categoryColors[category]?.border || categoryColors['ortacha'].border;
                    }),
                    borderWidth: 2,
                    pointRadius: 8,
                    pointHoverRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'График цены и октана',
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                return [
                                    `Variant ${point.variantNumber}: ${point.categoryLabel}`,
                                    `Октан: ${point.x}`,
                                    `Цена: ${point.y.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})} сум/кг`
                                ];
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Октановое число'
                        },
                        min: Math.max(0, Math.min(...variants.map(v => v.final_octane || 0)) - 5),
                        max: Math.max(...variants.map(v => v.final_octane || 0)) + 5
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Цена (сум/кг)'
                        },
                        beginAtZero: false
                    }
                },
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const variantCard = document.querySelector(`[data-variant-id="${variants[index].variant_number || `variant-${index}`}"]`);
                        if (variantCard) {
                            variantCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // Highlight effect
                            variantCard.style.boxShadow = '0 0 20px rgba(0, 123, 255, 0.5)';
                            setTimeout(() => {
                                variantCard.style.boxShadow = '';
                            }, 2000);
                        }
                    }
                }
            }
        });

        // Grafiklar konteynerni ko'rsatish
        if (this.chartsContainer) {
            this.chartsContainer.style.display = 'block';
        }
    }

    attachVariantCheckboxListeners(variants) {
        // Barcha checkboxlarni topish va event listener qo'shish
        const checkboxes = document.querySelectorAll('.variant-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const variantIndex = parseInt(e.target.dataset.variantIndex);
                const variantId = e.target.value;
                
                if (e.target.checked) {
                    this.selectedVariants.add(variantIndex);
                } else {
                    this.selectedVariants.delete(variantIndex);
                }
                
                this.updateCompareButton();
            });
        });
    }

    updateCompareButton() {
        const count = this.selectedVariants.size;
        if (this.selectedCountSpan) {
            this.selectedCountSpan.textContent = count;
        }
        if (this.compareBtn) {
            if (count >= 2 && count <= 5) {
                this.compareBtn.style.display = 'inline-block';
                this.compareBtn.disabled = false;
            } else if (count > 5) {
                this.compareBtn.style.display = 'inline-block';
                this.compareBtn.disabled = true;
                this.compareBtn.title = 'Можно сравнить максимум 5 вариантов';
            } else {
                this.compareBtn.style.display = 'none';
            }
        }
    }

    compareVariants() {
        if (!this.currentResult || this.selectedVariants.size < 2) {
            alert('Для сравнения выберите хотя бы 2 варианта');
            return;
        }
        
        if (this.selectedVariants.size > 5) {
            alert('Можно сравнить максимум 5 вариантов');
            return;
        }
        
        // Tanlangan variantlarni olish
        const selectedVariantData = Array.from(this.selectedVariants).map(idx => {
            return this.currentResult.variants[idx];
        });
        
        // localStorage ga saqlash
        const compareData = {
            variants: selectedVariantData,
            target_octane: this.currentResult.target_octane,
            total_weight: this.totalWeightInput ? parseFloat(this.totalWeightInput.value) || null : null
        };
        
        localStorage.setItem('compareVariants', JSON.stringify(compareData));
        
        // Solishtirish sahifasiga o'tish
        window.location.href = '/gasoline-blend/compare/';
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

    async exportToExcel() {
        if (!this.currentResult || !this.currentResult.variants || this.currentResult.variants.length === 0) {
            alert('Для экспорта сначала должны быть результаты расчета');
            return;
        }

        // Loading ko'rsatish
        const originalText = this.exportExcelBtn.innerHTML;
        this.exportExcelBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Загрузка...';
        this.exportExcelBtn.disabled = true;

        try {
            // Variantlarni serverga yuborish
            const data = {
                variants: this.currentResult.variants,
                target_octane: this.currentResult.target_octane,
                total_weight: this.totalWeightInput ? parseFloat(this.totalWeightInput.value) || null : null
            };

            // Fetch API orqali POST request
            // URL ni global konstantadan yoki to'g'ri path dan olish
            const exportUrl = typeof EXPORT_EXCEL_URL !== 'undefined' 
                ? EXPORT_EXCEL_URL 
                : '/gasoline-blend/export-excel/';
            
            console.log('Export URL:', exportUrl);
            
            const response = await fetch(exportUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrftoken
                },
                body: JSON.stringify(data)
            });

            // Content-Type ni tekshirish
            const contentType = response.headers.get('Content-Type');
            
            if (response.ok && contentType && contentType.includes('application/vnd.openxmlformats')) {
                // Excel fayl - blob sifatida yuklab olish
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                // Filename olish Content-Disposition dan
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `benzin_aralashma_AI${this.currentResult.target_octane}.xlsx`;
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch) {
                        filename = filenameMatch[1];
                    }
                }
                
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                // Xatolik - JSON yoki HTML qaytarilgan
                const text = await response.text();
                let errorMessage = `Ошибка сервера (status: ${response.status})`;
                
                // JSON yoki HTML ekanligini tekshirish
                if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                    // JSON ko'rinishida
                    try {
                        const errorData = JSON.parse(text);
                        errorMessage = errorData.error || errorMessage;
                    } catch (e) {
                        console.error('JSON parse xatoligi:', e);
                    }
                } else {
                    // HTML qaytarilgan (Django xato sahifasi)
                    console.error('Server HTML xato sahifasini qaytardi');
                    console.error('Response text (first 500 chars):', text.substring(0, 500));
                    errorMessage = `Ошибка сервера (status: ${response.status}). Проверьте логи сервера или попробуйте еще раз.`;
                }
                
                throw new Error(errorMessage);
            }

            // Tugmani tiklash
            this.exportExcelBtn.innerHTML = originalText;
            this.exportExcelBtn.disabled = false;

        } catch (error) {
            console.error('Excel export error:', error);
            alert('Ошибка экспорта в Excel: ' + error.message);
            this.exportExcelBtn.innerHTML = originalText;
            this.exportExcelBtn.disabled = false;
        }
    }
}

// Sahifa yuklanganda ishga tushirish
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('calculate-btn')) {
        window.gasolineBlendCalculator = new GasolineBlendCalculator();
    }
});

