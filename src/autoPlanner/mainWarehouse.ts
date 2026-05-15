import type { Connection, PlacedMachine } from '../types';
import { getConnectionCarriedItem } from '../utils/connectionContent';
import { getItemByIdIncludingDynamic } from '../utils/dynamicRecipes';
import type { AutoPlannerSettings } from '../store/autoPlannerSettingsStore';

export interface MainWarehouseSnapshot {
    availableItemIds: Set<string>;
    sourceRates: Map<string, number>;
    enteredItemIds: Set<string>;
}

const WAREHOUSE_INPUT_FACILITY_IDS = new Set([
    'automation-core',
    'protocol-stash',
    'depot-loader',
]);

export const createMainWarehouseSnapshot = (
    settings: AutoPlannerSettings,
    machines: PlacedMachine[],
    connections: Connection[]
): MainWarehouseSnapshot => {
    const availableItemIds = new Set<string>();
    const sourceRates = new Map<string, number>();
    const enteredItemIds = new Set<string>();

    Object.entries(settings.resourceRates).forEach(([itemId, rate]) => {
        if (rate <= 0) return;
        availableItemIds.add(itemId);
        sourceRates.set(itemId, rate);
    });

    const inputMachineIds = new Set(
        machines
            .filter(machine => WAREHOUSE_INPUT_FACILITY_IDS.has(machine.machineId))
            .map(machine => machine.id)
    );

    connections.forEach(connection => {
        if (!connection.toOriginal || !inputMachineIds.has(connection.toOriginal.machineId)) return;
        const item = getConnectionCarriedItem(connection, machines, new Map(), connections);
        if (!item) return;
        availableItemIds.add(item.id);
        enteredItemIds.add(item.id);
    });

    machines.forEach(machine => {
        if (machine.machineId !== 'protocol-stash' || !machine.selectedMaterialId) return;
        const item = getItemByIdIncludingDynamic(machine.selectedMaterialId);
        if (!item || item.state === 'liquid') return;
        availableItemIds.add(item.id);
        enteredItemIds.add(item.id);
    });

    return { availableItemIds, sourceRates, enteredItemIds };
};

export const isWarehouseAvailable = (warehouse: MainWarehouseSnapshot, itemId: string) =>
    warehouse.availableItemIds.has(itemId);
