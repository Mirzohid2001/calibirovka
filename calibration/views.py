from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from .models import Tank, Product, TransferCalculation, VolumeWeightCalculation, AddingCalculation
import json
import logging

logger = logging.getLogger(__name__)


def home(request):
    """Главная страница с калькулятором"""
    tanks = Tank.objects.all()
    products = Product.objects.all()
    
    if request.method == 'POST':
        try:
            # Получить данные из формы
            tank_id = request.POST.get('tank')
            product_id = request.POST.get('product')
            density_str = request.POST.get('density_kg_per_liter', '').replace(',', '.')
            initial_height_str = request.POST.get('initial_height_cm', '').replace(',', '.')
            transfer_weight_str = request.POST.get('transfer_weight_kg', '').replace(',', '.')
            
            # Валидация входных данных
            if not all([tank_id, product_id, density_str, initial_height_str, transfer_weight_str]):
                messages.error(request, "Пожалуйста, заполните все поля.")
                return render(request, 'calibration/home.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            # Преобразование в числа
            try:
                density = float(density_str)
                initial_height = float(initial_height_str)
                transfer_weight = float(transfer_weight_str)
            except ValueError:
                messages.error(request, "Пожалуйста, введите корректные числовые значения.")
                return render(request, 'calibration/home.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            # Валидация диапазонов
            if density <= 0 or density > 5:
                messages.error(request, "Плотность должна быть между 0.0001 и 5.0000 кг/л")
                return render(request, 'calibration/home.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            if initial_height < 0:
                messages.error(request, "Начальная высота не может быть отрицательной")
                return render(request, 'calibration/home.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            if transfer_weight <= 0:
                messages.error(request, "Вес перекачки должен быть положительным числом")
                return render(request, 'calibration/home.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            # Получить объекты
            tank = get_object_or_404(Tank, id=tank_id)
            product = get_object_or_404(Product, id=product_id)
            
            # Проверить, что начальная высота не превышает высоту резервуара
            if initial_height > tank.height_cm:
                messages.error(request, f"Начальная высота не может превышать высоту резервуара ({tank.height_cm:.2f} см)")
                return render(request, 'calibration/home.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            # Выполнить расчеты
            try:
                # 1. Преобразовать начальную высоту в объем
                initial_volume = tank.height_to_volume(initial_height)
                
                # 2. Рассчитать удаленный объем из веса и плотности
                volume_removed = transfer_weight / density
                
                # 3. Проверить, что у нас достаточно жидкости для удаления
                if volume_removed > initial_volume:
                    messages.error(request, f"Невозможно удалить {volume_removed:.2f} л: в резервуаре только {initial_volume:.2f} л")
                    return render(request, 'calibration/home.html', {
                        'tanks': tanks,
                        'products': products
                    })
                
                # 4. Рассчитать конечный объем (удаляем жидкость)
                final_volume = initial_volume - volume_removed
                
                # 5. Преобразовать конечный объем в высоту
                final_height = tank.volume_to_height(final_volume)
                
                # 6. Рассчитать процент заполнения
                fill_percentage = (final_volume / tank.capacity_liters) * 100
                
                # 7. Определить метод интерполяции
                calibration_points_count = tank.calibrations.count()
                interpolation_method = 'spline' if calibration_points_count >= 4 else 'linear'
                
                # 8. Сохранить расчет в базе данных (сохраняем удаленный объем как положительное значение)
                calculation = TransferCalculation.objects.create(
                    tank=tank,
                    product=product,
                    density_kg_per_liter=density,
                    initial_height_cm=initial_height,
                    transfer_weight_kg=transfer_weight,
                    initial_volume_liters=initial_volume,
                    final_volume_liters=final_volume,
                    volume_added_liters=volume_removed,  # сохраняем как положительное значение удаленного объема
                    final_height_cm=final_height,
                    fill_percentage=fill_percentage,
                    interpolation_method=interpolation_method
                )
                
                # 9. Подготовить результат для отображения
                result = {
                    'tank_name': tank.name,
                    'product_name': product.name,
                    'density': density,
                    'initial_height': initial_height,
                    'transfer_weight': transfer_weight,
                    'initial_volume': initial_volume,
                    'final_volume': final_volume,
                    'volume_removed': volume_removed,
                    'final_height': final_height,
                    'fill_percentage': fill_percentage,
                    'interpolation_method': interpolation_method
                }
                
                messages.success(request, "Расчет выполнен успешно!")
                
                return render(request, 'calibration/home.html', {
                    'tanks': tanks,
                    'products': products,
                    'result': result
                })
                
            except Exception as e:
                logger.error(f"Ошибка расчета: {str(e)}")
                messages.error(request, f"Ошибка при выполнении расчета: {str(e)}")
                return render(request, 'calibration/home.html', {
                    'tanks': tanks,
                    'products': products
                })
        
        except Exception as e:
            logger.error(f"Общая ошибка: {str(e)}")
            messages.error(request, "Произошла ошибка при обработке запроса.")
            return render(request, 'calibration/home.html', {
                'tanks': tanks,
                'products': products
            })
    
    return render(request, 'calibration/home.html', {
        'tanks': tanks,
        'products': products
    })


def history(request):
    """Страница истории расчетов"""
    # Получить все типы расчетов
    transfer_calculations = TransferCalculation.objects.all().order_by('-timestamp')
    volume_weight_calculations = VolumeWeightCalculation.objects.all().order_by('-timestamp')
    adding_calculations = AddingCalculation.objects.all().order_by('-timestamp')
    
    # Объединить все расчеты и отсортировать по времени
    all_calculations = []
    
    for calc in transfer_calculations:
        all_calculations.append({
            'type': 'transfer',
            'object': calc,
            'timestamp': calc.timestamp,
            'tank_name': calc.tank_name,
            'product_name': calc.product_name,
            'description': f"Откачка: {calc.transfer_weight_kg:.2f} кг из {calc.initial_height_cm:.2f} см → {calc.final_height_cm:.2f} см"
        })
    
    for calc in volume_weight_calculations:
        all_calculations.append({
            'type': 'volume_weight',
            'object': calc,
            'timestamp': calc.timestamp,
            'tank_name': calc.tank_name,
            'product_name': calc.product_name,
            'description': f"Объем и вес: {calc.height_cm:.2f} см → {calc.volume_liters:.2f} л, {calc.weight_kg:.2f} кг"
        })
    
    for calc in adding_calculations:
        all_calculations.append({
            'type': 'adding',
            'object': calc,
            'timestamp': calc.timestamp,
            'tank_name': calc.tank_name,
            'product_name': calc.product_name,
            'description': f"Добавление: {calc.current_height_cm:.2f} см + {calc.amount_value:.2f} {'кг' if calc.amount_type == 'weight' else 'л'} → {calc.final_height_cm:.2f} см"
        })
    
    # Сортировка по времени (новые сначала)
    all_calculations.sort(key=lambda x: x['timestamp'], reverse=True)
    
    # Пагинация
    paginator = Paginator(all_calculations, 10)  # 10 расчетов на страницу
    page_number = request.GET.get('page')
    calculations = paginator.get_page(page_number)
    
    return render(request, 'calibration/history.html', {
        'calculations': calculations,
        'is_paginated': calculations.has_other_pages(),
        'page_obj': calculations
    })


def delete_calculation(request, calculation_id):
    """Удалить расчет"""
    if request.method == 'POST':
        # Попробуем найти расчет во всех трех моделях
        calculation = None
        
        # Проверяем TransferCalculation
        try:
            calculation = TransferCalculation.objects.get(id=calculation_id)
        except TransferCalculation.DoesNotExist:
            pass
        
        # Проверяем VolumeWeightCalculation
        if not calculation:
            try:
                calculation = VolumeWeightCalculation.objects.get(id=calculation_id)
            except VolumeWeightCalculation.DoesNotExist:
                pass
        
        # Проверяем AddingCalculation
        if not calculation:
            try:
                calculation = AddingCalculation.objects.get(id=calculation_id)
            except AddingCalculation.DoesNotExist:
                pass
        
        if calculation:
            calculation.delete()
            messages.success(request, "Расчет удален успешно.")
        else:
            messages.error(request, "Расчет не найден.")
    
    return redirect('calibration:history')


def interpolate_volume_from_height(reservoir, height_cm):
    """
    Interpolate volume from height using calibration data.
    Returns volume in liters.
    """
    height_cm = Decimal(str(height_cm))
    
    # Get calibration points for this reservoir
    calibration_points = CalibrationData.objects.filter(
        reservoir=reservoir
    ).order_by('height_cm')
    
    if not calibration_points.exists():
        raise ValueError(f"No calibration data found for reservoir {reservoir.name}")
    
    # Convert to list for easier manipulation
    points = list(calibration_points.values_list('height_cm', 'volume_liters'))
    
    # Check if height is exactly in our data
    for point_height, point_volume in points:
        if height_cm == point_height:
            return point_volume
    
    # Check if height is outside our calibration range
    if height_cm < points[0][0]:
        raise ValueError(f"Height {height_cm}cm is below minimum calibrated height {points[0][0]}cm")
    if height_cm > points[-1][0]:
        raise ValueError(f"Height {height_cm}cm is above maximum calibrated height {points[-1][0]}cm")
    
    # Find the two points to interpolate between
    for i in range(len(points) - 1):
        h1, v1 = points[i]
        h2, v2 = points[i + 1]
        
        if h1 <= height_cm <= h2:
            # Linear interpolation
            ratio = (height_cm - h1) / (h2 - h1)
            interpolated_volume = v1 + ratio * (v2 - v1)
            return interpolated_volume.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    raise ValueError("Unable to interpolate volume for given height")


def interpolate_height_from_volume(reservoir, volume_liters):
    """
    Interpolate height from volume using calibration data.
    Returns height in cm.
    """
    volume_liters = Decimal(str(volume_liters))
    
    # Get calibration points for this reservoir
    calibration_points = CalibrationData.objects.filter(
        reservoir=reservoir
    ).order_by('height_cm')
    
    if not calibration_points.exists():
        raise ValueError(f"No calibration data found for reservoir {reservoir.name}")
    
    # Convert to list for easier manipulation
    points = list(calibration_points.values_list('height_cm', 'volume_liters'))
    
    # Check if volume is exactly in our data
    for point_height, point_volume in points:
        if volume_liters == point_volume:
            return point_height
    
    # Check if volume is outside our calibration range
    if volume_liters < points[0][1]:
        raise ValueError(f"Volume {volume_liters}L is below minimum calibrated volume {points[0][1]}L")
    if volume_liters > points[-1][1]:
        raise ValueError(f"Volume {volume_liters}L is above maximum calibrated volume {points[-1][1]}L")
    
    # Find the two points to interpolate between
    for i in range(len(points) - 1):
        h1, v1 = points[i]
        h2, v2 = points[i + 1]
        
        if v1 <= volume_liters <= v2:
            # Linear interpolation
            ratio = (volume_liters - v1) / (v2 - v1)
            interpolated_height = h1 + ratio * (h2 - h1)
            return interpolated_height.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    raise ValueError("Unable to interpolate height for given volume")


@csrf_exempt
@require_http_methods(["POST"])
def calculate_transfer(request):
    """API endpoint для расчета перекачки (для AJAX запросов)"""
    try:
        data = json.loads(request.body)
        
        # Получить данные
        tank_id = data.get('tank_id')
        product_id = data.get('product_id')
        density = float(str(data.get('density_kg_per_liter')).replace(',', '.'))
        initial_height = float(str(data.get('initial_height_cm')).replace(',', '.'))
        transfer_weight = float(str(data.get('transfer_weight_kg')).replace(',', '.'))
        
        # Валидация
        if density <= 0 or density > 5:
            return JsonResponse({
                'success': False,
                'error': 'Плотность должна быть между 0.0001 и 5.0000 кг/л'
            })
        
        if initial_height < 0:
            return JsonResponse({
                'success': False,
                'error': 'Начальная высота не может быть отрицательной'
            })
        
        if transfer_weight <= 0:
            return JsonResponse({
                'success': False,
                'error': 'Вес перекачки должен быть положительным числом'
            })
        
        # Получить объекты
        tank = Tank.objects.get(id=tank_id)
        product = Product.objects.get(id=product_id)
        
        # Проверить высоту резервуара
        if initial_height > tank.height_cm:
            return JsonResponse({
                'success': False,
                'error': f'Начальная высота не может превышать высоту резервуара ({tank.height_cm:.2f} см)'
            })
        
        # Выполнить расчеты
        initial_volume = tank.height_to_volume(initial_height)
        volume_removed = transfer_weight / density
        
        # Проверить, что у нас достаточно жидкости для удаления
        if volume_removed > initial_volume:
            return JsonResponse({
                'success': False,
                'error': f'Невозможно удалить {volume_removed:.2f} л: в резервуаре только {initial_volume:.2f} л'
            })
        
        final_volume = initial_volume - volume_removed
        final_height = tank.volume_to_height(final_volume)
        fill_percentage = (final_volume / tank.capacity_liters) * 100
        
        # Определить метод интерполяции
        interpolation_method = 'spline' if tank.calibrations.count() >= 4 else 'linear'
        
        # Сохранить расчет
        TransferCalculation.objects.create(
            tank=tank,
            product=product,
            density_kg_per_liter=density,
            initial_height_cm=initial_height,
            transfer_weight_kg=transfer_weight,
            initial_volume_liters=initial_volume,
            final_volume_liters=final_volume,
            volume_added_liters=volume_removed,  # сохраняем как положительное значение удаленного объема
            final_height_cm=final_height,
            fill_percentage=fill_percentage,
            interpolation_method=interpolation_method
        )
        
        return JsonResponse({
            'success': True,
            'tank_name': tank.name,
            'product_name': product.name,
            'density': density,
            'initial_height': initial_height,
            'transfer_weight': transfer_weight,
            'initial_volume': initial_volume,
            'final_volume': final_volume,
            'volume_removed': volume_removed,
            'final_height': final_height,
            'fill_percentage': fill_percentage,
            'interpolation_method': interpolation_method
        })
        
    except Exception as e:
        logger.error(f"API ошибка: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Ошибка при выполнении расчета: {str(e)}'
        })


def volume_weight_calculator(request):
    """Калькулятор объема и веса"""
    tanks = Tank.objects.all()
    products = Product.objects.all()
    
    if request.method == 'POST':
        try:
            # Получить данные из формы
            tank_id = request.POST.get('tank')
            product_id = request.POST.get('product')
            density_str = request.POST.get('density_kg_per_liter', '').replace(',', '.')
            height_str = request.POST.get('height_cm', '').replace(',', '.')
            
            # Валидация входных данных
            if not all([tank_id, product_id, density_str, height_str]):
                messages.error(request, "Пожалуйста, заполните все поля.")
                return render(request, 'calibration/volume_weight.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            # Преобразование в числа
            try:
                density = float(density_str)
                height = float(height_str)
            except ValueError:
                messages.error(request, "Пожалуйста, введите корректные числовые значения.")
                return render(request, 'calibration/volume_weight.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            # Валидация диапазонов
            if density <= 0 or density > 5:
                messages.error(request, "Плотность должна быть между 0.0001 и 5.0000 кг/л")
                return render(request, 'calibration/volume_weight.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            if height < 0:
                messages.error(request, "Высота не может быть отрицательной")
                return render(request, 'calibration/volume_weight.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            # Получить объекты
            tank = get_object_or_404(Tank, id=tank_id)
            product = get_object_or_404(Product, id=product_id)
            
            # Проверить, что высота не превышает высоту резервуара
            if height > tank.height_cm:
                messages.error(request, f"Высота не может превышать высоту резервуара ({tank.height_cm:.2f} см)")
                return render(request, 'calibration/volume_weight.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            # Выполнить расчеты
            try:
                # 1. Преобразовать высоту в объем
                volume = tank.height_to_volume(height)
                
                # 2. Рассчитать вес (объем × плотность)
                weight = volume * density
                
                # 3. Рассчитать процент заполнения
                fill_percentage = (volume / tank.capacity_liters) * 100
                
                # 4. Определить метод интерполяции
                calibration_points_count = tank.calibrations.count()
                interpolation_method = 'spline' if calibration_points_count >= 4 else 'linear'
                
                # 5. Сохранить расчет в базе данных
                calculation = VolumeWeightCalculation.objects.create(
                    tank=tank,
                    product=product,
                    height_cm=height,
                    density_kg_per_liter=density,
                    volume_liters=volume,
                    weight_kg=weight,
                    fill_percentage=fill_percentage,
                    interpolation_method=interpolation_method
                )
                
                # 6. Подготовить результат для отображения
                result = {
                    'tank_name': tank.name,
                    'product_name': product.name,
                    'height': height,
                    'density': density,
                    'volume': volume,
                    'weight': weight,
                    'fill_percentage': fill_percentage,
                    'interpolation_method': interpolation_method
                }
                
                messages.success(request, "Расчет выполнен успешно!")
                
                return render(request, 'calibration/volume_weight.html', {
                    'tanks': tanks,
                    'products': products,
                    'result': result
                })
                
            except Exception as e:
                logger.error(f"Ошибка расчета: {str(e)}")
                messages.error(request, f"Ошибка при выполнении расчета: {str(e)}")
                return render(request, 'calibration/volume_weight.html', {
                    'tanks': tanks,
                    'products': products
                })
        
        except Exception as e:
            logger.error(f"Общая ошибка: {str(e)}")
            messages.error(request, "Произошла ошибка при обработке запроса.")
            return render(request, 'calibration/volume_weight.html', {
                'tanks': tanks,
                'products': products
            })
    
    return render(request, 'calibration/volume_weight.html', {
        'tanks': tanks,
        'products': products
    })


def adding_calculator(request):
    """Калькулятор добавления жидкости"""
    tanks = Tank.objects.all()
    products = Product.objects.all()
    
    if request.method == 'POST':
        try:
            # Получить данные из формы
            tank_id = request.POST.get('tank')
            product_id = request.POST.get('product')
            density_str = request.POST.get('density_kg_per_liter', '').replace(',', '.')
            current_height_str = request.POST.get('current_height_cm', '').replace(',', '.')
            amount_type = request.POST.get('amount_type')
            amount_value_str = request.POST.get('amount_value', '').replace(',', '.')
            
            # Валидация входных данных
            if not all([tank_id, product_id, density_str, current_height_str, amount_type, amount_value_str]):
                messages.error(request, "Пожалуйста, заполните все поля.")
                return render(request, 'calibration/adding.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            # Преобразование в числа
            try:
                density = float(density_str)
                current_height = float(current_height_str)
                amount_value = float(amount_value_str)
            except ValueError:
                messages.error(request, "Пожалуйста, введите корректные числовые значения.")
                return render(request, 'calibration/adding.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            # Валидация диапазонов
            if density <= 0 or density > 5:
                messages.error(request, "Плотность должна быть между 0.0001 и 5.0000 кг/л")
                return render(request, 'calibration/adding.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            if current_height < 0:
                messages.error(request, "Текущая высота не может быть отрицательной")
                return render(request, 'calibration/adding.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            if amount_value <= 0:
                messages.error(request, "Количество для добавления должно быть положительным")
                return render(request, 'calibration/adding.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            # Получить объекты
            tank = get_object_or_404(Tank, id=tank_id)
            product = get_object_or_404(Product, id=product_id)
            
            # Проверить, что текущая высота не превышает высоту резервуара
            if current_height > tank.height_cm:
                messages.error(request, f"Текущая высота не может превышать высоту резервуара ({tank.height_cm:.2f} см)")
                return render(request, 'calibration/adding.html', {
                    'tanks': tanks,
                    'products': products
                })
            
            # Выполнить расчеты
            try:
                # 1. Преобразовать текущую высоту в объем
                current_volume = tank.height_to_volume(current_height)
                
                # 2. Рассчитать текущий вес
                current_weight = current_volume * density
                
                # 3. Рассчитать добавляемые объем и вес
                if amount_type == 'weight':
                    added_weight = amount_value
                    added_volume = added_weight / density
                else:  # volume
                    added_volume = amount_value
                    added_weight = added_volume * density
                
                # 4. Рассчитать конечные значения
                final_volume = current_volume + added_volume
                final_weight = current_weight + added_weight
                
                # 5. Проверить, не превышает ли конечный объем емкость резервуара
                if final_volume > tank.capacity_liters:
                    messages.error(request, f"Невозможно добавить {added_volume:.2f} л: превысит емкость резервуара ({tank.capacity_liters:.2f} л)")
                    return render(request, 'calibration/adding.html', {
                        'tanks': tanks,
                        'products': products
                    })
                
                # 6. Преобразовать конечный объем в высоту
                final_height = tank.volume_to_height(final_volume)
                
                # 7. Рассчитать процент заполнения
                fill_percentage = (final_volume / tank.capacity_liters) * 100
                
                # 8. Определить метод интерполяции
                calibration_points_count = tank.calibrations.count()
                interpolation_method = 'spline' if calibration_points_count >= 4 else 'linear'
                
                # 9. Сохранить расчет в базе данных
                calculation = AddingCalculation.objects.create(
                    tank=tank,
                    product=product,
                    current_height_cm=current_height,
                    density_kg_per_liter=density,
                    amount_type=amount_type,
                    amount_value=amount_value,
                    current_volume_liters=current_volume,
                    current_weight_kg=current_weight,
                    added_volume_liters=added_volume,
                    added_weight_kg=added_weight,
                    final_volume_liters=final_volume,
                    final_weight_kg=final_weight,
                    final_height_cm=final_height,
                    fill_percentage=fill_percentage,
                    interpolation_method=interpolation_method
                )
                
                # 10. Подготовить результат для отображения
                result = {
                    'tank_name': tank.name,
                    'product_name': product.name,
                    'current_height': current_height,
                    'density': density,
                    'amount_type': amount_type,
                    'amount_value': amount_value,
                    'current_volume': current_volume,
                    'current_weight': current_weight,
                    'added_volume': added_volume,
                    'added_weight': added_weight,
                    'final_volume': final_volume,
                    'final_weight': final_weight,
                    'final_height': final_height,
                    'fill_percentage': fill_percentage,
                    'interpolation_method': interpolation_method
                }
                
                messages.success(request, "Расчет выполнен успешно!")
                
                return render(request, 'calibration/adding.html', {
                    'tanks': tanks,
                    'products': products,
                    'result': result
                })
                
            except Exception as e:
                logger.error(f"Ошибка расчета: {str(e)}")
                messages.error(request, f"Ошибка при выполнении расчета: {str(e)}")
                return render(request, 'calibration/adding.html', {
                    'tanks': tanks,
                    'products': products
                })
        
        except Exception as e:
            logger.error(f"Общая ошибка: {str(e)}")
            messages.error(request, "Произошла ошибка при обработке запроса.")
            return render(request, 'calibration/adding.html', {
                'tanks': tanks,
                'products': products
            })
    
    return render(request, 'calibration/adding.html', {
        'tanks': tanks,
        'products': products
    })


def calculator_selector(request):
    """Страница выбора калькулятора"""
    return render(request, 'calibration/calculator_selector.html')
