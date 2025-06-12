from django.urls import path
from . import views

app_name = 'calibration'

urlpatterns = [
    path('', views.home, name='home'),
    path('history/', views.history, name='history'),
    path('calculate/', views.calculate_transfer, name='calculate_transfer'),
    path('delete/<int:calculation_id>/', views.delete_calculation, name='delete_calculation'),
] 