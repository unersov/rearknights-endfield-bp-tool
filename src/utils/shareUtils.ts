import pako from 'pako';
import html2canvas from 'html2canvas';

// Types for Minified Data
type MinifiedMachine = [
    number, // typeIdx
    number, // x
    number, // y
    number, // rotation
    string | undefined // materialId (optional)
];

type MinifiedConnection = [
    number, // fromIdx
    number, // fromPort
    number, // toIdx
    number, // toPort
    number[] // flat path [x1, y1, x2, y2...]
];

interface MinifiedBlueprint {
    v: number;
    w: number;
    h: number;
    t: string[]; // types
    m: MinifiedMachine[];
    c: MinifiedConnection[];
}

// Base64Url Encode/Decode to be URL safe
const toBase64Url = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

const fromBase64Url = (str: string): Uint8Array => {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const minifyBlueprint = (data: any): MinifiedBlueprint => {
    const machineTypes = [...new Set<string>(data.machines.map((m: any) => m.machineId))];

    // Map original IDs to indices
    const idMap = new Map<string, number>();
    data.machines.forEach((m: any, i: number) => idMap.set(m.id, i));

    const machines: MinifiedMachine[] = data.machines.map((m: any) => {
        const typeIdx = machineTypes.indexOf(m.machineId);
        return [typeIdx, m.x, m.y, m.rotation, m.selectedMaterialId];
    });

    const connections: MinifiedConnection[] = data.connections.map((c: any) => {
        const fromIdx = idMap.get(c.fromOriginal.machineId) ?? -1;
        const toIdx = c.toOriginal ? (idMap.get(c.toOriginal.machineId) ?? -1) : -1;

        // Flatten path
        const flatPath: number[] = [];
        c.path.forEach((p: any) => {
            flatPath.push(p.x, p.y);
        });

        return [
            fromIdx,
            c.fromOriginal.portIndex,
            toIdx,
            c.toOriginal?.portIndex ?? -1,
            flatPath
        ];
    });

    return {
        v: 1,
        w: data.gridWidth,
        h: data.gridHeight,
        t: machineTypes,
        m: machines,
        c: connections
    };
};

const expandBlueprint = (data: MinifiedBlueprint): any => {
    if (data.v !== 1) throw new Error(`Unknown version ${data.v}`);

    const newIds: string[] = data.m.map(() => crypto.randomUUID());

    const machines = data.m.map((m, i) => ({
        id: newIds[i],
        machineId: data.t[m[0]],
        x: m[1],
        y: m[2],
        rotation: m[3],
        selectedMaterialId: m[4]
    }));

    const connections = data.c.map(c => {
        const fromId = newIds[c[0]];
        const toId = c[2] !== -1 ? newIds[c[2]] : undefined;

        // Reconstruct path
        const path = [];
        for (let i = 0; i < c[4].length; i += 2) {
            path.push({ x: c[4][i], y: c[4][i + 1] });
        }

        return {
            id: crypto.randomUUID(),
            fromOriginal: { machineId: fromId, portIndex: c[1] },
            toOriginal: toId ? { machineId: toId, portIndex: c[3] } : null,
            path
        };
    });

    return {
        machines,
        connections,
        gridWidth: data.w,
        gridHeight: data.h
    };
};

export const generateShareUrl = (blueprintData: any): string => {
    try {
        const minified = minifyBlueprint(blueprintData);
        const json = JSON.stringify(minified);
        const compressed = pako.deflate(json);
        const encoded = toBase64Url(compressed);
        return `${window.location.origin}${window.location.pathname}?bp=${encoded}`;
    } catch (e) {
        console.error('Share URL generation failed', e);
        return '';
    }
};

export const parseShareUrl = (): any | null => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('bp');

    // Fallback for old 'blueprint' param if needed, but we can assume fresh start
    if (!code) return null;

    try {
        const bytes = fromBase64Url(code);
        const decompressed = pako.inflate(bytes, { to: 'string' });
        const minified = JSON.parse(decompressed);
        return expandBlueprint(minified);
    } catch (e) {
        console.error('Failed to parse blueprint from URL', e);
        return null;
    }
};

export const captureBlueprintScreenshot = async (): Promise<string | null> => {
    // We target the .grid-container or a specific wrapper
    const gridContainer = document.querySelector('.grid-container');
    if (!gridContainer) return null;

    const zoomContent = gridContainer.querySelector('.zoom-content') as HTMLElement;
    if (!zoomContent) return null;

    // Get the grid background to know dimensions
    const gridBackground = zoomContent.querySelector('.grid-background') as HTMLElement;
    if (!gridBackground) return null;

    // Use current grid dimensions from the style
    const width = parseInt(gridBackground.style.width);
    const height = parseInt(gridBackground.style.height);

    // Create a clone wrapper
    const cloneWrapper = document.createElement('div');
    cloneWrapper.style.position = 'absolute';
    cloneWrapper.style.top = '0';
    cloneWrapper.style.left = '0';
    cloneWrapper.style.width = `${width}px`;
    cloneWrapper.style.height = `${height}px`;
    cloneWrapper.style.zIndex = '-9999'; // Behind everything
    cloneWrapper.style.overflow = 'hidden';

    const clonedContent = zoomContent.cloneNode(true) as HTMLElement;

    // Reset transforms on the clone
    clonedContent.style.transform = 'none';
    clonedContent.style.width = '100%';
    clonedContent.style.height = '100%';

    // Ensure background color is explicit
    cloneWrapper.style.backgroundColor = getComputedStyle(gridContainer).backgroundColor;

    cloneWrapper.appendChild(clonedContent);
    document.body.appendChild(cloneWrapper);

    // Wait a brief moment for DOM to settle/images to be recognized?
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const canvas = await html2canvas(cloneWrapper, {
            width: width,
            height: height,
            backgroundColor: null,
            scale: 1,
            logging: false,
            useCORS: true,
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0
        });

        const dataUrl = canvas.toDataURL('image/png');
        if (document.body.contains(cloneWrapper)) {
            document.body.removeChild(cloneWrapper);
        }
        return dataUrl;
    } catch (e) {
        console.error('Screenshot failed', e);
        if (document.body.contains(cloneWrapper)) {
            document.body.removeChild(cloneWrapper);
        }
        return null;
    }
};
