# Reservoir Calibration Calculator

A Django web application for calculating final liquid height in reservoirs after transferring specific amounts of weight during the compounding process.

## Features

### Core Functionality
- **Reservoir Selection**: Choose from predefined reservoirs with calibration tables
- **Product Selection**: Select products (oil, gasoline, diesel, etc.)
- **Density Input**: Enter current density (varies with temperature)
- **Transfer Calculation**: Calculate final height after transferring a specific weight
- **Linear Interpolation**: Accurate height-to-volume conversions using calibration data
- **Calculation History**: Track and review past calculations with density used

### Technical Features
- **Modern UI**: Bootstrap 5 with responsive design
- **Real-time Validation**: Client-side form validation
- **AJAX Calculations**: Smooth user experience without page reloads
- **Admin Interface**: Django admin for managing data
- **Sample Data**: Pre-populated with realistic calibration data
- **Temperature-Aware**: Density input accounts for temperature variations

## Installation & Setup

### Prerequisites
- Python 3.8+
- Django 5.2+
- Virtual environment (recommended)

### Quick Start

1. **Clone/Download the project**
   ```bash
   cd calibration
   ```

2. **Activate virtual environment** (if not already active)
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies** (if not already installed)
   ```bash
   pip install django
   ```

4. **Run migrations** (already done)
   ```bash
   python manage.py migrate
   ```

5. **Start the server**
   ```bash
   python manage.py runserver
   ```

6. **Access the application**
   - Main Calculator: http://127.0.0.1:8000/
   - Admin Interface: http://127.0.0.1:8000/admin/
   - Admin credentials: username=`admin`, password=`admin123`

## Usage

### Basic Calculation Process

1. **Select a Reservoir**: Choose from Tank A-001, B-002, or C-003
2. **Select a Product**: Choose from Crude Oil, Gasoline, Diesel, etc.
3. **Enter Density**: Input current density in kg/L (varies with temperature)
4. **Enter Initial Height**: Current liquid height in centimeters
5. **Enter Transfer Weight**: Amount to transfer in kilograms
6. **Calculate**: Get the final height after transfer

### Example Calculation

- **Reservoir**: Tank A-001 (500,000L capacity)
- **Product**: Crude Oil
- **Density**: 0.8500 kg/L (at current temperature)
- **Initial Height**: 800 cm
- **Transfer Weight**: 100,000 kg
- **Result**: Final height after removing 100,000 kg of crude oil

### Calculation Logic

1. **Height → Volume**: Use calibration table to convert initial height to volume
2. **Volume → Weight**: Multiply volume by input density to get initial weight
3. **Weight Transfer**: Subtract transfer weight from initial weight
4. **Weight → Volume**: Divide remaining weight by density to get final volume
5. **Volume → Height**: Use interpolation to find final height from calibration table

### Important: Temperature and Density

**Density varies significantly with temperature!** Always use the actual measured density at the current temperature for accurate calculations. The application includes common reference densities at 15°C for guidance, but actual values should be measured or calculated based on current conditions.

## Data Management

### Admin Interface Features

- **Reservoirs**: Manage reservoir information and specifications
- **Products**: Add/edit product types (density is entered per calculation)
- **Calibration Data**: Manage height-to-volume calibration points
- **Transfer History**: View all calculation results with density used

### Sample Data Included

**Reservoirs:**
- Tank A-001: 500,000L capacity, 1200cm max height
- Tank B-002: 300,000L capacity, 1000cm max height  
- Tank C-003: 100,000L capacity, 800cm max height

**Products:**
- Crude Oil
- Gasoline
- Diesel Fuel
- Jet Fuel (Kerosene)
- Heavy Fuel Oil
- Water

**Common Density Values (at 15°C):**
- Crude Oil: ~0.850 kg/L
- Gasoline: ~0.740 kg/L
- Diesel Fuel: ~0.832 kg/L
- Jet Fuel: ~0.810 kg/L
- Heavy Fuel Oil: ~0.980 kg/L
- Water: 1.000 kg/L

### Adding New Data

Use the Django admin interface to:
1. Add new reservoirs with their specifications
2. Add calibration points for each reservoir
3. Add new product types
4. View calculation history with density values used

## Project Structure

```
calibration/
├── calibration/                 # Django app
│   ├── migrations/             # Database migrations
│   ├── management/             # Custom management commands
│   │   └── commands/
│   │       └── populate_sample_data.py
│   ├── admin.py               # Admin interface configuration
│   ├── apps.py                # App configuration
│   ├── models.py              # Data models
│   ├── urls.py                # URL routing
│   └── views.py               # View logic and calculations
├── config/                     # Django project settings
│   ├── settings.py            # Project configuration
│   ├── urls.py                # Main URL configuration
│   └── wsgi.py                # WSGI configuration
├── templates/                  # HTML templates
│   └── calibration/
│       ├── base.html          # Base template
│       ├── home.html          # Calculator page
│       └── history.html       # History page
├── static/                     # Static files
│   ├── css/
│   │   └── style.css          # Custom styles
│   └── js/
│       └── main.js            # JavaScript functionality
├── manage.py                   # Django management script
└── README.md                   # This file
```

## API Endpoints

- `GET /` - Main calculator page
- `POST /calculate/` - AJAX endpoint for calculations (includes density parameter)
- `GET /history/` - Calculation history page
- `GET /admin/` - Django admin interface

## Technical Details

### Models

- **Reservoir**: Tank information and specifications
- **Product**: Product types (without density - varies with temperature)
- **CalibrationData**: Height-to-volume mapping for each reservoir
- **TransferCalculation**: Historical calculation records (includes density used)

### Interpolation Algorithm

The application uses linear interpolation to calculate volumes and heights between calibration points:

```python
# Linear interpolation formula
ratio = (target_value - point1_value) / (point2_value - point1_value)
result = point1_result + ratio * (point2_result - point1_result)
```

### Error Handling

- Validates input ranges against calibration data
- Prevents transfers exceeding available liquid
- Validates density input (must be > 0)
- Provides clear error messages for invalid inputs
- Handles edge cases and boundary conditions

## Customization

### Adding New Reservoirs

1. Access Django admin
2. Add reservoir with basic information
3. Add calibration points (height-volume pairs)
4. Ensure calibration points cover the full range

### Modifying Calculations

The calculation logic is in `calibration/views.py`:
- `interpolate_volume_from_height()`: Height to volume conversion
- `interpolate_height_from_volume()`: Volume to height conversion
- `calculate_transfer()`: Main calculation endpoint (now includes density parameter)

### UI Customization

- Modify `templates/calibration/` for HTML structure
- Update `static/css/style.css` for styling
- Enhance `static/js/main.js` for functionality

## Troubleshooting

### Common Issues

1. **Migration Errors**: Run `python manage.py migrate`
2. **Static Files**: Ensure `STATICFILES_DIRS` is configured
3. **Template Errors**: Check template paths in settings
4. **Calculation Errors**: Verify calibration data completeness
5. **Density Validation**: Ensure density values are positive and reasonable

### Development Commands

```bash
# Create new migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Populate sample data
python manage.py populate_sample_data --clear

# Run development server
python manage.py runserver
```

## Future Enhancements

### Suggested Improvements

1. **Temperature Conversion**: Automatic density calculation from temperature
2. **Density Database**: Store temperature-density curves for products
3. **Advanced Interpolation**: Cubic spline or polynomial interpolation
4. **Multiple Transfers**: Calculate multiple sequential transfers
5. **Reporting**: PDF reports for calculations
6. **API**: REST API for external integrations
7. **Charts**: Graphical visualization of calibration curves
8. **Backup/Restore**: Database backup functionality
9. **User Management**: Multi-user support with permissions

### Scalability Considerations

- Database optimization for large calibration datasets
- Caching for frequently accessed calibration data
- Background processing for complex calculations
- Load balancing for high-traffic scenarios

## License

This project is developed for internal use. Modify and distribute as needed for your organization's requirements.

## Support

For technical support or feature requests, contact the development team or refer to the Django documentation for framework-specific issues. 