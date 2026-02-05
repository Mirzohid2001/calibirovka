from django.contrib import admin
from .models import (
    Tank,
    Product,
    CalibrationPoint,
    TransferCalculation,
    VolumeWeightCalculation,
    AddingCalculation,
    DensityTemperatureCalculation,
    GasolineBlendCalculation,
    SavedProductConfiguration,
    ProcessingCalculation,
)


class CalibrationPointInline(admin.TabularInline):
    model = CalibrationPoint
    extra = 5
    fields = ('height_cm', 'volume_liters')
    ordering = ('height_cm',)


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

    inlines = [CalibrationPointInline]

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('calibrations')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'gost_percentage',
        'is_for_blending',
        'is_for_processing',
        'created_at'
    ]
    list_filter = [
        'is_for_blending',
        'is_for_processing',
        'created_at', 
        'updated_at'
    ]
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Информация о продукте', {
            'fields': ('name', 'description')
        }),
        ('Параметры бензиновой смеси (GOST)', {
            'description': 'Октановое число и цена вводятся в интерфейсе калькулятора при каждом расчете. Здесь указывается только GOST процент использования продукта.',
            'fields': (
                'gost_percentage',
                'is_for_blending'
            )
        }),
        ('Использование в калькуляторах', {
            'description': 'Выберите, в каких калькуляторах показывать этот продукт.',
            'fields': (
                'is_for_processing',
            )
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


@admin.register(VolumeWeightCalculation)
class VolumeWeightCalculationAdmin(admin.ModelAdmin):
    list_display = [
        'tank', 
        'product', 
        'height_cm',
        'density_kg_per_liter',
        'volume_liters', 
        'weight_kg',
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
        'volume_liters',
        'weight_kg', 
        'fill_percentage',
        'interpolation_method',
        'timestamp'
    ]
    fieldsets = (
        ('Входные данные', {
            'fields': (
                'tank', 
                'product', 
                'height_cm',
                'density_kg_per_liter'
            )
        }),
        ('Результаты расчета', {
            'fields': (
                'volume_liters',
                'weight_kg', 
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


@admin.register(AddingCalculation)
class AddingCalculationAdmin(admin.ModelAdmin):
    list_display = [
        'tank', 
        'product', 
        'current_height_cm',
        'density_kg_per_liter',
        'amount_type',
        'amount_value',
        'final_height_cm',
        'timestamp'
    ]
    list_filter = [
        'tank', 
        'product', 
        'amount_type',
        'timestamp',
        'interpolation_method'
    ]
    search_fields = [
        'tank__name', 
        'product__name'
    ]
    readonly_fields = [
        'current_volume_liters',
        'current_weight_kg',
        'added_volume_liters',
        'added_weight_kg',
        'final_volume_liters',
        'final_weight_kg',
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
                'current_height_cm',
                'density_kg_per_liter',
                'amount_type',
                'amount_value'
            )
        }),
        ('Результаты расчета', {
            'fields': (
                'current_volume_liters',
                'current_weight_kg',
                'added_volume_liters',
                'added_weight_kg',
                'final_volume_liters',
                'final_weight_kg',
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


@admin.register(DensityTemperatureCalculation)
class DensityTemperatureCalculationAdmin(admin.ModelAdmin):
    list_display = [
        'product_name',
        'reference_density_kg_m3',
        'reference_temperature_c',
        'target_temperature_c',
        'corrected_density_kg_m3',
        'timestamp',
    ]
    list_filter = [
        'product',
        'timestamp',
    ]
    search_fields = [
        'product__name',
    ]
    readonly_fields = [
        'corrected_density_kg_m3',
        'density_difference_kg_m3',
        'timestamp',
    ]
    fieldsets = (
        ('Входные данные', {
            'fields': (
                'product',
                'reference_density_kg_m3',
                'reference_temperature_c',
                'target_temperature_c',
                'thermal_expansion_coefficient',
            )
        }),
        ('Результаты расчета', {
            'fields': (
                'corrected_density_kg_m3',
                'density_difference_kg_m3',
            ),
            'classes': ('collapse',)
        }),
        ('Метаданные', {
            'fields': (
                'notes',
                'timestamp',
            ),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product')


@admin.register(GasolineBlendCalculation)
class GasolineBlendCalculationAdmin(admin.ModelAdmin):
    list_display = [
        'target_octane_display',
        'variants_count_display',
        'best_price_display',
        'calculation_method',
        'timestamp'
    ]
    list_filter = [
        'target_octane',
        'calculation_method',
        'timestamp',
    ]
    search_fields = ['target_octane', 'notes']
    readonly_fields = [
        'blend_variants',
        'best_variant_index',
        'variants_count_display',
        'timestamp'
    ]
    fieldsets = (
        ('Входные данные', {
            'fields': (
                'target_octane',
                'target_price',
                'total_volume_liters',
                'calculation_method',
                'variants_count'
            )
        }),
        ('Результаты расчета', {
            'fields': (
                'variants_count_display',
                'best_variant_index',
                'blend_variants',
            ),
            'classes': ('collapse',)
        }),
        ('Метаданные', {
            'fields': (
                'notes',
                'timestamp'
            ),
            'classes': ('collapse',)
        }),
    )

    def target_octane_display(self, obj):
        return f"AI-{obj.target_octane}"
    target_octane_display.short_description = 'Целевое октановое число'

    def variants_count_display(self, obj):
        return obj.variants_count_display
    variants_count_display.short_description = 'Найдено вариантов'

    def best_price_display(self, obj):
        best = obj.best_variant
        if best and 'final_price_per_liter' in best:
            return f"{best['final_price_per_liter']:,.0f} сум/л"
        return "—"
    best_price_display.short_description = 'Лучшая цена'

    def get_queryset(self, request):
        return super().get_queryset(request)

    def has_add_permission(self, request):
        # Расчеты создаются только через интерфейс приложения
        return False


@admin.register(SavedProductConfiguration)
class SavedProductConfigurationAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'products_count_display',
        'is_active',
        'created_at',
        'updated_at'
    ]
    list_filter = [
        'is_active',
        'created_at',
        'updated_at'
    ]
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Asosiy ma\'lumotlar', {
            'fields': ('name', 'description', 'is_active')
        }),
        ('Productlar konfiguratsiyasi', {
            'fields': ('products_config',)
        }),
        ('Meta', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def products_count_display(self, obj):
        return obj.products_count
    products_count_display.short_description = 'Productlar soni'


@admin.register(ProcessingCalculation)
class ProcessingCalculationAdmin(admin.ModelAdmin):
    list_display = [
        'calculation_date',
        'materials_count_display',
        'total_percentage',
        'total_octane_percent',
        'total_cost',
        'sale_price',
        'total_profit',
        'timestamp'
    ]
    list_filter = [
        'calculation_date',
        'timestamp',
    ]
    search_fields = ['notes']
    readonly_fields = [
        'total_percentage',
        'total_octane_percent',
        'total_cost',
        'total_profit',
        'materials_count_display',
        'timestamp'
    ]
    fieldsets = (
        ('Основная информация', {
            'fields': (
                'calculation_date',
                'sale_price',
            )
        }),
        ('Результаты расчета', {
            'fields': (
                'materials_count_display',
                'total_percentage',
                'total_octane_percent',
                'total_cost',
                'total_profit',
            ),
            'classes': ('collapse',)
        }),
        ('Материалы', {
            'fields': ('materials',),
            'classes': ('collapse',)
        }),
        ('Метаданные', {
            'fields': (
                'notes',
                'timestamp'
            ),
            'classes': ('collapse',)
        }),
    )

    def materials_count_display(self, obj):
        return obj.materials_count
    materials_count_display.short_description = 'Количество материалов'

    def get_queryset(self, request):
        return super().get_queryset(request)

    def has_add_permission(self, request):
        # Расчеты создаются только через интерфейс приложения
        return False


# Настройка заголовков админки
admin.site.site_header = "Администрирование калькулятора калибровки резервуаров"
admin.site.site_title = "Админ панель калькулятора"
admin.site.index_title = "Управление данными калькулятора"
