import { FACILITIES } from '../config/facilities';
import type { Connection, ConnectionKind, Direction, FacilityConfig, PlacedMachine, Point, Side } from '../types';
import { getItemByIdIncludingDynamic } from '../utils/dynamicRecipes';
import { checkCollision, getVectorFromSide } from '../utils/gridUtils';
import { getRotatedDimensions } from '../utils/machineUtils';
import { checkPlacementRule, isRectInsideCore, isRectInsideExpandedBounds } from '../utils/placementRules';
import { getConnectionInputs, getConnectionOutputs, isInputPortConnected, isOutputPortConnected } from '../utils/facilityLogistics';
import type { AutoPlannerSettings } from '../store/autoPlannerSettingsStore';
import type { ProductionGraph, ProductionNode } from './recipeResolver';
import { findPlantCycleRecipes, getItemLabel } from './recipeResolver';

export interface AutoPlannerReport {
    targets: string[];
    recipes: string[];
    facilities: Record<string, number>;
    limitedFacilities: Record<string, number>;
    warehouseSources: string[];
    producedItems: string[];
    warnings: string[];
}

export interface AutoLayoutResult {
    machines: PlacedMachine[];
    connections: Connection[];
    report: AutoPlannerReport;
}

interface ProviderRef {
    machineId: string;
    outputPortIndex?: number;
}

type PlaceResult = { machine: PlacedMachine | null; error: string | null };
type MachineRect = { x: number; y: number; width: number; height: number };
type ScoredConnectionCandidate = {
    connection: Connection;
    bridgeMachines: PlacedMachine[];
    fromRotation: Direction;
    toRotation: Direction;
    score: number;
};

const SOLID_SOURCE_OUTPUT_LIMIT = 6;
const CORE_AUTO_OUTPUT_PORT_ORDER = [3, 4, 5, 0, 1, 2];
const CORE_POSITION = { x: 8, y: 8 };
const START_X = 20;
const START_Y = 20;
const COLUMN_GAP = 13;
const ROW_GAP = 7;
const MAX_PATH_TURNS = 5;
const ROTATIONS: Direction[] = [0, 1, 2, 3];
const LOGISTICS_FACILITY_IDS = new Set([
    'belt',
    'pipe',
    'belt-bridge',
    'pipe-bridge',
    'splitter',
    'converger',
    'pipe-splitter',
    'pipe-converger',
    'item-control-port',
    'pipe-control-port',
]);

const SCORE_WEIGHTS = {
    lineLength: 80,
    turn: 1200,
    detour: 240,
    bridge: 3500,
    overlap: 5000,
    endpointDistance: 4,
    sideMismatch: 80,
    rotation: 1800,
    relatedGap: 600,
    relatedGapHard: 10000000,
    bboxArea: 0.2,
    emptyCell: 0.4,
    uselessObject: 100000,
    invalid: 100000000,
};

const getFacility = (facilityId: string) => FACILITIES.find(facility => facility.id === facilityId);

const itemKind = (itemId: string): ConnectionKind =>
    getItemByIdIncludingDynamic(itemId)?.state === 'liquid' ? 'pipe' : 'belt';

const pointKey = (point: Point) => `${point.x},${point.y}`;
const isSamePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

const machineCenter = (machine: PlacedMachine) => {
    const facility = getFacility(machine.machineId);
    if (!facility) return { x: machine.x, y: machine.y };
    const dims = getRotatedDimensions(facility.width, facility.height, machine.rotation);
    return { x: machine.x + dims.width / 2, y: machine.y + dims.height / 2 };
};

const machineRect = (machine: PlacedMachine): MachineRect | null => {
    const facility = getFacility(machine.machineId);
    if (!facility) return null;
    const dims = getRotatedDimensions(facility.width, facility.height, machine.rotation);
    return { x: machine.x, y: machine.y, width: dims.width, height: dims.height };
};

const rectEdgeGap = (a: MachineRect, b: MachineRect) => {
    const dx = Math.max(0, Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width)));
    const dy = Math.max(0, Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height)));
    return Math.max(dx, dy);
};

const rectContainsPoint = (rect: MachineRect, point: Point) =>
    point.x >= rect.x &&
    point.x < rect.x + rect.width &&
    point.y >= rect.y &&
    point.y < rect.y + rect.height;

const connectionPathIntersectsRect = (rect: MachineRect, connections: Connection[]) =>
    connections.some(connection => connection.path.some(point => rectContainsPoint(rect, point)));

const directionAlignmentPenalty = (side: Side, from: Point, to: Point) => {
    const vector = getVectorFromSide(side);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const primary = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
    if (primary.x === 0 && primary.y === 0) return 0;
    return vector.x === primary.x && vector.y === primary.y ? 0 : vector.x === -primary.x && vector.y === -primary.y ? 2 : 1;
};

const portAccessPoints = (machine: PlacedMachine) => {
    const facility = getFacility(machine.machineId);
    if (!facility || facility.category === 'logistics') return [];
    return [
        ...getConnectionInputs(facility, machine, 'belt'),
        ...getConnectionOutputs(facility, machine, 'belt'),
        ...getConnectionInputs(facility, machine, 'pipe'),
        ...getConnectionOutputs(facility, machine, 'pipe'),
    ].map(port => {
        const vector = getVectorFromSide(port.side);
        return { x: machine.x + port.x + vector.x, y: machine.y + port.y + vector.y };
    });
};

const portAccessBlockCount = (machine: PlacedMachine, machines: PlacedMachine[]) =>
    portAccessPoints(machine).filter(point =>
        machines.some(other => other.id !== machine.id && isPointInsideMachine(point, other))
    ).length;

const blockedExistingPortCount = (candidate: PlacedMachine, machines: PlacedMachine[]) =>
    machines.reduce((sum, machine) => {
        if (machine.id === candidate.id) return sum;
        return sum + portAccessPoints(machine).filter(point => isPointInsideMachine(point, candidate)).length;
    }, 0);

const downstreamOutputFlowPenalty = (machine: PlacedMachine, kind: ConnectionKind) => {
    const facility = getFacility(machine.machineId);
    if (!facility || facility.category === 'logistics') return 0;
    const outputs = getConnectionOutputs(facility, machine, kind);
    if (outputs.length === 0) return 0;
    return Math.min(...outputs.map(output =>
        output.side === 'right' ? 0 :
            output.side === 'bottom' ? 1 :
                output.side === 'top' ? 3 : 5
    ));
};

const makeMachine = (
    machineId: string,
    x: number,
    y: number,
    extra: Partial<PlacedMachine> = {}
): PlacedMachine => ({
    id: crypto.randomUUID(),
    machineId,
    x,
    y,
    rotation: 0,
    ...extra,
});

const cloneMachine = (machine: PlacedMachine): PlacedMachine => ({
    ...machine,
    selectedOutputItemIds: machine.selectedOutputItemIds ? { ...machine.selectedOutputItemIds } : machine.selectedOutputItemIds,
});

const cloneConnection = (connection: Connection): Connection => ({
    ...connection,
    fromOriginal: { ...connection.fromOriginal },
    toOriginal: connection.toOriginal ? { ...connection.toOriginal } : connection.toOriginal,
    path: connection.path.map(point => ({ ...point })),
});

const restoreMachinePrefix = (machines: PlacedMachine[], states: PlacedMachine[], keepCount: number) => {
    for (let index = 0; index < keepCount; index += 1) {
        Object.assign(machines[index], cloneMachine(states[index]));
    }
    machines.splice(keepCount);
};

const hasAnyConnection = (machineId: string, connections: Connection[]) =>
    connections.some(connection =>
        connection.fromOriginal.machineId === machineId ||
        connection.toOriginal?.machineId === machineId
    );

const rankProvidersForConsumer = (
    itemId: string,
    consumer: PlacedMachine,
    providers: Map<string, ProviderRef[]>,
    machines: PlacedMachine[],
    connections: Connection[]
) => {
    const kind = itemKind(itemId);
    const candidates = providers.get(itemId) || [];
    const consumerCenter = machineCenter(consumer);
    return candidates
        .map(provider => {
            const machine = machines.find(candidate => candidate.id === provider.machineId);
            if (!machine) return null;
            const outputUseCount = connections.filter(connection =>
                connection.fromOriginal.machineId === provider.machineId &&
                (provider.outputPortIndex === undefined || connection.fromOriginal.portIndex === provider.outputPortIndex) &&
                (connection.kind || 'belt') === kind
            ).length;
            const center = machineCenter(machine);
            const distance = Math.abs(center.x - consumerCenter.x) + Math.abs(center.y - consumerCenter.y);
            return { provider, machine, score: outputUseCount * 20000 + distance };
        })
        .filter((candidate): candidate is { provider: ProviderRef; machine: PlacedMachine; score: number } => Boolean(candidate))
        .sort((a, b) => a.score - b.score);
};

const chooseProviderForConsumer = (
    itemId: string,
    consumer: PlacedMachine,
    providers: Map<string, ProviderRef[]>,
    machines: PlacedMachine[],
    connections: Connection[]
) => rankProvidersForConsumer(itemId, consumer, providers, machines, connections)[0] || null;

const canPlace = (
    facility: FacilityConfig,
    machine: PlacedMachine,
    machines: PlacedMachine[],
    gridWidth: number,
    gridHeight: number,
    blockedConnections: Connection[] = []
) => {
    const dims = getRotatedDimensions(facility.width, facility.height, machine.rotation);
    const rect = { x: machine.x, y: machine.y, width: dims.width, height: dims.height };
    const placement = checkPlacementRule(facility, rect, machines, gridWidth, gridHeight, machine.rotation);
    return placement.valid &&
        !checkCollision(rect, machines) &&
        !connectionPathIntersectsRect(rect, blockedConnections);
};

const placeNear = (
    machineId: string,
    preferred: Point,
    machines: PlacedMachine[],
    gridWidth: number,
    gridHeight: number,
    extra: Partial<PlacedMachine> = {},
    scoreCandidate: (machine: PlacedMachine) => number = () => 0,
    blockedConnections: Connection[] = []
): PlaceResult => {
    const facility = getFacility(machineId);
    if (!facility) return { machine: null, error: `Auto layout failed: facility ${machineId} does not exist.` };

    let bestMachine: PlacedMachine | undefined;
    let bestScore = Infinity;
    let bestRadius = 0;
    for (let radius = 0; radius <= 70; radius += 1) {
        for (let dy = -radius; dy <= radius; dy += 1) {
            for (let dx = -radius; dx <= radius; dx += 1) {
                if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                for (const rotation of ROTATIONS) {
                    const machine = makeMachine(machineId, preferred.x + dx, preferred.y + dy, { ...extra, rotation });
                    if (!canPlace(facility, machine, machines, gridWidth, gridHeight, blockedConnections)) continue;
                    const distance = Math.abs(dx) + Math.abs(dy);
                    const rect = machineRect(machine);
                    const compactness = rect
                        ? machines.reduce((sum, existing) => {
                            const existingRect = machineRect(existing);
                            return existingRect ? sum + Math.min(16, rectEdgeGap(rect, existingRect)) : sum;
                        }, 0)
                        : 0;
                    const portClearance = portAccessBlockCount(machine, machines) + blockedExistingPortCount(machine, machines);
                    const score = distance * 30 + compactness + portClearance * 20000 + machine.rotation * 500 + scoreCandidate(machine);
                    if (score < bestScore) {
                        bestMachine = machine;
                        bestScore = score;
                        bestRadius = radius;
                    }
                }
            }
        }
        if (bestMachine && radius >= bestRadius + 5) {
            machines.push(bestMachine);
            return { machine: bestMachine, error: null };
        }
    }

    if (bestMachine) {
        machines.push(bestMachine);
        return { machine: bestMachine, error: null };
    }

    return { machine: null, error: `Auto layout failed: cannot legally place ${facility.name}.` };
};

const placeDepotPair = (
    x: number,
    y: number,
    machines: PlacedMachine[],
    gridWidth: number,
    gridHeight: number,
    mode: 'loader' | 'unloader',
    selectedMaterialId?: string,
    blockedConnections: Connection[] = []
) => {
    const startMachineCount = machines.length;
    const bus = placeNear('depot-bus-port', { x: x + 1, y }, machines, gridWidth, gridHeight, {}, () => 0, blockedConnections);
    if (!bus.machine) return { port: null, error: bus.error };

    const portId = mode === 'loader' ? 'depot-loader' : 'depot-unloader';
    const port = makeMachine(portId, x, y, selectedMaterialId ? { selectedMaterialId } : {});
    const facility = getFacility(portId);
    if (!facility || !canPlace(facility, port, machines, gridWidth, gridHeight, blockedConnections)) {
        machines.splice(startMachineCount);
        return { port: null, error: `Auto layout failed: cannot place ${facility?.name || portId} beside depot bus.` };
    }
    machines.push(port);
    return { port, error: null };
};

const makeDepotCandidates = (source: PlacedMachine, index: number, width: number, height: number, local: boolean) => {
    const rawCandidates: Point[] = [];
    for (const radius of [4, 6, 8, 12, 16, 22]) {
        rawCandidates.push(
            { x: source.x + radius, y: source.y },
            { x: source.x + radius, y: source.y + 8 },
            { x: source.x + radius, y: source.y - 8 },
            { x: source.x, y: source.y + radius },
            { x: source.x + 8, y: source.y + radius },
            { x: source.x - 8, y: source.y + radius },
            { x: source.x, y: source.y - radius },
            { x: source.x + 8, y: source.y - radius },
        );
    }
    if (!local) {
        rawCandidates.push({ x: 184, y: 24 + index * 8 }, { x: 176, y: 24 + index * 8 }, { x: 184, y: 40 + index * 8 });
    }

    return rawCandidates.map(candidate => ({
        x: Math.max(1, Math.min(width - 3, candidate.x)),
        y: Math.max(1, Math.min(height - 4, candidate.y)),
    }));
};

const isPointInsideMachine = (point: Point, machine: PlacedMachine) => {
    const facility = getFacility(machine.machineId);
    if (!facility) return false;
    const dims = getRotatedDimensions(facility.width, facility.height, machine.rotation);
    return point.x >= machine.x &&
        point.x < machine.x + dims.width &&
        point.y >= machine.y &&
        point.y < machine.y + dims.height;
};

const pointHasMachine = (point: Point, machines: PlacedMachine[]) =>
    machines.some(machine => isPointInsideMachine(point, machine));

const addBridgeForPathOverlaps = (
    path: Point[],
    kind: ConnectionKind,
    machines: PlacedMachine[],
    connections: Connection[],
    gridWidth: number,
    gridHeight: number
) => {
    const bridgeId = kind === 'pipe' ? 'pipe-bridge' : 'belt-bridge';
    const bridge = getFacility(bridgeId);
    if (!bridge) return true;

    const occupied = new Map<string, Connection[]>();
    connections
        .filter(connection => (connection.kind || 'belt') === kind)
        .forEach(connection => {
            connection.path.slice(1, -1).forEach(point => {
                const key = pointKey(point);
                const list = occupied.get(key) || [];
                list.push(connection);
                occupied.set(key, list);
            });
        });

    for (let index = 1; index < path.length - 1; index += 1) {
        const point = path[index];
        const existingConnectionsAtPoint = occupied.get(pointKey(point));
        if (!existingConnectionsAtPoint) continue;

        const newDirection = isStraightThroughPathPoint(path, index)
            ? directionBetween(path[index - 1], path[index])
            : null;
        if (!newDirection) return false;

        let needsBridge = false;
        for (const existingConnection of existingConnectionsAtPoint) {
            const existingDirection = pathDirectionAtPoint(existingConnection.path, point);
            if (!existingDirection) return false;
            if (existingDirection === newDirection) return false;
            needsBridge = true;
        }
        if (!needsBridge) continue;

        const machineAtPoint = machines.find(machine => isPointInsideMachine(point, machine));
        if (machineAtPoint && machineAtPoint.machineId !== bridgeId) return false;
        if (machineAtPoint?.machineId === bridgeId) continue;
        const machine = makeMachine(bridgeId, point.x, point.y);
        if (!canPlace(bridge, machine, machines, gridWidth, gridHeight)) return false;
        machines.push(machine);
    }

    return true;
};

const pathTurns = (path: Point[]) => {
    let turns = 0;
    let previousDirection: 'h' | 'v' | null = null;
    for (let index = 1; index < path.length; index += 1) {
        const from = path[index - 1];
        const to = path[index];
        const currentDirection = from.x !== to.x && from.y === to.y
            ? 'h'
            : from.y !== to.y && from.x === to.x
                ? 'v'
                : null;
        if (!currentDirection) continue;
        if (previousDirection && previousDirection !== currentDirection) turns += 1;
        previousDirection = currentDirection;
    }
    return turns;
};

const directionBetween = (from: Point, to: Point): 'h' | 'v' | null => {
    if (from.x !== to.x && from.y === to.y) return 'h';
    if (from.y !== to.y && from.x === to.x) return 'v';
    return null;
};

const isStraightThroughPathPoint = (path: Point[], index: number) => {
    if (index <= 0 || index >= path.length - 1) return false;
    const before = directionBetween(path[index - 1], path[index]);
    const after = directionBetween(path[index], path[index + 1]);
    return before !== null && before === after;
};

const pathDirectionAtPoint = (path: Point[], point: Point) => {
    const index = path.findIndex(candidate => isSamePoint(candidate, point));
    if (index <= 0 || index >= path.length - 1) return null;
    if (!isStraightThroughPathPoint(path, index)) return null;
    return directionBetween(path[index - 1], path[index]);
};

const pointInsideBlockedMachine = (
    point: Point,
    machines: PlacedMachine[],
    allowedLogisticsIds: Set<string> = new Set()
) => machines.some(machine =>
    !allowedLogisticsIds.has(machine.id) &&
    isPointInsideMachine(point, machine)
);

const pathManhattan = (path: Point[]) => {
    if (path.length < 2) return 0;
    const start = path[0];
    const end = path[path.length - 1];
    return Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
};

const countPathOverlaps = (path: Point[], connections: Connection[], kind: ConnectionKind) => {
    const occupied = new Set<string>();
    connections
        .filter(connection => (connection.kind || 'belt') === kind)
        .forEach(connection => connection.path.slice(1, -1).forEach(point => occupied.add(pointKey(point))));
    return path.slice(1, -1).filter(point => occupied.has(pointKey(point))).length;
};

const pathScore = (path: Point[], connections: Connection[] = [], kind: ConnectionKind = 'belt') => {
    const turns = pathTurns(path);
    if (turns > MAX_PATH_TURNS) return SCORE_WEIGHTS.invalid + turns * SCORE_WEIGHTS.turn;
    const length = Math.max(0, path.length - 1);
    const detour = Math.max(0, length - pathManhattan(path));
    return length * SCORE_WEIGHTS.lineLength +
        turns * SCORE_WEIGHTS.turn +
        detour * SCORE_WEIGHTS.detour +
        countPathOverlaps(path, connections, kind) * SCORE_WEIGHTS.overlap;
};

const hasRepeatedPoint = (path: Point[]) => {
    const seen = new Set<string>();
    for (const point of path) {
        const key = pointKey(point);
        if (seen.has(key)) return true;
        seen.add(key);
    }
    return false;
};

const getConnectionEndpointMachineIds = (connection: Connection) =>
    new Set([
        connection.fromOriginal.machineId,
        ...(connection.toOriginal ? [connection.toOriginal.machineId] : []),
    ]);

const validateConnectionGeometry = (
    connection: Connection,
    machines: PlacedMachine[],
    connections: Connection[]
) => {
    const kind = connection.kind || 'belt';
    const bridgeId = kind === 'pipe' ? 'pipe-bridge' : 'belt-bridge';
    const endpointIds = getConnectionEndpointMachineIds(connection);

    if (pathTurns(connection.path) > MAX_PATH_TURNS) {
        return `${kind} route has more than ${MAX_PATH_TURNS} turns`;
    }

    for (let index = 1; index < connection.path.length - 1; index += 1) {
        const point = connection.path[index];
        const machinesAtPoint = machines.filter(machine => isPointInsideMachine(point, machine));
        for (const machine of machinesAtPoint) {
            if (endpointIds.has(machine.id)) return `${kind} route crosses endpoint facility footprint`;
            if (machine.machineId !== bridgeId) return `${kind} route overlaps ${getFacility(machine.machineId)?.name || machine.machineId}`;
            if (!isStraightThroughPathPoint(connection.path, index)) return `${kind} bridge is used as a turn`;
        }

        const overlappingConnections = connections.filter(candidate =>
            candidate.id !== connection.id &&
            candidate.path.some((candidatePoint, candidateIndex) =>
                candidateIndex > 0 &&
                candidateIndex < candidate.path.length - 1 &&
                isSamePoint(candidatePoint, point)
            )
        );

        for (const overlappingConnection of overlappingConnections) {
            const overlappingKind = overlappingConnection.kind || 'belt';
            const existingDirection = pathDirectionAtPoint(overlappingConnection.path, point);
            const currentDirection = pathDirectionAtPoint(connection.path, point);
            if (!existingDirection || !currentDirection) return `${kind} route overlaps another route at a turn`;
            if (overlappingKind !== kind) return `${kind} route overlaps ${overlappingKind}`;
            if (existingDirection === currentDirection) return `${kind} route stacks on another ${kind} route`;
            const hasBridge = machinesAtPoint.some(machine => machine.machineId === bridgeId);
            if (!hasBridge) return `${kind} route crosses another route without a bridge`;
        }
    }

    return null;
};

const endpointGapPenalty = (from: PlacedMachine, to: PlacedMachine) => {
    const fromRect = machineRect(from);
    const toRect = machineRect(to);
    if (!fromRect || !toRect) return 0;
    const gap = rectEdgeGap(fromRect, toRect);
    return gap >= 5
        ? SCORE_WEIGHTS.relatedGapHard + gap * SCORE_WEIGHTS.relatedGap
        : gap * SCORE_WEIGHTS.relatedGap;
};

const getOccupiedLayoutStats = (machines: PlacedMachine[], connections: Connection[]) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const occupied = new Set<string>();

    const addPoint = (point: Point) => {
        occupied.add(pointKey(point));
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x + 1);
        maxY = Math.max(maxY, point.y + 1);
    };

    machines.forEach(machine => {
        const rect = machineRect(machine);
        if (!rect) return;
        for (let y = rect.y; y < rect.y + rect.height; y += 1) {
            for (let x = rect.x; x < rect.x + rect.width; x += 1) addPoint({ x, y });
        }
    });
    connections.forEach(connection => connection.path.forEach(addPoint));

    if (occupied.size === 0 || minX === Infinity) return { area: 0, occupied: 0, empty: 0, coverage: 1 };
    const area = Math.max(1, (maxX - minX) * (maxY - minY));
    return { area, occupied: occupied.size, empty: Math.max(0, area - occupied.size), coverage: occupied.size / area };
};

const layoutScore = (machines: PlacedMachine[], connections: Connection[]) => {
    const stats = getOccupiedLayoutStats(machines, connections);
    const lineScore = connections.reduce((sum, connection) => sum + pathScore(connection.path, connections, connection.kind || 'belt'), 0);
    const gapScore = connections.reduce((sum, connection) => {
        const from = machines.find(machine => machine.id === connection.fromOriginal.machineId);
        const to = connection.toOriginal
            ? machines.find(machine => machine.id === connection.toOriginal?.machineId)
            : undefined;
        return from && to ? sum + endpointGapPenalty(from, to) : sum + SCORE_WEIGHTS.invalid;
    }, 0);
    const logisticsPenalty = machines.filter(machine => LOGISTICS_FACILITY_IDS.has(machine.machineId)).length * 8;
    return lineScore + gapScore + stats.area * SCORE_WEIGHTS.bboxArea + stats.empty * SCORE_WEIGHTS.emptyCell + logisticsPenalty;
};

const connectionFillsRelatedGap = (connection: Connection, fromRect: MachineRect, toRect: MachineRect) => {
    const length = Math.max(0, connection.path.length - 1);
    const manhattan = pathManhattan(connection.path);
    if (pathTurns(connection.path) > MAX_PATH_TURNS || length > manhattan + 4) return false;
    const minX = Math.min(fromRect.x, toRect.x);
    const maxX = Math.max(fromRect.x + fromRect.width - 1, toRect.x + toRect.width - 1);
    const minY = Math.min(fromRect.y, toRect.y);
    const maxY = Math.max(fromRect.y + fromRect.height - 1, toRect.y + toRect.height - 1);
    return connection.path.slice(1, -1).some(point =>
        point.x >= minX &&
        point.x <= maxX &&
        point.y >= minY &&
        point.y <= maxY
    );
};

const findOccupiedAwarePathCandidate = (
    start: Point,
    end: Point,
    machines: PlacedMachine[],
    connections: Connection[],
    startSide: Side,
    endSide: Side,
    kind: ConnectionKind,
    gridWidth: number,
    gridHeight: number,
    options: { corridorPadding: number; turnPenalty: number; compactWeight: number; neighborOrder: number[] }
) => {
    const startVector = getVectorFromSide(startSide);
    const endVector = getVectorFromSide(endSide);
    const realStart = { x: start.x + startVector.x, y: start.y + startVector.y };
    const realEnd = { x: end.x + endVector.x, y: end.y + endVector.y };
    const corridor = {
        minX: Math.max(0, Math.min(realStart.x, realEnd.x) - options.corridorPadding),
        maxX: Math.min(gridWidth - 1, Math.max(realStart.x, realEnd.x) + options.corridorPadding),
        minY: Math.max(0, Math.min(realStart.y, realEnd.y) - options.corridorPadding),
        maxY: Math.min(gridHeight - 1, Math.max(realStart.y, realEnd.y) + options.corridorPadding),
    };
    const compactPenalty = (point: Point) => {
        const dx = point.x < corridor.minX ? corridor.minX - point.x : point.x > corridor.maxX ? point.x - corridor.maxX : 0;
        const dy = point.y < corridor.minY ? corridor.minY - point.y : point.y > corridor.maxY ? point.y - corridor.maxY : 0;
        return (dx + dy) * options.compactWeight;
    };
    const lineBlocked = new Set<string>();
    connections
        .filter(connection => (connection.kind || 'belt') === kind)
        .forEach(connection => connection.path.forEach(point => lineBlocked.add(pointKey(point))));
    const allowedPointOwners = new Map<string, Set<string>>([
        [pointKey(realStart), new Set(machines.filter(machine => isPointInsideMachine(start, machine)).map(machine => machine.id))],
        [pointKey(realEnd), new Set(machines.filter(machine => isPointInsideMachine(end, machine)).map(machine => machine.id))],
    ]);

    const isInsideBounds = (point: Point) => {
        const rect = { x: point.x, y: point.y, width: 1, height: 1 };
        return kind === 'pipe'
            ? isRectInsideExpandedBounds(rect, gridWidth, gridHeight)
            : isRectInsideCore(rect, gridWidth, gridHeight);
    };

    const isBlocked = (point: Point) => {
        if (!isInsideBounds(point)) return true;
        if (lineBlocked.has(pointKey(point))) return true;
        const allowedOwners = allowedPointOwners.get(pointKey(point));
        if (allowedOwners) {
            return machines.some(machine => !allowedOwners.has(machine.id) && isPointInsideMachine(point, machine));
        }
        return pointInsideBlockedMachine(point, machines);
    };

    if (isBlocked(realStart) || isBlocked(realEnd)) return null;

    const open: Array<Point & { g: number; f: number; parent: string | null }> = [{
        ...realStart,
        g: 0,
        f: Math.abs(realStart.x - realEnd.x) + Math.abs(realStart.y - realEnd.y),
        parent: null,
    }];
    const nodes = new Map<string, Point & { g: number; f: number; parent: string | null }>();
    nodes.set(pointKey(realStart), open[0]);
    const closed = new Set<string>();

    for (let iterations = 0; open.length > 0 && iterations < 2500; iterations += 1) {
        open.sort((a, b) => a.f - b.f);
        const current = open.shift()!;
        const currentKey = pointKey(current);
        if (closed.has(currentKey)) continue;
        closed.add(currentKey);

        if (isSamePoint(current, realEnd)) {
            const path: Point[] = [];
            let cursor: typeof current | undefined = current;
            while (cursor) {
                path.push({ x: cursor.x, y: cursor.y });
                cursor = cursor.parent ? nodes.get(cursor.parent) : undefined;
            }
            path.reverse();
            const fullPath = [start, ...path, end].filter((point, index, list) => index === 0 || !isSamePoint(point, list[index - 1]));
            return hasRepeatedPoint(fullPath) ? null : fullPath;
        }

        const neighborBase = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 },
        ];
        const neighbors = options.neighborOrder.map(index => neighborBase[index]);

        for (const neighbor of neighbors) {
            const neighborKey = pointKey(neighbor);
            if (closed.has(neighborKey) || isBlocked(neighbor)) continue;

            const parent = current.parent ? nodes.get(current.parent) : undefined;
            const turnPenalty = parent &&
                ((parent.x !== current.x && current.x !== neighbor.x) ||
                    (parent.y !== current.y && current.y !== neighbor.y))
                ? options.turnPenalty
                : 0;
            const overlapPenalty = lineBlocked.has(neighborKey) ? 40 : 0;
            const g = current.g + 1 + turnPenalty + overlapPenalty + compactPenalty(neighbor);
            const h = Math.abs(neighbor.x - realEnd.x) + Math.abs(neighbor.y - realEnd.y);
            const existing = nodes.get(neighborKey);
            if (existing && existing.g <= g) continue;

            const node = { ...neighbor, g, f: g + h, parent: currentKey };
            nodes.set(neighborKey, node);
            open.push(node);
        }
    }

    return null;
};

const findOccupiedAwarePathCandidates = (
    start: Point,
    end: Point,
    machines: PlacedMachine[],
    connections: Connection[],
    startSide: Side,
    endSide: Side,
    kind: ConnectionKind,
    gridWidth: number,
    gridHeight: number
) => {
    const startVector = getVectorFromSide(startSide);
    const endVector = getVectorFromSide(endSide);
    const realStart = { x: start.x + startVector.x, y: start.y + startVector.y };
    const realEnd = { x: end.x + endVector.x, y: end.y + endVector.y };
    if (realStart.x === end.x && realStart.y === end.y && realEnd.x === start.x && realEnd.y === start.y) {
        return [[start, end]];
    }
    if (isSamePoint(realStart, realEnd)) {
        return [[start, realStart, end].filter((point, index, list) => index === 0 || !isSamePoint(point, list[index - 1]))];
    }
    const allowedPointOwners = new Map<string, Set<string>>([
        [pointKey(realStart), new Set(machines.filter(machine => isPointInsideMachine(start, machine)).map(machine => machine.id))],
        [pointKey(realEnd), new Set(machines.filter(machine => isPointInsideMachine(end, machine)).map(machine => machine.id))],
    ]);
    const isInsideBounds = (point: Point) => {
        const rect = { x: point.x, y: point.y, width: 1, height: 1 };
        return kind === 'pipe'
            ? isRectInsideExpandedBounds(rect, gridWidth, gridHeight)
            : isRectInsideCore(rect, gridWidth, gridHeight);
    };
    const isBlocked = (point: Point) => {
        if (!isInsideBounds(point)) return true;
        const allowedOwners = allowedPointOwners.get(pointKey(point));
        if (allowedOwners) {
            return machines.some(machine => !allowedOwners.has(machine.id) && isPointInsideMachine(point, machine));
        }
        return pointInsideBlockedMachine(point, machines);
    };
    const makeSegment = (from: Point, to: Point) => {
        if (from.x !== to.x && from.y !== to.y) return null;
        const points: Point[] = [];
        const dx = Math.sign(to.x - from.x);
        const dy = Math.sign(to.y - from.y);
        let cursor = { ...from };
        while (!isSamePoint(cursor, to)) {
            cursor = { x: cursor.x + dx, y: cursor.y + dy };
            points.push(cursor);
        }
        return points;
    };
    const buildCorePath = (points: Point[]) => {
        const corePath: Point[] = [points[0]];
        for (let index = 1; index < points.length; index += 1) {
            const segment = makeSegment(points[index - 1], points[index]);
            if (!segment) return null;
            corePath.push(...segment);
        }
        return corePath;
    };
    const directCandidates = [
        [realStart, realEnd],
        [realStart, { x: realEnd.x, y: realStart.y }, realEnd],
        [realStart, { x: realStart.x, y: realEnd.y }, realEnd],
    ];
    for (const doglegOffset of [2, 3, 5, 7]) {
        directCandidates.push(
            [realStart, { x: realStart.x, y: realStart.y - doglegOffset }, { x: realEnd.x, y: realStart.y - doglegOffset }, realEnd],
            [realStart, { x: realStart.x, y: realStart.y + doglegOffset }, { x: realEnd.x, y: realStart.y + doglegOffset }, realEnd],
            [realStart, { x: realStart.x - doglegOffset, y: realStart.y }, { x: realStart.x - doglegOffset, y: realEnd.y }, realEnd],
            [realStart, { x: realStart.x + doglegOffset, y: realStart.y }, { x: realStart.x + doglegOffset, y: realEnd.y }, realEnd],
        );
    }
    const directUnique = new Map<string, Point[]>();
    for (const candidatePoints of directCandidates) {
        const corePath = buildCorePath(candidatePoints);
        if (!corePath) continue;
        if (corePath.some(isBlocked)) continue;
        const path = [start, ...corePath, end].filter((point, index, list) => index === 0 || !isSamePoint(point, list[index - 1]));
        if (!hasRepeatedPoint(path) && pathTurns(path) <= MAX_PATH_TURNS) directUnique.set(path.map(pointKey).join('|'), path);
    }
    const variants = [
        { corridorPadding: 8, turnPenalty: 24, compactWeight: 5, neighborOrder: [0, 2, 1, 3] },
        { corridorPadding: 12, turnPenalty: 36, compactWeight: 4, neighborOrder: [2, 0, 3, 1] },
        { corridorPadding: 16, turnPenalty: 48, compactWeight: 3, neighborOrder: [0, 3, 1, 2] },
    ];
    const unique = new Map<string, Point[]>();
    directUnique.forEach((path, key) => unique.set(key, path));
    variants.forEach(options => {
        const path = findOccupiedAwarePathCandidate(start, end, machines, connections, startSide, endSide, kind, gridWidth, gridHeight, options);
        if (!path || pathTurns(path) > MAX_PATH_TURNS) return;
        unique.set(path.map(pointKey).join('|'), path);
    });
    return [...unique.values()].sort((a, b) => pathScore(a, connections, kind) - pathScore(b, connections, kind)).slice(0, 8);
};

const buildConnection = (
    from: PlacedMachine,
    to: PlacedMachine,
    itemId: string,
    machines: PlacedMachine[],
    connections: Connection[],
    gridWidth: number,
    gridHeight: number,
    forcedOutputPortIndex?: number
): { connection: Connection | null; error: string | null } => {
    const kind = itemKind(itemId);
    const fromConfig = getFacility(from.machineId);
    const toConfig = getFacility(to.machineId);
    if (!fromConfig || !toConfig) return { connection: null, error: 'Auto layout failed: missing endpoint facility.' };

    const originalFromRotation = from.rotation;
    const originalToRotation = to.rotation;
    const fromRotations = hasAnyConnection(from.id, connections) || forcedOutputPortIndex !== undefined ? [from.rotation] : ROTATIONS;
    const toRotations = hasAnyConnection(to.id, connections) ? [to.rotation] : ROTATIONS;
    const attempts: string[] = [];

    const branchFromExistingOutput = () => {
        const splitterId = kind === 'pipe' ? 'pipe-splitter' : 'splitter';
        const splitter = getFacility(splitterId);
        const existing = connections
            .map((connection, index) => ({ connection, index }))
            .filter(({ connection }) =>
                connection.fromOriginal.machineId === from.id &&
                connection.toOriginal &&
                (connection.kind || 'belt') === kind
            )
            .sort((a, b) => Math.abs(a.connection.path[a.connection.path.length - 1].x - to.x) + Math.abs(a.connection.path[a.connection.path.length - 1].y - to.y) -
                (Math.abs(b.connection.path[b.connection.path.length - 1].x - to.x) + Math.abs(b.connection.path[b.connection.path.length - 1].y - to.y)))[0];
        if (!splitter || !existing) return null;

        const originalConnection = existing.connection;
        const originalTarget = originalConnection.toOriginal
            ? machines.find(machine => machine.id === originalConnection.toOriginal?.machineId)
            : undefined;
        if (!originalTarget) return null;

        const candidates = originalConnection.path
            .slice(1, -1)
            .map((point, index) => ({ point, pathIndex: index + 1 }))
            .filter(candidate => !pointHasMachine(candidate.point, machines))
            .filter(candidate => {
                const fromRect = machineRect(from);
                const splitterRect = { x: candidate.point.x, y: candidate.point.y, width: 1, height: 1 };
                return !fromRect || rectEdgeGap(fromRect, splitterRect) < 5;
            })
            .sort((a, b) => {
                const aToTarget = Math.abs(a.point.x - to.x) + Math.abs(a.point.y - to.y);
                const bToTarget = Math.abs(b.point.x - to.x) + Math.abs(b.point.y - to.y);
                const aToSource = Math.abs(a.point.x - from.x) + Math.abs(a.point.y - from.y);
                const bToSource = Math.abs(b.point.x - from.x) + Math.abs(b.point.y - from.y);
                return (aToTarget + aToSource * 3) - (bToTarget + bToSource * 3);
            });

        for (const candidate of candidates.slice(0, 12)) {
            const startMachineCount = machines.length;
            const connectionSnapshot = connections.slice();
            const branch = makeMachine(splitterId, candidate.point.x, candidate.point.y);
            if (!canPlace(splitter, branch, machines, gridWidth, gridHeight)) continue;
            machines.push(branch);

            connections.splice(existing.index, 1);

            const sourceToBranch = buildConnection(
                from,
                branch,
                itemId,
                machines,
                connections,
                gridWidth,
                gridHeight,
                originalConnection.fromOriginal.portIndex
            );
            const branchToOriginal = sourceToBranch.connection
                ? buildConnection(branch, originalTarget, itemId, machines, connections, gridWidth, gridHeight)
                : { connection: null };
            const branchToNew = branchToOriginal.connection
                ? buildConnection(branch, to, itemId, machines, connections, gridWidth, gridHeight)
                : { connection: null };

            if (branchToNew.connection) return branchToNew.connection;

            machines.splice(startMachineCount);
            connections.splice(0, connections.length, ...connectionSnapshot);
        }

        return null;
    };

    const tryCurrentRotation = (): Omit<ScoredConnectionCandidate, 'fromRotation' | 'toRotation'> | null => {
        const toCenter = machineCenter(to);
        const fromCenter = machineCenter(from);
        const outputs = getConnectionOutputs(fromConfig, from, kind);
        const inputs = getConnectionInputs(toConfig, to, kind);
        const outputCandidates = outputs
            .map((port, index) => ({ port, index, distance: Math.abs(from.x + port.x - toCenter.x) + Math.abs(from.y + port.y - toCenter.y) }))
            .filter(candidate => forcedOutputPortIndex !== undefined
                ? candidate.index === forcedOutputPortIndex
                : !isOutputPortConnected(from.id, candidate.index, kind, connections))
            .sort((a, b) => a.distance - b.distance);
        const inputCandidates = inputs
            .map((port, index) => ({ port, index, distance: Math.abs(to.x + port.x - fromCenter.x) + Math.abs(to.y + port.y - fromCenter.y) }))
            .filter(candidate => !isInputPortConnected(to.id, candidate.index, kind, connections))
            .sort((a, b) => a.distance - b.distance);

        if (outputCandidates.length === 0) {
            attempts.push(`${fromConfig.name} has no free ${kind} output`);
            return null;
        }
        if (inputCandidates.length === 0) {
            attempts.push(`${toConfig.name} has no free ${kind} input`);
            return null;
        }

        let best: {
            connection: Connection;
            bridgeMachines: PlacedMachine[];
            score: number;
        } | null = null;
        const rejections: string[] = [];

        for (const outputCandidate of outputCandidates.slice(0, 6)) {
            for (const inputCandidate of inputCandidates.slice(0, 6)) {
                const output = outputCandidate.port;
                const input = inputCandidate.port;
                const start = { x: from.x + output.x, y: from.y + output.y };
                const end = { x: to.x + input.x, y: to.y + input.y };
                const paths = findOccupiedAwarePathCandidates(start, end, machines, connections, output.side, input.side, kind, gridWidth, gridHeight);
                for (const path of paths) {
                    const bridgesStart = machines.length;
                    if (!addBridgeForPathOverlaps(path, kind, machines, connections, gridWidth, gridHeight)) {
                        rejections.push('bridge/overlap invalid');
                        machines.splice(bridgesStart);
                        continue;
                    }

                    const connection: Connection = {
                        id: crypto.randomUUID(),
                        fromOriginal: { machineId: from.id, portIndex: outputCandidate.index },
                        toOriginal: { machineId: to.id, portIndex: inputCandidate.index },
                        path,
                        kind,
                    };
                    const geometryError = validateConnectionGeometry(connection, machines, connections);
                    if (geometryError) {
                        rejections.push(geometryError);
                        machines.splice(bridgesStart);
                        continue;
                    }
                    const bridgeMachines = machines.slice(bridgesStart).map(machine => ({ ...machine }));
                    const sidePenalty = directionAlignmentPenalty(output.side, start, end) + directionAlignmentPenalty(input.side, end, start);
                    const score = pathScore(path, connections, kind) +
                        outputCandidate.distance * SCORE_WEIGHTS.endpointDistance +
                        inputCandidate.distance * SCORE_WEIGHTS.endpointDistance +
                        sidePenalty * SCORE_WEIGHTS.sideMismatch +
                        bridgeMachines.length * SCORE_WEIGHTS.bridge +
                        endpointGapPenalty(from, to) +
                        (portAccessBlockCount(from, machines) + portAccessBlockCount(to, machines)) * 20000 +
                        (from.rotation + to.rotation) * SCORE_WEIGHTS.rotation +
                        downstreamOutputFlowPenalty(to, kind) * 50000;
                    if (!best || score < best.score) {
                        best = { connection, bridgeMachines, score };
                    }
                    machines.splice(bridgesStart);
                }
            }
        }

        if (best) return best;

        attempts.push(`${fromConfig.name}(${from.rotation}) -> ${toConfig.name}(${to.rotation}) ${rejections.slice(-2).join(', ') || 'unreachable'}`);
        return null;
    };

    const acceptCandidate = (candidate: ScoredConnectionCandidate) => {
        from.rotation = candidate.fromRotation;
        to.rotation = candidate.toRotation;
        if (from.machineId === 'automation-core') {
            from.selectedOutputItemIds = {
                ...(from.selectedOutputItemIds || {}),
                [candidate.connection.fromOriginal.portIndex]: itemId,
            };
        }
        machines.push(...candidate.bridgeMachines.map(machine => ({ ...machine })));
        connections.push(candidate.connection);
        return { connection: candidate.connection, error: null };
    };

    let bestOverall: ScoredConnectionCandidate | null = null;
    for (const fromRotation of fromRotations) {
        from.rotation = fromRotation;
        if (!canPlace(fromConfig, from, machines.filter(machine => machine.id !== from.id), gridWidth, gridHeight)) continue;
        for (const toRotation of toRotations) {
            to.rotation = toRotation;
            if (!canPlace(toConfig, to, machines.filter(machine => machine.id !== to.id), gridWidth, gridHeight)) continue;
            const candidate = tryCurrentRotation();
            if (!candidate) continue;
            const scored = { ...candidate, fromRotation, toRotation };
            if (!bestOverall || scored.score < bestOverall.score) bestOverall = scored;
        }
    }

    if (bestOverall) {
        return acceptCandidate(bestOverall);
    }

    from.rotation = originalFromRotation;
    to.rotation = originalToRotation;
    const branchConnection = forcedOutputPortIndex === undefined ? branchFromExistingOutput() : null;
    if (branchConnection) return { connection: branchConnection, error: null };
    const detail = attempts.slice(-4).join('; ') || 'no viable port/rotation/path candidate';
    return { connection: null, error: `Auto layout failed: cannot route ${kind} for ${getItemLabel(itemId)} (${fromConfig.name} -> ${toConfig.name}); tried rotation and port candidates: ${detail}.` };
};

const connectSolidTargetToDepot = (
    itemId: string,
    sourceMachine: PlacedMachine,
    sourceOutputPortIndex: number | undefined,
    machines: PlacedMachine[],
    connections: Connection[],
    gridWidth: number,
    gridHeight: number,
    candidates: Point[]
) => {
    let lastError = 'Depot loader placement failed.';
    let best: { machines: PlacedMachine[]; connections: Connection[]; port: PlacedMachine; score: number } | null = null;
    const baseMachineCount = machines.length;
    const baseConnectionCount = connections.length;

    for (const candidate of candidates) {
        const machineCount = machines.length;
        const connectionCount = connections.length;
        const placed = placeDepotPair(candidate.x, candidate.y, machines, gridWidth, gridHeight, 'loader', undefined, connections);
        if (!placed.port) {
            lastError = placed.error || lastError;
            machines.splice(machineCount);
            continue;
        }

        const built = buildConnection(sourceMachine, placed.port, itemId, machines, connections, gridWidth, gridHeight, sourceOutputPortIndex);
        if (built.connection) {
            const candidateMachines = machines.slice(machineCount).map(machine => ({ ...machine }));
            const candidateConnections = connections.slice(connectionCount).map(connection => ({
                ...connection,
                path: connection.path.map(point => ({ ...point })),
            }));
            const score = layoutScore(machines, connections);
            if (!best || score < best.score) {
                best = { machines: candidateMachines, connections: candidateConnections, port: placed.port, score };
            }
        }

        lastError = built.error || 'Target item depot connection failed.';
        machines.splice(machineCount);
        connections.splice(connectionCount);
    }

    if (best) {
        machines.splice(baseMachineCount);
        connections.splice(baseConnectionCount);
        machines.push(...best.machines.map(machine => ({ ...machine })));
        connections.push(...best.connections.map(connection => ({ ...connection, path: connection.path.map(point => ({ ...point })) })));
        return { ok: true as const, port: best.port };
    }

    return { ok: false as const, error: lastError };
};

const pointWithSideOffset = (machine: PlacedMachine, port: { x: number; y: number; side: Side }) => {
    const vector = getVectorFromSide(port.side);
    const point = { x: machine.x + port.x, y: machine.y + port.y };
    return { point, outside: { x: point.x + vector.x, y: point.y + vector.y } };
};

const compactPath = (path: Point[]) =>
    path.filter((point, index, list) => index === 0 || !isSamePoint(point, list[index - 1]));

const buildPlantCycleConnections = (
    seedPicker: PlacedMachine,
    planter: PlacedMachine,
    seedItemId: string,
    plantItemId: string,
    machines: PlacedMachine[],
    connections: Connection[]
) => {
    const seedConfig = getFacility(seedPicker.machineId);
    const planterConfig = getFacility(planter.machineId);
    if (!seedConfig || !planterConfig) return 'Auto layout failed: missing plant cycle facility config.';

    seedPicker.rotation = 3;
    planter.rotation = 3;

    const seedOutputs = getConnectionOutputs(seedConfig, seedPicker, 'belt')
        .map((port, index) => ({ port, index, abs: pointWithSideOffset(seedPicker, port) }))
        .filter(candidate => candidate.port.side === 'right');
    const seedInputs = getConnectionInputs(seedConfig, seedPicker, 'belt')
        .map((port, index) => ({ port, index, abs: pointWithSideOffset(seedPicker, port) }))
        .filter(candidate => candidate.port.side === 'left');
    const planterInputs = getConnectionInputs(planterConfig, planter, 'belt')
        .map((port, index) => ({ port, index, abs: pointWithSideOffset(planter, port) }))
        .filter(candidate => candidate.port.side === 'left');
    const planterOutputs = getConnectionOutputs(planterConfig, planter, 'belt')
        .map((port, index) => ({ port, index, abs: pointWithSideOffset(planter, port) }))
        .filter(candidate => candidate.port.side === 'right');

    const seedToPlantPair = seedOutputs
        .flatMap(output => planterInputs.map(input => ({ output, input, dy: Math.abs(output.abs.outside.y - input.abs.outside.y) })))
        .sort((a, b) => a.dy - b.dy || Math.abs(a.output.abs.outside.y - machineCenter(seedPicker).y) - Math.abs(b.output.abs.outside.y - machineCenter(seedPicker).y))[0];
    const plantToSeedPair = planterOutputs
        .flatMap(output => seedInputs.map(input => ({ output, input, dy: Math.abs(output.abs.outside.y - input.abs.outside.y) })))
        .sort((a, b) => a.dy - b.dy || Math.abs(a.output.abs.outside.y - machineCenter(planter).y) - Math.abs(b.output.abs.outside.y - machineCenter(planter).y))[0];

    if (!seedToPlantPair || !plantToSeedPair) return 'Auto layout failed: plant cycle ports are not available.';

    const seedToPlantPath = compactPath([
        seedToPlantPair.output.abs.point,
        seedToPlantPair.output.abs.outside,
        { x: seedToPlantPair.input.abs.outside.x, y: seedToPlantPair.output.abs.outside.y },
        seedToPlantPair.input.abs.outside,
        seedToPlantPair.input.abs.point,
    ]);

    const seedRect = machineRect(seedPicker);
    const planterRect = machineRect(planter);
    const bottomLaneY = Math.max(
        seedRect ? seedRect.y + seedRect.height : seedPicker.y + 5,
        planterRect ? planterRect.y + planterRect.height : planter.y + 5
    ) + 1;
    const plantToSeedPath = compactPath([
        plantToSeedPair.output.abs.point,
        plantToSeedPair.output.abs.outside,
        { x: plantToSeedPair.output.abs.outside.x, y: bottomLaneY },
        { x: plantToSeedPair.input.abs.outside.x, y: bottomLaneY },
        plantToSeedPair.input.abs.outside,
        plantToSeedPair.input.abs.point,
    ]);

    const seedToPlant: Connection = {
        id: crypto.randomUUID(),
        fromOriginal: { machineId: seedPicker.id, portIndex: seedToPlantPair.output.index },
        toOriginal: { machineId: planter.id, portIndex: seedToPlantPair.input.index },
        path: seedToPlantPath,
        kind: 'belt',
    };
    const plantToSeed: Connection = {
        id: crypto.randomUUID(),
        fromOriginal: { machineId: planter.id, portIndex: plantToSeedPair.output.index },
        toOriginal: { machineId: seedPicker.id, portIndex: plantToSeedPair.input.index },
        path: plantToSeedPath,
        kind: 'belt',
    };

    const seedError = validateConnectionGeometry(seedToPlant, machines, connections);
    if (seedError) return `Auto layout failed: cannot connect ${getItemLabel(seedItemId)} cycle: ${seedError}.`;
    const plantError = validateConnectionGeometry(plantToSeed, machines, [...connections, seedToPlant]);
    if (plantError) return `Auto layout failed: cannot connect ${getItemLabel(plantItemId)} cycle: ${plantError}.`;

    connections.push(seedToPlant, plantToSeed);
    return null;
};

const nodeSort = (a: ProductionNode, b: ProductionNode) => b.depth - a.depth || a.id.localeCompare(b.id);

const isSinkMachine = (machine: PlacedMachine, incoming: Connection[], outgoing: Connection[]) => {
    if (outgoing.length > 0) return false;
    if (incoming.length === 0) return false;
    return machine.machineId === 'depot-loader' ||
        machine.machineId === 'protocol-stash' ||
        machine.machineId === 'automation-core' ||
        machine.machineId === 'fluid-tank' ||
        machine.machineId === 'conduit-inlet' ||
        machine.machineId === 'conduit-inlet-manifold';
};

const cleanupAutoLayout = (
    machines: PlacedMachine[],
    connections: Connection[],
    existingMachineIds: Set<string>
) => {
    const usedMachineIds = new Set<string>(existingMachineIds);
    const outgoingByMachine = new Map<string, Connection[]>();
    const incomingByMachine = new Map<string, Connection[]>();
    connections.forEach(connection => {
        const outgoing = outgoingByMachine.get(connection.fromOriginal.machineId) || [];
        outgoing.push(connection);
        outgoingByMachine.set(connection.fromOriginal.machineId, outgoing);
        if (!connection.toOriginal) return;
        const incoming = incomingByMachine.get(connection.toOriginal.machineId) || [];
        incoming.push(connection);
        incomingByMachine.set(connection.toOriginal.machineId, incoming);
    });

    const queue = machines
        .filter(machine => existingMachineIds.has(machine.id) || isSinkMachine(
            machine,
            incomingByMachine.get(machine.id) || [],
            outgoingByMachine.get(machine.id) || []
        ))
        .map(machine => machine.id);

    const visited = new Set<string>();
    while (queue.length > 0) {
        const machineId = queue.shift()!;
        if (visited.has(machineId)) continue;
        visited.add(machineId);
        usedMachineIds.add(machineId);
        for (const connection of incomingByMachine.get(machineId) || []) {
            queue.push(connection.fromOriginal.machineId);
        }
    }

    connections.forEach(connection => {
        const turns = pathTurns(connection.path);
        if (turns > MAX_PATH_TURNS) return;
        if (usedMachineIds.has(connection.toOriginal?.machineId || '')) {
            usedMachineIds.add(connection.fromOriginal.machineId);
        }
    });

    const pathPoints = new Set<string>();
    const viableConnections = connections.filter(connection =>
        pathTurns(connection.path) <= MAX_PATH_TURNS &&
        usedMachineIds.has(connection.fromOriginal.machineId) &&
        (!connection.toOriginal || usedMachineIds.has(connection.toOriginal.machineId))
    );
    viableConnections.forEach(connection => connection.path.forEach(point => pathPoints.add(pointKey(point))));
    machines.forEach(machine => {
        if (machine.machineId === 'belt-bridge' || machine.machineId === 'pipe-bridge') {
            if (pathPoints.has(pointKey(machine))) usedMachineIds.add(machine.id);
        }
        if ((machine.machineId === 'depot-bus-port' || machine.machineId === 'depot-bus-section') &&
            machines.some(candidate =>
                usedMachineIds.has(candidate.id) &&
                (candidate.machineId === 'depot-loader' || candidate.machineId === 'depot-unloader') &&
                rectEdgeGap(machineRect(machine)!, machineRect(candidate)!) === 0
            )) usedMachineIds.add(machine.id);
    });

    const keptMachines = machines.filter(machine => usedMachineIds.has(machine.id));
    const keptIds = new Set(keptMachines.map(machine => machine.id));
    const keptConnections = viableConnections.filter(connection =>
        keptIds.has(connection.fromOriginal.machineId) &&
        (!connection.toOriginal || keptIds.has(connection.toOriginal.machineId))
    );

    return { machines: keptMachines, connections: keptConnections };
};

const validateHardLayoutRules = (
    machines: PlacedMachine[],
    connections: Connection[],
    existingConnectionIds: Set<string>
) => {
    for (const connection of connections) {
        if (existingConnectionIds.has(connection.id)) continue;
        const turns = pathTurns(connection.path);
        if (turns > MAX_PATH_TURNS) {
            return `Auto layout failed validation: ${connection.kind || 'belt'} route has ${turns} turns; maximum is ${MAX_PATH_TURNS}.`;
        }
        const from = machines.find(machine => machine.id === connection.fromOriginal.machineId);
        const to = connection.toOriginal
            ? machines.find(machine => machine.id === connection.toOriginal?.machineId)
            : undefined;
        if (!from || !to) return 'Auto layout failed validation: connection references a removed facility.';
        const fromRect = machineRect(from);
        const toRect = machineRect(to);
        const geometryError = validateConnectionGeometry(connection, machines, connections);
        if (geometryError) {
            return `Auto layout failed validation: ${geometryError}.`;
        }
        const fromFacility = getFacility(from.machineId);
        const toFacility = getFacility(to.machineId);
        const hasLogisticsEndpoint = fromFacility?.category === 'logistics' || toFacility?.category === 'logistics';
        if (!hasLogisticsEndpoint &&
            fromRect &&
            toRect &&
            rectEdgeGap(fromRect, toRect) >= 5 &&
            !connectionFillsRelatedGap(connection, fromRect, toRect)) {
            return `Auto layout failed validation: ${getFacility(from.machineId)?.name || from.machineId} and ${getFacility(to.machineId)?.name || to.machineId} are separated by 5 or more cells.`;
        }
    }

    for (const machine of machines) {
        if (machine.machineId !== 'belt-bridge' && machine.machineId !== 'pipe-bridge') continue;
        const kind: ConnectionKind = machine.machineId === 'pipe-bridge' ? 'pipe' : 'belt';
        const point = { x: machine.x, y: machine.y };
        const directions = connections
            .filter(connection => (connection.kind || 'belt') === kind && connection.path.some(pathPoint => isSamePoint(pathPoint, point)))
            .map(connection => pathDirectionAtPoint(connection.path, point));
        if (directions.length !== 2) return 'Auto layout failed validation: bridge must carry exactly two crossing routes.';
        if (directions.some(direction => !direction)) return 'Auto layout failed validation: bridge is used as a turn.';
        if (new Set(directions).size !== 2) return 'Auto layout failed validation: bridge does not contain perpendicular straight routes.';
    }
    return null;
};

export const buildAutoLayout = (
    graph: ProductionGraph,
    settings: AutoPlannerSettings,
    existingMachines: PlacedMachine[],
    existingConnections: Connection[],
    gridWidth: number,
    gridHeight: number
): { ok: true; result: AutoLayoutResult } | { ok: false; error: string } => {
    const width = Math.max(200, gridWidth);
    const height = Math.max(200, gridHeight);
    const machines = existingMachines.map(machine => ({ ...machine }));
    const connections = existingConnections.map(connection => ({ ...connection, path: connection.path.map(point => ({ ...point })) }));
    const existingMachineIds = new Set(existingMachines.map(machine => machine.id));
    const existingConnectionIds = new Set(existingConnections.map(connection => connection.id));
    const providers = new Map<string, ProviderRef[]>();
    const warnings = [...graph.warnings];
    const limitedFacilities: Record<string, number> = {};
    const storedCycleTargetItemIds = new Set<string>();
    const storedTargetItemIds = new Set<string>();
    let depotBusPortsUsed = 0;

    const addProvider = (itemId: string, provider: ProviderRef) => {
        const list = providers.get(itemId) || [];
        list.push(provider);
        providers.set(itemId, list);
    };

    let core = machines.find(machine => machine.machineId === 'automation-core');
    const solidSources = [...graph.sourceDemands.keys()].filter(itemId => itemKind(itemId) === 'belt');
    const liquidSources = [...graph.sourceDemands.keys()].filter(itemId => itemKind(itemId) === 'pipe');

    if (solidSources.length > 0) {
        if (!core) {
            const placed = placeNear('automation-core', CORE_POSITION, machines, width, height);
            if (!placed.machine) return { ok: false, error: placed.error || 'Auto layout failed: cannot place protocol core.' };
            core = placed.machine;
        }

        const selectedOutputItemIds = { ...(core.selectedOutputItemIds || {}) };
        solidSources.slice(0, SOLID_SOURCE_OUTPUT_LIMIT).forEach((itemId, index) => {
            const outputPortIndex = CORE_AUTO_OUTPUT_PORT_ORDER[index] ?? index;
            selectedOutputItemIds[outputPortIndex] = itemId;
            addProvider(itemId, { machineId: core!.id });
        });
        Object.assign(core, { selectedOutputItemIds });

        const overflowSources = solidSources.slice(SOLID_SOURCE_OUTPUT_LIMIT);
        const depotBusLimit = settings.facilityLimits['depot-bus-port'];
        if (overflowSources.length > depotBusLimit) {
            return { ok: false, error: `Auto layout failed: protocol core outputs are full; need ${overflowSources.length} depot source ports but limit is ${depotBusLimit}.` };
        }
        overflowSources.forEach((itemId, index) => {
            const placed = placeDepotPair(8, 40 + index * 7, machines, width, height, 'unloader', itemId, connections);
            if (!placed.port) throw new Error(placed.error || 'Depot unloader placement failed.');
            addProvider(itemId, { machineId: placed.port.id, outputPortIndex: 0 });
        });
        depotBusPortsUsed = overflowSources.length;
        limitedFacilities['depot-bus-port'] = overflowSources.length;
    }

    liquidSources.forEach((itemId, index) => {
        const placed = placeNear('fluid-tank', { x: 15, y: START_Y + index * 5 }, machines, width, height, { selectedMaterialId: itemId }, () => 0, connections);
        if (!placed.machine) throw new Error(placed.error || 'Fluid tank placement failed.');
        addProvider(itemId, { machineId: placed.machine.id, outputPortIndex: 0 });
    });

    let cycleIndex = 0;
    for (const itemId of graph.cycleSourceDemands.keys()) {
        const cycle = findPlantCycleRecipes(itemId);
        if (!cycle) return { ok: false, error: `Auto layout failed: ${getItemLabel(itemId)} has no plant cycle recipe.` };

        const x = 8;
        const y = START_Y + 4 + cycleIndex * 14;
        cycleIndex += 1;

        const seedPicker = placeNear('seed-picking-unit', { x, y }, machines, width, height, {
            selectedRecipeId: cycle.seedRecipe.id,
            selectedMaterialId: cycle.seedItemId,
        }, () => 0, connections);
        if (!seedPicker.machine) return { ok: false, error: seedPicker.error || 'Auto layout failed: cannot place seed picker.' };

        const planter = placeNear('planting-unit', { x: x + 6, y }, machines, width, height, {
            selectedRecipeId: cycle.plantingRecipe.id,
            selectedMaterialId: cycle.plantItemId,
        }, () => 0, connections);
        if (!planter.machine) return { ok: false, error: planter.error || 'Auto layout failed: cannot place planter.' };

        const plantOutput = cycle.plantingRecipe.outputs.find(output => output.materialId === cycle.plantItemId);
        const plantOutputAmount = plantOutput?.amount || 1;

        const cycleConnectionError = buildPlantCycleConnections(
            seedPicker.machine,
            planter.machine,
            cycle.seedItemId,
            cycle.plantItemId,
            machines,
            connections
        );
        if (cycleConnectionError) return { ok: false, error: cycleConnectionError };

        for (const input of cycle.plantingRecipe.inputs) {
            if (!input.materialId || input.materialId === cycle.seedItemId || input.materialId === cycle.plantItemId) continue;
            const localLiquidSource = itemKind(input.materialId) === 'pipe'
                ? placeNear('fluid-tank', { x: planter.machine.x - 6, y: planter.machine.y }, machines, width, height, { selectedMaterialId: input.materialId }, () => 0, connections)
                : null;
            const provider = localLiquidSource?.machine
                ? { machineId: localLiquidSource.machine.id }
                : providers.get(input.materialId)?.[0];
            const providerMachine = provider ? machines.find(machine => machine.id === provider.machineId) : undefined;
            if (!provider || !providerMachine) {
                return { ok: false, error: `Auto layout failed: no upstream provider for ${getItemLabel(input.materialId)}.` };
            }
            const built = buildConnection(providerMachine, planter.machine, input.materialId, machines, connections, width, height, provider.outputPortIndex);
            if (!built.connection) return { ok: false, error: built.error || `Auto layout failed: cannot connect ${getItemLabel(input.materialId)}.` };
            if (input.amount / plantOutputAmount > 1) {
                warnings.push(`${getItemLabel(input.materialId)} cycle helper input is connected without advanced splitting.`);
            }
        }

        const cycleTargetSources = graph.targets
            .filter(target => target.itemId === cycle.seedItemId || target.itemId === cycle.plantItemId)
            .map(target => ({
                itemId: target.itemId,
                machine: target.itemId === cycle.seedItemId ? seedPicker.machine! : planter.machine!,
            }));

        for (const targetSource of cycleTargetSources) {
            if (storedCycleTargetItemIds.has(targetSource.itemId)) continue;
            if (depotBusPortsUsed >= settings.facilityLimits['depot-bus-port']) {
                warnings.push(`${getItemLabel(targetSource.itemId)} was not stored: depot source port limit reached.`);
                continue;
            }

            const stored = connectSolidTargetToDepot(
                targetSource.itemId,
                targetSource.machine,
                undefined,
                machines,
                connections,
                width,
                height,
                makeDepotCandidates(targetSource.machine, depotBusPortsUsed, width, height, true)
            );
            if (!stored.ok) return { ok: false, error: stored.error };

            depotBusPortsUsed += 1;
            storedCycleTargetItemIds.add(targetSource.itemId);
        }

        addProvider(cycle.plantItemId, { machineId: planter.machine.id });
        addProvider(cycle.seedItemId, { machineId: seedPicker.machine.id });
    }

    const sortedNodes = [...graph.nodes].sort(nodeSort);
    const nodeMachines = new Map<string, PlacedMachine[]>();
    const rowsByDepth = new Map<number, number>();
    const maxDepth = sortedNodes.reduce((max, node) => Math.max(max, node.depth), 0);
    const columnGap = Math.max(10, Math.min(COLUMN_GAP, Math.floor((width - START_X - 24) / Math.max(1, maxDepth))));

    for (const node of sortedNodes) {
        const facility = getFacility(node.recipe.machineId);
        if (!facility) return { ok: false, error: `Auto layout failed: facility ${node.recipe.machineId} does not exist.` };

        const row = rowsByDepth.get(node.depth) || 0;
        rowsByDepth.set(node.depth, row + node.facilityCount);
        const placedForNode: PlacedMachine[] = [];

        for (let index = 0; index < node.facilityCount; index += 1) {
            const upstreamMachines = node.inputRates
                .map(input => providers.get(input.itemId)?.[0])
                .map(provider => provider ? machines.find(machine => machine.id === provider.machineId) : undefined)
                .filter((machine): machine is PlacedMachine => Boolean(machine));
            const upstreamCenters = upstreamMachines.map(machineCenter);
            const upstreamAverageY = upstreamCenters.length
                ? Math.round(upstreamCenters.reduce((sum, center) => sum + center.y, 0) / upstreamCenters.length)
                : START_Y + (row + index) * ROW_GAP;
            const upstreamAverageX = upstreamCenters.length
                ? Math.round(upstreamCenters.reduce((sum, center) => sum + center.x, 0) / upstreamCenters.length)
                : START_X + (maxDepth - node.depth) * columnGap;
            const upstreamMaxX = upstreamMachines.length
                ? Math.max(...upstreamMachines.map(machine => {
                    const rect = machineRect(machine);
                    return rect ? rect.x + rect.width : machine.x;
                }))
                : START_X + (maxDepth - node.depth) * columnGap;
            const upstreamMaxY = upstreamMachines.length
                ? Math.max(...upstreamMachines.map(machine => {
                    const rect = machineRect(machine);
                    return rect ? rect.y + rect.height : machine.y;
                }))
                : START_Y + (row + index) * ROW_GAP;
            const hasMultipleUpstreams = upstreamMachines.length > 1;
            const x = upstreamMachines.length
                ? hasMultipleUpstreams
                    ? Math.max(START_X, upstreamMaxX + 4 + index * 2)
                    : Math.max(START_X, upstreamMaxX + 2 + index * 2)
                : Math.max(START_X + (maxDepth - node.depth) * columnGap, upstreamMaxX + 3);
            const y = upstreamMachines.length
                ? hasMultipleUpstreams
                    ? Math.max(START_Y, upstreamAverageY - Math.floor(facility.height / 2))
                    : Math.max(START_Y, upstreamAverageY - Math.floor(facility.height / 2))
                : Math.max(START_Y, upstreamAverageY - 2 + index * ROW_GAP);
            const placed = placeNear(node.recipe.machineId, { x, y }, machines, width, height, {
                selectedRecipeId: node.recipe.id,
                selectedMaterialId: node.itemId,
            }, candidate => {
                const candidateCenter = machineCenter(candidate);
                const upstreamDistance = upstreamCenters.reduce((sum, center) =>
                    sum + Math.abs(candidateCenter.x - center.x) + Math.abs(candidateCenter.y - center.y), 0);
                const candidateRect = machineRect(candidate);
                const upstreamGapPenalty = candidateRect
                    ? upstreamMachines.reduce((sum, machine) => {
                        const upstreamRect = machineRect(machine);
                        if (!upstreamRect) return sum;
                        const gap = rectEdgeGap(candidateRect, upstreamRect);
                        return sum + (gap >= 5 ? 80000 + gap * 1000 : gap * 500);
                    }, 0)
                    : 0;
                const multiInputFlowPenalty = hasMultipleUpstreams && candidate.x < upstreamMaxX + 3 ? 50000 : 0;
                return upstreamDistance * 2 + upstreamGapPenalty + multiInputFlowPenalty + index * 6;
            }, connections);
            if (!placed.machine) return { ok: false, error: placed.error || `Auto layout failed: cannot place ${facility.name}.` };
            placedForNode.push(placed.machine);
            addProvider(node.itemId, { machineId: placed.machine.id });
        }
        nodeMachines.set(node.id, placedForNode);
    }

    for (const node of sortedNodes) {
        const consumers = nodeMachines.get(node.id) || [];
        for (const consumer of consumers) {
            const orderedInputs = [...node.inputRates].sort((a, b) => {
                const machineA = chooseProviderForConsumer(a.itemId, consumer, providers, machines, connections)?.machine;
                const machineB = chooseProviderForConsumer(b.itemId, consumer, providers, machines, connections)?.machine;
                return machineCenter(machineB || consumer).y - machineCenter(machineA || consumer).y;
            });
            const inputOrders = [
                orderedInputs,
                [...orderedInputs].reverse(),
                [...node.inputRates].sort((a, b) => {
                    const machineA = chooseProviderForConsumer(a.itemId, consumer, providers, machines, connections)?.machine;
                    const machineB = chooseProviderForConsumer(b.itemId, consumer, providers, machines, connections)?.machine;
                    const center = machineCenter(consumer);
                    const distanceA = machineA ? Math.abs(machineCenter(machineA).x - center.x) + Math.abs(machineCenter(machineA).y - center.y) : Infinity;
                    const distanceB = machineB ? Math.abs(machineCenter(machineB).x - center.x) + Math.abs(machineCenter(machineB).y - center.y) : Infinity;
                    return distanceA - distanceB;
                }),
                [...node.inputRates].sort((a, b) => {
                    const machineA = chooseProviderForConsumer(a.itemId, consumer, providers, machines, connections)?.machine;
                    const machineB = chooseProviderForConsumer(b.itemId, consumer, providers, machines, connections)?.machine;
                    const center = machineCenter(consumer);
                    const distanceA = machineA ? Math.abs(machineCenter(machineA).x - center.x) + Math.abs(machineCenter(machineA).y - center.y) : Infinity;
                    const distanceB = machineB ? Math.abs(machineCenter(machineB).x - center.x) + Math.abs(machineCenter(machineB).y - center.y) : Infinity;
                    return distanceB - distanceA;
                }),
            ];
            const uniqueInputOrders = [...new Map(inputOrders.map(order => [order.map(input => input.itemId).join('|'), order])).values()];
            const baseMachineCount = machines.length;
            const baseMachineStates = machines.map(cloneMachine);
            const baseConnections = connections.map(cloneConnection);
            let lastConnectionError = 'Auto layout failed: logistics connection failed.';
            let bestInputPlan: { machines: PlacedMachine[]; connections: Connection[]; score: number } | null = null;
            const consumerBase = cloneMachine(consumer);
            const moveCandidates: Point[] = [{ x: 0, y: 0 }];
            for (let radius = 1; radius <= 2; radius += 1) {
                for (let dy = -radius; dy <= radius; dy += 1) {
                    for (let dx = -radius; dx <= radius; dx += 1) {
                        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                        moveCandidates.push({ x: dx, y: dy });
                    }
                }
            }

            for (const move of moveCandidates) {
                for (const inputOrder of uniqueInputOrders) {
                    restoreMachinePrefix(machines, baseMachineStates, baseMachineCount);
                    connections.splice(0, connections.length, ...baseConnections.map(cloneConnection));
                    const movedConsumer = machines.find(machine => machine.id === consumer.id);
                    const consumerFacility = movedConsumer ? getFacility(movedConsumer.machineId) : undefined;
                    if (!movedConsumer || !consumerFacility) {
                        return { ok: false, error: `Auto layout failed: missing consumer for ${getItemLabel(node.itemId)}.` };
                    }
                    Object.assign(movedConsumer, {
                        ...consumerBase,
                        x: consumerBase.x + move.x,
                        y: consumerBase.y + move.y,
                    });
                    if (!canPlace(consumerFacility, movedConsumer, machines.filter(machine => machine.id !== movedConsumer.id), width, height, connections)) {
                        continue;
                    }

                    let ok = true;

                    for (const input of inputOrder) {
                        const currentConsumer = machines.find(machine => machine.id === consumer.id);
                        if (!currentConsumer) {
                            return { ok: false, error: `Auto layout failed: no upstream provider for ${getItemLabel(input.itemId)}.` };
                        }
                        const providerOptions = rankProvidersForConsumer(input.itemId, currentConsumer, providers, machines, connections);
                        if (providerOptions.length === 0) {
                            return { ok: false, error: `Auto layout failed: no upstream provider for ${getItemLabel(input.itemId)}.` };
                        }

                        const inputMachineCount = machines.length;
                        const inputMachineStates = machines.map(cloneMachine);
                        const inputConnections = connections.map(cloneConnection);
                        let inputConnected = false;
                        for (const option of providerOptions) {
                            restoreMachinePrefix(machines, inputMachineStates, inputMachineCount);
                            connections.splice(0, connections.length, ...inputConnections.map(cloneConnection));
                            const providerMachine = machines.find(machine => machine.id === option.provider.machineId);
                            const refreshedConsumer = machines.find(machine => machine.id === currentConsumer.id);
                            if (!providerMachine || !refreshedConsumer) continue;
                            const built = buildConnection(providerMachine, refreshedConsumer, input.itemId, machines, connections, width, height, option.provider.outputPortIndex);
                            if (built.connection) {
                                inputConnected = true;
                                break;
                            }
                            lastConnectionError = built.error || lastConnectionError;
                        }

                        if (!inputConnected) {
                            restoreMachinePrefix(machines, inputMachineStates, inputMachineCount);
                            connections.splice(0, connections.length, ...inputConnections.map(cloneConnection));
                            ok = false;
                            break;
                        }
                    }

                    if (!ok) continue;
                    const score = layoutScore(machines, connections) + Math.abs(move.x) * 200 + Math.abs(move.y) * 200;
                    if (!bestInputPlan || score < bestInputPlan.score) {
                        bestInputPlan = {
                            machines: machines.map(cloneMachine),
                            connections: connections.map(cloneConnection),
                            score,
                        };
                    }
                }
            }

            restoreMachinePrefix(machines, baseMachineStates, baseMachineCount);
            connections.splice(0, connections.length, ...baseConnections.map(cloneConnection));
            if (!bestInputPlan) return { ok: false, error: lastConnectionError };
            for (let index = 0; index < baseMachineCount; index += 1) {
                Object.assign(machines[index], cloneMachine(bestInputPlan.machines[index]));
            }
            machines.push(...bestInputPlan.machines.slice(baseMachineCount).map(cloneMachine));
            connections.splice(0, connections.length, ...bestInputPlan.connections.map(cloneConnection));
        }
    }

    graph.targets.forEach((target, index) => {
        if (storedTargetItemIds.has(target.itemId) || storedCycleTargetItemIds.has(target.itemId)) return;
        const source = providers.get(target.itemId)?.[0];
        const sourceMachine = source ? machines.find(machine => machine.id === source.machineId) : undefined;
        if (!source || !sourceMachine) return;

        if (itemKind(target.itemId) === 'pipe') {
            const tank = placeNear('fluid-tank', { x: sourceMachine.x + 12, y: sourceMachine.y }, machines, width, height, { selectedMaterialId: target.itemId }, () => 0, connections);
            if (!tank.machine) throw new Error(tank.error || 'Target fluid tank placement failed.');
            const built = buildConnection(sourceMachine, tank.machine, target.itemId, machines, connections, width, height, source.outputPortIndex);
            if (!built.connection) throw new Error(built.error || 'Target liquid connection failed.');
            storedTargetItemIds.add(target.itemId);
            return;
        }

        if (depotBusPortsUsed >= settings.facilityLimits['depot-bus-port']) {
            warnings.push(`${getItemLabel(target.itemId)} was not stored: depot source port limit reached.`);
            return;
        }
        const stored = connectSolidTargetToDepot(
            target.itemId,
            sourceMachine,
            source.outputPortIndex,
            machines,
            connections,
            width,
            height,
            makeDepotCandidates(sourceMachine, index, width, height, graph.cycleSourceDemands.has(target.itemId))
        );
        if (!stored.ok) throw new Error(stored.error);
        depotBusPortsUsed += 1;
        storedTargetItemIds.add(target.itemId);
    });

    limitedFacilities['depot-bus-port'] = depotBusPortsUsed;
    graph.facilityUsage.forEach((count, facilityId) => {
        if (facilityId === 'forge-of-the-sky') {
            limitedFacilities[getFacility(facilityId)?.name || facilityId] = count;
        }
    });

    const facilities: Record<string, number> = {};
    graph.facilityUsage.forEach((count, facilityId) => {
        facilities[getFacility(facilityId)?.name || facilityId] = count;
    });

    const cycleRecipes: string[] = [];
    graph.cycleSourceDemands.forEach((_rate, itemId) => {
        const cycle = findPlantCycleRecipes(itemId);
        if (cycle) cycleRecipes.push(cycle.seedRecipe.name, cycle.plantingRecipe.name);
    });
    const cleaned = cleanupAutoLayout(machines, connections, existingMachineIds);
    const validationError = validateHardLayoutRules(cleaned.machines, cleaned.connections, existingConnectionIds);
    if (validationError) return { ok: false, error: validationError };
    const stats = getOccupiedLayoutStats(cleaned.machines, cleaned.connections);
    const generatedConnections = cleaned.connections.filter(connection => !existingConnectionIds.has(connection.id));
    const totalLineLength = generatedConnections.reduce((sum, connection) => sum + Math.max(0, connection.path.length - 1), 0);
    const totalTurns = generatedConnections.reduce((sum, connection) => sum + pathTurns(connection.path), 0);
    warnings.push(`Auto layout score: coverage ${(stats.coverage * 100).toFixed(1)}%, line length ${totalLineLength}, turns ${totalTurns}, bbox ${stats.area} cells.`);

    const report: AutoPlannerReport = {
        targets: graph.targets.map(target => `${getItemLabel(target.itemId)} ${target.ratePerMinute}/min`),
        recipes: [...new Set([...graph.nodes.map(node => node.recipe.name), ...cycleRecipes])],
        facilities,
        limitedFacilities,
        warehouseSources: [...graph.sourceDemands.entries()].map(([itemId, rate]) => `${getItemLabel(itemId)} ${rate.toFixed(2)}/min`),
        producedItems: [...graph.producedRates.entries()].map(([itemId, rate]) => `${getItemLabel(itemId)} ${rate.toFixed(2)}/min`),
        warnings,
    };

    return { ok: true, result: { machines: cleaned.machines, connections: cleaned.connections, report } };
};
