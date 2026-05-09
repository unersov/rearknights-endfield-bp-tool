import { create } from 'zustand';
import { GameMode } from '../types';
import type { Connection, ConnectionKind, PlacedMachine, Point, Direction, Side } from '../types';
import { FACILITIES } from '../config/facilities';
import { checkCollision, findPath } from '../utils/gridUtils';
import { getRotatedDimensions, getRotatedPorts } from '../utils/machineUtils';
import { canFacilityRunMultipleRecipes, findMatchingRecipeByInputs, findSatisfiedRecipesByInputs, getItemByIdIncludingDynamic, getPreferredRecipeOutput, getRecipesForFacility } from '../utils/dynamicRecipes';
import { canFacilityActAsConnectionNode, getConnectionInputs, getConnectionOutputs, getNearestInputPortIndex, getNearestOutputPortIndex, isBridgeForKind, isInputPortConnected, isLineFacilityForKind, isLogisticsFacility, isOutputPortConnected } from '../utils/facilityLogistics';
import { checkPlacementRule, isRectInsideCore, isRectInsideExpandedBounds } from '../utils/placementRules';
import { getConnectionCarriedItem } from '../utils/connectionContent';

interface HistorySnapshot {
    machines: PlacedMachine[];
    connections: Connection[];
    gridWidth: number;
    gridHeight: number;
}

interface GameState {
    machines: PlacedMachine[];
    connections: Connection[];
    mode: GameMode;
    selectedMachineId: string | null; // ID of machine to place from palette
    previewRotation: Direction;

    // Wiring State
    isWiring: boolean;
    isWiringValid: boolean;
    wiringKind: ConnectionKind;
    wiringSource: { machineId: string; portIndex: number; absolutePos: Point } | null;
    wiringFixedPath: Point[]; // Anchored segments
    wiringPreviewPath: Point[]; // Fixed + Current Preview

    // View State
    zoom: number;
    pan: Point;

    // Grid State
    gridWidth: number;
    gridHeight: number;

    movingMachineBackup: PlacedMachine | null; // Stores machine while moving
    movingMachineGrabOffset: Point | null;

    // Box Selection & Batch Move
    selectionStart: Point | null;
    selectionEnd: Point | null;
    selectedMachineIds: string[];
    selectedConnectionIds: string[];
    connectionDetailId: string | null;

    moveAnchor: Point | null;
    movingMachinesSnapshot: PlacedMachine[];
    movingConnectionsSnapshot: Connection[];
    isCopying: boolean; // Distinguish between Move (restore on cancel) and Copy (discard on cancel)

    // UI State
    uiView: 'list' | 'editor' | 'about' | 'settings';
    blueprintListMode: 'manage' | 'insert';
    materialSelectorMachineId: string | null;
    materialSelectorOutputIndex: number | null;

    // History
    history: {
        past: HistorySnapshot[];
        future: HistorySnapshot[];
    };
    undo: () => void;
    redo: () => void;
    takeSnapshot: () => void;


    // Actions
    setMode: (mode: GameMode) => void;
    selectMachine: (machineId: string | null) => void;
    rotatePreview: () => void;
    addMachine: (machineId: string, x: number, y: number, rotation: Direction) => boolean;
    removeMachine: (instanceId: string) => void;
    pickupMachine: (instanceId: string, grabOffset?: Point) => void;
    cancelOperation: () => void; // Cancels wiring or placement/move
    setGridSize: (width: number, height: number) => void;

    // Box Selection Actions
    setBoxSelection: (start: Point | null, end: Point | null) => void;
    commitBoxSelection: (isToggle?: boolean) => void;
    clearSelection: () => void;
    selectConnection: (connectionId: string) => void;
    deleteSelected: () => void;

    // Batch Move Actions
    startBatchMove: (anchor: Point) => void;
    startCopySelection: (anchor: Point) => void;
    commitBatchMove: (targetPos: Point) => void;

    // UI Actions
    setUiView: (view: 'list' | 'editor' | 'about' | 'settings') => void;
    setBlueprintListMode: (mode: 'manage' | 'insert') => void;
    startInsertBlueprint: (blueprint: { data: { machines: any[], connections: any[] } }) => void;

    // Material Selection Actions
    facilityDetailMachineId: string | null;
    openFacilityDetail: (machineInstanceId: string) => void;
    closeFacilityDetail: () => void;
    openMaterialSelector: (machineInstanceId: string, outputIndex?: number | null) => void;
    closeMaterialSelector: () => void;
    setMachineMaterial: (instanceId: string, materialId: string, outputIndex?: number | null) => void;
    setMachineRecipe: (instanceId: string, recipeId: string) => void;

    // Blueprint Actions
    currentBlueprintId: string | null;
    currentBlueprintName: string | null;
    loadGame: (machines: PlacedMachine[], connections: Connection[], gridWidth: number, gridHeight: number, blueprintId: string | null, blueprintName: string) => void;
    setCurrentBlueprint: (id: string, name: string) => void;
    resetGame: () => void;

    startWiring: (machineInstanceId: string, portIndex: number, absolutePos: Point, kind: ConnectionKind) => void;
    updateWiringPreview: (mouseGridPos: Point) => void;
    addWiringAnchor: (pos: Point) => void;
    commitWiring: () => void;
    cancelWiring: () => void;

    setZoom: (zoom: number) => void;
    setPan: (pan: Point) => void;
}

const isPointOnBridge = (point: Point, machines: PlacedMachine[], kind: ConnectionKind) =>
    machines.some(machine => machine.x === point.x && machine.y === point.y && isBridgeForKind(machine.machineId, kind));

const isConnectionPointAllowed = (point: Point, kind: ConnectionKind, gridWidth: number, gridHeight: number) => {
    const rect = { x: point.x, y: point.y, width: 1, height: 1 };
    return kind === 'pipe'
        ? isRectInsideExpandedBounds(rect, gridWidth, gridHeight)
        : isRectInsideCore(rect, gridWidth, gridHeight);
};

const pointKey = (point: Point) => `${point.x},${point.y}`;

const isSamePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

const getEntrySide = (from: Point, to: Point): Side | undefined => {
    if (from.x < to.x) return 'left';
    if (from.x > to.x) return 'right';
    if (from.y < to.y) return 'top';
    if (from.y > to.y) return 'bottom';
    return undefined;
};

const isLogisticsPointForKind = (point: Point, machines: PlacedMachine[], kind: ConnectionKind) =>
    machines.some(machine => machine.x === point.x && machine.y === point.y && canFacilityActAsConnectionNode(machine.machineId, kind));

const hasPathOverlap = (path: Point[], connections: Connection[], machines: PlacedMachine[], kind: ConnectionKind) => {
    const occupied = new Set<string>();
    connections
        .filter(conn => (conn.kind || 'belt') === kind)
        .forEach(conn => conn.path.forEach(p => occupied.add(pointKey(p))));

    return path.some((point, index) => {
        if (!occupied.has(pointKey(point))) return false;
        if (index === 0 || index === path.length - 1) return false;
        return !isPointOnBridge(point, machines, kind) && !isLogisticsPointForKind(point, machines, kind);
    });
};

const getMatchingInputAtPoint = (
    point: Point,
    target: Point,
    machines: PlacedMachine[],
    connections: Connection[],
    kind: ConnectionKind,
    preferredSide?: Side
): { machine: PlacedMachine; portIndex: number; port: ReturnType<typeof getConnectionInputs>[number] } | null => {
    for (const machine of machines) {
        const config = FACILITIES.find(candidate => candidate.id === machine.machineId);
        if (!config) continue;

        const inputs = getConnectionInputs(config, machine, kind);
        if (preferredSide) {
            const preferredInputIndex = inputs.findIndex((port, index) => {
                const portKind: ConnectionKind = port.kind === 'pipe' ? 'pipe' : 'belt';
                return machine.x + port.x === point.x &&
                    machine.y + port.y === point.y &&
                    port.side === preferredSide &&
                    portKind === kind &&
                    !isInputPortConnected(machine.id, index, kind, connections);
            });
            if (preferredInputIndex !== -1) {
                return { machine, portIndex: preferredInputIndex, port: inputs[preferredInputIndex] };
            }
        }

        const dims = getRotatedDimensions(config.width, config.height, machine.rotation);
        const isInside = point.x >= machine.x && point.x < machine.x + dims.width && point.y >= machine.y && point.y < machine.y + dims.height;
        if (isInside) {
            const nearestInputIndex = getNearestInputPortIndex(config, machine, kind, target, connections);
            const nearestInput = nearestInputIndex !== -1 ? inputs[nearestInputIndex] : undefined;
            if (nearestInput) {
                return { machine, portIndex: nearestInputIndex, port: nearestInput };
            }
        }

        const exactInputIndex = inputs.findIndex((port, index) => {
            const portKind: ConnectionKind = port.kind === 'pipe' ? 'pipe' : 'belt';
            return machine.x + port.x === point.x &&
                machine.y + port.y === point.y &&
                portKind === kind &&
                !isInputPortConnected(machine.id, index, kind, connections);
        });

        if (exactInputIndex !== -1) {
            return { machine, portIndex: exactInputIndex, port: inputs[exactInputIndex] };
        }
    }

    return null;
};

const getFacilityTransportKind = (config: typeof FACILITIES[number]): ConnectionKind | null => {
    if (config.id === 'pipe' || config.id.startsWith('pipe-')) return 'pipe';
    if (config.id === 'belt' || config.id.startsWith('belt-')) return 'belt';
    const ports = [...config.inputs, ...config.outputs];
    if (ports.some(port => port.kind === 'pipe')) return 'pipe';
    if (ports.some(port => (port.kind || 'item') === 'item')) return 'belt';
    return null;
};

const findReplacementMachineIds = (
    rect: { x: number; y: number; width: number; height: number },
    machines: PlacedMachine[],
    kind: ConnectionKind | null
) => {
    if (!kind) return new Set<string>();
    return new Set(machines
        .filter(machine =>
            isLineFacilityForKind(machine.machineId, kind) &&
            machine.x >= rect.x &&
            machine.x < rect.x + rect.width &&
            machine.y >= rect.y &&
            machine.y < rect.y + rect.height
        )
        .map(machine => machine.id));
};

const splitConnectionsThroughMachine = (
    connections: Connection[],
    machine: PlacedMachine,
    config: typeof FACILITIES[number],
    kind: ConnectionKind
) => {
    let didSplit = false;
    const nextConnections: Connection[] = [];

    connections.forEach(connection => {
        const connectionKind = connection.kind || 'belt';
        const passIndex = connectionKind === kind
            ? connection.path.findIndex(point => isSamePoint(point, { x: machine.x, y: machine.y }))
            : -1;

        if (passIndex <= 0 || passIndex >= connection.path.length - 1) {
            nextConnections.push(connection);
            return;
        }

        const previousPoint = connection.path[passIndex - 1];
        const nextPoint = connection.path[passIndex + 1];
        const inputIndex = getNearestInputPortIndex(config, machine, kind, previousPoint);
        const outputIndex = getNearestOutputPortIndex(config, machine, kind, nextPoint);

        if (inputIndex === -1 || outputIndex === -1) {
            nextConnections.push(connection);
            return;
        }

        didSplit = true;
        const firstPath = connection.path.slice(0, passIndex + 1);
        const secondPath = connection.path.slice(passIndex);

        nextConnections.push({
            ...connection,
            id: crypto.randomUUID(),
            toOriginal: { machineId: machine.id, portIndex: inputIndex },
            path: firstPath,
            kind,
        });
        nextConnections.push({
            ...connection,
            id: crypto.randomUUID(),
            fromOriginal: { machineId: machine.id, portIndex: outputIndex },
            path: secondPath,
            kind,
        });
    });

    return didSplit ? nextConnections : connections;
};

const deriveAutoRecipeProducts = (machines: PlacedMachine[], connections: Connection[]) => {
    let nextMachines = machines;
    let changed = false;
    let passChanged = true;
    let passCount = 0;

    const incomingByMachine = new Map<string, Connection[]>();
    connections.forEach(connection => {
        if (!connection.toOriginal) return;
        const incoming = incomingByMachine.get(connection.toOriginal.machineId) || [];
        incoming.push(connection);
        incomingByMachine.set(connection.toOriginal.machineId, incoming);
    });

    while (passChanged && passCount < machines.length + 1) {
        passCount += 1;
        passChanged = false;
        const inputIdsByMachine = new Map<string, string[]>();

        for (const machine of nextMachines) {
            const incoming = incomingByMachine.get(machine.id);
            if (!incoming || incoming.length === 0) continue;

            const inputItemIds = incoming
                .map(connection => getConnectionCarriedItem(connection, nextMachines, inputIdsByMachine)?.id)
                .filter((id): id is string => Boolean(id));
            inputIdsByMachine.set(machine.id, inputItemIds);

            if (machine.machineId === 'fluid-tank') {
                const incomingLiquidId = inputItemIds.find(id => getItemByIdIncludingDynamic(id)?.state === 'liquid');
                if (incomingLiquidId && (!machine.selectedMaterialId || machine.selectedMaterialId === incomingLiquidId)) {
                    if (machine.selectedMaterialId === incomingLiquidId) continue;
                    changed = true;
                    passChanged = true;
                    nextMachines = nextMachines.map(candidate =>
                        candidate.id === machine.id ? { ...candidate, selectedMaterialId: incomingLiquidId } : candidate
                    );
                }
                continue;
            }

            const matchedRecipe = inputItemIds.length === incoming.length
                ? findMatchingRecipeByInputs(machine.machineId, inputItemIds)
                : undefined;
            const satisfiedRecipes = canFacilityRunMultipleRecipes(machine.machineId)
                ? findSatisfiedRecipesByInputs(machine.machineId, inputItemIds)
                : [];
            const nextMaterialId = satisfiedRecipes.length > 0
                ? getPreferredRecipeOutput(satisfiedRecipes[0])?.id
                : matchedRecipe ? getPreferredRecipeOutput(matchedRecipe)?.id : undefined;

            if (machine.selectedMaterialId === nextMaterialId) continue;

            changed = true;
            passChanged = true;
            nextMachines = nextMachines.map(candidate =>
                candidate.id === machine.id ? { ...candidate, selectedMaterialId: nextMaterialId } : candidate
            );
        }
    }

    return changed ? nextMachines : machines;
};

export const useGameStore = create<GameState>((set, get) => ({
    machines: [],
    connections: [],
    mode: GameMode.BUILD,
    selectedMachineId: null,
    previewRotation: 0,
    movingMachineBackup: null,
    movingMachineGrabOffset: null,

    selectionStart: null,
    selectionEnd: null,
    selectedMachineIds: [],
    selectedConnectionIds: [],
    connectionDetailId: null,

    moveAnchor: null,
    movingMachinesSnapshot: [],
    movingConnectionsSnapshot: [],
    isCopying: false,

    uiView: 'editor',
    blueprintListMode: 'manage',
    materialSelectorMachineId: null,
    materialSelectorOutputIndex: null,
    facilityDetailMachineId: null,

    history: {
        past: [],
        future: []
    },

    isWiring: false,
    isWiringValid: true,
    wiringKind: 'belt',
    wiringSource: null,
    wiringFixedPath: [],
    wiringPreviewPath: [],

    zoom: 1,
    pan: { x: 0, y: 0 },
    gridWidth: 200,
    gridHeight: 200,

    currentBlueprintId: null,
    currentBlueprintName: null,

    setMode: (mode) => set({ mode }),
    selectMachine: (machineId) => {
        // If we were moving a machine and select something else, typically we might want to restore or delete.
        // For now, let's assume selecting a new machine cancels the move (restores it) to be safe.
        const { movingMachineBackup } = get();
        if (movingMachineBackup) {
            set(state => ({
                machines: [...state.machines, movingMachineBackup],
                movingMachineBackup: null,
                movingMachineGrabOffset: null
            }));
        }
        set({ selectedMachineId: machineId, mode: GameMode.BUILD, previewRotation: 0, connectionDetailId: null, selectedConnectionIds: [] });
    },
    rotatePreview: () => set(state => {
        const nextRotation = (state.previewRotation + 1) % 4 as Direction;

        if (!state.movingMachineBackup || !state.movingMachineGrabOffset) {
            return { previewRotation: nextRotation };
        }

        const config = FACILITIES.find(m => m.id === state.movingMachineBackup?.machineId);
        if (!config) return { previewRotation: nextRotation };

        const oldDims = getRotatedDimensions(config.width, config.height, state.previewRotation);
        const newDims = getRotatedDimensions(config.width, config.height, nextRotation);

        return {
            previewRotation: nextRotation,
            movingMachineGrabOffset: {
                x: state.movingMachineGrabOffset.x - oldDims.width / 2 + newDims.width / 2,
                y: state.movingMachineGrabOffset.y - oldDims.height / 2 + newDims.height / 2,
            }
        };
    }),
    setZoom: (zoom) => set({ zoom }),
    setPan: (pan) => set({ pan }),

    setGridSize: (width, height) => {
        get().takeSnapshot();
        set({ gridWidth: width, gridHeight: height });
    },

    takeSnapshot: () => {
        const { machines, connections, gridWidth, gridHeight, history } = get();
        const snapshot: HistorySnapshot = {
            machines,
            connections,
            gridWidth,
            gridHeight
        };

        set({
            history: {
                past: [...history.past, snapshot],
                future: [] // New action clears future (redo stack)
            }
        });
    },

    undo: () => {
        const { history, cancelOperation } = get();
        if (history.past.length === 0) return;

        // Cancel any active operation first to ensure clean state
        cancelOperation();

        const previous = history.past[history.past.length - 1];
        const newPast = history.past.slice(0, -1);

        const currentSnapshot: HistorySnapshot = {
            machines: get().machines,
            connections: get().connections,
            gridWidth: get().gridWidth,
            gridHeight: get().gridHeight
        };

        set({
            machines: previous.machines,
            connections: previous.connections,
            gridWidth: previous.gridWidth,
            gridHeight: previous.gridHeight,
            history: {
                past: newPast,
                future: [currentSnapshot, ...history.future]
            }
        });
    },

    redo: () => {
        const { history, cancelOperation } = get();
        if (history.future.length === 0) return;

        cancelOperation();

        const next = history.future[0];
        const newFuture = history.future.slice(1);

        const currentSnapshot: HistorySnapshot = {
            machines: get().machines,
            connections: get().connections,
            gridWidth: get().gridWidth,
            gridHeight: get().gridHeight
        };

        set({
            machines: next.machines,
            connections: next.connections,
            gridWidth: next.gridWidth,
            gridHeight: next.gridHeight,
            history: {
                past: [...history.past, currentSnapshot],
                future: newFuture
            }
        });
    },

    addMachine: (machineId, x, y, rotation) => {
        const config = FACILITIES.find(m => m.id === machineId);
        if (!config) return false;

        const { movingMachineBackup, movingMachineGrabOffset } = get();
        const placeX = movingMachineBackup && movingMachineGrabOffset ? Math.round(x - movingMachineGrabOffset.x) : x;
        const placeY = movingMachineBackup && movingMachineGrabOffset ? Math.round(y - movingMachineGrabOffset.y) : y;

        // Collision Check
        const { width, height } = getRotatedDimensions(config.width, config.height, rotation);
        const candidateRect = {
            x: placeX,
            y: placeY,
            width,
            height
        };

        const currentMachines = get().machines;
        const placementKind = getFacilityTransportKind(config);
        const replacementMachineIds = findReplacementMachineIds(candidateRect, currentMachines, placementKind);
        const machinesForCollision = currentMachines.filter(machine => !replacementMachineIds.has(machine.id));

        const placement = checkPlacementRule(config, candidateRect, machinesForCollision, get().gridWidth, get().gridHeight, rotation);
        if (!placement.valid) {
            return false;
        }

        if (checkCollision(candidateRect, machinesForCollision)) {
            // Collision detected, do not place
            return false;
        }

        let finalId: any = crypto.randomUUID();
        let shouldClearConnections = false;

        if (movingMachineBackup) {
            finalId = movingMachineBackup.id; // Preserve ID
            // Check if position changed
            if (movingMachineBackup.x !== placeX || movingMachineBackup.y !== placeY) {
                shouldClearConnections = true;
            }
        }

        const newMachine: PlacedMachine = {
            id: finalId,
            machineId,
            x: placeX,
            y: placeY,
            rotation,
        };

        const oldInputLocations = new Set<string>();
        if (shouldClearConnections && movingMachineBackup) {
            const config = FACILITIES.find(m => m.id === movingMachineBackup.machineId);
            if (config) {
                const inputs = getRotatedPorts(config.inputs, config.width, config.height, movingMachineBackup.rotation);
                inputs.forEach(p => {
                    oldInputLocations.add(`${movingMachineBackup.x + p.x},${movingMachineBackup.y + p.y}`);
                });
            }
        }

        get().takeSnapshot();

        set(state => {
            const baseConnections = state.connections.filter(connection =>
                !replacementMachineIds.has(connection.fromOriginal.machineId) &&
                !replacementMachineIds.has(connection.toOriginal?.machineId || '')
            );
            const clearedConnections = shouldClearConnections
                ? baseConnections.filter(c => {
                    // Remove if starting from this machine
                    if (c.fromOriginal.machineId === finalId) return false;
                    // Remove if ending at this machine (by ID)
                    if (c.toOriginal?.machineId === finalId) return false;

                    // Remove if ending at this machine (by Geometry - for old connections or if toOriginal is missing)
                    const endPoint = c.path[c.path.length - 1];
                    if (endPoint && oldInputLocations.has(`${endPoint.x},${endPoint.y}`)) {
                        return false;
                    }

                    return true;
                })
                : baseConnections;
            const nextConnections = placementKind
                ? splitConnectionsThroughMachine(clearedConnections, newMachine, config, placementKind)
                : clearedConnections;
            const nextMachines = [...state.machines.filter(machine => !replacementMachineIds.has(machine.id)), newMachine];

            return {
                machines: deriveAutoRecipeProducts(nextMachines, nextConnections),
                connections: nextConnections,
                movingMachineBackup: null, // Clear backup on successful placement (move completed)
                movingMachineGrabOffset: null
            };
        });
        return true;
    },

    removeMachine: (instanceId) => {
        get().takeSnapshot();
        set(state => {
            const nextMachines = state.machines.filter(m => m.id !== instanceId);
            const nextConnections = state.connections.filter(c => c.fromOriginal.machineId !== instanceId && c.toOriginal?.machineId !== instanceId);
            return {
                machines: deriveAutoRecipeProducts(nextMachines, nextConnections),
                connections: nextConnections,
                connectionDetailId: nextConnections.some(connection => connection.id === state.connectionDetailId) ? state.connectionDetailId : null
            };
        });
    },

    pickupMachine: (instanceId, grabOffset) => {
        get().takeSnapshot();
        const { machines } = get();
        const machine = machines.find(m => m.id === instanceId);
        if (!machine) return;

        set(() => ({
            movingMachineBackup: machine,
            selectedMachineId: machine.machineId,
            previewRotation: machine.rotation,
            movingMachineGrabOffset: grabOffset ?? null,
            mode: GameMode.BUILD,
            machines: machines.filter(m => m.id !== instanceId),
            // Do NOT clear connections here. We wait until placement to decide.
        }));
    },

    cancelOperation: () => {
        const { isWiring, movingMachineBackup } = get();
        if (isWiring) {
            get().cancelWiring();
        } else if (movingMachineBackup) {
            // Restore moved machine
            set(state => ({
                machines: [...state.machines, movingMachineBackup],
                movingMachineBackup: null,
                movingMachineGrabOffset: null,
                selectedMachineId: null,
                mode: GameMode.BUILD
            }));
        } else {
            // Normal deselect
            set({ selectedMachineId: null });
        }

        // Handle Box Select / Batch Move Cancel
        const { mode, movingMachinesSnapshot, movingConnectionsSnapshot } = get();
        if (mode === GameMode.BOX_SELECT) {
            set({ selectionStart: null, selectionEnd: null, selectedMachineIds: [], selectedConnectionIds: [], connectionDetailId: null, mode: GameMode.BUILD });
        }
        if (mode === GameMode.MOVE_SELECTION) {
            const { isCopying: wasCopying } = get();
            if (wasCopying) {
                // Copying: discard clones (snapshot)
                set({
                    movingMachinesSnapshot: [],
                    movingConnectionsSnapshot: [],
                    moveAnchor: null,
                    mode: GameMode.BOX_SELECT,
                    isCopying: false
                });
            } else {
                // Moving: restore items
                set(state => ({
                    machines: [...state.machines, ...movingMachinesSnapshot],
                    connections: [...state.connections, ...movingConnectionsSnapshot],
                    movingMachinesSnapshot: [],
                    movingConnectionsSnapshot: [],
                    moveAnchor: null,
                    mode: GameMode.BOX_SELECT
                }));
            }
        }
    },

    startWiring: (machineInstanceId, portIndex, absolutePos, kind) => {
        const { connections } = get();
        if (isOutputPortConnected(machineInstanceId, portIndex, kind, connections)) return;

        set({
            isWiring: true,
            isWiringValid: true,
            wiringKind: kind,
            wiringSource: { machineId: machineInstanceId, portIndex, absolutePos },
            wiringFixedPath: [absolutePos],
            wiringPreviewPath: [absolutePos] // Start point
        });
    },

    updateWiringPreview: (mouseGridPos) => {
        const { wiringSource, machines, wiringFixedPath, wiringKind, connections, gridWidth, gridHeight } = get();
        if (!wiringSource || wiringFixedPath.length === 0) return;
        const mouseCell = { x: Math.floor(mouseGridPos.x), y: Math.floor(mouseGridPos.y) };

        let activeSource = wiringSource;
        let activeFixedPath = wiringFixedPath;
        if (wiringFixedPath.length === 1) {
            const sourceMachine = machines.find(m => m.id === wiringSource.machineId);
            const sourceConfig = sourceMachine ? FACILITIES.find(m => m.id === sourceMachine.machineId) : undefined;
            if (sourceMachine && sourceConfig && isLogisticsFacility(sourceConfig)) {
                const nearestOutputIndex = getNearestOutputPortIndex(sourceConfig, sourceMachine, wiringKind, mouseGridPos, connections);
                const output = nearestOutputIndex !== -1 ? getConnectionOutputs(sourceConfig, sourceMachine, wiringKind)[nearestOutputIndex] : undefined;
                if (output) {
                    activeSource = {
                        machineId: wiringSource.machineId,
                        portIndex: nearestOutputIndex,
                        absolutePos: { x: sourceMachine.x + output.x, y: sourceMachine.y + output.y },
                    };
                    activeFixedPath = [activeSource.absolutePos];
                } else {
                    set({
                        wiringSource,
                        wiringFixedPath,
                        wiringPreviewPath: [wiringSource.absolutePos, mouseCell],
                        isWiringValid: false
                    });
                    return;
                }
            }
        }

        const start = activeFixedPath[activeFixedPath.length - 1]; // Start from last anchor
        let end = mouseCell;

        // Determine Start Side (only matters if we are at the very beginning of the whole path)
        let startSide: Side | undefined;
        if (wiringFixedPath.length === 1) { // Only first point
            const sourceMachine = machines.find(m => m.id === activeSource.machineId);
            if (sourceMachine) {
                const config = FACILITIES.find(m => m.id === sourceMachine.machineId);
                if (config) {
                    const outputs = getConnectionOutputs(config, sourceMachine, wiringKind);
                    if (outputs[activeSource.portIndex]) {
                        startSide = outputs[activeSource.portIndex].side;
                    }
                }
            }
        }

        // Determine End Side if hovering a valid input port
        let endSide: Side | undefined;
        let isMatchingInput = false;
        const matchedInput = getMatchingInputAtPoint(end, mouseGridPos, machines, connections, wiringKind);
        if (matchedInput) {
            end = { x: matchedInput.machine.x + matchedInput.port.x, y: matchedInput.machine.y + matchedInput.port.y };
            endSide = matchedInput.port.side;
            isMatchingInput = true;
        }

        const segmentPath = findPath(start, end, machines, startSide, endSide, wiringKind);

        if (segmentPath) {
            const cleanSegment = segmentPath.length > 0 ? segmentPath.slice(1) : [];
            const previewPath = [...activeFixedPath, ...cleanSegment];
            const hasOverlap = hasPathOverlap(previewPath, connections, machines, wiringKind);
            const isInAllowedBounds = previewPath.every(p => isConnectionPointAllowed(p, wiringKind, gridWidth, gridHeight));
            set({
                wiringSource: activeSource,
                wiringFixedPath: activeFixedPath,
                wiringPreviewPath: previewPath,
                isWiringValid: isMatchingInput && !hasOverlap && isInAllowedBounds
            });
        } else {
            // Invalid path - Show straight line but flag as invalid
            // We want to show a straight line to indicating intent, but red?
            set({
                wiringSource: activeSource,
                wiringFixedPath: activeFixedPath,
                wiringPreviewPath: [...activeFixedPath, end],
                isWiringValid: false
            });
        }
    },

    addWiringAnchor: (pos) => {
        const { wiringSource, machines, wiringFixedPath, wiringKind, connections, gridWidth, gridHeight } = get();
        if (!wiringSource || wiringFixedPath.length === 0) return;

        const start = wiringFixedPath[wiringFixedPath.length - 1];
        const end = pos;

        // Check validity before adding anchor
        let startSide: Side | undefined;
        if (wiringFixedPath.length === 1) {
            const sourceMachine = machines.find(m => m.id === wiringSource.machineId);
            if (sourceMachine) {
                const config = FACILITIES.find(m => m.id === sourceMachine.machineId);
                if (config) {
                    const outputs = getConnectionOutputs(config, sourceMachine, wiringKind);
                    if (outputs[wiringSource.portIndex]) {
                        startSide = outputs[wiringSource.portIndex].side;
                    }
                }
            }
        }

        const segmentPath = findPath(start, end, machines, startSide, undefined, wiringKind);

        if (segmentPath) {
            const cleanSegment = segmentPath.length > 0 ? segmentPath.slice(1) : [];
            const nextPath = [...wiringFixedPath, ...cleanSegment];
            if (!hasPathOverlap(nextPath, connections, machines, wiringKind) &&
                nextPath.every(p => isConnectionPointAllowed(p, wiringKind, gridWidth, gridHeight))) {
                set({ wiringFixedPath: nextPath });
            }
        } else {
            // Do nothing if invalid? Or feedback?
        }
    },

    commitWiring: () => {
        const { wiringSource, wiringPreviewPath, isWiringValid, machines, connections, wiringKind } = get();
        if (!wiringSource || wiringPreviewPath.length < 2 || !isWiringValid) {
            get().cancelWiring();
            return;
        }

        get().takeSnapshot();

        const end = wiringPreviewPath[wiringPreviewPath.length - 1];
        const beforeEnd = wiringPreviewPath[wiringPreviewPath.length - 2];
        const preferredEndSide = beforeEnd ? getEntrySide(beforeEnd, end) : undefined;
        let toOriginal: { machineId: string; portIndex: number } | null = null;

        const matchedInput = getMatchingInputAtPoint(end, end, machines, connections, wiringKind, preferredEndSide);
        if (matchedInput) {
            toOriginal = { machineId: matchedInput.machine.id, portIndex: matchedInput.portIndex };
        } else {
            get().cancelWiring();
            return;
        }

        const newConnection: Connection = {
            id: crypto.randomUUID(),
            fromOriginal: { machineId: wiringSource.machineId, portIndex: wiringSource.portIndex },
            toOriginal,
            path: [...wiringPreviewPath],
            kind: wiringKind
        };

        set(state => {
            const nextConnections = [...state.connections, newConnection];
            return {
                machines: deriveAutoRecipeProducts(state.machines, nextConnections),
                connections: nextConnections,
                isWiring: false,
                isWiringValid: true,
                wiringKind: 'belt',
                wiringSource: null,
                wiringFixedPath: [],
                wiringPreviewPath: []
            };
        });
    },

    cancelWiring: () => {
        set({ isWiring: false, isWiringValid: true, wiringKind: 'belt', wiringSource: null, wiringFixedPath: [], wiringPreviewPath: [] });
    },

    // Box Selection Implementation
    setBoxSelection: (start, end) => set({ selectionStart: start, selectionEnd: end }),

    commitBoxSelection: (isToggle: boolean = false) => {
        const { selectionStart, selectionEnd, machines, connections, selectedMachineIds: prevMachineIds, selectedConnectionIds: prevConnectionIds } = get();
        if (!selectionStart || !selectionEnd) return;

        // Normalize Selection Rect
        const x1 = Math.min(selectionStart.x, selectionEnd.x);
        const y1 = Math.min(selectionStart.y, selectionEnd.y);
        const x2 = Math.max(selectionStart.x, selectionEnd.x);
        const y2 = Math.max(selectionStart.y, selectionEnd.y);

        // Filter Machines in Box
        const machineIdsInBox = machines.filter(m => {
            const config = FACILITIES.find(c => c.id === m.machineId);
            if (!config) return false;
            const { width, height } = getRotatedDimensions(config.width, config.height, m.rotation);
            // Machine Rect
            const mx1 = m.x;
            const my1 = m.y;
            const mx2 = m.x + width;
            const my2 = m.y + height;

            // Check Intersection
            // mx2 and my2 are exclusive bounds (starting point + size)
            // So if selection start (x1) equals mx2, they do NOT touch.
            return !(x2 < mx1 || x1 >= mx2 || y2 < my1 || y1 >= my2);
        }).map(m => m.id);

        // Filter Connections in Box
        let connectionIdsInBox = connections.filter(c => {
            // Precise check: Is any point of the path inside the selection box?
            return c.path.some(p => p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2);
        }).map(c => c.id);

        const isSingleCell = (x1 === x2) && (y1 === y2);

        // Priority Rule: If selecting a single cell and we found a machine, ignore connections at that spot.
        // This prevents accidental selection of the connected wire when clicking a machine.
        // User request: "Unless I box-select ... don't select it" implies clicking machine shouldn't select wire.
        if (isSingleCell && machineIdsInBox.length > 0) {
            connectionIdsInBox = [];
        }

        let finalMachineIds = machineIdsInBox;
        let finalConnectionIds = connectionIdsInBox;

        if (isToggle) {
            // Symmetric Difference (XOR)
            // If already selected AND in box -> remove (toggle off)
            // If not selected AND in box -> add (toggle on)
            // If not in box -> keep status (keep selected if selected, keep unselected if unselected)

            // Machines
            const boxSet = new Set(machineIdsInBox);
            const prevSet = new Set(prevMachineIds);

            // Items in box that are NOT in prev -> ADD
            const toAdd = machineIdsInBox.filter(id => !prevSet.has(id));
            // Items in box that ARE in prev -> REMOVE (Toggle off)
            // const toRemove = machineIdsInBox.filter(id => prevSet.has(id));

            // Result = (Prev - toRemove) + toAdd
            const kept = prevMachineIds.filter(id => !boxSet.has(id)); // Keep those NOT in box
            finalMachineIds = [...kept, ...toAdd];

            // Connections
            const boxConnSet = new Set(connectionIdsInBox);
            const prevConnSet = new Set(prevConnectionIds);

            const connToAdd = connectionIdsInBox.filter(id => !prevConnSet.has(id));
            const connToKeep = prevConnectionIds.filter(id => !boxConnSet.has(id));
            finalConnectionIds = [...connToKeep, ...connToAdd];
        }

        set({
            selectedMachineIds: finalMachineIds,
            selectedConnectionIds: finalConnectionIds,
            connectionDetailId: null,
            selectionStart: null,
            selectionEnd: null
        });
    },

    clearSelection: () => set({ selectedMachineIds: [], selectedConnectionIds: [], connectionDetailId: null }),

    selectConnection: (connectionId) => set({
        selectedMachineIds: [],
        selectedConnectionIds: [connectionId],
        connectionDetailId: connectionId,
    }),

    deleteSelected: () => {
        // Reuse remove logic? 
        // We need to cascade delete connections attached to deleted machines.
        const { machines, connections, selectedMachineIds, selectedConnectionIds } = get();
        if (selectedMachineIds.length === 0 && selectedConnectionIds.length === 0) return;

        get().takeSnapshot();

        // 1. Determine all machines to remove
        const machinesToRemove = new Set(selectedMachineIds);

        // 2. Determine all connections to remove (explicitly selected OR attached to removed machines)
        const connectionsToRemove = new Set(selectedConnectionIds);

        connections.forEach(c => {
            if (machinesToRemove.has(c.fromOriginal.machineId) || (c.toOriginal && machinesToRemove.has(c.toOriginal.machineId))) {
                connectionsToRemove.add(c.id);
            }
        });

        const newMachines = machines.filter(m => !machinesToRemove.has(m.id));
        const newConnections = connections.filter(c => !connectionsToRemove.has(c.id));

        set({
            machines: deriveAutoRecipeProducts(newMachines, newConnections),
            connections: newConnections,
            selectedMachineIds: [],
            selectedConnectionIds: [],
            connectionDetailId: null
        });
    },

    setUiView: (view) => set({ uiView: view }),
    setBlueprintListMode: (mode) => set({ blueprintListMode: mode }),

    openFacilityDetail: (machineInstanceId) => set({ facilityDetailMachineId: machineInstanceId }),
    closeFacilityDetail: () => set({ facilityDetailMachineId: null }),
    openMaterialSelector: (machineInstanceId, outputIndex = null) => set({ materialSelectorMachineId: machineInstanceId, materialSelectorOutputIndex: outputIndex }),
    closeMaterialSelector: () => set({ materialSelectorMachineId: null, materialSelectorOutputIndex: null }),
    setMachineMaterial: (instanceId, materialId, outputIndex = null) => {
        get().takeSnapshot();
        set(state => {
            const manuallyUpdatedMachines = state.machines.map(m => {
                if (m.id !== instanceId) return m;
                if (outputIndex !== null && outputIndex !== undefined) {
                    return {
                        ...m,
                        selectedOutputItemIds: {
                            ...(m.selectedOutputItemIds || {}),
                            [outputIndex]: materialId,
                        }
                    };
                }
                return { ...m, selectedMaterialId: materialId };
            });
            return {
                machines: deriveAutoRecipeProducts(manuallyUpdatedMachines, state.connections),
                materialSelectorMachineId: null,
                materialSelectorOutputIndex: null
            };
        });
    },
    setMachineRecipe: (instanceId, recipeId) => {
        const recipe = getRecipesForFacility(get().machines.find(machine => machine.id === instanceId)?.machineId || '')
            .find(candidate => candidate.id === recipeId);
        get().takeSnapshot();
        set(state => ({
            machines: state.machines.map(machine => machine.id === instanceId
                ? {
                    ...machine,
                    selectedRecipeId: recipeId,
                    selectedMaterialId: recipe ? getPreferredRecipeOutput(recipe)?.id : machine.selectedMaterialId,
                }
                : machine
            )
        }));
    },

    startInsertBlueprint: (blueprint) => {
        const { machines, connections } = blueprint.data;
        if (machines.length === 0 && connections.length === 0) return;

        // Calculate Center
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        machines.forEach((m: any) => {
            const config = FACILITIES.find(c => c.id === m.machineId);
            if (config) {
                const { width, height } = getRotatedDimensions(config.width, config.height, m.rotation);
                minX = Math.min(minX, m.x);
                minY = Math.min(minY, m.y);
                maxX = Math.max(maxX, m.x + width);
                maxY = Math.max(maxY, m.y + height);
            }
        });

        connections.forEach((c: any) => {
            c.path.forEach((p: any) => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x + 1);
                maxY = Math.max(maxY, p.y + 1);
            });
        });

        const centerX = Math.floor((minX + maxX) / 2);
        const centerY = Math.floor((minY + maxY) / 2);
        const selectionCenter = { x: centerX, y: centerY };

        // Normalize Data (Clone with new IDs)
        // Similar to copy logic
        const idMap: Record<string, string> = {};

        const newMachines = machines.map((m: any) => {
            const newId = crypto.randomUUID();
            idMap[m.id] = newId;
            return { ...m, id: newId };
        });

        const newConnections = connections.map((c: any) => {
            // Remap IDs
            const fromId = idMap[c.fromOriginal.machineId];
            if (!fromId) return null; // Should not happen in valid blueprint

            let toOriginal = null;
            if (c.toOriginal) {
                const toId = idMap[c.toOriginal.machineId];
                if (toId) {
                    toOriginal = { ...c.toOriginal, machineId: toId };
                }
            }

            return {
                ...c,
                id: crypto.randomUUID(),
                fromOriginal: { ...c.fromOriginal, machineId: fromId },
                toOriginal,
                // Force path copy
                path: c.path.map((p: any) => ({ ...p }))
            };
        }).filter((c: any) => c !== null);

        set({
            mode: GameMode.MOVE_SELECTION,
            moveAnchor: selectionCenter,
            movingMachinesSnapshot: newMachines,
            movingConnectionsSnapshot: newConnections,
            isCopying: true, // Treat as copy so cancel discards them
            uiView: 'editor' // Switch back to editor
        });
    },

    startBatchMove: (_anchor: Point) => {
        const { machines, connections, selectedMachineIds, selectedConnectionIds } = get();
        if (selectedMachineIds.length === 0 && selectedConnectionIds.length === 0) return;

        // Extract items
        const movingMachines = machines.filter(m => selectedMachineIds.includes(m.id));
        const movingConnections = connections.filter(c => selectedConnectionIds.includes(c.id));

        // Calculate Selection Center for Snap Behavior
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        if (movingMachines.length === 0 && movingConnections.length === 0) {
            // Should not happen due to check above
            return;
        }

        // 1. Machines Bounds
        movingMachines.forEach(m => {
            const config = FACILITIES.find(c => c.id === m.machineId);
            if (config) {
                const { width, height } = getRotatedDimensions(config.width, config.height, m.rotation);
                minX = Math.min(minX, m.x);
                minY = Math.min(minY, m.y);
                maxX = Math.max(maxX, m.x + width);
                maxY = Math.max(maxY, m.y + height);
            }
        });

        // 2. Connections Bounds
        movingConnections.forEach(c => {
            c.path.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x + 1); // +1 assuming cell size
                maxY = Math.max(maxY, p.y + 1);
            });
        });

        const centerX = Math.floor((minX + maxX) / 2);
        const centerY = Math.floor((minY + maxY) / 2);
        const selectionCenter = { x: centerX, y: centerY };

        // Remove from world (temporary)
        const remainingMachines = machines.filter(m => !selectedMachineIds.includes(m.id));
        const remainingConnections = connections.filter(c => !selectedConnectionIds.includes(c.id));

        set({
            mode: GameMode.MOVE_SELECTION,
            moveAnchor: selectionCenter, // Use Center as Anchor to snap selection to mouse
            movingMachinesSnapshot: movingMachines,
            movingConnectionsSnapshot: movingConnections,
            machines: remainingMachines,
            connections: remainingConnections,
            // Keep selection IDs so we know what we are moving? Or clear them?
            // Usually we clear selection while moving, then re-select on place.
            selectedMachineIds: [],
            selectedConnectionIds: [],
            connectionDetailId: null,
            isCopying: false
        });
    },

    startCopySelection: (_anchor: Point) => {
        const { machines, connections, selectedMachineIds, selectedConnectionIds } = get();
        if (selectedMachineIds.length === 0 && selectedConnectionIds.length === 0) return;

        // Filter items to copy
        const sourceMachines = machines.filter(m => selectedMachineIds.includes(m.id));
        const sourceConnections = connections.filter(c => selectedConnectionIds.includes(c.id));

        if (sourceMachines.length === 0 && sourceConnections.length === 0) return;

        // Calculate Selection Center
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        sourceMachines.forEach(m => {
            const config = FACILITIES.find(c => c.id === m.machineId);
            if (config) {
                const { width, height } = getRotatedDimensions(config.width, config.height, m.rotation);
                minX = Math.min(minX, m.x);
                minY = Math.min(minY, m.y);
                maxX = Math.max(maxX, m.x + width);
                maxY = Math.max(maxY, m.y + height);
            }
        });

        sourceConnections.forEach(c => {
            c.path.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x + 1);
                maxY = Math.max(maxY, p.y + 1);
            });
        });

        const centerX = Math.floor((minX + maxX) / 2);
        const centerY = Math.floor((minY + maxY) / 2);
        const selectionCenter = { x: centerX, y: centerY };

        // ID Mapping: OldID -> NewID
        const idMap: Record<string, string> = {};

        // Clone Machines
        const newMachines: PlacedMachine[] = sourceMachines.map(m => {
            const newId = crypto.randomUUID();
            idMap[m.id] = newId;
            return {
                ...m,
                id: newId
            };
        });

        // Clone Connections
        const newConnections: Connection[] = [];
        sourceConnections.forEach(c => {
            // Remap IDs
            const fromId = idMap[c.fromOriginal.machineId];

            // For toOriginal, it might be null/undefined OR it might point to a machine outside selection.
            // If outside selection, we detach it (because physical copy doesn't drag the wire across the map).
            // Actually, if we copy a wire, and one end is NOT in the selection, it becomes a dangling wire?
            // In Factorio/Shapez, if you copy a belt without the machine, it's just a belt.
            // But here connections are logical links.
            // A logical link requires both endpoints usually, or at least a valid 'from'.
            // If 'from' machine was not copied, we can't create this connection unless we make it 'from' the original machine?
            // No, that would duplicate the wire from the original machine.
            // Rule: Only copy connection if 'from' machine is also copied.

            if (!fromId) {
                // The source of this connection was NOT selected. 
                // We do not copy this connection.
                return;
            }

            let toOriginal: { machineId: string; portIndex: number } | null = null;
            if (c.toOriginal) {
                const toId = idMap[c.toOriginal.machineId];
                if (toId) {
                    toOriginal = { ...c.toOriginal, machineId: toId };
                } else {
                    // Target not in selection. Detach?
                    // leave null.
                }
            }

            newConnections.push({
                ...c,
                id: crypto.randomUUID(),
                fromOriginal: { ...c.fromOriginal, machineId: fromId },
                toOriginal,
                path: [...c.path] // Deep copy path
            });
        });

        set({
            mode: GameMode.MOVE_SELECTION,
            moveAnchor: selectionCenter,
            movingMachinesSnapshot: newMachines,
            movingConnectionsSnapshot: newConnections,
            // DO NOT Remove from machines/connections (Copy mode)
            // But we Deselect originals so we can focus on placing the ghost
            selectedMachineIds: [],
            selectedConnectionIds: [],
            isCopying: true
        });
    },

    commitBatchMove: (targetPos) => {
        const { moveAnchor, movingMachinesSnapshot, movingConnectionsSnapshot, machines, gridWidth, gridHeight, connections } = get();
        if (!moveAnchor) return;

        // We check collision first. If valid, we snapshot BEFORE applying changes.
        // Wait, collisions are checked below. We should only snapshot if we proceed.

        const offsetX = targetPos.x - moveAnchor.x;
        const offsetY = targetPos.y - moveAnchor.y;

        // Collision Check for Machines
        let collision = false;

        // Tentative new positions
        const placedMachines = movingMachinesSnapshot.map(m => ({
            ...m,
            x: m.x + offsetX,
            y: m.y + offsetY
        }));

        for (const m of placedMachines) {
            const config = FACILITIES.find(c => c.id === m.machineId);
            if (!config) continue;
            const { width, height } = getRotatedDimensions(config.width, config.height, m.rotation);
            const rect = { x: m.x, y: m.y, width, height };

            const placement = checkPlacementRule(config, rect, machines, gridWidth, gridHeight, m.rotation);
            if (!placement.valid) {
                collision = true;
                break;
            }

            // Overlap with existing (stationary) machines
            if (checkCollision(rect, machines)) {
                collision = true;
                break;
            }
        }

        if (collision) {
            // Maybe play error sound? For now, just don't commit.
            return;
        }

        // Move Connections
        const placedConnections = movingConnectionsSnapshot.map(c => ({
            ...c,
            path: c.path.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }))
        }));

        // Success: Merge back
        get().takeSnapshot();

        set({
            machines: [...machines, ...placedMachines],
            connections: [...connections, ...placedConnections],
            movingMachinesSnapshot: [],
            movingConnectionsSnapshot: [],
            moveAnchor: null,
            mode: GameMode.BOX_SELECT, // Return to box select?
            selectedMachineIds: placedMachines.map(m => m.id),
            selectedConnectionIds: placedConnections.map(c => c.id),
            connectionDetailId: null,
            isCopying: false
        });
    },

    loadGame: (machines, connections, gridWidth, gridHeight, blueprintId, blueprintName) => {
        // Clear history on new load?
        // User said: "这个记录并不保存在蓝图存档中，所以当我刷新或关闭网页后，就会重新记录"
        // Also "refresh or close webpage => re-record".
        // Loading a blueprint effectively resets the session for that blueprint?
        // Usually yes, or we could treat load as a push to history?
        // If I load a save, I probably can't undo "Loading the save" to go back to previous blueprint cleanly 
        // without saving the *previous* state which might be complex.
        // Let's clear history on load for simplicity and safety.
        set({
            machines,
            connections,
            gridWidth,
            gridHeight,
            currentBlueprintId: blueprintId,
            currentBlueprintName: blueprintName,
            mode: GameMode.BUILD,
            selectedMachineId: null,
            movingMachineBackup: null,
            movingMachineGrabOffset: null,
            selectedMachineIds: [],
            selectedConnectionIds: [],
            connectionDetailId: null,
            history: { past: [], future: [] }
        });
    },

    setCurrentBlueprint: (id, name) => set({ currentBlueprintId: id, currentBlueprintName: name }),

    resetGame: () => {
        set({
            machines: [],
            connections: [],
            gridWidth: 200,
            gridHeight: 200,
            currentBlueprintId: null,
            currentBlueprintName: null,
            mode: GameMode.BUILD,
            selectedMachineId: null,
            movingMachineBackup: null,
            movingMachineGrabOffset: null,
            selectedMachineIds: [],
            selectedConnectionIds: [],
            connectionDetailId: null,
            history: { past: [], future: [] }
        });
    }
}));
