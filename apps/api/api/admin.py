"""Admin registrations for api models."""

from django.contrib import admin

from api.models import Sample


@admin.register(Sample)
class SampleAdmin(admin.ModelAdmin):
    """Admin configuration for the Sample model."""

    list_display = ("id", "name", "is_active", "created_at", "updated_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "description")
    ordering = ("-created_at",)
