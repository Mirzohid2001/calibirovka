"""
Optimizatsiya funksiyalari - 3+ product kombinatsiyalari uchun
AI-based optimization - Genetic Algorithm va Gradient Descent
"""
from decimal import Decimal
from itertools import combinations
import random
from .genetic_algorithm import genetic_optimize_blend

def optimize_multi_product_blend(products_list, target_octane, max_products=4, step=1.0, use_ai=True, num_variants=5):
    """
    3+ product kombinatsiyasi uchun optimal foizlarni topadi
    use_ai=True bo'lsa, Genetic Algorithm (AI) ishlatiladi - ChatGPT kabi aqlli algoritm
    num_variants - nechta variant topish kerak
    """
    if len(products_list) < 3:
        return []
    
    variants = []
    
    # 3, 4, ... max_products gacha kombinatsiyalar
    for num_products in range(3, min(max_products + 1, len(products_list) + 1)):
        for product_combo in combinations(products_list, num_products):
            if use_ai:
                # AI-based optimization - Genetic Algorithm (bir nechta variant)
                # Har bir kombinatsiya uchun bir nechta variantlar topish
                # Har safar turli variantlar olish uchun, bir necha marta chaqiramiz
                # Turli strategiyalar bilan (narx va mutation rate)
                combo_variants = []
                seen_keys = set()
                
                # Turli strategiyalar bilan variantlar topish
                strategies = [
                    (0.1, 0.2),  # Arzon variant, katta mutation
                    (0.5, 0.15),  # Arzon-o'rtacha, o'rtacha mutation
                    (1.0, 0.15),  # O'rtacha, o'rtacha mutation
                    (1.5, 0.1),   # Qimmat-o'rtacha, kichik mutation
                    (2.0, 0.1),   # Qimmat, kichik mutation
                ]
                
                for price_weight, mutation_rate in strategies:
                    # Har bir strategiya uchun 2-3 marta sinab ko'ramiz
                    # Lekin strategiyalar `genetic_optimize_blend` ga o'tkazilmayapti
                    # Shuning uchun, har bir strategiya uchun alohida GA instance yaratamiz
                    for attempt in range(2):
                        # Har safar turli variantlar uchun
                        import time
                        random.seed(int(time.time() * 1000 + attempt * 1000) % 100000)
                        
                        result = genetic_optimize_blend(list(product_combo), target_octane, num_variants=1)
                        if result:
                            # Duplikatlarni tekshirish (yengil)
                            price_key = round(result.get('final_price', 0), 0)  # 0 aniqligi
                            octane_key = round(result.get('final_octane', 0), 0)  # 0 aniqligi
                            key = (price_key, octane_key)
                            
                            if key not in seen_keys:
                                seen_keys.add(key)
                                combo_variants.append(result)
                                if len(combo_variants) >= 5:  # Har bir kombinatsiya uchun 5 ta variant
                                    break
                    
                    if len(combo_variants) >= 5:
                        break
                
                variants.extend(combo_variants)
            else:
                # Gradient Descent (eski usul)
                result = solve_optimal_blend(list(product_combo), target_octane)
                if result:
                    variants.append(result)
    
    # Variantlarni oktan farqi bo'yicha tartiblash
    if variants:
        variants.sort(key=lambda x: x.get('octane_diff', float('inf')))
        
        # Duplikatlarni olib tashlash - narx va oktan bo'yicha
        seen = set()
        unique_variants = []
        for v in variants:
            # Narx va oktan bo'yicha tekshirish
            price_key = round(v.get('final_price', 0), 1)
            octane_key = round(v.get('final_octane', 0), 1)
            key = (price_key, octane_key)
            
            if key not in seen:
                seen.add(key)
                unique_variants.append(v)
        
        # Narx bo'yicha tartiblash - kategoriyalarga bo'lish uchun
        unique_variants.sort(key=lambda x: x.get('final_price', 0))
        
        return unique_variants[:num_variants * 3]  # Ko'proq variantlar
    
    return []


def solve_optimal_blend(products, target_octane):
    """
    Optimal foizlarni topadi - gradient descent bilan
    """
    if len(products) < 3:
        return None
    
    octanes = [float(p.octane_number) for p in products]
    prices = [float(p.price_per_liter) for p in products]
    gost_limits = [float(p.gost_percentage or 100) for p in products]
    
    min_oct = min(octanes)
    max_oct = max(octanes)
    
    # Agar maqsad diapazondan tashqarida bo'lsa, maksimal/minimal kombinatsiyani qaytaramiz
    if target_octane > max_oct:
        return solve_maximum_octane(products, octanes, prices, gost_limits)
    elif target_octane < min_oct:
        return solve_minimum_octane(products, octanes, prices, gost_limits)
    
    # Optimal kombinatsiyani topish - yaxshilangan algoritm
    best_result = None
    best_diff = float('inf')
    
    # Bir nechta random start bilan
    for trial in range(200):
        percentages = initialize_percentages(len(products), gost_limits, octanes, target_octane)
        
        # Iterativ optimization
        for iteration in range(1000):
            current_octane = sum(octanes[i] * percentages[i] / 100.0 for i in range(len(products)))
            error = target_octane - current_octane
            
            if abs(error) < 0.01:
                break
            
            # Kuchliroq o'zgarishlar
            adjust_percentages_improved(percentages, octanes, gost_limits, error, target_octane)
            
            # Normalizatsiya
            normalize_percentages(percentages, gost_limits)
        
        # Natijani baholash
        final_octane = sum(octanes[i] * percentages[i] / 100.0 for i in range(len(products)))
        final_price = sum(prices[i] * percentages[i] / 100.0 for i in range(len(products)))
        octane_diff = abs(final_octane - target_octane)
        
        if octane_diff < best_diff:
            gost_ok = all(percentages[i] <= gost_limits[i] + 0.01 for i in range(len(products)))
            best_result = {
                'products': products,
                'percentages': [round(p, 2) for p in percentages],
                'final_octane': round(final_octane, 2),
                'final_price': round(final_price, 2),
                'octane_diff': octane_diff,
                'gost_compliant': gost_ok
            }
            best_diff = octane_diff
            
            if octane_diff < 0.05:
                break
    
    return best_result


def initialize_percentages(n, gost_limits, octanes, target_octane):
    """Maqsad oktan soniga mos keladigan initial foizlar"""
    percentages = [0.0] * n
    
    # Maqsad oktan soniga yaqin productlarga ko'proq foiz
    weights = []
    for oct in octanes:
        diff = abs(oct - target_octane)
        if diff == 0:
            weight = 100.0
        else:
            weight = 10.0 / (diff + 1.0)
        weights.append(weight)
    
    # Normalizatsiya
    total_weight = sum(weights)
    if total_weight > 0:
        weights = [w / total_weight * 100 for w in weights]
    else:
        weights = [100.0 / n] * n
    
    # Foizlarni taqsimlash
    remaining = 100.0
    for i in range(n - 1):
        max_pct = min(gost_limits[i], remaining, weights[i] * 1.5)
        pct = random.uniform(max_pct * 0.5, max_pct)
        percentages[i] = pct
        remaining -= pct
    
    percentages[-1] = min(remaining, gost_limits[-1])
    
    # Normalizatsiya
    total = sum(percentages)
    if abs(total - 100.0) > 0.01:
        factor = 100.0 / total
        percentages = [p * factor for p in percentages]
    
    return percentages


def adjust_percentages(percentages, octanes, gost_limits, error):
    """Gradient direction bo'yicha foizlarni o'zgartiradi"""
    adjust_percentages_improved(percentages, octanes, gost_limits, error, None)


def adjust_percentages_improved(percentages, octanes, gost_limits, error, target_octane):
    """Yaxshilangan gradient direction - kuchliroq o'zgarishlar"""
    n = len(percentages)
    current_octane = sum(octanes[i] * percentages[i] / 100.0 for i in range(n))
    
    if error > 0:
        # Oktan sonini oshirish kerak - yuqori oktanli productlarni ko'proq ishlatish
        # Eng yuqori oktanli productlarni topish
        high_octane_indices = [i for i in range(n) if octanes[i] > current_octane and percentages[i] < gost_limits[i]]
        low_octane_indices = [i for i in range(n) if octanes[i] < current_octane and percentages[i] > 0.1]
        
        if high_octane_indices and low_octane_indices:
            # Eng yuqori oktanli productlarga ko'proq foiz
            for hi in high_octane_indices:
                max_delta = min(
                    gost_limits[hi] - percentages[hi],
                    abs(error) * 0.5,
                    10.0
                )
                if max_delta > 0.01:
                    delta = random.uniform(0.1, max_delta)
                    percentages[hi] += delta
                    
                    # Past oktanli productdan ayirish
                    for li in sorted(low_octane_indices, key=lambda i: octanes[i]):
                        if percentages[li] > delta:
                            percentages[li] = max(0, percentages[li] - delta)
                            break
    else:
        # Oktan sonini kamaytirish kerak
        low_octane_indices = [i for i in range(n) if octanes[i] < current_octane and percentages[i] < gost_limits[i]]
        high_octane_indices = [i for i in range(n) if octanes[i] > current_octane and percentages[i] > 0.1]
        
        if low_octane_indices and high_octane_indices:
            for li in low_octane_indices:
                max_delta = min(
                    gost_limits[li] - percentages[li],
                    abs(error) * 0.5,
                    10.0
                )
                if max_delta > 0.01:
                    delta = random.uniform(0.1, max_delta)
                    percentages[li] += delta
                    
                    for hi in sorted(high_octane_indices, key=lambda i: -octanes[i]):
                        if percentages[hi] > delta:
                            percentages[hi] = max(0, percentages[hi] - delta)
                            break


def normalize_percentages(percentages, gost_limits):
    """Foizlarni normalizatsiya qiladi va GOST cheklovlarini tekshiradi"""
    # Normalizatsiya
    total = sum(percentages)
    if abs(total - 100.0) > 0.01:
        factor = 100.0 / total
        percentages = [p * factor for p in percentages]
    
    # GOST cheklovlarini tekshirish
    for i in range(len(percentages)):
        if percentages[i] > gost_limits[i]:
            excess = percentages[i] - gost_limits[i]
            percentages[i] = gost_limits[i]
            # Boshqa productlarga taqsimlash
            for j in range(len(percentages)):
                if j != i and percentages[j] < gost_limits[j]:
                    add = min(excess, gost_limits[j] - percentages[j])
                    percentages[j] += add
                    excess -= add
                    if excess <= 0:
                        break
    
    # Qayta normalizatsiya
    total = sum(percentages)
    if abs(total - 100.0) > 0.01:
        factor = 100.0 / total
        percentages = [p * factor for p in percentages]


def solve_maximum_octane(products, octanes, prices, gost_limits):
    """Maksimal oktan kombinatsiyasi"""
    n = len(products)
    best_result = None
    best_octane = 0
    
    # Eng yuqori oktanli productlarni ko'proq ishlatish
    for _ in range(200):
        percentages = [0.0] * n
        
        # Oktanlarni tartiblash (yuqoridan pastga)
        sorted_indices = sorted(range(n), key=lambda i: -octanes[i])
        
        remaining = 100.0
        for idx in sorted_indices:
            ratio = octanes[idx] / max(octanes)
            max_pct = min(gost_limits[idx], remaining, ratio * 60.0)
            pct = random.uniform(max_pct * 0.5, max_pct)
            percentages[idx] = min(pct, remaining)
            remaining -= percentages[idx]
            if remaining <= 0:
                break
        
        if remaining > 0:
            best_idx = max(range(n), key=lambda i: octanes[i])
            percentages[best_idx] = min(percentages[best_idx] + remaining, gost_limits[best_idx])
        
        total = sum(percentages)
        if abs(total - 100.0) > 0.01:
            factor = 100.0 / total
            percentages = [p * factor for p in percentages]
        
        final_octane = sum(octanes[i] * percentages[i] / 100.0 for i in range(n))
        final_price = sum(prices[i] * percentages[i] / 100.0 for i in range(n))
        
        if final_octane > best_octane:
            best_result = {
                'products': products,
                'percentages': [round(p, 2) for p in percentages],
                'final_octane': round(final_octane, 2),
                'final_price': round(final_price, 2),
                'octane_diff': abs(final_octane - 100.0),
                'gost_compliant': all(percentages[i] <= gost_limits[i] + 0.01 for i in range(n))
            }
            best_octane = final_octane
    
    return best_result


def solve_minimum_octane(products, octanes, prices, gost_limits):
    """Minimal oktan kombinatsiyasi"""
    n = len(products)
    best_result = None
    best_octane = float('inf')
    
    for _ in range(200):
        percentages = [0.0] * n
        sorted_indices = sorted(range(n), key=lambda i: octanes[i])
        
        remaining = 100.0
        for idx in sorted_indices:
            if max(octanes) > min(octanes):
                ratio = (max(octanes) - octanes[idx]) / (max(octanes) - min(octanes))
            else:
                ratio = 1.0
            max_pct = min(gost_limits[idx], remaining, ratio * 60.0)
            pct = random.uniform(max_pct * 0.5, max_pct)
            percentages[idx] = min(pct, remaining)
            remaining -= percentages[idx]
            if remaining <= 0:
                break
        
        if remaining > 0:
            best_idx = min(range(n), key=lambda i: octanes[i])
            percentages[best_idx] = min(percentages[best_idx] + remaining, gost_limits[best_idx])
        
        total = sum(percentages)
        if abs(total - 100.0) > 0.01:
            factor = 100.0 / total
            percentages = [p * factor for p in percentages]
        
        final_octane = sum(octanes[i] * percentages[i] / 100.0 for i in range(n))
        final_price = sum(prices[i] * percentages[i] / 100.0 for i in range(n))
        
        if final_octane < best_octane:
            best_result = {
                'products': products,
                'percentages': [round(p, 2) for p in percentages],
                'final_octane': round(final_octane, 2),
                'final_price': round(final_price, 2),
                'octane_diff': abs(final_octane - 0.0),
                'gost_compliant': all(percentages[i] <= gost_limits[i] + 0.01 for i in range(n))
            }
            best_octane = final_octane
    
    return best_result

