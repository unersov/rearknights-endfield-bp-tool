import type { ConnectionKind, FacilityConfig, PlacedMachine, Point, PortConfig } from '../types';
import { getRotatedPorts } from './machineUtils';

const LOGISTICS_ICON_MAP: Record<string, string> = {
    'item-control-port': 'control_icon',
    'pipe-control-port': 'control_icon',
    splitter: 'splitter_icon',
    converger: 'converger_icon',
    'pipe-splitter': 'pipe-splitter_icon',
    'pipe-converger': 'pipe-converger_icon',
    'belt-bridge': 'belt-bridge_icon',
    'pipe-bridge': 'pipe-bridge_icon',
    belt: 'belt',
    pipe: 'pipe',
};

export const getFacilityImageId = (facilityId: string) => LOGISTICS_ICON_MAP[facilityId] || facilityId;

export const isLogisticsFacility = (config?: FacilityConfig | null) => config?.category === 'logistics';

export const isBridgeFacilityId = (facilityId: string) => facilityId === 'belt-bridge' || facilityId === 'pipe-bridge';

export const isBridgeForKind = (facilityId: string, kind: ConnectionKind) =>
    (kind === 'belt' && facilityId === 'belt-bridge') || (kind === 'pipe' && facilityId === 'pipe-bridge');

export const isLineFacilityForKind = (facilityId: string, kind: ConnectionKind) =>
    (kind === 'belt' && facilityId === 'belt') || (kind === 'pipe' && facilityId === 'pipe');

export const canFacilityActAsConnectionNode = (facilityId: string, kind: ConnectionKind) =>
    isBridgeForKind(facilityId, kind) || isLineFacilityForKind(facilityId, kind);

export const shouldRotateFacilityImage = (facilityId: string) =>
    Boolean(LOGISTICS_ICON_MAP[facilityId]) && facilityId !== 'pipe' && !isBridgeFacilityId(facilityId);

export const getVirtualNodePorts = (kind: ConnectionKind): PortConfig[] => {
    const portKind = kind === 'pipe' ? 'pipe' : 'item';
    return [
        { x: 0, y: 0, side: 'top', kind: portKind },
        { x: 0, y: 0, side: 'right', kind: portKind },
        { x: 0, y: 0, side: 'bottom', kind: portKind },
        { x: 0, y: 0, side: 'left', kind: portKind },
    ];
};

export const getConnectionInputs = (config: FacilityConfig, machine: PlacedMachine, kind: ConnectionKind): PortConfig[] => {
    if (canFacilityActAsConnectionNode(config.id, kind)) {
        return getRotatedPorts(getVirtualNodePorts(kind), config.width, config.height, machine.rotation);
    }
    return getRotatedPorts(config.inputs, config.width, config.height, machine.rotation)
        .filter(port => (port.kind === 'pipe' ? 'pipe' : 'belt') === kind);
};

export const getConnectionOutputs = (config: FacilityConfig, machine: PlacedMachine, kind: ConnectionKind): PortConfig[] => {
    if (canFacilityActAsConnectionNode(config.id, kind)) {
        return getRotatedPorts(getVirtualNodePorts(kind), config.width, config.height, machine.rotation);
    }
    return getRotatedPorts(config.outputs, config.width, config.height, machine.rotation)
        .filter(port => (port.kind === 'pipe' ? 'pipe' : 'belt') === kind);
};

export const getNearestOutputPortIndex = (
    config: FacilityConfig,
    machine: PlacedMachine,
    kind: ConnectionKind,
    target: Point
) => {
    const outputs = getConnectionOutputs(config, machine, kind);
    if (outputs.length === 0) return -1;

    let bestIndex = 0;
    let bestDistance = Infinity;
    outputs.forEach((port, index) => {
        const absX = machine.x + port.x;
        const absY = machine.y + port.y;
        const distance = Math.abs(absX - target.x) + Math.abs(absY - target.y);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    });
    return bestIndex;
};

export const getNearestInputPortIndex = (
    config: FacilityConfig,
    machine: PlacedMachine,
    kind: ConnectionKind,
    target: Point
) => {
    const inputs = getConnectionInputs(config, machine, kind);
    if (inputs.length === 0) return -1;

    let bestIndex = 0;
    let bestDistance = Infinity;
    inputs.forEach((port, index) => {
        const absX = machine.x + port.x;
        const absY = machine.y + port.y;
        const distance = Math.abs(absX - target.x) + Math.abs(absY - target.y);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    });
    return bestIndex;
};
