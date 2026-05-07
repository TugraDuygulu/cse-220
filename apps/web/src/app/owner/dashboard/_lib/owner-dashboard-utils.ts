import { resolveApiAssetUrl, type Restaurant } from '@/lib/restaurants';

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
  primaryPhotoFile: File | null;
  primaryPhotoUrl: string;
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
    primaryPhotoFile: null,
    primaryPhotoUrl: '',
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
    primaryPhotoFile: null,
    primaryPhotoUrl: resolveApiAssetUrl(restaurant.primary_photo_url),
  };
}

export function buildRestaurantWriteFormData(
  values: RestaurantFormValues,
): FormData {
  const formData = new FormData();
  formData.append('name', values.name.trim());
  formData.append('category_ids', values.categoryId.trim());
  formData.append('description', values.description.trim());
  formData.append('address_line1', values.addressLine1.trim());
  formData.append('city', values.city.trim());
  formData.append('district', values.district.trim());
  formData.append('phone', values.phone.trim());
  formData.append('website', values.website.trim());
  formData.append('price_range', values.priceRange.trim() || '2');

  if (values.primaryPhotoFile) {
    formData.append('primary_photo', values.primaryPhotoFile);
  }

  return formData;
}
