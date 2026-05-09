import { FACILITIES } from '../config/facilities';
import type { Connection, ConnectionKind, Item, PlacedMachine } from '../types';
import { canFacilityRunMultipleRecipes, findMatchingRecipeByInputs, getItemByIdIncludingDynamic, getRecipesForFacility } from './dynamicRecipes';
import { getConnectionInputs, getConnectionOutputs, isLogisticsFacility } from './facilityLogistics';
import { getRotatedPorts } from './machineUtils';
import { getFirstRecipeOutputForConnectionKind } from './recipePorts';

export const getConnectionPortKind = (machine: PlacedMachine, portIndex: number, kind: ConnectionKind): ConnectionKind => {
    const config = FACILITIES.find(facility => facility.id === machine.machineId);
    if (!config) return kind;
    const port = getConnectionOutputs(config, machine, kind)[portIndex];
    return port?.kind === 'pipe' ? 'pipe' : kind;
};

const getFullOutputPortIndex = (machine: PlacedMachine, portIndex: number, kind: ConnectionKind) => {
    const config = FACILITIES.find(facility => facility.id === machine.machineId);
    if (!config) return portIndex;

    const typedPort = getConnectionOutputs(config, machine, kind)[portIndex];
    if (!typedPort) return portIndex;

    const rotatedOutputs = getRotatedPorts(config.outputs, config.width, config.height, machine.rotation);
    const fullIndex = rotatedOutputs.findIndex(port =>
        port.x === typedPort.x &&
        port.y === typedPort.y &&
        port.side === typedPort.side &&
        (port.kind || 'item') === (typedPort.kind || 'item')
    );
    return fullIndex === -1 ? portIndex : fullIndex;
};

const itemMatchesConnectionKind = (item: Item | undefined, kind: ConnectionKind) => {
    if (!item) return false;
    if (kind === 'pipe') return item.state === 'liquid';
    return item.state !== 'liquid';
};

const oppositeSide = (side: string | undefined) => {
    switch (side) {
        case 'top': return 'bottom';
        case 'right': return 'left';
        case 'bottom': return 'top';
        case 'left': return 'right';
        default: return undefined;
    }
};

export const getConnectionCarriedItem = (
    connection: Connection,
    machines: PlacedMachine[],
    inputIdsByMachine: Map<string, string[]> = new Map(),
    allConnections: Connection[] = [],
    visitedConnectionIds: Set<string> = new Set()
): Item | undefined => {
    if (visitedConnectionIds.has(connection.id)) return undefined;
    visitedConnectionIds.add(connection.id);

    const source = machines.find(candidate => candidate.id === connection.fromOriginal.machineId);
    if (!source) return undefined;

    const sourceConfig = FACILITIES.find(facility => facility.id === source.machineId);
    if (!sourceConfig) return undefined;

    const kind = connection.kind || 'belt';
    const outputKind = getConnectionPortKind(source, connection.fromOriginal.portIndex, kind);
    const fullOutputIndex = getFullOutputPortIndex(source, connection.fromOriginal.portIndex, kind);

    if (isLogisticsFacility(sourceConfig)) {
        const outputPort = getConnectionOutputs(sourceConfig, source, kind)[connection.fromOriginal.portIndex];
        const preferredInputSide = oppositeSide(outputPort?.side);
        const incoming = allConnections.filter(candidate =>
            candidate.toOriginal?.machineId === source.id &&
            (candidate.kind || 'belt') === kind
        );
        const preferredIncoming = incoming.find(candidate => {
            const inputPort = getConnectionInputs(sourceConfig, source, kind)[candidate.toOriginal!.portIndex];
            return inputPort?.side === preferredInputSide;
        });
        const candidates = preferredIncoming ? [preferredIncoming, ...incoming.filter(candidate => candidate.id !== preferredIncoming.id)] : incoming;

        for (const incomingConnection of candidates) {
            const item = getConnectionCarriedItem(incomingConnection, machines, inputIdsByMachine, allConnections, new Set(visitedConnectionIds));
            if (itemMatchesConnectionKind(item, outputKind)) return item;
        }
        return undefined;
    }

    const portManualOutput = source.selectedOutputItemIds?.[fullOutputIndex];
    const manualOutput = portManualOutput || source.selectedMaterialId;
    const manualItem = getItemByIdIncludingDynamic(manualOutput);

    if (portManualOutput) {
        return itemMatchesConnectionKind(manualItem, outputKind) ? manualItem : undefined;
    }

    if (sourceConfig.category === 'resourcing') {
        const sourceRecipe = getRecipesForFacility(source.machineId).find(recipe =>
            manualOutput ? recipe.outputs.some(output => output.materialId === manualOutput) : recipe.outputs.length > 0
        );
        return getFirstRecipeOutputForConnectionKind(sourceRecipe, outputKind);
    }

    if (sourceConfig.category !== 'production' && sourceConfig.category !== 'processing') {
        return itemMatchesConnectionKind(manualItem, outputKind) ? manualItem : undefined;
    }

    const sourceRecipe = findMatchingRecipeByInputs(source.machineId, inputIdsByMachine.get(source.id) || [])
        || getRecipesForFacility(source.machineId).find(recipe => recipe.id === source.selectedRecipeId)
        || getRecipesForFacility(source.machineId).find(recipe =>
            recipe.outputs.some(output => output.materialId === source.selectedMaterialId)
        );
    const typedOutput = canFacilityRunMultipleRecipes(source.machineId)
        ? undefined
        : getFirstRecipeOutputForConnectionKind(sourceRecipe, outputKind);
    if (typedOutput) return typedOutput;

    return itemMatchesConnectionKind(manualItem, outputKind) ? manualItem : undefined;
};

export const getConnectionRateText = (kind: ConnectionKind) =>
    kind === 'pipe' ? '2 液体/秒' : '0.5 物品/秒';
