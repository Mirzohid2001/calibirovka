from django import forms
from .models import Tank


class TankAdminForm(forms.ModelForm):
    class Meta:
        model = Tank
        fields = ['name', 'description', 'capacity_liters', 'height_cm']


