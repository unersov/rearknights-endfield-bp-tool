import type { FacilityConfig, PlacedMachine, Point } from '../types';
import { FACILITIES } from '../config/facilities';
import { getRotatedDimensions } from './machineUtils';

export const OUTER_BUILD_MARGIN = 8;

export interface PlacementCheckResult {
    valid: boolean;
    reason?: string;
}

export interface PlacementRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

const WAREHOUSE_PORT_IDS = new Set(['depot-loader', 'depot-unloader']);
const DEPOT_BUS_SECTION_ID = 'depot-bus-section';
const DEPOT_BUS_SOURCE_ID = 'depot-bus-port';
const SIDES = ['top', 'right', 'bottom', 'left'] as const;

const rectsOverlap = (a: PlacementRect, b: PlacementRect) =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const rectsTouchByEdge = (a: PlacementRect, b: PlacementRect) => {
    const verticalOverlap = a.y < b.y + b.height && a.y + a.height > b.y;
    const horizontalOverlap = a.x < b.x + b.width && a.x + a.width > b.x;
    const touchesLeftRight = (a.x + a.width === b.x || b.x + b.width === a.x) && verticalOverlap;
    const touchesTopBottom = (a.y + a.height === b.y || b.y + b.height === a.y) && horizontalOverlap;
    return touchesLeftRight || touchesTopBottom;
};

export const getExpandedBounds = (gridWidth: number, gridHeight: number) => ({
    minX: -OUTER_BUILD_MARGIN,
    minY: -OUTER_BUILD_MARGIN,
    maxX: gridWidth + OUTER_BUILD_MARGIN,
    maxY: gridHeight + OUTER_BUILD_MARGIN,
});

export const isRectInsideCore = (rect: PlacementRect, gridWidth: number, gridHeight: number) =>
    rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= gridWidth && rect.y + rect.height <= gridHeight;

export const isRectInsideExpandedBounds = (rect: PlacementRect, gridWidth: number, gridHeight: number) => {
    const bounds = getExpandedBounds(gridWidth, gridHeight);
    return rect.x >= bounds.minX &&
        rect.y >= bounds.minY &&
        rect.x + rect.width <= bounds.maxX &&
        rect.y + rect.height <= bounds.maxY;
};

export const isRectFullyOutsideCore = (rect: PlacementRect, gridWidth: number, gridHeight: number) =>
    rect.x + rect.width <= 0 || rect.y + rect.height <= 0 || rect.x >= gridWidth || rect.y >= gridHeight;

export const rectCrossesCoreBoundary = (rect: PlacementRect, gridWidth: number, gridHeight: number) =>
    !isRectInsideCore(rect, gridWidth, gridHeight) && !isRectFullyOutsideCore(rect, gridWidth, gridHeight);

export const getPlacementRect = (facility: FacilityConfig, position: Point, rotation: 0 | 1 | 2 | 3): PlacementRect => {
    const dims = getRotatedDimensions(facility.width, facility.height, rotation);
    return { x: position.x, y: position.y, width: dims.width, height: dims.height };
};

const getMachinePlacementRect = (machine: PlacedMachine): PlacementRect | null => {
    const facility = FACILITIES.find(candidate => candidate.id === machine.machineId);
    if (!facility) return null;
    const dims = getRotatedDimensions(facility.width, facility.height, machine.rotation);
    return { x: machine.x, y: machine.y, width: dims.width, height: dims.height };
};

export const hasAdjacentSpecialBuilding = (
    rect: PlacementRect,
    machines: PlacedMachine[],
    specialFacilityIds: string[] = []
) => machines.some(machine => {
    if (!specialFacilityIds.includes(machine.machineId)) return false;
    const machineRect = getMachinePlacementRect(machine);
    return machineRect ? rectsTouchByEdge(rect, machineRect) : false;
});

const getAdjacentRects = (rect: PlacementRect): PlacementRect[] => [
    { x: rect.x - 1, y: rect.y, width: 1, height: rect.height },
    { x: rect.x + rect.width, y: rect.y, width: 1, height: rect.height },
    { x: rect.x, y: rect.y - 1, width: rect.width, height: 1 },
    { x: rect.x, y: rect.y + rect.height, width: rect.width, height: 1 },
];

const getBackRect = (rect: PlacementRect, facility: FacilityConfig, rotation: 0 | 1 | 2 | 3): PlacementRect => {
    const facingSide = facility.outputs[0]?.side || facility.inputs[0]?.side || 'right';
    const rotatedSide = SIDES[(SIDES.indexOf(facingSide) + rotation) % SIDES.length];
    switch (rotatedSide) {
        case 'right': return { x: rect.x - 1, y: rect.y, width: 1, height: rect.height };
        case 'left': return { x: rect.x + rect.width, y: rect.y, width: 1, height: rect.height };
        case 'bottom': return { x: rect.x, y: rect.y - 1, width: rect.width, height: 1 };
        case 'top': return { x: rect.x, y: rect.y + rect.height, width: rect.width, height: 1 };
    }
};

export const getActiveDepotBusSectionIds = (machines: PlacedMachine[]) => {
    const active = new Set<string>();
    let changed = true;

    while (changed) {
        changed = false;
        for (const machine of machines) {
            if (machine.machineId !== DEPOT_BUS_SECTION_ID || active.has(machine.id)) continue;
            const rect = getMachinePlacementRect(machine);
            if (!rect) continue;
            const adjacentRects = getAdjacentRects(rect);
            const canActivate = machines.some(other => {
                if (other.id === machine.id) return false;
                if (other.machineId !== DEPOT_BUS_SOURCE_ID && !(other.machineId === DEPOT_BUS_SECTION_ID && active.has(other.id))) return false;
                const otherRect = getMachinePlacementRect(other);
                return otherRect ? adjacentRects.some(adjacent => rectsOverlap(adjacent, otherRect)) : false;
            });
            if (canActivate) {
                active.add(machine.id);
                changed = true;
            }
        }
    }

    return active;
};

export const isDepotBusSectionActivatedAt = (rect: PlacementRect, machines: PlacedMachine[]) => {
    const active = getActiveDepotBusSectionIds(machines);
    const adjacentRects = getAdjacentRects(rect);
    return machines.some(machine => {
        if (machine.machineId !== DEPOT_BUS_SOURCE_ID && !(machine.machineId === DEPOT_BUS_SECTION_ID && active.has(machine.id))) return false;
        const machineRect = getMachinePlacementRect(machine);
        return machineRect ? adjacentRects.some(adjacent => rectsOverlap(adjacent, machineRect)) : false;
    });
};

export const hasBackAdjacentSpecialBuilding = (
    facility: FacilityConfig,
    rect: PlacementRect,
    rotation: 0 | 1 | 2 | 3,
    machines: PlacedMachine[],
    specialFacilityIds: string[] = []
) => {
    const backRect = getBackRect(rect, facility, rotation);
    return machines.some(machine => {
        if (!specialFacilityIds.includes(machine.machineId)) return false;
        const machineRect = getMachinePlacementRect(machine);
        return machineRect ? rectsOverlap(backRect, machineRect) : false;
    });
};

export const isWarehousePortOperational = (machine: PlacedMachine, machines: PlacedMachine[]) => {
    if (!WAREHOUSE_PORT_IDS.has(machine.machineId)) return true;
    const facility = FACILITIES.find(candidate => candidate.id === machine.machineId);
    const rect = getMachinePlacementRect(machine);
    if (!facility || !rect) return true;
    const activeSectionIds = getActiveDepotBusSectionIds(machines);
    const activeMachines = machines.filter(candidate =>
        candidate.machineId !== DEPOT_BUS_SECTION_ID || activeSectionIds.has(candidate.id)
    );
    return hasBackAdjacentSpecialBuilding(facility, rect, machine.rotation, activeMachines, facility.adjacentToFacilityIds);
};

export const isDepotBusSectionOperational = (machine: PlacedMachine, machines: PlacedMachine[]) =>
    machine.machineId !== DEPOT_BUS_SECTION_ID || getActiveDepotBusSectionIds(machines).has(machine.id);

export const checkPlacementRule = (
    facility: FacilityConfig,
    rect: PlacementRect,
    machines: PlacedMachine[],
    gridWidth: number,
    gridHeight: number,
    rotation: 0 | 1 | 2 | 3 = 0
): PlacementCheckResult => {
    if (!isRectInsideExpandedBounds(rect, gridWidth, gridHeight)) {
        return { valid: false, reason: '超出可放置范围' };
    }

    if (rectCrossesCoreBoundary(rect, gridWidth, gridHeight)) {
        return { valid: false, reason: '设施不能跨越原始边界' };
    }

    const rule = facility.placementRule || 'normal';
    if (rule === 'normal' && !isRectInsideCore(rect, gridWidth, gridHeight)) {
        return { valid: false, reason: '该设施不能放置在外围区域' };
    }

    if (rule === 'outsideOnly' && !isRectFullyOutsideCore(rect, gridWidth, gridHeight)) {
        return { valid: false, reason: '该设施只能放置在外围区域' };
    }

    if (rule === 'adjacentToSpecialBuilding') {
        if (!isRectInsideCore(rect, gridWidth, gridHeight)) {
            return { valid: false, reason: '该设施必须放置在原始范围内并紧贴特殊建筑' };
        }
        if (WAREHOUSE_PORT_IDS.has(facility.id)) {
            const activeSectionIds = getActiveDepotBusSectionIds(machines);
            const activeMachines = machines.filter(machine =>
                machine.machineId !== DEPOT_BUS_SECTION_ID || activeSectionIds.has(machine.id)
            );
            if (!hasBackAdjacentSpecialBuilding(facility, rect, rotation, activeMachines, facility.adjacentToFacilityIds)) {
                return { valid: false, reason: '仓库存取口必须背面紧贴特殊建筑' };
            }
        } else if (!hasAdjacentSpecialBuilding(rect, machines, facility.adjacentToFacilityIds)) {
            return { valid: false, reason: '该设施必须紧贴特殊建筑放置' };
        }
    }

    if (facility.id === DEPOT_BUS_SECTION_ID && !isDepotBusSectionActivatedAt(rect, machines)) {
        return { valid: false, reason: '仓库存取线基段必须连接源桩或已激活基段' };
    }

    return { valid: true };
};
