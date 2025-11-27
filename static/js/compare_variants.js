/**
 * Страница сравнения вариантов JavaScript
 */

class VariantComparer {
    constructor() {
        this.compareData = null;
        this.compareContainer = document.getElementById('compare-container');
        this.errorMessage = document.getElementById('error-message');
        this.compareTable = document.getElementById('compare-table');
        this.compareThead = document.getElementById('compare-thead');
        this.compareTbody = document.getElementById('compare-tbody');
        
        this.init();
    }

    init() {
        // localStorage dan ma'lumotlarni olish
        const storedData = localStorage.getItem('compareVariants');
        
        if (!storedData) {
            this.showError('Варианты для сравнения не найдены. Пожалуйста, вернитесь назад и выберите варианты.');
            return;
        }

        try {
            this.compareData = JSON.parse(storedData);
            
            if (!this.compareData.variants || this.compareData.variants.length < 2) {
                this.showError('Для сравнения требуется минимум 2 варианта.');
                return;
            }

            this.renderComparison();
        } catch (e) {
            console.error('Error parsing compare data:', e);
            this.showError('Произошла ошибка при загрузке вариантов.');
        }
    }

    renderComparison() {
        const variants = this.compareData.variants;
        const targetOctane = this.compareData.target_octane;
        
        // Table header yaratish
        let theadHtml = '<tr>';
        theadHtml += '<th class="align-middle">Parametr</th>';
        
        variants.forEach((variant, idx) => {
            const category = variant.category || 'ortacha';
            const categoryLabel = variant.category_label || 'Средний';
            const categoryColors = {
                'eng_arzon': 'bg-success',
                'arzon': 'bg-info',
                'ortacha': 'bg-warning',
                'qimmat': 'bg-orange',
                'juda_qimmat': 'bg-danger'
            };
            const bgClass = categoryColors[category] || 'bg-secondary';
            
            theadHtml += `
                <th class="text-center align-middle ${bgClass} text-white">
                    <div>
                        <strong>Variant ${variant.variant_number}</strong><br>
                        <small>${categoryLabel}</small><br>
                        ${variant.gost_compliant ? 
                            '<span class="badge bg-success mt-1"><i class="bi bi-check-circle"></i> GOST</span>' : 
                            '<span class="badge bg-warning mt-1"><i class="bi bi-exclamation-triangle"></i> Не соответствует ГОСТ</span>'
                        }
                    </div>
                </th>
            `;
        });
        
        theadHtml += '</tr>';
        this.compareThead.innerHTML = theadHtml;

        // Table body yaratish
        let tbodyHtml = '';

        // Oktan soni
        tbodyHtml += '<tr><th>Октановое число</th>';
        variants.forEach(variant => {
            const octane = variant.final_octane || 0;
            const diff = Math.abs(octane - targetOctane);
            const diffClass = diff <= 1 ? 'text-success' : diff <= 5 ? 'text-warning' : 'text-danger';
            tbodyHtml += `
                <td class="text-center">
                    <strong>${octane}</strong>
                    <br>
                    <small class="${diffClass}">(цель: ${targetOctane}, разница: ${diff > 0 ? '+' : ''}${diff.toFixed(2)})</small>
                </td>
            `;
        });
        tbodyHtml += '</tr>';

        // Narx
        tbodyHtml += '<tr><th>Цена (сум/кг)</th>';
        variants.forEach(variant => {
            const price = variant.final_price_per_kg || variant.final_price_per_liter || 0;
            tbodyHtml += `
                <td class="text-center">
                    <strong class="text-success">${this.formatNumber(price)}</strong>
                </td>
            `;
        });
        tbodyHtml += '</tr>';

        // Jami narx (agar mavjud bo'lsa)
        if (this.compareData.total_weight) {
            tbodyHtml += '<tr><th>Общая цена (сум)</th>';
            variants.forEach(variant => {
                const totalPrice = variant.total_price || 0;
                tbodyHtml += `
                    <td class="text-center">
                        <strong class="text-info">${this.formatNumber(totalPrice)}</strong>
                    </td>
                `;
            });
            tbodyHtml += '</tr>';
        }

        // GOST
        tbodyHtml += '<tr><th>GOST mosligi</th>';
        variants.forEach(variant => {
            const gostCompliant = variant.gost_compliant || false;
            tbodyHtml += `
                <td class="text-center">
                    ${gostCompliant ? 
                        '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Соответствует</span>' : 
                        '<span class="badge bg-warning"><i class="bi bi-exclamation-triangle"></i> Не соответствует</span>'
                    }
                </td>
            `;
        });
        tbodyHtml += '</tr>';

        // GOST ogohlantirishlar
        const hasWarnings = variants.some(v => v.gost_warnings && v.gost_warnings.length > 0);
        if (hasWarnings) {
            tbodyHtml += '<tr><th>Предупреждения ГОСТ</th>';
            variants.forEach(variant => {
                const warnings = variant.gost_warnings || [];
                tbodyHtml += `
                    <td>
                        ${warnings.length > 0 ? 
                            '<ul class="mb-0">' + warnings.map(w => `<li class="text-warning">${this.escapeHtml(w)}</li>`).join('') + '</ul>' : 
                            '<span class="text-success">-</span>'
                        }
                    </td>
                `;
            });
            tbodyHtml += '</tr>';
        }

        // Kompozitsiya
        tbodyHtml += '<tr><th>Состав</th>';
        variants.forEach(variant => {
            const products = variant.products || [];
            tbodyHtml += `
                <td>
                    <ul class="list-unstyled mb-0">
                        ${products.map(product => {
                            const pct = product.percentage || 0;
                            const octane = product.octane || 0;
                            const name = product.product_name || 'Noma\'lum';
                            return `
                                <li class="mb-2">
                                    <strong>${this.escapeHtml(name)}</strong><br>
                                    <small class="text-muted">
                                        Октан: <strong>${octane}</strong> | 
                                        Процент: <strong>${pct}%</strong>
                                        ${product.price_per_kg ? ` | Цена: <strong>${this.formatNumber(product.price_per_kg)} сум/кг</strong>` : ''}
                                    </small>
                                </li>
                            `;
                        }).join('')}
                    </ul>
                </td>
            `;
        });
        tbodyHtml += '</tr>';

        // Komponentlar jadvali
        tbodyHtml += '<tr><th colspan="' + (variants.length + 1) + '" class="text-center bg-light"><strong>Детали компонентов</strong></th></tr>';
        
        // Barcha komponentlarni yig'ish (barcha variantlardan)
        const allProducts = new Set();
        variants.forEach(variant => {
            (variant.products || []).forEach(product => {
                allProducts.add(product.product_name || 'Noma\'lum');
            });
        });

        // Har bir komponent uchun qator
        Array.from(allProducts).forEach(productName => {
            tbodyHtml += `<tr><th>${this.escapeHtml(productName)}</th>`;
            variants.forEach(variant => {
                const product = (variant.products || []).find(p => (p.product_name || 'Noma\'lum') === productName);
                if (product) {
                    tbodyHtml += `
                        <td class="text-center">
                            <strong>${product.percentage}%</strong><br>
                            <small class="text-muted">Октан: ${product.octane}</small>
                        </td>
                    `;
                } else {
                    tbodyHtml += '<td class="text-center text-muted">-</td>';
                }
            });
            tbodyHtml += '</tr>';
        });

        this.compareTbody.innerHTML = tbodyHtml;
        this.compareContainer.style.display = 'block';
    }

    showError(message) {
        if (this.errorMessage) {
            const errorText = document.getElementById('error-text');
            if (errorText) {
                errorText.textContent = message;
            }
            this.errorMessage.style.display = 'block';
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
}

// Sahifa yuklanganda ishga tushirish
document.addEventListener('DOMContentLoaded', function() {
    new VariantComparer();
});

