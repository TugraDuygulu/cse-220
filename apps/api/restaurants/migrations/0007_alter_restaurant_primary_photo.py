# Generated manually to align the renamed restaurant photo field with the model.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("files", "0001_initial"),
        ("restaurants", "0006_rename_restaurant_logo_to_primary_photo"),
    ]

    operations = [
        migrations.AlterField(
            model_name="restaurant",
            name="primary_photo",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="restaurant_primary_photos",
                to="files.storedfile",
            ),
        ),
    ]
