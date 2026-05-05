import type { MachineConfig } from '../types';
import { MATERIALS } from './materials';

export const MACHINES: MachineConfig[] = [
    {
        id: 'protocol-core',
        name: '協議核心',
        power: 0,
        width: 9,
        height: 9,
        inputs: [
            { x: 0, y: 1, side: 'left' },
            { x: 0, y: 2, side: 'left' },
            { x: 0, y: 3, side: 'left' },
            { x: 0, y: 4, side: 'left' },
            { x: 0, y: 5, side: 'left' },
            { x: 0, y: 6, side: 'left' },
            { x: 0, y: 7, side: 'left' },
            { x: 8, y: 1, side: 'right' },
            { x: 8, y: 2, side: 'right' },
            { x: 8, y: 3, side: 'right' },
            { x: 8, y: 4, side: 'right' },
            { x: 8, y: 5, side: 'right' },
            { x: 8, y: 6, side: 'right' },
            { x: 8, y: 7, side: 'right' },
        ],
        outputs: [
            { x: 1, y: 0, side: 'top' },
            { x: 4, y: 0, side: 'top' },
            { x: 7, y: 0, side: 'top' },
            { x: 1, y: 8, side: 'bottom' },
            { x: 4, y: 8, side: 'bottom' },
            { x: 7, y: 8, side: 'bottom' },
        ],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'core',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'logistics-bridge',
        name: '物流橋',
        power: 0,
        width: 1,
        height: 1,
        inputs: [],
        outputs: [],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'logistics',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'splitter',
        name: '分流器',
        power: 0,
        width: 1,
        height: 1,
        inputs: [{ x: 0, y: 0, side: 'left' }],
        outputs: [{ x: 0, y: 0, side: 'right' }, { x: 0, y: 0, side: 'bottom' }, { x: 0, y: 0, side: 'top' }],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'logistics',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'merger',
        name: '匯流器',
        power: 0,
        width: 1,
        height: 1,
        inputs: [{ x: 0, y: 0, side: 'left' }, { x: 0, y: 0, side: 'top' }, { x: 0, y: 0, side: 'bottom' }],
        outputs: [{ x: 0, y: 0, side: 'right' }],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'logistics',
        allowedMaterials: Object.values(MATERIALS)
    }, {
        id: 'item-input-port',
        name: '物品准入口',
        power: 0,
        width: 1,
        height: 1,
        inputs: [],
        outputs: [],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'logistics',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'protocol-storage',
        name: '協議儲存箱',
        power: 10,
        width: 3,
        height: 3,
        inputs: [{ x: 0, y: 0, side: 'left' }, { x: 0, y: 1, side: 'left' }, { x: 0, y: 2, side: 'left' }],
        outputs: [{ x: 2, y: 0, side: 'right' }, { x: 2, y: 1, side: 'right' }, { x: 2, y: 2, side: 'right' }],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'storage',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'warehouse-storage-port',
        name: '倉庫存貨口',
        power: 0,
        width: 1,
        height: 3,
        inputs: [{ x: 0, y: 1, side: 'left' }],
        outputs: [],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'storage',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'warehouse-pickup-port',
        name: '倉庫取貨口',
        power: 0,
        width: 1,
        height: 3,
        inputs: [],
        outputs: [{ x: 0, y: 1, side: 'right' }],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'storage',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'warehouse-storage-pickup-line-segment',
        name: '倉庫存取線基段',
        power: 0,
        width: 4,
        height: 8,
        inputs: [],
        outputs: [],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'storage',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'warehouse-storage-pickup-line-source-pile',
        name: '倉庫存取線源樁',
        power: 0,
        width: 4,
        height: 4,
        inputs: [],
        outputs: [],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'storage',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'refinery',
        name: '精煉爐',
        power: 10,
        width: 3,
        height: 3,
        inputs: [{ x: 0, y: 0, side: 'left' }, { x: 0, y: 1, side: 'left' }, { x: 0, y: 2, side: 'left' }],
        outputs: [{ x: 2, y: 0, side: 'right' }, { x: 2, y: 1, side: 'right' }, { x: 2, y: 2, side: 'right' }],
        color: 'rgba(170, 221, 255, 0.3)', // Light Blue
        category: 'production',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'crusher',
        name: '粉碎機',
        power: 10,
        width: 3,
        height: 3,
        inputs: [{ x: 0, y: 0, side: 'left' }, { x: 0, y: 1, side: 'left' }, { x: 0, y: 2, side: 'left' }],
        outputs: [{ x: 2, y: 0, side: 'right' }, { x: 2, y: 1, side: 'right' }, { x: 2, y: 2, side: 'right' }],
        color: 'rgba(255, 170, 136, 0.3)', // Light Orange
        category: 'production',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'assembler',
        name: '配件機',
        power: 10,
        width: 3,
        height: 3,
        inputs: [{ x: 0, y: 0, side: 'left' }, { x: 0, y: 1, side: 'left' }, { x: 0, y: 2, side: 'left' }],
        outputs: [{ x: 2, y: 0, side: 'right' }, { x: 2, y: 1, side: 'right' }, { x: 2, y: 2, side: 'right' }],
        color: 'rgba(204, 136, 255, 0.3)', // Purple
        category: 'production',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'molder',
        name: '塑型機',
        power: 10,
        width: 3,
        height: 3,
        inputs: [{ x: 0, y: 0, side: 'left' }, { x: 0, y: 1, side: 'left' }, { x: 0, y: 2, side: 'left' }],
        outputs: [{ x: 2, y: 0, side: 'right' }, { x: 2, y: 1, side: 'right' }, { x: 2, y: 2, side: 'right' }],
        color: 'rgba(255, 136, 136, 0.3)', // Red
        category: 'production',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'seedHarvester',
        name: '採種機',
        power: 10,
        width: 5,
        height: 5,
        inputs: [{ x: 0, y: 0, side: 'left' }, { x: 0, y: 1, side: 'left' }, { x: 0, y: 2, side: 'left' }, { x: 0, y: 3, side: 'left' }, { x: 0, y: 4, side: 'left' }],
        outputs: [{ x: 4, y: 0, side: 'right' }, { x: 4, y: 1, side: 'right' }, { x: 4, y: 2, side: 'right' }, { x: 4, y: 3, side: 'right' }, { x: 4, y: 4, side: 'right' }],
        color: 'rgba(209, 230, 209, 0.3)', // Green
        category: 'production',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'planter',
        name: '種植機',
        power: 10,
        width: 5,
        height: 5,
        inputs: [{ x: 0, y: 0, side: 'left' }, { x: 0, y: 1, side: 'left' }, { x: 0, y: 2, side: 'left' }, { x: 0, y: 3, side: 'left' }, { x: 0, y: 4, side: 'left' }],
        outputs: [{ x: 4, y: 0, side: 'right' }, { x: 4, y: 1, side: 'right' }, { x: 4, y: 2, side: 'right' }, { x: 4, y: 3, side: 'right' }, { x: 4, y: 4, side: 'right' }],
        color: 'rgba(255, 136, 136, 0.3)', // Red
        category: 'production',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'component-assembler',
        name: '裝備原件機',
        power: 10,
        width: 4,
        height: 6,
        inputs: [
            { x: 0, y: 0, side: 'left' }, { x: 0, y: 1, side: 'left' },
            { x: 0, y: 2, side: 'left' }, { x: 0, y: 3, side: 'left' },
            { x: 0, y: 4, side: 'left' }, { x: 0, y: 5, side: 'left' }
        ],
        outputs: [
            { x: 3, y: 0, side: 'right' }, { x: 3, y: 1, side: 'right' },
            { x: 3, y: 2, side: 'right' }, { x: 3, y: 3, side: 'right' },
            { x: 3, y: 4, side: 'right' }, { x: 3, y: 5, side: 'right' }
        ],
        color: 'rgba(255, 136, 204, 0.3)', // Pinkish
        category: 'processing',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'filler',
        name: '灌裝機',
        power: 10,
        width: 4,
        height: 6,
        inputs: [
            { x: 0, y: 0, side: 'left' }, { x: 0, y: 1, side: 'left' },
            { x: 0, y: 2, side: 'left' }, { x: 0, y: 3, side: 'left' },
            { x: 0, y: 4, side: 'left' }, { x: 0, y: 5, side: 'left' }
        ],
        outputs: [
            { x: 3, y: 0, side: 'right' }, { x: 3, y: 1, side: 'right' },
            { x: 3, y: 2, side: 'right' }, { x: 3, y: 3, side: 'right' },
            { x: 3, y: 4, side: 'right' }, { x: 3, y: 5, side: 'right' }
        ],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'processing',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'sealer',
        name: '封裝機',
        power: 10,
        width: 4,
        height: 6,
        inputs: [
            { x: 0, y: 0, side: 'left' }, { x: 0, y: 1, side: 'left' },
            { x: 0, y: 2, side: 'left' }, { x: 0, y: 3, side: 'left' },
            { x: 0, y: 4, side: 'left' }, { x: 0, y: 5, side: 'left' }
        ],
        outputs: [
            { x: 3, y: 0, side: 'right' }, { x: 3, y: 1, side: 'right' },
            { x: 3, y: 2, side: 'right' }, { x: 3, y: 3, side: 'right' },
            { x: 3, y: 4, side: 'right' }, { x: 3, y: 5, side: 'right' }
        ],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'processing',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'grinder',
        name: '研磨機',
        power: 10,
        width: 4,
        height: 6,
        inputs: [
            { x: 0, y: 0, side: 'left' }, { x: 0, y: 1, side: 'left' },
            { x: 0, y: 2, side: 'left' }, { x: 0, y: 3, side: 'left' },
            { x: 0, y: 4, side: 'left' }, { x: 0, y: 5, side: 'left' }
        ],
        outputs: [
            { x: 3, y: 0, side: 'right' }, { x: 3, y: 1, side: 'right' },
            { x: 3, y: 2, side: 'right' }, { x: 3, y: 3, side: 'right' },
            { x: 3, y: 4, side: 'right' }, { x: 3, y: 5, side: 'right' }
        ],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'processing',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'reactor',
        name: '反應池',
        power: 10,
        width: 5,
        height: 5,
        inputs: [
            { x: 0, y: 1, side: 'left' },
            { x: 0, y: 3, side: 'left' },
        ],
        outputs: [
            { x: 4, y: 1, side: 'right' },
            { x: 4, y: 3, side: 'right' },
        ],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'processing',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'tian-you-hong-furnace',
        name: '天有洪爐',
        power: 10,
        width: 5,
        height: 5,
        inputs: [
            { x: 0, y: 0, side: 'left' },
            { x: 0, y: 1, side: 'left' },
            { x: 0, y: 2, side: 'left' },
            { x: 0, y: 3, side: 'left' },
            { x: 0, y: 4, side: 'left' },
        ],
        outputs: [
            { x: 4, y: 0, side: 'right' },
            { x: 4, y: 1, side: 'right' },
            { x: 4, y: 2, side: 'right' },
            { x: 4, y: 3, side: 'right' },
            { x: 4, y: 4, side: 'right' },
        ],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'processing',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'supply-pole',
        name: '供電樁',
        power: 0, // Does not consume power
        supplyRange: 12, // 12x12 range
        width: 2,
        height: 2,
        inputs: [], // No inputs/outputs explicitly mentioned, but usually power poles might have them? User didn't say. Assuming standalone.
        outputs: [],
        color: 'rgba(255, 230, 128, 0.3)', // Pale Yellow
        category: 'power',
        allowedMaterials: Object.values(MATERIALS)
    },
    {
        id: 'thermal-pool',
        name: '熱能池',
        power: 0,
        width: 2,
        height: 2,
        inputs: [
            { x: 0, y: 0, side: 'left' },
            { x: 0, y: 1, side: 'left' },
        ],
        outputs: [],
        color: 'rgba(255, 255, 255, 0.3)',
        category: 'power',
        allowedMaterials: Object.values(MATERIALS)
    }
];

export const getMachineConfig = (id: string) => MACHINES.find(m => m.id === id);
