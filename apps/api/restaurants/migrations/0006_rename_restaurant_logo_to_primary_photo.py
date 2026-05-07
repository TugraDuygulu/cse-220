# Generated manually for restaurant photo support.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("restaurants", "0005_remove_restaurant_category_restaurant_categories"),
        ("files", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="restaurant",
            old_name="logo",
            new_name="primary_photo",
        ),
    ]
