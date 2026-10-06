/**
 * Excel'ga o'xshash kalkulyator - Переработка
 *
 * LOGIKA:
 * 1. Foydalanuvchi bazadagi istalgan tovarni tanlab jadvalga qo'shadi
 * 2. Foiz, oktan va narx kiritiladi
 * 3. Hisob-kitoblar avtomatik:
 *    - ОКТАН * % = Октан × Процент / 100
 *    - СЕБЕСТОИМОСТ = Цена × Процент / 100
 * 4. Faqat to'ldirilgan productlar saqlashda yuboriladi
 */

class ProcessingCalculator {
    constructor() {
        this.products = [];
        this.rowSeq = 0;
        this.init();
    }

    /**
     * O'nlik sonni o'qish: vergul (,) va nuqta (.) qabul qiladi.
     * Masalan: "1,3" va "1.3" ikkalasi ham 1.3 qaytaradi.
     */
    parseDecimal(value) {
        if (value === null || value === undefined || value === '') return NaN;
        const str = String(value).trim().replace(',', '.');
        const num = parseFloat(str);
        return isNaN(num) ? NaN : num;
    }

    init() {
        const dataEl = document.getElementById('products-data');
        if (dataEl) {
            try {
                this.products = JSON.parse(dataEl.textContent) || [];
            } catch (e) {
                console.error('Products JSON parse error:', e);
                this.products = [];
            }
        }

        const today = new Date();
        const dateInput = document.getElementById('calculation-date');
        if (dateInput) {
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            dateInput.value = `${today.getFullYear()}-${month}-${day}`;
            this.updateDateDisplay();
        }

        document.getElementById('calculation-date')?.addEventListener('change', () => this.updateDateDisplay());
        const salePriceEl = document.getElementById('sale-price');
        if (salePriceEl) {
            salePriceEl.addEventListener('input', (e) => {
                if (e.target.value && e.target.value.includes(',')) e.target.value = e.target.value.replace(',', '.');
                this.calculateTotals();
            });
        }
        document.getElementById('export-excel-btn')?.addEventListener('click', () => this.exportToExcel());
        document.getElementById('save-calculation-btn')?.addEventListener('click', () => this.saveCalculation());
        document.getElementById('clear-all-btn')?.addEventListener('click', () => this.clearAll());
        document.getElementById('add-row-btn')?.addEventListener('click', () => this.addEmptyRow());

        this.attachTableListeners();
        this.resetRows(4);

        const tableWrapper = document.querySelector('.processing-table-wrapper');
        const scrollHint = document.getElementById('scroll-hint');
        if (tableWrapper && scrollHint) {
            tableWrapper.addEventListener('scroll', () => {
                scrollHint.classList.add('scroll-hint-hidden');
            }, { once: true });
        }

        this.calculateTotals();
    }

    getSelectedProductIds(exceptSelect = null) {
        const ids = new Set();
        document.querySelectorAll('.product-name-select').forEach((select) => {
            if (exceptSelect && select === exceptSelect) return;
            if (select.value) ids.add(String(select.value));
        });
        return ids;
    }

    fillProductSelect(select, selectedId = '') {
        const used = this.getSelectedProductIds(select);
        const current = selectedId || select.value || '';
        select.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = this.products.length
            ? '-- Выберите сырьё --'
            : 'Нет продуктов в базе';
        select.appendChild(placeholder);

        this.products.forEach((product) => {
            const id = String(product.id);
            if (used.has(id) && id !== String(current)) return;
            const option = document.createElement('option');
            option.value = id;
            option.textContent = product.name || '';
            select.appendChild(option);
        });

        if (current) select.value = current;
    }

    refreshAllRowSelects() {
        document.querySelectorAll('.product-name-select').forEach((select) => {
            this.fillProductSelect(select, select.value);
        });
    }

    resetRows(count = 4) {
        const tbody = document.getElementById('materials-tbody');
        if (tbody) tbody.innerHTML = '';
        this.rowSeq = 0;
        for (let i = 0; i < count; i++) {
            this.addEmptyRow();
        }
    }

    addEmptyRow() {
        const tbody = document.getElementById('materials-tbody');
        if (!tbody) return;

        this.rowSeq += 1;
        const rowId = String(this.rowSeq);
        const row = document.createElement('tr');
        row.className = 'product-row';
        row.dataset.rowId = rowId;
        row.dataset.productId = '';
        row.innerHTML = `
            <td class="text-center row-number"></td>
            <td>
                <select class="form-select form-select-sm product-name-select input-no-zoom" aria-label="Наименование сырья">
                </select>
            </td>
            <td class="text-center">
                <input type="text"
                       class="form-control form-control-sm text-center material-octane input-no-zoom"
                       placeholder="—"
                       inputmode="decimal"
                       autocomplete="off">
            </td>
            <td class="text-center">
                <input type="text"
                       class="form-control form-control-sm text-center material-specific-weight input-no-zoom"
                       placeholder="—"
                       inputmode="decimal"
                       autocomplete="off">
            </td>
            <td class="text-end">
                <input type="text"
                       class="form-control form-control-sm text-end material-price input-no-zoom"
                       placeholder="0.00"
                       inputmode="decimal"
                       autocomplete="off">
            </td>
            <td class="text-center">
                <input type="text"
                       class="form-control form-control-sm text-center material-percentage input-no-zoom"
                       placeholder="0.00"
                       inputmode="decimal"
                       autocomplete="off">
            </td>
            <td class="text-center fw-bold material-octane-percent">0.00</td>
            <td class="text-end fw-bold material-cost">0.00</td>
            <td class="text-center">
                <button type="button" class="btn btn-outline-danger btn-sm remove-product-btn min-touch-target" title="Удалить">
                    <i class="bi bi-x-lg"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
        this.fillProductSelect(row.querySelector('.product-name-select'));
        this.renumberRows();
    }

    applyProductToRow(row) {
        const select = row.querySelector('.product-name-select');
        const productId = select?.value || '';
        row.dataset.productId = productId;

        const octaneInput = row.querySelector('.material-octane');
        const specificWeightInput = row.querySelector('.material-specific-weight');
        const product = this.products.find((item) => String(item.id) === String(productId));

        if (product) {
            if (octaneInput) octaneInput.value = product.octane == null ? '' : product.octane;
            if (specificWeightInput) {
                specificWeightInput.value = product.specificWeight == null ? '' : product.specificWeight;
            }
        } else {
            if (octaneInput) octaneInput.value = '';
            if (specificWeightInput) specificWeightInput.value = '';
        }

        this.refreshAllRowSelects();
        this.updateRow(row);
    }

    removeRow(row) {
        if (!row) return;
        row.remove();
        if (!document.querySelector('#materials-tbody .product-row')) {
            this.addEmptyRow();
        }
        this.renumberRows();
        this.refreshAllRowSelects();
        this.calculateTotals();
        this.validateTotalPercentage();
        this.updateSelectedComposition();
    }

    renumberRows() {
        document.querySelectorAll('#materials-tbody .product-row').forEach((row, index) => {
            const numberCell = row.querySelector('.row-number');
            if (numberCell) numberCell.textContent = String(index + 1);
        });
    }

    attachTableListeners() {
        const tbody = document.getElementById('materials-tbody');
        if (!tbody) return;

        const handleInput = (e) => {
            const el = e.target;
            if (!el.matches('.material-octane, .material-price, .material-percentage, .material-specific-weight')) {
                return;
            }
            if (el.value && el.value.includes(',')) {
                el.value = el.value.replace(',', '.');
            }
            const row = el.closest('.product-row');
            if (!row) return;
            this.updateRow(row);
        };

        tbody.addEventListener('input', handleInput);
        tbody.addEventListener('change', (e) => {
            if (e.target.matches('.product-name-select')) {
                this.applyProductToRow(e.target.closest('.product-row'));
                return;
            }
            handleInput(e);
        });
        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.remove-product-btn');
            if (!btn) return;
            this.removeRow(btn.closest('.product-row'));
        });
    }

    updateRow(row) {
        if (!row) return;

        const octaneInput = row.querySelector('.material-octane');
        const priceInput = row.querySelector('.material-price');
        const percentageInput = row.querySelector('.material-percentage');
        const octanePercentCell = row.querySelector('.material-octane-percent');
        const costCell = row.querySelector('.material-cost');

        const octane = this.parseDecimal(octaneInput?.value) || 0;
        const price = this.parseDecimal(priceInput?.value) || 0;
        const percentage = this.parseDecimal(percentageInput?.value) || 0;

        const octanePercent = octane * percentage / 100;
        const cost = price * percentage / 100;

        if (octanePercentCell) {
            octanePercentCell.textContent = octanePercent.toFixed(2).replace('.', ',');
        }
        if (costCell) {
            costCell.textContent = this.formatNumberDisplay(cost, 2);
        }

        this.calculateTotals();
    }

    validateTotalPercentage() {
        const totalPercentage = this.getFilledMaterials().reduce((sum, m) => sum + m.percentage, 0);
        const productRows = document.querySelectorAll('.product-row');

        productRows.forEach((row) => {
            const percentageInput = row.querySelector('.material-percentage');
            if (!percentageInput) return;
            if (totalPercentage > 100.01) {
                percentageInput.classList.add('is-invalid');
                percentageInput.classList.remove('is-valid');
            } else if (totalPercentage > 99.9 && totalPercentage <= 100.01) {
                percentageInput.classList.add('is-valid');
                percentageInput.classList.remove('is-invalid');
            } else {
                percentageInput.classList.remove('is-invalid', 'is-valid');
            }
        });

        const percentageEl = document.getElementById('total-percentage-display');
        if (percentageEl) {
            percentageEl.textContent = totalPercentage.toFixed(2) + '%';
            if (totalPercentage > 100.01) {
                percentageEl.className = 'mb-0 fw-bold text-danger';
            } else if (totalPercentage >= 99.9) {
                percentageEl.className = 'mb-0 fw-bold text-success';
            } else if (totalPercentage > 0 && totalPercentage < 50) {
                percentageEl.className = 'mb-0 fw-bold text-warning';
            } else {
                percentageEl.className = 'mb-0 fw-bold';
            }
        }
    }

    updateDateDisplay() {
        const dateInput = document.getElementById('calculation-date');
        const dateDisplay = document.getElementById('date-display');
        if (dateInput && dateDisplay && dateInput.value) {
            const parts = dateInput.value.split('-').map(Number);
            if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
                const date = new Date(parts[0], parts[1] - 1, parts[2]);
                dateDisplay.textContent = date.toLocaleDateString('ru-RU');
                return;
            }
            dateDisplay.textContent = dateInput.value;
        }
    }

    clearAll() {
        if (confirm('Вы уверены, что хотите очистить все данные?')) {
            const salePrice = document.getElementById('sale-price');
            if (salePrice) salePrice.value = '';
            this.resetRows(4);
            this.calculateTotals();
            this.validateTotalPercentage();
            this.updateSelectedComposition();
        }
    }

    getFilledMaterials() {
        /**
         * To'ldirilgan productlarni olish
         * 
         * QADAMLAR:
         * 1. Barcha product qatorlarini ko'rib chiqish
         * 2. Faqat to'ldirilganlarni ro'yxatga qo'shish
         * 3. Materiallar ro'yxatini qaytarish
         */
        
        const materials = [];
        const productRows = document.querySelectorAll('.product-row');

        productRows.forEach((row, index) => {
            const productId = row.dataset.productId;
            const select = row.querySelector('.product-name-select');
            const name = select?.value ? (select.selectedOptions?.[0]?.textContent.trim() || '') : '';
            const octaneInput = row.querySelector('.material-octane');
            const priceInput = row.querySelector('.material-price');
            const percentageInput = row.querySelector('.material-percentage');
            const specificWeightInput = row.querySelector('.material-specific-weight');

            const octane = this.parseDecimal(octaneInput?.value) || 0;
            const price = this.parseDecimal(priceInput?.value) || 0;
            const percentage = this.parseDecimal(percentageInput?.value) || 0;
            const sw = this.parseDecimal(specificWeightInput?.value);
            const specificWeight = (!isNaN(sw) && sw > 0) ? sw : null;

            if (select?.value && name && percentage > 0) {
                const octanePercent = octane * percentage / 100;
                const cost = price * percentage / 100;

                materials.push({
                    id: productId,
                    name: name,
                    octane: octane,
                    specificWeight: specificWeight,
                    price: price,
                    percentage: percentage,
                    octanePercent: octanePercent,
                    cost: cost
                });
            }
        });

        return materials;
    }

    updateSelectedComposition() {
        /**
         * Tanlangan tarkibni alohida jadvalda ko'rsatish
         */
        
        const materials = this.getFilledMaterials();
        const selectedCard = document.getElementById('selected-composition-card');
        const selectedTbody = document.getElementById('selected-composition-tbody');
        
        if (!selectedCard || !selectedTbody) return;
        
        // Agar tanlangan mahsulotlar bo'lsa, ko'rsatish
        if (materials.length > 0) {
            selectedCard.style.display = 'block';
            
            // Tbody'ni tozalash
            selectedTbody.innerHTML = '';
            
            // Har bir tanlangan mahsulotni qo'shish
            materials.forEach((material, index) => {
                const row = document.createElement('tr');
                row.className = 'table-light';
                
                const specWeightStr = material.specificWeight != null ? material.specificWeight.toFixed(3).replace('.', ',') : '—';
                row.innerHTML = `
                    <td class="text-center">${index + 1}</td>
                    <td class="fw-semibold">${material.name}</td>
                    <td class="text-center">${material.octane.toFixed(1).replace('.', ',')}</td>
                    <td class="text-center">${specWeightStr}</td>
                    <td class="text-end">${this.formatNumberDisplay(material.price, 2)}</td>
                    <td class="text-center">${material.percentage.toFixed(2).replace('.', ',')}%</td>
                    <td class="text-center fw-bold text-primary">${material.octanePercent.toFixed(2).replace('.', ',')}</td>
                    <td class="text-end fw-bold text-warning">${this.formatNumberDisplay(material.cost, 2)}</td>
                `;
                
                selectedTbody.appendChild(row);
            });
        } else {
            // Agar tanlangan mahsulotlar bo'lmasa, yashirish
            selectedCard.style.display = 'none';
        }
    }

    calculateTotals() {
        const materials = this.getFilledMaterials();

        const totalPercentage = materials.reduce((sum, m) => sum + m.percentage, 0);
        const totalOctanePercent = materials.reduce((sum, m) => sum + (m.octanePercent || 0), 0);
        const totalCost = materials.reduce((sum, m) => sum + (m.cost || 0), 0);
        const blendOctane = totalPercentage > 0 ? (totalOctanePercent * 100) / totalPercentage : 0;

        const swWeighted = materials.reduce((acc, m) => {
            if (m.specificWeight == null) return acc;
            return {
                sum: acc.sum + (m.specificWeight * m.percentage),
                pct: acc.pct + m.percentage,
            };
        }, { sum: 0, pct: 0 });
        const avgSpecificWeight = swWeighted.pct > 0 ? swWeighted.sum / swWeighted.pct : null;

        const salePrice = this.parseDecimal(document.getElementById('sale-price')?.value) || 0;
        const profit = salePrice - totalCost;

        document.getElementById('total-octane-percent').textContent = totalOctanePercent.toFixed(2).replace('.', ',');
        document.getElementById('total-cost').textContent = this.formatNumberDisplay(totalCost, 2);
        document.getElementById('header-sale-price').textContent = this.formatNumberDisplay(salePrice, 2);
        document.getElementById('header-profit').textContent = this.formatNumberDisplay(profit, 2);

        const profitEl = document.getElementById('header-profit');
        if (profitEl) {
            if (profit < 0) {
                profitEl.classList.add('text-danger');
                profitEl.classList.remove('text-success');
            } else {
                profitEl.classList.add('text-success');
                profitEl.classList.remove('text-danger');
            }
        }

        this.validateTotalPercentage();

        document.getElementById('total-octane-display').textContent = blendOctane.toFixed(2).replace('.', ',');

        const specificWeightEl = document.getElementById('total-specific-weight-display');
        if (specificWeightEl) {
            if (avgSpecificWeight != null && avgSpecificWeight > 0) {
                specificWeightEl.textContent = avgSpecificWeight.toFixed(3).replace('.', ',');
                specificWeightEl.className = 'mb-0 fw-bold text-info';
            } else {
                specificWeightEl.textContent = '—';
                specificWeightEl.className = 'mb-0 fw-bold text-muted';
            }
        }

        document.getElementById('total-cost-display').textContent = this.formatNumberDisplay(totalCost, 2);

        const profitDisplayEl = document.getElementById('total-profit-display');
        if (profitDisplayEl) {
            profitDisplayEl.textContent = this.formatNumberDisplay(profit, 2);
            if (profit < 0) {
                profitDisplayEl.className = 'mb-0 fw-bold text-danger';
            } else {
                profitDisplayEl.className = 'mb-0 fw-bold text-success';
            }
        }

        this.updateSelectedComposition();
    }

    async exportToExcel() {
        /**
         * Excel'ga export qilish - server-side (chiroyli ranglar va formatlar bilan)
         */
        
        const materials = this.getFilledMaterials();
        
        if (materials.length === 0) {
            alert('❌ Нет данных для экспорта!\n\nЗаполните хотя бы один продукт.');
            return;
        }

        // Loading ko'rsatish
        const exportBtn = document.getElementById('export-excel-btn');
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Загрузка...';
        exportBtn.disabled = true;

        try {
            // Ma'lumotlarni olish
            const dateInput = document.getElementById('calculation-date');
            const dateValue = dateInput?.value || new Date().toISOString().split('T')[0];
            const salePrice = this.parseDecimal(document.getElementById('sale-price')?.value) || 0;
            
            // Umumiy qiymatlar
            const totalPercentage = materials.reduce((sum, m) => sum + m.percentage, 0);
            const totalOctanePercent = materials.reduce((sum, m) => sum + (m.octanePercent || 0), 0);
            const totalCost = materials.reduce((sum, m) => sum + (m.cost || 0), 0);
            const profit = salePrice - totalCost;

            // Materiallarni tozalash
            const materialsData = materials.map(m => ({
                name: m.name,
                octane: m.octane,
                specificWeight: m.specificWeight,
                price: m.price,
                percentage: m.percentage,
                octanePercent: m.octanePercent,
                cost: m.cost
            }));

            // Serverga yuborish
            const response = await fetch('/processing/export-excel/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    calculation_date: dateValue,
                    sale_price: salePrice,
                    materials: materialsData,
                    total_percentage: totalPercentage,
                    total_octane_percent: totalOctanePercent,
                    total_cost: totalCost,
                    total_profit: profit
                })
            });

            if (!response.ok) {
                const text = await response.text();
                console.error('Server error:', text);
                let errorMessage = 'Ошибка при экспорте';
                try {
                    const errorData = JSON.parse(text);
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    errorMessage = `Ошибка сервера (${response.status})`;
                }
                throw new Error(errorMessage);
            }

            // Excel faylini yuklab olish
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Fayl nomini olish (Content-Disposition header'dan)
            const contentDisposition = response.headers.get('Content-Disposition');
            let fileName = 'ПЕРЕРАБОТКА.xlsx';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch) {
                    fileName = fileNameMatch[1];
                }
            }
            
            link.download = fileName;
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            // Xabar
            alert('✅ Файл успешно экспортирован!\n\nФайл: ' + fileName + '\n\n💡 Файл содержит красивое форматирование с цветами!');
            
        } catch (error) {
            console.error('Excel export error:', error);
            alert('❌ Ошибка при экспорте:\n\n' + error.message);
        } finally {
            // Tugmani tiklash
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }
    }

    async saveCalculation() {
        /**
         * Bazaga saqlash funksiyasi
         */
        
        const materials = this.getFilledMaterials();
        
        // Validatsiya
        if (materials.length === 0) {
            alert('❌ Нет данных для сохранения!\n\nЗаполните хотя бы один продукт.');
            return;
        }

        const dateInput = document.getElementById('calculation-date');
        if (!dateInput || !dateInput.value) {
            alert('❌ Укажите дату расчета!');
            dateInput?.focus();
            return;
        }

        // Jami foizni tekshirish
        const totalPercentage = materials.reduce((sum, m) => sum + m.percentage, 0);
        if (totalPercentage > 100.01) {
            alert(`❌ Общий процент превышает 100%!\n\nТекущий процент: ${totalPercentage.toFixed(2)}%\n\nИсправьте проценты перед сохранением.`);
            return;
        }

        // Ma'lumotlarni yig'ish
        const salePrice = this.parseDecimal(document.getElementById('sale-price')?.value) || 0;
        const totalOctanePercent = materials.reduce((sum, m) => sum + (m.octanePercent || 0), 0);
        const totalCost = materials.reduce((sum, m) => sum + (m.cost || 0), 0);
        const profit = salePrice - totalCost;

        // Materiallarni tozalash (faqat kerakli ma'lumotlar)
        const materialsData = materials.map(m => ({
            name: m.name,
            octane: m.octane,
            specificWeight: m.specificWeight,
            price: m.price,
            percentage: m.percentage,
            octanePercent: m.octanePercent,
            cost: m.cost
        }));

        // AJAX so'rov
        try {
            const response = await fetch('/processing/save/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    calculation_date: dateInput.value,
                    sale_price: salePrice,
                    materials: materialsData,
                    total_percentage: totalPercentage,
                    total_octane_percent: totalOctanePercent,
                    total_cost: totalCost,
                    total_profit: profit,
                    notes: ''
                })
            });

            // Response status'ni tekshirish
            if (!response.ok) {
                const text = await response.text();
                console.error('Server error response:', text);
                alert('❌ Ошибка при сохранении!\n\nСтатус: ' + response.status + '\n\nПроверьте консоль для подробностей.');
                return;
            }

            // JSON parse qilish
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('JSON parse error:', jsonError);
                const text = await response.text();
                console.error('Response text:', text);
                alert('❌ Ошибка: Сервер вернул неверный формат данных.\n\nПроверьте консоль для подробностей.');
                return;
            }

            if (data.success) {
                alert('✅ Расчет успешно сохранен!\n\nВы можете просмотреть его в разделе "История".');
            } else {
                alert('❌ Ошибка при сохранении:\n\n' + (data.error || 'Неизвестная ошибка'));
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('❌ Ошибка при сохранении:\n\n' + error.message);
        }
    }

    getCsrfToken() {
        // Avval meta tagdan olish
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            return metaTag.getAttribute('content');
        }
        
        // Agar meta tag bo'lmasa, cookie'dan olish
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        
        // Agar hech biri bo'lmasa, bo'sh qaytarish
        console.warn('CSRF token not found!');
        return '';
    }

    formatNumberDisplay(num, decimals = 2) {
        if (isNaN(num) || num === null || num === undefined) return '$0,00';
        if (num < 0) return '-' + this.formatNumberDisplay(Math.abs(num), decimals);
        const formatted = parseFloat(num).toFixed(decimals);
        const [intPart, fracPart] = formatted.split('.');
        const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return '$' + grouped + ',' + fracPart;
    }
}

// Global o'zgaruvchi
let calculator;

// DOM yuklanganda ishga tushirish
document.addEventListener('DOMContentLoaded', function() {
    calculator = new ProcessingCalculator();
});
