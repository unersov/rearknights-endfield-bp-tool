const itemImages = import.meta.glob('../assets/items/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const facilityImages = import.meta.glob('../assets/facilities/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const assetName = (path: string) => path.split('/').pop()?.replace(/\.webp$/, '') || path;

const itemImageById = new Map(Object.entries(itemImages).map(([path, url]) => [assetName(path), url]));
const facilityImageById = new Map(Object.entries(facilityImages).map(([path, url]) => [assetName(path), url]));

export const getItemImageUrl = (itemId?: string) =>
    itemId ? itemImageById.get(itemId) || null : null;

export const getFacilityImageUrl = (facilityImageId?: string) =>
    facilityImageId ? facilityImageById.get(facilityImageId) || null : null;
