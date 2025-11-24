from django.db import models
from django.core.validators import MinValueValidator
import scipy.interpolate
import numpy as np


class Tank(models.Model):
    name = models.CharField(
        max_length=200, 
        unique=True,
        verbose_name="Название",
        help_text="Уникальное название резервуара"
    )
    capacity_liters = models.FloatField(
        validators=[MinValueValidator(0.01)],
        verbose_name="Емкость (л)",
        help_text="Максимальная емкость резервуара в литрах"
    )
    height_cm = models.FloatField(
        validators=[MinValueValidator(0.01)],
        verbose_name="Высота (см)",
        help_text="Общая высота резервуара в сантиметрах"
    )
    description = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Описание",
        help_text="Дополнительная информация о резервуаре"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Дата обновления"
    )

    class Meta:
        verbose_name = "Резервуар"
        verbose_name_plural = "Резервуары"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.capacity_liters:.0f}л, {self.height_cm:.0f}см)"

    def get_calibration_data(self):
        """Получить калибровочные данные как списки высоты и объема"""
        calibrations = self.calibrations.all().order_by('height_cm')
        if not calibrations.exists():
            # Возвратить линейные данные по умолчанию, если калибровка не найдена
            return [0, self.height_cm], [0, self.capacity_liters]
        
        heights = [cal.height_cm for cal in calibrations]
        volumes = [cal.volume_liters for cal in calibrations]
        return heights, volumes

    def height_to_volume(self, height_cm, method='spline'):
        """Преобразовать высоту в объем, используя интерполяцию"""
        heights, volumes = self.get_calibration_data()
        
        if height_cm <= 0:
            return 0.0
        if height_cm >= max(heights):
            return max(volumes)
        
        if method == 'spline' and len(heights) >= 4:
            # Использовать кубическую сплайн-интерполяцию
            spline = scipy.interpolate.CubicSpline(heights, volumes, bc_type='natural')
            return float(spline(height_cm))
        else:
            # Использовать линейную интерполяцию
            return float(np.interp(height_cm, heights, volumes))

    def volume_to_height(self, volume_liters, method='spline'):
        """Преобразовать объем в высоту, используя интерполяцию"""
        heights, volumes = self.get_calibration_data()
        
        if volume_liters <= 0:
            return 0.0
        if volume_liters >= max(volumes):
            return max(heights)
        
        if method == 'spline' and len(volumes) >= 4:
            # Использовать кубическую сплайн-интерполяцию
            spline = scipy.interpolate.CubicSpline(volumes, heights, bc_type='natural')
            return float(spline(volume_liters))
        else:
            # Использовать линейную интерполяцию
            return float(np.interp(volume_liters, volumes, heights))


class Product(models.Model):
    name = models.CharField(
        max_length=200,
        verbose_name="Название",
        help_text="Название продукта"
    )
    description = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Описание",
        help_text="Описание продукта, включая информацию о плотности"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Дата обновления"
    )

    class Meta:
        verbose_name = "Продукт"
        verbose_name_plural = "Продукты"
        ordering = ['name']

    def __str__(self):
        return self.name


class CalibrationPoint(models.Model):
    tank = models.ForeignKey(
        Tank, 
        on_delete=models.CASCADE, 
        related_name='calibrations',
        verbose_name="Резервуар"
    )
    height_cm = models.FloatField(
        validators=[MinValueValidator(0)],
        verbose_name="Высота (см)",
        help_text="Высота жидкости в сантиметрах"
    )
    volume_liters = models.FloatField(
        validators=[MinValueValidator(0)],
        verbose_name="Объем (л)",
        help_text="Соответствующий объем в литрах"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания"
    )

    class Meta:
        verbose_name = "Точка калибровки"
        verbose_name_plural = "Точки калибровки"
        unique_together = ['tank', 'height_cm']
        ordering = ['tank', 'height_cm']

    def __str__(self):
        return f"{self.tank.name} - {self.height_cm:.1f}см = {self.volume_liters:.1f}л"


class TransferCalculation(models.Model):
    # Входные данные
    tank = models.ForeignKey(
        Tank, 
        on_delete=models.CASCADE,
        verbose_name="Резервуар"
    )
    product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE,
        verbose_name="Продукт"
    )
    density_kg_per_liter = models.FloatField(
        validators=[MinValueValidator(0.0001)],
        verbose_name="Плотность (кг/л)",
        help_text="Плотность продукта в килограммах на литр",
        default=1.0
    )
    initial_height_cm = models.FloatField(
        validators=[MinValueValidator(0)],
        verbose_name="Начальная высота (см)",
        help_text="Уровень жидкости до откачки в сантиметрах"
    )
    transfer_weight_kg = models.FloatField(
        validators=[MinValueValidator(0.01)],
        verbose_name="Вес откачки (кг)",
        help_text="Вес жидкости для откачки в килограммах"
    )
    
    # Рассчитанные результаты
    initial_volume_liters = models.FloatField(
        verbose_name="Начальный объем (л)",
        help_text="Рассчитанный начальный объем",
        default=0.0
    )
    final_volume_liters = models.FloatField(
        verbose_name="Объем после откачки (л)",
        help_text="Рассчитанный объем после откачки",
        default=0.0
    )
    volume_added_liters = models.FloatField(
        verbose_name="Откачанный объем (л)",
        help_text="Объем жидкости, откачанной из резервуара",
        default=0.0
    )
    final_height_cm = models.FloatField(
        verbose_name="Высота после откачки (см)",
        help_text="Рассчитанная высота после откачки",
        default=0.0
    )
    fill_percentage = models.FloatField(
        verbose_name="Процент заполнения",
        help_text="Процент заполнения резервуара после откачки",
        default=0.0
    )
    
    # Метаданные
    interpolation_method = models.CharField(
        max_length=20, 
        default='spline',
        verbose_name="Метод интерполяции",
        help_text="Метод, используемый для интерполяции"
    )
    notes = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Примечания"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Время расчета"
    )

    class Meta:
        verbose_name = "Расчет откачки"
        verbose_name_plural = "Расчеты откачки"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.tank.name} - {self.product.name} ({self.timestamp.strftime('%d.%m.%Y %H:%M')})"

    @property
    def tank_name(self):
        return self.tank.name
    
    @property
    def product_name(self):
        return self.product.name
        
    @property
    def density(self):
        return self.density_kg_per_liter


class VolumeWeightCalculation(models.Model):
    """Модель для расчетов объема и веса"""
    # Входные данные
    tank = models.ForeignKey(
        Tank, 
        on_delete=models.CASCADE,
        verbose_name="Резервуар"
    )
    product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE,
        verbose_name="Продукт"
    )
    height_cm = models.FloatField(
        validators=[MinValueValidator(0)],
        verbose_name="Высота жидкости (см)",
        help_text="Уровень жидкости в сантиметрах"
    )
    density_kg_per_liter = models.FloatField(
        validators=[MinValueValidator(0.0001)],
        verbose_name="Плотность (кг/л)",
        help_text="Плотность продукта в килограммах на литр",
        default=1.0
    )
    
    # Рассчитанные результаты
    volume_liters = models.FloatField(
        verbose_name="Объем (л)",
        help_text="Рассчитанный объем на основе калибровки",
        default=0.0
    )
    weight_kg = models.FloatField(
        verbose_name="Вес (кг)",
        help_text="Рассчитанный вес (объем × плотность)",
        default=0.0
    )
    fill_percentage = models.FloatField(
        verbose_name="Процент заполнения",
        help_text="Процент заполнения резервуара",
        default=0.0
    )
    
    # Метаданные
    interpolation_method = models.CharField(
        max_length=20, 
        default='spline',
        verbose_name="Метод интерполяции",
        help_text="Метод, используемый для интерполяции"
    )
    notes = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Примечания"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Время расчета"
    )

    class Meta:
        verbose_name = "Расчет объема и веса"
        verbose_name_plural = "Расчеты объема и веса"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.tank.name} - {self.product.name} ({self.timestamp.strftime('%d.%m.%Y %H:%M')})"

    @property
    def tank_name(self):
        return self.tank.name
    
    @property
    def product_name(self):
        return self.product.name
        
    @property
    def density(self):
        return self.density_kg_per_liter


class AddingCalculation(models.Model):
    """Модель для расчетов добавления жидкости"""
    # Входные данные
    tank = models.ForeignKey(
        Tank, 
        on_delete=models.CASCADE,
        verbose_name="Резервуар"
    )
    product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE,
        verbose_name="Продукт"
    )
    current_height_cm = models.FloatField(
        validators=[MinValueValidator(0)],
        verbose_name="Текущая высота (см)",
        help_text="Текущий уровень жидкости в сантиметрах"
    )
    density_kg_per_liter = models.FloatField(
        validators=[MinValueValidator(0.0001)],
        verbose_name="Плотность (кг/л)",
        help_text="Плотность продукта в килограммах на литр",
        default=1.0
    )
    amount_type = models.CharField(
        max_length=10,
        choices=[('weight', 'Вес (кг)'), ('volume', 'Объем (л)')],
        verbose_name="Тип количества",
        help_text="Тип добавляемого количества"
    )
    amount_value = models.FloatField(
        validators=[MinValueValidator(0.01)],
        verbose_name="Количество для добавления",
        help_text="Количество жидкости для добавления"
    )
    
    # Рассчитанные результаты
    current_volume_liters = models.FloatField(
        verbose_name="Текущий объем (л)",
        help_text="Рассчитанный текущий объем",
        default=0.0
    )
    current_weight_kg = models.FloatField(
        verbose_name="Текущий вес (кг)",
        help_text="Рассчитанный текущий вес",
        default=0.0
    )
    added_volume_liters = models.FloatField(
        verbose_name="Добавленный объем (л)",
        help_text="Объем жидкости, который будет добавлен",
        default=0.0
    )
    added_weight_kg = models.FloatField(
        verbose_name="Добавленный вес (кг)",
        help_text="Вес жидкости, который будет добавлен",
        default=0.0
    )
    final_volume_liters = models.FloatField(
        verbose_name="Конечный объем (л)",
        help_text="Объем после добавления",
        default=0.0
    )
    final_weight_kg = models.FloatField(
        verbose_name="Конечный вес (кг)",
        help_text="Вес после добавления",
        default=0.0
    )
    final_height_cm = models.FloatField(
        verbose_name="Конечная высота (см)",
        help_text="Высота после добавления",
        default=0.0
    )
    fill_percentage = models.FloatField(
        verbose_name="Процент заполнения",
        help_text="Процент заполнения резервуара после добавления",
        default=0.0
    )
    
    # Метаданные
    interpolation_method = models.CharField(
        max_length=20, 
        default='spline',
        verbose_name="Метод интерполяции",
        help_text="Метод, используемый для интерполяции"
    )
    notes = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Примечания"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Время расчета"
    )

    class Meta:
        verbose_name = "Расчет добавления"
        verbose_name_plural = "Расчеты добавления"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.tank.name} - {self.product.name} ({self.timestamp.strftime('%d.%m.%Y %H:%M')})"

    @property
    def tank_name(self):
        return self.tank.name
    
    @property
    def product_name(self):
        return self.product.name
        
    @property
    def density(self):
        return self.density_kg_per_liter


class DensityTemperatureCalculation(models.Model):
    """Расчет корректировки плотности по температуре"""
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Продукт"
    )
    reference_density_kg_m3 = models.FloatField(
        validators=[MinValueValidator(100)],
        verbose_name="Фактическая плотность (кг/м³)",
        help_text="Измеренная плотность при текущей температуре"
    )
    reference_temperature_c = models.FloatField(
        verbose_name="Текущая температура (°C)"
    )
    target_temperature_c = models.FloatField(
        verbose_name="Целевая температура (°C)"
    )
    thermal_expansion_coefficient = models.FloatField(
        validators=[MinValueValidator(0)],
        default=0.00065,
        verbose_name="Коэффициент объемного расширения (1/°C)",
        help_text="Типовое значение для нефтепродуктов — 0.00065"
    )
    corrected_density_kg_m3 = models.FloatField(
        verbose_name="Плотность при целевой температуре (кг/м³)",
        default=0.0
    )
    density_difference_kg_m3 = models.FloatField(
        verbose_name="Изменение плотности (кг/м³)",
        default=0.0
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Примечания"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Время расчета"
    )

    class Meta:
        verbose_name = "Расчет плотности по температуре"
        verbose_name_plural = "Расчеты плотности по температуре"
        ordering = ['-timestamp']

    def __str__(self):
        product = self.product.name if self.product else "Не указан"
        return f"{product} ({self.timestamp.strftime('%d.%m.%Y %H:%M')})"

    @property
    def product_name(self):
        return self.product.name if self.product else "—"
