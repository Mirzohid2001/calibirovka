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
