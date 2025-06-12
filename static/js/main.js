// Main JavaScript for Reservoir Calibration Calculator

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips if Bootstrap is available
    if (typeof bootstrap !== 'undefined') {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // Form validation and enhancement
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        // Add real-time validation
        const inputs = form.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearFieldError);
        });
    });

    // Enhanced number input formatting
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Remove any non-numeric characters except decimal point
            this.value = this.value.replace(/[^0-9.]/g, '');
            
            // Ensure only one decimal point
            const parts = this.value.split('.');
            if (parts.length > 2) {
                this.value = parts[0] + '.' + parts.slice(1).join('');
            }
        });

        // Add thousand separators on blur for display
        input.addEventListener('blur', function() {
            if (this.value && !isNaN(this.value)) {
                const num = parseFloat(this.value);
                if (this.step === '1' || this.step === undefined) {
                    // Integer formatting
                    this.setAttribute('data-original', this.value);
                } else {
                    // Decimal formatting
                    this.setAttribute('data-original', this.value);
                }
            }
        });

        // Remove formatting on focus for editing
        input.addEventListener('focus', function() {
            const original = this.getAttribute('data-original');
            if (original) {
                this.value = original;
            }
        });
    });

    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            if (alert.classList.contains('show')) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    });

    // Enhanced table interactions
    const tables = document.querySelectorAll('.table');
    tables.forEach(table => {
        // Add click-to-select row functionality
        const rows = table.querySelectorAll('tbody tr:not(.collapse)');
        rows.forEach(row => {
            row.addEventListener('click', function() {
                // Remove previous selection
                rows.forEach(r => r.classList.remove('table-active'));
                // Add selection to current row
                this.classList.add('table-active');
            });
        });
    });

    // Loading state management
    window.showLoading = function(element, text = 'Loading...') {
        if (element) {
            element.setAttribute('data-original-text', element.innerHTML);
            element.innerHTML = `<i class="bi bi-hourglass-split me-2"></i>${text}`;
            element.disabled = true;
        }
    };

    window.hideLoading = function(element) {
        if (element) {
            const originalText = element.getAttribute('data-original-text');
            if (originalText) {
                element.innerHTML = originalText;
                element.removeAttribute('data-original-text');
            }
            element.disabled = false;
        }
    };

    // Utility function for number formatting
    window.formatNumber = function(num, decimals = 2) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    };

    // Copy to clipboard functionality
    window.copyToClipboard = function(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Copied to clipboard!', 'success');
            }).catch(() => {
                fallbackCopyToClipboard(text);
            });
        } else {
            fallbackCopyToClipboard(text);
        }
    };

    function fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showNotification('Copied to clipboard!', 'success');
        } catch (err) {
            showNotification('Failed to copy to clipboard', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    // Show notification function
    window.showNotification = function(message, type = 'info') {
        const alertClass = type === 'error' ? 'alert-danger' : `alert-${type}`;
        const iconClass = type === 'success' ? 'bi-check-circle' : 
                         type === 'error' ? 'bi-exclamation-triangle' : 'bi-info-circle';
        
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" role="alert">
                <i class="bi ${iconClass} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', alertHtml);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            const alert = document.querySelector('.alert.position-fixed');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 3000);
    };

    // Enhanced form validation
    function validateField(event) {
        const field = event.target;
        const value = field.value.trim();
        
        // Remove existing error styling
        field.classList.remove('is-invalid');
        const existingError = field.parentNode.querySelector('.invalid-feedback');
        if (existingError) {
            existingError.remove();
        }

        // Validate based on field type
        let isValid = true;
        let errorMessage = '';

        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required.';
        } else if (field.type === 'number' && value) {
            const num = parseFloat(value);
            if (isNaN(num)) {
                isValid = false;
                errorMessage = 'Please enter a valid number.';
            } else if (field.hasAttribute('min') && num < parseFloat(field.getAttribute('min'))) {
                isValid = false;
                errorMessage = `Value must be at least ${field.getAttribute('min')}.`;
            } else if (field.hasAttribute('max') && num > parseFloat(field.getAttribute('max'))) {
                isValid = false;
                errorMessage = `Value must be at most ${field.getAttribute('max')}.`;
            }
        }

        if (!isValid) {
            field.classList.add('is-invalid');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            errorDiv.textContent = errorMessage;
            field.parentNode.appendChild(errorDiv);
        }

        return isValid;
    }

    function clearFieldError(event) {
        const field = event.target;
        field.classList.remove('is-invalid');
        const existingError = field.parentNode.querySelector('.invalid-feedback');
        if (existingError) {
            existingError.remove();
        }
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to submit forms
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const activeForm = document.querySelector('form:focus-within');
            if (activeForm) {
                const submitBtn = activeForm.querySelector('button[type="submit"]');
                if (submitBtn && !submitBtn.disabled) {
                    submitBtn.click();
                }
            }
        }
    });

    // Print functionality
    window.printResults = function() {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection && resultsSection.style.display !== 'none') {
            window.print();
        } else {
            showNotification('No results to print', 'warning');
        }
    };

    console.log('Reservoir Calibration Calculator initialized successfully');
}); 