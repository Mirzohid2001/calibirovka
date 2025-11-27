/**
 * Отображение результатов расчета смешивания бензина из истории
 */

class GasolineBlendHistoryViewer {
    constructor() {
        this.selectedVariants = new Set();
        this.compareBtn = document.getElementById('compare-btn');
        this.selectedCountSpan = document.getElementById('selected-count');
        this.exportExcelBtn = document.getElementById('export-excel-btn');
        this.variantsList = document.getElementById('variants-list');
        this.chartsContainer = document.getElementById('charts-container');
        this.priceOctaneChart = null;
        this.csrftoken = this.getCookie('csrftoken');
        
        this.init();
    }

    init() {
        if (typeof HISTORY_DATA === 'undefined') {
            console.error('HISTORY_DATA topilmadi');
            return;
        }

        // Variants JSON string bo'lishi mumkin, parse qilamiz
        let variants = HISTORY_DATA.variants;
        if (typeof variants === 'string') {
            try {
                variants = JSON.parse(variants);
            } catch (e) {
                console.error('Variants JSON parse xatoligi:', e);
                variants = [];
            }
        }

        if (!variants || !Array.isArray(variants) || variants.length === 0) {
            console.error('Variants topilmadi yoki bo\'sh');
            this.variantsList.innerHTML = '<div class="alert alert-warning">Варианты не найдены</div>';
            return;
        }

        // Natijalarni ko'rsatish
        this.displayResults({
            variants: variants,
            target_octane: HISTORY_DATA.target_octane,
            variants_count: variants.length
        });

        // Event listeners
        if (this.compareBtn) {
            this.compareBtn.addEventListener('click', () => this.compareVariants());
        }
        if (this.exportExcelBtn) {
            this.exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        }
    }

    displayResults(result) {
        if (!this.variantsList) return;

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

        // Checkbox event listeners qo'shish
        this.attachVariantCheckboxListeners(result.variants);

        // Grafiklarni yaratish
        this.renderCharts(result.variants, result.target_octane);
    }

    attachVariantCheckboxListeners(variants) {
        const checkboxes = document.querySelectorAll('.variant-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const variantIndex = parseInt(e.target.dataset.variantIndex);
                
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
        if (!HISTORY_DATA || !HISTORY_DATA.variants || this.selectedVariants.size < 2) {
            alert('Для сравнения выберите хотя бы 2 варианта');
            return;
        }
        
        const selectedVariantData = Array.from(this.selectedVariants).map(idx => {
            return HISTORY_DATA.variants[idx];
        });
        
        const compareData = {
            variants: selectedVariantData,
            target_octane: HISTORY_DATA.target_octane,
            total_weight: HISTORY_DATA.total_weight
        };
        
        localStorage.setItem('compareVariants', JSON.stringify(compareData));
        window.location.href = '/gasoline-blend/compare/';
    }

    async exportToExcel() {
        if (!HISTORY_DATA || !HISTORY_DATA.variants || HISTORY_DATA.variants.length === 0) {
            alert('Для экспорта варианты отсутствуют');
            return;
        }

        const originalText = this.exportExcelBtn.innerHTML;
        this.exportExcelBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Загрузка...';
        this.exportExcelBtn.disabled = true;

        try {
            const data = {
                variants: HISTORY_DATA.variants,
                target_octane: HISTORY_DATA.target_octane,
                total_weight: HISTORY_DATA.total_weight
            };

            const exportUrl = typeof EXPORT_EXCEL_URL !== 'undefined' 
                ? EXPORT_EXCEL_URL 
                : '/gasoline-blend/export-excel/';

            const response = await fetch(exportUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrftoken
                },
                body: JSON.stringify(data)
            });

            const contentType = response.headers.get('Content-Type') || '';
            
            if (response.ok && contentType.includes('application/vnd.openxmlformats')) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `benzin_aralashma_AI${HISTORY_DATA.target_octane}_${HISTORY_DATA.calculation_date.replace(/\./g, '_').replace(/\s/g, '_')}.xlsx`;
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
                const text = await response.text();
                let errorMessage = `Ошибка сервера (status: ${response.status})`;
                
                try {
                    const errorData = JSON.parse(text);
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    console.error('Server вернул HTML страницу ошибки');
                    errorMessage = `Ошибка сервера (status: ${response.status}). Проверьте логи сервера или попробуйте еще раз.`;
                }
                
                throw new Error(errorMessage);
            }

            this.exportExcelBtn.innerHTML = originalText;
            this.exportExcelBtn.disabled = false;

        } catch (error) {
            console.error('Excel export error:', error);
            alert('Ошибка экспорта в Excel: ' + error.message);
            this.exportExcelBtn.innerHTML = originalText;
            this.exportExcelBtn.disabled = false;
        }
    }

    renderCharts(variants, targetOctane) {
        if (!variants || variants.length === 0 || typeof Chart === 'undefined') {
            return;
        }

        const categoryColors = {
            'eng_arzon': { bg: 'rgba(40, 167, 69, 0.7)', border: 'rgba(40, 167, 69, 1)', label: 'Самый дешевый' },
            'arzon': { bg: 'rgba(23, 162, 184, 0.7)', border: 'rgba(23, 162, 184, 1)', label: 'Дешевый' },
            'ortacha': { bg: 'rgba(255, 193, 7, 0.7)', border: 'rgba(255, 193, 7, 1)', label: 'Средний' },
            'qimmat': { bg: 'rgba(255, 140, 0, 0.7)', border: 'rgba(255, 140, 0, 1)', label: 'Дорогой' },
            'juda_qimmat': { bg: 'rgba(220, 53, 69, 0.7)', border: 'rgba(220, 53, 69, 1)', label: 'Очень дорогой' }
        };

        if (this.priceOctaneChart) {
            this.priceOctaneChart.destroy();
        }

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
                            variantCard.style.boxShadow = '0 0 20px rgba(0, 123, 255, 0.5)';
                            setTimeout(() => {
                                variantCard.style.boxShadow = '';
                            }, 2000);
                        }
                    }
                }
            }
        });

        if (this.chartsContainer) {
            this.chartsContainer.style.display = 'block';
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
}

// Sahifa yuklanganda ishga tushirish
document.addEventListener('DOMContentLoaded', function() {
    new GasolineBlendHistoryViewer();
});

