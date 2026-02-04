/**
 * Excel'ga o'xshash kalkulyator - Переработка
 * 
 * YANGI LOGIKA:
 * 1. Barcha productlar jadvalda ko'rinadi (bazadan)
 * 2. Foydalanuvchi faqat foiz, oktan va narxni kiritadi
 * 3. Hisob-kitoblar avtomatik bajariladi:
 *    - ОКТАН * % = Октан × Процент / 100
 *    - СЕБЕСТОИМОСТ = Цена × Процент / 100
 * 4. Faqat to'ldirilgan productlar saqlashda yuboriladi
 */

class ProcessingCalculator {
    constructor() {
        this.init();
    }

    init() {
        // Sana o'rnatish
        const today = new Date();
        const dateInput = document.getElementById('calculation-date');
        if (dateInput) {
            dateInput.value = today.toISOString().split('T')[0];
            this.updateDateDisplay();
        }

        // Event listeners
        document.getElementById('calculation-date')?.addEventListener('change', () => this.updateDateDisplay());
        document.getElementById('sale-price')?.addEventListener('input', () => this.calculateTotals());
        document.getElementById('export-excel-btn')?.addEventListener('click', () => this.exportToExcel());
        document.getElementById('save-calculation-btn')?.addEventListener('click', () => this.saveCalculation());
        document.getElementById('clear-all-btn')?.addEventListener('click', () => this.clearAll());

        // Jadvaldagi barcha input'larni event listener qo'shish
        this.attachInputListeners();

        // Boshlang'ich hisob-kitoblar
        this.calculateTotals();
    }

    attachInputListeners() {
        // Barcha product qatorlarini topish
        const productRows = document.querySelectorAll('.product-row');
        
        productRows.forEach(row => {
            const productId = row.dataset.productId;
            
            // Oktan input
            const octaneInput = row.querySelector('.material-octane');
            if (octaneInput) {
                octaneInput.addEventListener('input', () => {
                    this.updateProductRow(productId);
                });
                octaneInput.addEventListener('change', () => {
                    this.updateProductRow(productId);
                });
            }
            
            // Narx input
            const priceInput = row.querySelector('.material-price');
            if (priceInput) {
                priceInput.addEventListener('input', () => {
                    this.updateProductRow(productId);
                });
                priceInput.addEventListener('change', () => {
                    this.updateProductRow(productId);
                });
            }
            
            // Foiz input
            const percentageInput = row.querySelector('.material-percentage');
            if (percentageInput) {
                percentageInput.addEventListener('input', () => {
                    this.updateProductRow(productId);
                    this.validateTotalPercentage();
                });
                percentageInput.addEventListener('change', () => {
                    this.updateProductRow(productId);
                    this.validateTotalPercentage();
                });
            }
        });
    }

    updateProductRow(productId) {
        /**
         * Product qatorini yangilash
         * 
         * QADAMLAR:
         * 1. Input'lardan qiymatlarni olish
         * 2. Hisob-kitoblarni bajarish
         * 3. Jadvaldagi qiymatlarni yangilash
         */
        
        const row = document.querySelector(`tr[data-product-id="${productId}"]`);
        if (!row) return;

        const name = row.querySelector('.product-name')?.textContent.trim() || '';
        const octaneInput = row.querySelector('.material-octane');
        const priceInput = row.querySelector('.material-price');
        const percentageInput = row.querySelector('.material-percentage');
        const octanePercentCell = row.querySelector('.material-octane-percent');
        const costCell = row.querySelector('.material-cost');

        // Qiymatlarni olish
        const octane = parseFloat(octaneInput?.value || 0);
        const price = parseFloat(priceInput?.value || 0);
        const percentage = parseFloat(percentageInput?.value || 0);

        // Hisob-kitoblar
        const octanePercent = (octane * percentage / 100) || 0;
        const cost = (price * percentage / 100) || 0;

        // Jadvaldagi qiymatlarni yangilash
        if (octanePercentCell) {
            octanePercentCell.textContent = octanePercent.toFixed(2).replace('.', ',');
        }
        if (costCell) {
            costCell.textContent = this.formatNumberDisplay(cost, 2);
        }

        // Umumiy qiymatlarni yangilash
        this.calculateTotals();
    }

    validateTotalPercentage() {
        /**
         * Jami foizni tekshirish (100% dan oshmasligi kerak)
         */
        const productRows = document.querySelectorAll('.product-row');
        let totalPercentage = 0;

        productRows.forEach(row => {
            const percentageInput = row.querySelector('.material-percentage');
            if (percentageInput && percentageInput.value) {
                totalPercentage += parseFloat(percentageInput.value) || 0;
            }
        });

        // Barcha foiz input'larini rang bilan belgilash
        productRows.forEach(row => {
            const percentageInput = row.querySelector('.material-percentage');
            if (percentageInput) {
                if (totalPercentage > 100.01) {
                    percentageInput.classList.add('is-invalid');
                    percentageInput.classList.remove('is-valid');
                } else if (totalPercentage > 99.9) {
                    percentageInput.classList.add('is-valid');
                    percentageInput.classList.remove('is-invalid');
                } else {
                    percentageInput.classList.remove('is-invalid', 'is-valid');
                }
            }
        });

        // Xabar ko'rsatish
        const percentageDisplay = document.getElementById('total-percentage-display');
        if (percentageDisplay) {
            percentageDisplay.textContent = totalPercentage.toFixed(2) + '%';
            if (totalPercentage > 100.01) {
                percentageDisplay.className = 'mb-0 fw-bold text-danger';
            } else if (totalPercentage >= 99.9) {
                percentageDisplay.className = 'mb-0 fw-bold text-success';
            } else if (totalPercentage < 50) {
                percentageDisplay.className = 'mb-0 fw-bold text-warning';
            } else {
                percentageDisplay.className = 'mb-0 fw-bold';
            }
        }
    }

    updateDateDisplay() {
        const dateInput = document.getElementById('calculation-date');
        const dateDisplay = document.getElementById('date-display');
        if (dateInput && dateDisplay) {
            const date = new Date(dateInput.value);
            const formattedDate = date.toLocaleDateString('ru-RU');
            dateDisplay.textContent = formattedDate;
        }
    }

    clearAll() {
        if (confirm('Вы уверены, что хотите очистить все данные?')) {
            // Barcha input'larni tozalash
            const productRows = document.querySelectorAll('.product-row');
            productRows.forEach(row => {
                const octaneInput = row.querySelector('.material-octane');
                const priceInput = row.querySelector('.material-price');
                const percentageInput = row.querySelector('.material-percentage');
                
                if (octaneInput) octaneInput.value = '';
                if (priceInput) priceInput.value = '';
                if (percentageInput) percentageInput.value = '';
            });

            document.getElementById('sale-price').value = '';
            this.calculateTotals();
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
            const name = row.querySelector('.product-name')?.textContent.trim() || '';
            const octaneInput = row.querySelector('.material-octane');
            const priceInput = row.querySelector('.material-price');
            const percentageInput = row.querySelector('.material-percentage');

            const octane = parseFloat(octaneInput?.value || 0);
            const price = parseFloat(priceInput?.value || 0);
            const percentage = parseFloat(percentageInput?.value || 0);

            // Faqat barcha maydonlar to'ldirilgan bo'lsa qo'shish
            if (name && octane > 0 && price > 0 && percentage > 0) {
                const octanePercent = (octane * percentage / 100);
                const cost = (price * percentage / 100);

                materials.push({
                    id: productId,
                    name: name,
                    octane: octane,
                    price: price,
                    percentage: percentage,
                    octanePercent: octanePercent,
                    cost: cost
                });
            }
        });

        return materials;
    }

    calculateTotals() {
        /**
         * Umumiy qiymatlarni hisoblash
         */
        
        const materials = this.getFilledMaterials();

        // Umumiy qiymatlar (yig'indi)
        const totalPercentage = materials.reduce((sum, m) => sum + m.percentage, 0);
        const totalOctanePercent = materials.reduce((sum, m) => sum + (m.octanePercent || 0), 0);
        const totalCost = materials.reduce((sum, m) => sum + (m.cost || 0), 0);
        
        // Sotish narxi va foyda
        const salePrice = parseFloat(document.getElementById('sale-price')?.value || 0);
        const profit = salePrice - totalCost;

        // Header qatorida ko'rsatish
        document.getElementById('total-octane-percent').textContent = totalOctanePercent.toFixed(2).replace('.', ',');
        document.getElementById('total-cost').textContent = this.formatNumberDisplay(totalCost, 2);
        document.getElementById('header-sale-price').textContent = this.formatNumberDisplay(salePrice, 2);
        document.getElementById('header-profit').textContent = this.formatNumberDisplay(profit, 2);
        
        // Header qatorida rang o'zgarishi (foyda manfiy bo'lsa qizil)
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

        // Statistikalar (pastdagi kartalar)
        // Общий процент
        const percentageEl = document.getElementById('total-percentage-display');
        if (percentageEl) {
            percentageEl.textContent = totalPercentage.toFixed(2) + '%';
            if (totalPercentage >= 99.9) {
                percentageEl.className = 'mb-0 fw-bold text-success';
            } else if (totalPercentage < 50) {
                percentageEl.className = 'mb-0 fw-bold text-warning';
            } else {
                percentageEl.className = 'mb-0 fw-bold';
            }
        }
        
        // Октановое число
        document.getElementById('total-octane-display').textContent = totalOctanePercent.toFixed(2).replace('.', ',');
        
        // Себестоимость
        document.getElementById('total-cost-display').textContent = this.formatNumberDisplay(totalCost, 2);
        
        // Прибыль (foyda manfiy bo'lsa qizil rang)
        const profitDisplayEl = document.getElementById('total-profit-display');
        if (profitDisplayEl) {
            profitDisplayEl.textContent = this.formatNumberDisplay(profit, 2);
            if (profit < 0) {
                profitDisplayEl.className = 'mb-0 fw-bold text-danger';
            } else {
                profitDisplayEl.className = 'mb-0 fw-bold text-success';
            }
        }
    }

    exportToExcel() {
        /**
         * Excel'ga export qilish
         */
        
        const materials = this.getFilledMaterials();
        
        if (materials.length === 0) {
            alert('❌ Нет данных для экспорта!\n\nЗаполните хотя бы один продукт.');
            return;
        }

        // Ma'lumotlarni olish
        const date = document.getElementById('date-display')?.textContent || new Date().toLocaleDateString('ru-RU');
        const salePrice = parseFloat(document.getElementById('sale-price')?.value || 0);
        
        // Umumiy qiymatlar
        const totalOctanePercent = materials.reduce((sum, m) => sum + (m.octanePercent || 0), 0);
        const totalCost = materials.reduce((sum, m) => sum + (m.cost || 0), 0);
        const profit = salePrice - totalCost;

        // CSV format (Excel'ga mos)
        let csv = '\ufeff'; // UTF-8 BOM (kirill harflari uchun)
        
        // Sana
        csv += 'ДАТА,' + date + '\n';
        
        // Ustunlar
        csv += '№,НАИМЕНОВАНИЕ СИРЯ,Октан,ЦЕНА,процент %,ОКТАН * %,СЕБЕСТОИМОСТ,ПРОДАЖА (цена),ПРЫБЛ\n';
        
        // Header qatorida umumiy qiymatlar (Excel'ga o'xshash)
        csv += `,,,,"${totalOctanePercent.toFixed(2).replace('.', ',')}","${totalCost.toFixed(2).replace('.', ',')}","${salePrice.toFixed(2).replace('.', ',')}","${profit.toFixed(2).replace('.', ',')}"\n`;
        
        // Materiallar
        materials.forEach((material, index) => {
            csv += `${index + 1},"${material.name}",${material.octane},${material.price.toFixed(2).replace('.', ',')},${material.percentage.toFixed(2).replace('.', ',')},${material.octanePercent.toFixed(2).replace('.', ',')},${material.cost.toFixed(2).replace('.', ',')},,\n`;
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const fileName = `ПЕРЕРАБОТКА_${date.replace(/\//g, '_').replace(/\./g, '_').replace(/\s/g, '_')}.csv`;
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Xabar
        alert('✅ Файл успешно экспортирован!\n\nФайл: ' + fileName);
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
        const salePrice = parseFloat(document.getElementById('sale-price')?.value || 0);
        const totalOctanePercent = materials.reduce((sum, m) => sum + (m.octanePercent || 0), 0);
        const totalCost = materials.reduce((sum, m) => sum + (m.cost || 0), 0);
        const profit = salePrice - totalCost;

        // Materiallarni tozalash (faqat kerakli ma'lumotlar)
        const materialsData = materials.map(m => ({
            name: m.name,
            octane: m.octane,
            price: m.price,
            percentage: m.percentage,
            octanePercent: m.octanePercent,
            cost: m.cost
        }));

        // AJAX so'rov
        try {
            const response = await fetch('/calibration/processing/save/', {
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
        /**
         * Raqamni ko'rsatish uchun formatlash
         * 
         * FORMAT:
         * - $ belgisi bilan
         * - Vergul bilan (Excel'ga o'xshash)
         * - Bo'shliqlar bilan (1000 → "1 000")
         */
        if (isNaN(num) || num === null || num === undefined) return '$0,00';
        const formatted = parseFloat(num).toFixed(decimals);
        // Excel'ga o'xshash format (vergul bilan, bo'shliqlar bilan) + $ belgisi
        return '$' + formatted.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
}

// Global o'zgaruvchi
let calculator;

// DOM yuklanganda ishga tushirish
document.addEventListener('DOMContentLoaded', function() {
    calculator = new ProcessingCalculator();
});
