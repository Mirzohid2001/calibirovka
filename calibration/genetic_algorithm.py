"""
Genetic Algorithm - AI-based optimization
ChatGPT kabi "aqlli" algoritm - ideal sostavlar topish uchun
"""
import random
import copy


class GeneticAlgorithm:
    """
    Genetic Algorithm - evolyutsiya algoritmi
    Ko'p variantlarni parallel sinab ko'radi, eng yaxshilarini tanlaydi,
    va evolyutsiya jarayonida takomillashtiradi
    """
    
    def __init__(self, products, target_octane, gost_limits, prices, octanes):
        self.products = products
        self.target_octane = target_octane
        self.gost_limits = gost_limits
        self.prices = prices
        self.octanes = octanes
        self.n = len(products)
        # Har safar turli variantlar uchun seed
        random.seed()  # Random seed
        
    def find_optimal_blend(self, population_size=100, generations=50, mutation_rate=0.1, price_weight=1.0):
        """
        Optimal sostavni topish - GA algoritmi
        price_weight - narxning ahamiyati (0.1 = arzon, 2.0 = qimmat)
        """
        # 1. Initial population - boshlang'ich aholi
        population = self._create_initial_population(population_size)
        
        best_individual = None
        best_fitness = float('inf')
        
        # 2. Evolution - evolyutsiya jarayoni
        for generation in range(generations):
            # Fitness evaluation - har bir variantni baholash
            fitness_scores = []
            for individual in population:
                fitness = self._calculate_fitness(individual, price_weight=price_weight)
                fitness_scores.append((fitness, individual))
                
                if fitness < best_fitness:
                    best_fitness = fitness
                    best_individual = copy.deepcopy(individual)
            
            # Agar juda yaxshi natija topilsa, to'xtatamiz
            if best_fitness < 0.01:
                break
            
            # Selection - eng yaxshilarini tanlash (50%)
            fitness_scores.sort(key=lambda x: x[0])
            selected = [ind for _, ind in fitness_scores[:population_size // 2]]
            
            # Crossover + Mutation - yangi avlod yaratish
            new_population = selected.copy()  # Elitlar saqlanadi
            
            while len(new_population) < population_size:
                # Crossover - 2 ta yaxshi variantdan yangi yaratish
                parent1 = random.choice(selected)
                parent2 = random.choice(selected)
                child = self._crossover(parent1, parent2)
                
                # Mutation - tasodifiy o'zgarishlar
                if random.random() < mutation_rate:
                    child = self._mutate(child)
                
                # Validatsiya
                child = self._normalize_individual(child)
                
                if self._is_valid(child):
                    new_population.append(child)
            
            population = new_population
        
        # 3. Final result
        if best_individual:
            return self._individual_to_result(best_individual)
        return None
    
    def _create_initial_population(self, size):
        """Boshlang'ich aholi yaratish - turli variantlar"""
        population = []
        
        for _ in range(size):
            individual = []
            remaining = 100.0
            
            # Smart initialization - maqsad oktan soniga mos keladigan variantlar
            # Har safar turli variantlar uchun random qo'shamiz
            weights = []
            random_factor = random.uniform(0.8, 1.2)  # Turli variantlar uchun
            for oct in self.octanes:
                diff = abs(oct - self.target_octane)
                if diff == 0:
                    weight = 100.0
                else:
                    weight = (10.0 / (diff + 1.0)) * random_factor
                weights.append(weight)
            
            total_weight = sum(weights)
            if total_weight > 0:
                weights = [w / total_weight * 100 for w in weights]
            else:
                weights = [100.0 / self.n] * self.n
            
            # Foizlarni taqsimlash
            for i in range(self.n - 1):
                max_pct = min(self.gost_limits[i], remaining, weights[i] * 1.5)
                pct = random.uniform(0, max_pct)
                individual.append(pct)
                remaining -= pct
            
            individual.append(min(remaining, self.gost_limits[-1]))
            
            # Normalizatsiya
            individual = self._normalize_individual(individual)
            
            if self._is_valid(individual):
                population.append(individual)
        
        return population
    
    def _calculate_fitness(self, individual, price_weight=1.0):
        """
        Fitness function - variant qancha yaxshi
        Pastroq fitness = yaxshiroq variant
        price_weight - narxning ahamiyati (past = arzon variant, yuqori = qimmat variant)
        """
        # Oktan sonini hisoblash
        final_octane = sum(self.octanes[i] * individual[i] / 100.0 for i in range(self.n))
        
        # Oktan farqi (asosiy mezon)
        octane_diff = abs(final_octane - self.target_octane)
        
        # Narx (ikkinchi mezon)
        final_price = sum(self.prices[i] * individual[i] / 100.0 for i in range(self.n))
        
        # GOST cheklovlari
        gost_penalty = 0
        for i in range(self.n):
            if individual[i] > self.gost_limits[i]:
                gost_penalty += (individual[i] - self.gost_limits[i]) * 10
        
        # Fitness = oktan farqi + narx penalty (price_weight bilan) + GOST penalty
        # price_weight=0.1 - arzon variantlar, price_weight=2.0 - qimmat variantlar
        fitness = octane_diff * 1000 + final_price / 100.0 * price_weight + gost_penalty * 100
        
        return fitness
    
    def _crossover(self, parent1, parent2):
        """
        Crossover - 2 ta yaxshi variantdan yangi yaratish
        """
        child = []
        
        # Uniform crossover - har bir gen uchun tasodifiy tanlash
        for i in range(self.n):
            if random.random() < 0.5:
                child.append(parent1[i])
            else:
                child.append(parent2[i])
        
        return self._normalize_individual(child)
    
    def _mutate(self, individual):
        """
        Mutation - tasodifiy o'zgarishlar
        Bu "yangi g'oyalar" kiritadi
        """
        mutated = copy.deepcopy(individual)
        
        # 1-2 ta genni mutatsiya qilish
        num_mutations = random.randint(1, 2)
        
        for _ in range(num_mutations):
            i = random.randint(0, self.n - 1)
            
            # Oktan soniga mos keladigan o'zgarish
            if self.octanes[i] > self.target_octane:
                # Yuqori oktanli productni ko'paytirish
                delta = random.uniform(0.1, 3.0)
                if mutated[i] + delta <= self.gost_limits[i]:
                    mutated[i] += delta
                    # Boshqa productdan ayirish
                    j = random.randint(0, self.n - 1)
                    if j != i and mutated[j] > delta:
                        mutated[j] -= delta
            else:
                # Past oktanli productni kamaytirish
                delta = random.uniform(0.1, 3.0)
                if mutated[i] > delta:
                    mutated[i] -= delta
                    # Boshqa productga qo'shish
                    j = random.randint(0, self.n - 1)
                    if j != i and mutated[j] + delta <= self.gost_limits[j]:
                        mutated[j] += delta
        
        return self._normalize_individual(mutated)
    
    def _normalize_individual(self, individual):
        """Foizlarni normalizatsiya qilish"""
        total = sum(individual)
        
        if abs(total - 100.0) > 0.01:
            factor = 100.0 / total
            individual = [p * factor for p in individual]
        
        # GOST cheklovlarini tekshirish
        for i in range(self.n):
            if individual[i] > self.gost_limits[i]:
                excess = individual[i] - self.gost_limits[i]
                individual[i] = self.gost_limits[i]
                # Boshqa productlarga taqsimlash
                for j in range(self.n):
                    if j != i and individual[j] < self.gost_limits[j]:
                        add = min(excess, self.gost_limits[j] - individual[j])
                        individual[j] += add
                        excess -= add
                        if excess <= 0:
                            break
        
        # Qayta normalizatsiya
        total = sum(individual)
        if abs(total - 100.0) > 0.01:
            factor = 100.0 / total
            individual = [p * factor for p in individual]
        
        return individual
    
    def _is_valid(self, individual):
        """Variant to'g'ri yoki yo'qligini tekshirish"""
        # Foizlar jami 100% bo'lishi kerak
        total = sum(individual)
        if abs(total - 100.0) > 0.1:
            return False
        
        # Kamida 2 ta productda foiz bo'lishi kerak
        non_zero = sum(1 for p in individual if p > 0.01)
        if non_zero < 2:
            return False
        
        return True
    
    def _individual_to_result(self, individual):
        """Individual ni result formatiga o'tkazish"""
        final_octane = sum(self.octanes[i] * individual[i] / 100.0 for i in range(self.n))
        final_price = sum(self.prices[i] * individual[i] / 100.0 for i in range(self.n))
        octane_diff = abs(final_octane - self.target_octane)
        gost_compliant = all(individual[i] <= self.gost_limits[i] + 0.01 for i in range(self.n))
        
        # Faqat foizi > 0 bo'lgan productlarni ko'rsatish
        active_products = []
        active_percentages = []
        for i in range(self.n):
            if individual[i] > 0.01:
                active_products.append(self.products[i])
                active_percentages.append(individual[i])
        
        return {
            'products': active_products,
            'percentages': [round(p, 2) for p in active_percentages],
            'final_octane': round(final_octane, 2),
            'final_price': round(final_price, 2),
            'octane_diff': octane_diff,
            'gost_compliant': gost_compliant
        }


def genetic_optimize_blend(products, target_octane, num_variants=1):
    """
    Genetic Algorithm orqali optimal sostavni topish
    num_variants - nechta variant qaytarish kerak
    """
    if len(products) < 3:
        return None if num_variants == 1 else []
    
    octanes = [float(p.octane_number) for p in products]
    prices = [float(p.price_per_liter) for p in products]
    gost_limits = [float(p.gost_percentage or 100) for p in products]
    
    # GA algoritmi
    ga = GeneticAlgorithm(products, target_octane, gost_limits, prices, octanes)
    
    if num_variants == 1:
        # Faqat bitta eng yaxshi variant
        # Har safar turli variantlar uchun, mutation rate va price weight ni o'zgartiramiz
        import time
        # Har safar turli seed - turli variantlar uchun
        current_time_ms = int(time.time() * 1000)
        random.seed(current_time_ms % 10000)
        
        # Turli mutation rate va price weight
        mutation_rate = random.uniform(0.1, 0.3)
        price_weight = random.uniform(0.5, 2.0)
        
        result = ga.find_optimal_blend(
            population_size=150,
            generations=100,
            mutation_rate=mutation_rate,
            price_weight=price_weight
        )
        return result
    else:
        # Bir nechta variantlar - turli narx strategiyalari bilan
        variants = []
        seen_combinations = set()
        
        # Turli narx strategiyalari: arzon, o'rtacha, qimmat
        price_strategies = [0.1, 0.5, 1.0, 1.5, 2.0]  # Arzondan qimmatgacha
        
        for strategy_idx in range(num_variants):
            price_weight = price_strategies[strategy_idx % len(price_strategies)]
            
            for attempt in range(3):  # Har bir strategiya uchun 3 marta sinab ko'ramiz
                result = ga.find_optimal_blend(
                    population_size=100,
                    generations=50,
                    mutation_rate=0.2,
                    price_weight=price_weight
                )
                
                if result:
                    # Kombinatsiyani tekshirish (duplikatlar uchun)
                    combo_key = tuple(sorted([
                        (result['products'][i].id, round(result['percentages'][i], 1))
                        for i in range(len(result['products']))
                    ]))
                    
                    if combo_key not in seen_combinations:
                        seen_combinations.add(combo_key)
                        variants.append(result)
                        break  # Bu strategiya uchun variant topildi
        
        # Variantlarni narx bo'yicha tartiblash
        variants.sort(key=lambda x: x['final_price'])
        
        return variants[:num_variants] if variants else None

