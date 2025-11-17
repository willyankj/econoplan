from rest_framework import serializers
from .models import CustomUser

class CustomUserDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'username') # Campos a retornar no endpoint /user/
