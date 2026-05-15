import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ITEMS } from '../config/items';
import { FACILITIES } from '../config/facilities';
import type { Item } from '../types';

export const DEFAULT_RESOURCE_RATE_PER_MINUTE = 9999;
export const DEFAULT_FACILITY_LIMIT = 99;

export const LIMITED_FACILITY_IDS = ['forge-of-the-sky', 'depot-bus-section', 'depot-bus-port'] as const;
export type LimitedFacilityId = typeof LIMITED_FACILITY_IDS[number];

export interface AutoPlannerSettings {
    resourceRates: Record<string, number>;
    facilityLimits: Record<LimitedFacilityId, number>;
}

interface AutoPlannerSettingsState extends AutoPlannerSettings {
    setResourceRate: (itemId: string, rate: number | '') => void;
    setFacilityLimit: (facilityId: LimitedFacilityId, limit: number | '') => void;
    resetResourceRates: () => void;
    resetFacilityLimits: () => void;
    getEffectiveSettings: () => AutoPlannerSettings;
}

export const getPlannerResourceItems = () => {
    const items = Object.values(ITEMS);
    const minerals = items
        .filter(item => item.storageCategory === 'minerals')
        .sort(compareItems);
    const naturalLiquids = items
        .filter(item => item.itemCategory === 'natural_resource' && item.state === 'liquid')
        .sort(compareItems);

    return { minerals, naturalLiquids };
};

export const createDefaultResourceRates = () => {
    const { minerals, naturalLiquids } = getPlannerResourceItems();
    return [...minerals, ...naturalLiquids].reduce<Record<string, number>>((acc, item) => {
        acc[item.id] = DEFAULT_RESOURCE_RATE_PER_MINUTE;
        return acc;
    }, {});
};

export const createDefaultFacilityLimits = (): Record<LimitedFacilityId, number> => ({
    'forge-of-the-sky': DEFAULT_FACILITY_LIMIT,
    'depot-bus-section': DEFAULT_FACILITY_LIMIT,
    'depot-bus-port': DEFAULT_FACILITY_LIMIT,
});

export const getLimitedFacilityName = (facilityId: LimitedFacilityId) =>
    FACILITIES.find(facility => facility.id === facilityId)?.name || facilityId;

const compareItems = (a: Item, b: Item) =>
    (a.nameEn || a.name || a.id).localeCompare(b.nameEn || b.name || b.id);

const sanitizeNumber = (value: number | '') => {
    if (value === '') return DEFAULT_RESOURCE_RATE_PER_MINUTE;
    if (!Number.isFinite(value)) return DEFAULT_RESOURCE_RATE_PER_MINUTE;
    return Math.max(0, value);
};

const sanitizeInteger = (value: number | '') => {
    if (value === '') return DEFAULT_FACILITY_LIMIT;
    if (!Number.isFinite(value)) return DEFAULT_FACILITY_LIMIT;
    return Math.max(0, Math.floor(value));
};

export const useAutoPlannerSettingsStore = create<AutoPlannerSettingsState>()(
    persist(
        (set, get) => ({
            resourceRates: createDefaultResourceRates(),
            facilityLimits: createDefaultFacilityLimits(),
            setResourceRate: (itemId, rate) => set(state => ({
                resourceRates: {
                    ...state.resourceRates,
                    [itemId]: sanitizeNumber(rate),
                },
            })),
            setFacilityLimit: (facilityId, limit) => set(state => ({
                facilityLimits: {
                    ...state.facilityLimits,
                    [facilityId]: sanitizeInteger(limit),
                },
            })),
            resetResourceRates: () => set({ resourceRates: createDefaultResourceRates() }),
            resetFacilityLimits: () => set({ facilityLimits: createDefaultFacilityLimits() }),
            getEffectiveSettings: () => {
                const defaults = createDefaultResourceRates();
                const limitDefaults = createDefaultFacilityLimits();
                const state = get();
                return {
                    resourceRates: { ...defaults, ...state.resourceRates },
                    facilityLimits: { ...limitDefaults, ...state.facilityLimits },
                };
            },
        }),
        {
            name: 'auto-planner-settings-storage',
        }
    )
);
