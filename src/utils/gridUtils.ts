import type { Point, PlacedMachine } from '../types';
import { MACHINES } from '../config/machines';

import { getRotatedDimensions } from './machineUtils';

// Helper to get machine rect
export const getMachineRect = (machine: PlacedMachine) => {
    const config = MACHINES.find(m => m.id === machine.machineId);
    if (!config) return null;
    const { width, height } = getRotatedDimensions(config.width, config.height, machine.rotation);
    return {
        x: machine.x,
        y: machine.y,
        w: width,
        h: height
    };
};

export const isOverlapping = (
    rectA: { x: number; y: number; w: number; h: number },
    rectB: { x: number; y: number; w: number; h: number }
): boolean => {
    return (
        rectA.x < rectB.x + rectB.w &&
        rectA.x + rectA.w > rectB.x &&
        rectA.y < rectB.y + rectB.h &&
        rectA.y + rectA.h > rectB.y
    );
};

export const checkCollision = (
    candidate: { x: number; y: number; width: number; height: number },
    machines: PlacedMachine[]
): boolean => {
    const candidateRect = {
        x: candidate.x,
        y: candidate.y,
        w: candidate.width,
        h: candidate.height
    };

    for (const m of machines) {
        const r = getMachineRect(m);
        if (r && isOverlapping(candidateRect, r)) {
            return true;
        }
    }
    return false;
};

// A* Pathfinding
interface Node {
    x: number;
    y: number;
    f: number;
    g: number;
    h: number;
    parent: Node | null;
}

// Helper to get vector from side
export const getVectorFromSide = (side: 'top' | 'right' | 'bottom' | 'left'): Point => {
    switch (side) {
        case 'top': return { x: 0, y: -1 };
        case 'right': return { x: 1, y: 0 };
        case 'bottom': return { x: 0, y: 1 };
        case 'left': return { x: -1, y: 0 };
    }
};

export const findPath = (
    start: Point,
    end: Point,
    machines: PlacedMachine[],
    startSide?: 'top' | 'right' | 'bottom' | 'left',
    endSide?: 'top' | 'right' | 'bottom' | 'left'
): Point[] | null => {

    // Quick check: if start == end
    if (start.x === end.x && start.y === end.y) return [start];

    // Calculate actual navigable start/end points
    let realStart = { ...start };

    if (startSide) {
        const vec = getVectorFromSide(startSide);
        realStart = { x: start.x + vec.x, y: start.y + vec.y };
    }

    // Similarly for end
    let realEnd = { ...end };

    if (endSide) {
        const vec = getVectorFromSide(endSide);
        realEnd = { x: end.x + vec.x, y: end.y + vec.y };
    }

    // Check for "Kissing" ports (Adjacent and facing each other)
    if (realStart.x === end.x && realStart.y === end.y &&
        realEnd.x === start.x && realEnd.y === start.y) {
        return [start, end];
    }

    // Build a set of blocked coordinates
    const isBlocked = (x: number, y: number) => {
        // If strict direction is set, the start/end nodes themselves are impediments 
        // to the path unless they are the current start/end of the traversal.
        // But since we traverse from realStart to realEnd, 'start' and 'end' should be treated as obstacles
        // to prevent cutting corners through the machine, UNLESS startSide/endSide is missing.

        const isStart = x === start.x && y === start.y;
        const isEnd = x === end.x && y === end.y;

        if (isStart && !startSide) return false; // Allowed if no strict start
        if (isEnd && !endSide) return false; // Allowed if no strict end

        // If strict sides are strictly defined, start/end are effectively inside the "machine block" context
        // and should be avoided by the A* path (which goes roughly from realStart to realEnd).

        for (const m of machines) {
            const config = MACHINES.find(mc => mc.id === m.machineId);
            if (!config) continue;

            const { width, height } = getRotatedDimensions(config.width, config.height, m.rotation);

            // Machine occupies [x, x+w) and [y, y+h)
            if (x >= m.x && x < m.x + width &&
                y >= m.y && y < m.y + height) {
                return true;
            }
        }
        return false;
    };

    const openList: Node[] = [];
    const closedList: Set<string> = new Set();

    const startNode: Node = { x: realStart.x, y: realStart.y, f: 0, g: 0, h: 0, parent: null };
    openList.push(startNode);

    const getHash = (x: number, y: number) => `${x},${y}`;

    // Safety break
    let iterations = 0;

    // Is the realStart blocked? If so, we can't path find FROM it, but we can try to include it.
    // If realStart is inside another machine, we fail pathing.
    if (isBlocked(realStart.x, realStart.y) && !(realStart.x === end.x && realStart.y === end.y)) {
        // Forced Move is blocked
        return [start, realStart]; // Just show the stump
    }

    while (openList.length > 0) {
        iterations++;
        // optimization cap
        if (iterations > 2000) break;

        // Sort by f
        openList.sort((a, b) => a.f - b.f);
        const current = openList.shift()!;

        if (current.x === realEnd.x && current.y === realEnd.y) {
            // Reconstruct path
            const path: Point[] = [];
            let curr: Node | null = current;
            while (curr) {
                path.push({ x: curr.x, y: curr.y });
                curr = curr.parent;
            }
            const corePath = path.reverse();

            // Assemble: [Start (if moved)] + CorePath + [End (if moved)]
            // If startSide was used, 'start' is original port, 'corePath[0]' is realStart.
            // Duplicate check: if startSide, does corePath include start? No, it starts at realStart.
            const fullPath: Point[] = [];

            if (startSide) {
                fullPath.push(start);
            }

            fullPath.push(...corePath);

            if (endSide) {
                fullPath.push(end);
            }

            return fullPath;
        }

        closedList.add(getHash(current.x, current.y));

        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 },
        ];

        for (const neighbor of neighbors) {
            if (closedList.has(getHash(neighbor.x, neighbor.y))) continue;
            if (isBlocked(neighbor.x, neighbor.y)) continue;

            const g = current.g + 1;
            const h = Math.abs(neighbor.x - realEnd.x) + Math.abs(neighbor.y - realEnd.y);
            const f = g + h;

            const existingNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);
            if (existingNode) {
                if (g < existingNode.g) {
                    existingNode.g = g;
                    existingNode.f = f;
                    existingNode.parent = current;
                }
            } else {
                openList.push({ x: neighbor.x, y: neighbor.y, f, g, h, parent: current });
            }
        }
    }

    // Fallback: Return null if failed
    return null;
};

export const calculateContentDimensions = (machines: PlacedMachine[], connections: { path: Point[] }[]) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    if (machines.length === 0 && connections.length === 0) {
        return { width: 0, height: 0 };
    }

    machines.forEach(m => {
        const rect = getMachineRect(m);
        if (rect) {
            minX = Math.min(minX, rect.x);
            minY = Math.min(minY, rect.y);
            maxX = Math.max(maxX, rect.x + rect.w);
            maxY = Math.max(maxY, rect.y + rect.h);
        }
    });

    connections.forEach(c => {
        c.path.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x + 1);
            maxY = Math.max(maxY, p.y + 1);
        });
    });

    // If for some reason we still have infinity (e.g. malformed data), return 0
    if (minX === Infinity || minY === Infinity) {
        return { width: 0, height: 0 };
    }

    return {
        width: maxX - minX,
        height: maxY - minY
    };
};
