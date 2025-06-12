from django.contrib import admin
from .models import Tank, Product, CalibrationPoint, TransferCalculation


@admin.register(Tank)
class TankAdmin(admin.ModelAdmin):
    list_display = ['name', 'capacity_liters', 'height_cm', 'description', 'created_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'description')
        }),
        ('Технические параметры', {
            'fields': ('capacity_liters', 'height_cm')
        }),
        ('Метаданные', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('calibrations')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Информация о продукте', {
            'fields': ('name', 'description')
        }),
        ('Метаданные', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CalibrationPoint)
class CalibrationPointAdmin(admin.ModelAdmin):
    list_display = ['tank', 'height_cm', 'volume_liters', 'created_at']
    list_filter = ['tank', 'created_at']
    search_fields = ['tank__name']
    readonly_fields = ['created_at']
    fieldsets = (
        ('Калибровочные данные', {
            'fields': ('tank', 'height_cm', 'volume_liters')
        }),
        ('Метаданные', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('tank')


@admin.register(TransferCalculation)
class TransferCalculationAdmin(admin.ModelAdmin):
    list_display = [
        'tank', 
        'product', 
        'density_kg_per_liter',
        'initial_height_cm', 
        'transfer_weight_kg', 
        'final_height_cm',
        'timestamp'
    ]
    list_filter = [
        'tank', 
        'product', 
        'timestamp',
        'interpolation_method'
    ]
    search_fields = [
        'tank__name', 
        'product__name'
    ]
    readonly_fields = [
        'initial_volume_liters',
        'final_volume_liters', 
        'volume_added_liters',
        'final_height_cm',
        'fill_percentage',
        'interpolation_method',
        'timestamp'
    ]
    fieldsets = (
        ('Входные данные', {
            'fields': (
                'tank', 
                'product', 
                'density_kg_per_liter',
                'initial_height_cm', 
                'transfer_weight_kg'
            )
        }),
        ('Результаты расчета', {
            'fields': (
                'initial_volume_liters',
                'final_volume_liters',
                'volume_added_liters', 
                'final_height_cm',
                'fill_percentage'
            ),
            'classes': ('collapse',)
        }),
        ('Метаданные', {
            'fields': (
                'interpolation_method',
                'notes',
                'timestamp'
            ),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('tank', 'product')

    def has_add_permission(self, request):
        # Расчеты создаются только через интерфейс приложения
        return False


# Настройка заголовков админки
admin.site.site_header = "Администрирование калькулятора калибровки резервуаров"
admin.site.site_title = "Админ панель калькулятора"
admin.site.index_title = "Управление данными калькулятора"
