from django.urls import path
from . import views

app_name = 'calibration'

urlpatterns = [
    path('', views.calculator_selector, name='calculator_selector'),
    path('deduction/', views.home, name='home'),
    path('volume-weight/', views.volume_weight_calculator, name='volume_weight_calculator'),
    path('adding/', views.adding_calculator, name='adding_calculator'),
    path('density/', views.density_calculator, name='density_calculator'),
    path('density-quick/', views.density_quick_calculator, name='density_quick_calculator'),
    path('processing/', views.processing_calculator, name='processing_calculator'),
    path('processing/save/', views.save_processing_calculation, name='save_processing_calculation'),
    path('processing/export-excel/', views.export_processing_excel, name='export_processing_excel'),
    # Benzin aralashma kalkulyatori o'chirilgan
    # path('gasoline-blend/products/', views.product_selection, name='product_selection'),
    # path('gasoline-blend/', views.gasoline_blend_calculator, name='gasoline_blend_calculator'),
    # path('gasoline-blend/calculate/', views.calculate_gasoline_blend, name='calculate_gasoline_blend'),
    # path('gasoline-blend/save-config/', views.save_product_configuration, name='save_product_configuration'),
    # path('gasoline-blend/configs/', views.saved_configurations_list, name='saved_configurations_list'),
    # path('gasoline-blend/configs/<int:config_id>/load/', views.load_configuration, name='load_configuration'),
    # path('gasoline-blend/delete-config/<int:config_id>/', views.delete_configuration, name='delete_configuration'),
    # path('gasoline-blend/export-excel/', views.export_blend_variants_excel, name='export_blend_variants_excel'),
    # path('gasoline-blend/compare/', views.compare_variants, name='compare_variants'),
    # path('gasoline-blend/history/<int:calculation_id>/', views.view_gasoline_blend_history, name='view_gasoline_blend_history'),
    path('history/', views.history, name='history'),
    path('calculate/', views.calculate_transfer, name='calculate_transfer'),
    path('delete/<int:calculation_id>/', views.delete_calculation, name='delete_calculation'),
] 