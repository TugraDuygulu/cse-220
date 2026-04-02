"""Sample model used as a boilerplate reference."""

from django.db import models


class Resturant(models.Model):
    """Example model to demonstrate project structure."""

    name = models.CharField(max_length=100)
    slug = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    website = models.TextField(blank=True)
    phone = models.TextField(max_length=20, blank=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name
