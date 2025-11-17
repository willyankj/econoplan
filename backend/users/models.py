import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    # Substitui o ID inteiro pelo UUID
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # O 'username' do AbstractUser é mantido, mas não será usado para login.
    # O email será o campo de login único.
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # 'username' não é mais obrigatório no registro

    def __str__(self):
        return self.email
