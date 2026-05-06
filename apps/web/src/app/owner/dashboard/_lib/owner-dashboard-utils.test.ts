import { describe, expect, it } from 'vitest';

import type { Restaurant } from '@/lib/restaurants';
import {
  buildRestaurantWritePayload,
  emptyRestaurantFormValues,
  restaurantToFormValues,
} from './owner-dashboard-utils';

describe('owner dashboard utilities', () => {
  it('creates a compact write payload from form values', () => {
    expect(
      buildRestaurantWritePayload({
        name: '  Ada Bistro  ',
        categoryId: 'cat-1',
        description: '  Seasonal plates  ',
        addressLine1: '  Main Street 1  ',
        city: '  Istanbul  ',
        district: '  Kadikoy  ',
        phone: '  +90 555 0101  ',
        website: '  https://ada.example.com  ',
        priceRange: '2',
      }),
    ).toEqual({
      name: 'Ada Bistro',
      category_id: 'cat-1',
      description: 'Seasonal plates',
      address_line1: 'Main Street 1',
      city: 'Istanbul',
      district: 'Kadikoy',
      phone: '+90 555 0101',
      website: 'https://ada.example.com',
      price_range: '2',
    });
  });

  it('preserves optional blank fields as empty strings for updates', () => {
    expect(
      buildRestaurantWritePayload({
        ...emptyRestaurantFormValues(),
        name: 'Ada Bistro',
        categoryId: 'cat-1',
        description: 'Seasonal plates',
        addressLine1: 'Main Street 1',
        city: 'Istanbul',
      }),
    ).toMatchObject({
      district: '',
      phone: '',
      website: '',
      price_range: '2',
    });
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
    });
  });
});
