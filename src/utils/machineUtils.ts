import type { Direction, PortConfig } from '../types';

export const getRotatedDimensions = (width: number, height: number, rotation: Direction) => {
    if (rotation % 2 === 1) { // 1 (90) or 3 (270)
        return { width: height, height: width };
    }
    return { width, height };
};

export const getRotatedPorts = (
    ports: PortConfig[],
    originalWidth: number,
    originalHeight: number,
    rotation: Direction
): PortConfig[] => {
    if (rotation === 0) return ports;

    return ports.map(p => {
        let x = p.x;
        let y = p.y;
        let side = p.side;

        // Rotate 90 degrees clockwise 'rotation' times
        for (let r = 0; r < rotation; r++) {
            const oldX = x;
            const oldY = y;

            const currentH = (r % 2 === 0) ? originalHeight : originalWidth;

            x = currentH - 1 - oldY;
            y = oldX;

            // Rotate Side
            switch (side) {
                case 'top': side = 'right'; break;
                case 'right': side = 'bottom'; break;
                case 'bottom': side = 'left'; break;
                case 'left': side = 'top'; break;
            }
        }

        return { x, y, side };
    });
};

import type { PlacedMachine, MachineConfig } from '../types';

export const isMachinePowered = (
    target: PlacedMachine,
    allMachines: PlacedMachine[],
    getConfig: (id: string) => MachineConfig | undefined
): boolean => {
    const targetConfig = getConfig(target.machineId);
    if (!targetConfig || !targetConfig.power || targetConfig.power <= 0) {
        // Doesn't need power
        return true;
    }

    // Find all power sources
    const powerSources = allMachines.filter(m => {
        const cfg = getConfig(m.machineId);
        return cfg && cfg.supplyRange && cfg.supplyRange > 0;
    });

    if (powerSources.length === 0) return false;

    // Target Rect
    const { width: tW, height: tH } = getRotatedDimensions(targetConfig.width, targetConfig.height, target.rotation);
    const tx1 = target.x;
    const ty1 = target.y;
    const tx2 = target.x + tW;
    const ty2 = target.y + tH;

    // Check intersection with any power source range
    return powerSources.some(source => {
        const sourceConfig = getConfig(source.machineId)!;
        const range = sourceConfig.supplyRange!;

        // Power Source Center (assuming grid units)
        const { width: sW, height: sH } = getRotatedDimensions(sourceConfig.width, sourceConfig.height, source.rotation);
        const cx = source.x + sW / 2;
        const cy = source.y + sH / 2;

        const rangeRadius = range / 2;

        const px1 = cx - rangeRadius;
        const py1 = cy - rangeRadius;
        const px2 = cx + rangeRadius;
        const py2 = cy + rangeRadius;

        // Check AABB intersection
        return !(tx2 <= px1 || tx1 >= px2 || ty2 <= py1 || ty1 >= py2);
    });
};
