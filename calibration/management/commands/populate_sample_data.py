from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from calibration.models import Tank, Product, CalibrationPoint


class Command(BaseCommand):
    help = 'Populate the database with sample tanks, products, and calibration data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before populating',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            CalibrationPoint.objects.all().delete()
            Tank.objects.all().delete()
            Product.objects.all().delete()

        with transaction.atomic():
            # Create sample products
            self.stdout.write('Creating sample products...')
            products_data = [
                {
                    'name': 'Crude Oil',
                    'description': 'Standard crude oil - density varies with temperature (typically 0.85 kg/L at 15°C)'
                },
                {
                    'name': 'Gasoline',
                    'description': 'Regular unleaded gasoline - density varies with temperature (typically 0.74 kg/L at 15°C)'
                },
                {
                    'name': 'Diesel Fuel',
                    'description': 'Standard diesel fuel - density varies with temperature (typically 0.832 kg/L at 15°C)'
                },
                {
                    'name': 'Jet Fuel (Kerosene)',
                    'description': 'Aviation turbine fuel - density varies with temperature (typically 0.81 kg/L at 15°C)'
                },
                {
                    'name': 'Heavy Fuel Oil',
                    'description': 'Heavy fuel oil for marine and industrial use - density varies with temperature (typically 0.98 kg/L at 15°C)'
                },
                {
                    'name': 'Water',
                    'description': 'Pure water for testing and calibration - density varies with temperature (1.0 kg/L at 15°C)'
                }
            ]

            for product_data in products_data:
                product, created = Product.objects.get_or_create(
                    name=product_data['name'],
                    defaults=product_data
                )
                if created:
                    self.stdout.write(f'  Created product: {product.name}')

            # Create sample tanks
            self.stdout.write('Creating sample tanks...')
            tanks_data = [
                {
                    'name': 'Tank A-001',
                    'description': 'Primary storage tank for crude oil',
                    'capacity_liters': 500000.00,
                    'height_cm': 1200.00
                },
                {
                    'name': 'Tank B-002',
                    'description': 'Secondary storage tank for refined products',
                    'capacity_liters': 300000.00,
                    'height_cm': 1000.00
                },
                {
                    'name': 'Tank C-003',
                    'description': 'Small capacity tank for specialty products',
                    'capacity_liters': 100000.00,
                    'height_cm': 800.00
                }
            ]

            for tank_data in tanks_data:
                tank, created = Tank.objects.get_or_create(
                    name=tank_data['name'],
                    defaults=tank_data
                )
                if created:
                    self.stdout.write(f'  Created tank: {tank.name}')

            # Create calibration data for each tank
            self.stdout.write('Creating calibration data...')
            
            # Tank A-001 calibration data (0-1200cm, 0-500000L)
            tank_a = Tank.objects.get(name='Tank A-001')
            tank_a_calibration = [
                (0, 0), (50, 8500), (100, 18000), (150, 28500), (200, 40000),
                (250, 52500), (300, 66000), (350, 80500), (400, 96000), (450, 112500),
                (500, 130000), (550, 148500), (600, 168000), (650, 188500), (700, 210000),
                (750, 232500), (800, 256000), (850, 280500), (900, 306000), (950, 332500),
                (1000, 360000), (1050, 388500), (1100, 418000), (1150, 448500), (1200, 500000)
            ]

            for height, volume in tank_a_calibration:
                CalibrationPoint.objects.get_or_create(
                    tank=tank_a,
                    height_cm=height,
                    defaults={'volume_liters': volume}
                )

            # Tank B-002 calibration data (0-1000cm, 0-300000L)
            tank_b = Tank.objects.get(name='Tank B-002')
            tank_b_calibration = [
                (0, 0), (50, 4500), (100, 10000), (150, 16500), (200, 24000),
                (250, 32500), (300, 42000), (350, 52500), (400, 64000), (450, 76500),
                (500, 90000), (550, 104500), (600, 120000), (650, 136500), (700, 154000),
                (750, 172500), (800, 192000), (850, 212500), (900, 234000), (950, 256500),
                (1000, 300000)
            ]

            for height, volume in tank_b_calibration:
                CalibrationPoint.objects.get_or_create(
                    tank=tank_b,
                    height_cm=height,
                    defaults={'volume_liters': volume}
                )

            # Tank C-003 calibration data (0-800cm, 0-100000L)
            tank_c = Tank.objects.get(name='Tank C-003')
            tank_c_calibration = [
                (0, 0), (50, 2000), (100, 4500), (150, 7500), (200, 11000),
                (250, 15000), (300, 19500), (350, 24500), (400, 30000), (450, 36000),
                (500, 42500), (550, 49500), (600, 57000), (650, 65000), (700, 73500),
                (750, 82500), (800, 100000)
            ]

            for height, volume in tank_c_calibration:
                CalibrationPoint.objects.get_or_create(
                    tank=tank_c,
                    height_cm=height,
                    defaults={'volume_liters': volume}
                )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully populated database with:\n'
                    f'  - {Product.objects.count()} products\n'
                    f'  - {Tank.objects.count()} tanks\n'
                    f'  - {CalibrationPoint.objects.count()} calibration points'
                )
            ) 