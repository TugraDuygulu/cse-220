import type { Restaurant } from '@/lib/restaurants';

export type RestaurantFormValues = {
  name: string;
  categoryId: string;
  description: string;
  addressLine1: string;
  city: string;
  district: string;
  phone: string;
  website: string;
  priceRange: string;
};

export type RestaurantWritePayload = {
  name: string;
  category_id: string;
  description: string;
  address_line1: string;
  city: string;
  district: string;
  phone: string;
  website: string;
  price_range: string;
};

export function emptyRestaurantFormValues(): RestaurantFormValues {
  return {
    name: '',
    categoryId: '',
    description: '',
    addressLine1: '',
    city: '',
    district: '',
    phone: '',
    website: '',
    priceRange: '2',
  };
}

export function restaurantToFormValues(
  restaurant: Restaurant,
): RestaurantFormValues {
  return {
    name: restaurant.name,
    categoryId: restaurant.category?.id ?? '',
    description: restaurant.description ?? '',
    addressLine1: restaurant.address_line1 ?? '',
    city: restaurant.city ?? '',
    district: restaurant.district ?? '',
    phone: restaurant.phone ?? '',
    website: restaurant.website ?? '',
    priceRange: restaurant.price_range ?? '2',
  };
}

export function buildRestaurantWritePayload(
  values: RestaurantFormValues,
): RestaurantWritePayload {
  return {
    name: values.name.trim(),
    category_id: values.categoryId.trim(),
    description: values.description.trim(),
    address_line1: values.addressLine1.trim(),
    city: values.city.trim(),
    district: values.district.trim(),
    phone: values.phone.trim(),
    website: values.website.trim(),
    price_range: values.priceRange.trim() || '2',
  };
}
