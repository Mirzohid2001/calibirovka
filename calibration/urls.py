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
    path('history/', views.history, name='history'),
    path('calculate/', views.calculate_transfer, name='calculate_transfer'),
    path('delete/<int:calculation_id>/', views.delete_calculation, name='delete_calculation'),
] 