"""Signals to keep Restaurant rating stats in sync with reviews."""

from django.db.models import Avg, Count
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from reviews.models import Review

@receiver(post_save, sender=Review)
def on_review_save(sender, instance, **kwargs):
    if instance.parent_id is None:
        _update_restaurant_rating(instance.restaurant)

@receiver(post_delete, sender=Review)
def on_review_delete(sender, instance, **kwargs):
    if instance.parent_id is None:
        _update_restaurant_rating(instance.restaurant)

def _update_restaurant_rating(restaurant):
    result = Review.objects.filter(
        restaurant=restaurant,
        parent__isnull=True,  
    ).aggregate(
        avg=Avg("rating"),
        count=Count("id"),
    )
    restaurant.average_rating = round(result["avg"] or 0, 2)
    restaurant.review_count = result["count"] or 0
    restaurant.save(update_fields=["average_rating", "review_count"])