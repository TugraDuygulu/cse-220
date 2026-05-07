import { describe, expect, it } from 'vitest';

import type { Restaurant } from '@/lib/restaurants';
import {
  buildRestaurantWriteFormData,
  emptyRestaurantFormValues,
  restaurantToFormValues,
} from './owner-dashboard-utils';

describe('owner dashboard utilities', () => {
  it('creates a multipart payload from form values', () => {
    const formData = buildRestaurantWriteFormData({
      name: '  Ada Bistro  ',
      categoryId: 'cat-1',
      description: '  Seasonal plates  ',
      addressLine1: '  Main Street 1  ',
      city: '  Istanbul  ',
      district: '  Kadikoy  ',
      phone: '  +90 555 0101  ',
      website: '  https://ada.example.com  ',
      priceRange: '2',
      primaryPhotoFile: null,
      primaryPhotoUrl: '',
    });

    expect(formData.get('name')).toBe('Ada Bistro');
    expect(formData.get('category_ids')).toBe('cat-1');
    expect(formData.get('description')).toBe('Seasonal plates');
    expect(formData.get('address_line1')).toBe('Main Street 1');
    expect(formData.get('city')).toBe('Istanbul');
    expect(formData.get('district')).toBe('Kadikoy');
    expect(formData.get('phone')).toBe('+90 555 0101');
    expect(formData.get('website')).toBe('https://ada.example.com');
    expect(formData.get('price_range')).toBe('2');
  });

  it('preserves optional blank fields as empty strings for updates', () => {
    const formData = buildRestaurantWriteFormData({
      ...emptyRestaurantFormValues(),
      name: 'Ada Bistro',
      categoryId: 'cat-1',
      description: 'Seasonal plates',
      addressLine1: 'Main Street 1',
      city: 'Istanbul',
    });

    expect(formData.get('district')).toBe('');
    expect(formData.get('phone')).toBe('');
    expect(formData.get('website')).toBe('');
    expect(formData.get('price_range')).toBe('2');
  });

  it('converts an existing restaurant to editable form values', () => {
    const restaurant: Restaurant = {
      id: 'restaurant-1',
      slug: 'ada-bistro',
      name: 'Ada Bistro',
      category: { id: 'cat-1', name: 'Modern' },
      description: 'Seasonal plates',
      address_line1: 'Main Street 1',
      city: 'Istanbul',
      district: 'Kadikoy',
      phone: '+90 555 0101',
      website: 'https://ada.example.com',
      price_range: '3',
      primary_photo_url: 'https://media.example.com/primary-photo.jpg',
    };

    expect(restaurantToFormValues(restaurant)).toEqual({
      name: 'Ada Bistro',
      categoryId: 'cat-1',
      description: 'Seasonal plates',
      addressLine1: 'Main Street 1',
      city: 'Istanbul',
      district: 'Kadikoy',
      phone: '+90 555 0101',
      website: 'https://ada.example.com',
      priceRange: '3',
      primaryPhotoFile: null,
      primaryPhotoUrl: 'https://media.example.com/primary-photo.jpg',
    });
  });
});
