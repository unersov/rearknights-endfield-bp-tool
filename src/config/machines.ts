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
        allowedMaterials: []
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
        allowedMaterials: []
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
        allowedMaterials: []
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
        allowedMaterials: []
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
        allowedMaterials: []
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
        allowedMaterials: []
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
        allowedMaterials: []
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
        allowedMaterials: [
            MATERIALS.BLUE_IRON_BLOCK,
            MATERIALS.PURPLE_CRYSTAL_FIBER,
            MATERIALS.CRYSTAL_SHELL,
            MATERIALS.COMPACT_CRYSTAL,
            MATERIALS.STEEL_INGOT,
            MATERIALS.HIGH_CRYSTAL_FIBER,
            MATERIALS.STABLE_CARBON_BLOCK,
            MATERIALS.COMPACT_CRYSTAL_POWDER,
            MATERIALS.CARBON_BLOCK
        ]
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
        allowedMaterials: [
            MATERIALS.BLUE_IRON_POWDER,
            MATERIALS.PURPLE_CRYSTAL_POWDER,
            MATERIALS.SOURCE_POWDER,
            MATERIALS.CARBON_POWDER,
            MATERIALS.CRYSTAL_SHELL_POWDER,
            MATERIALS.QIAO_FLOWER_POWDER,
            MATERIALS.GAN_SHI_POWDER,
            MATERIALS.SAND_LEAF_POWDER,
            MATERIALS.KETONIZED_SHRUB_POWDER,
            MATERIALS.JIN_CAO_POWDER,
            MATERIALS.YA_ZHEN_POWDER
        ]
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
        allowedMaterials: [
            MATERIALS.IRON_PARTS,
            MATERIALS.PURPLE_CRYSTAL_PARTS,
            MATERIALS.STEEL_PARTS,
            MATERIALS.HIGH_CRYSTAL_PARTS
        ]
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
        allowedMaterials: [
            MATERIALS.BLUE_IRON_BOTTLE,
            MATERIALS.PURPLE_CRYSTAL_BOTTLE,
            MATERIALS.STEEL_BOTTLE,
            MATERIALS.HIGH_CRYSTAL_BOTTLE
        ]
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
        allowedMaterials: [
            MATERIALS.QIAO_FLOWER_SEED,
            MATERIALS.GAN_SHI_SEED,
            MATERIALS.SAND_LEAF_SEED,
            MATERIALS.KETONIZED_SHRUB_SEED,
            MATERIALS.JIN_CAO_SEED,
            MATERIALS.YA_ZHEN_SEED,
            MATERIALS.HUI_LU_MAI_SEED,
            MATERIALS.KU_YE_JIAO_SEED,
            MATERIALS.QIONG_YE_SHEN_SEED,
            MATERIALS.JIN_SHI_DAO_SEED
        ]
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
        allowedMaterials: [
            MATERIALS.QIAO_FLOWER,
            MATERIALS.GAN_SHI,
            MATERIALS.SAND_LEAF,
            MATERIALS.KETONIZED_SHRUB,
            MATERIALS.JIN_CAO,
            MATERIALS.YA_ZHEN
        ]
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
        allowedMaterials: [
            MATERIALS.PURPLE_CRYSTAL_EQUIPMENT_COMPONENT,
            MATERIALS.BLUE_IRON_EQUIPMENT_COMPONENT,
            MATERIALS.HIGH_CRYSTAL_EQUIPMENT_COMPONENT,
            MATERIALS.XI_RANG_EQUIPMENT_COMPONENT
        ]
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
        allowedMaterials: [
            MATERIALS.WATER_BOTTLE,
            MATERIALS.JIN_CAO_SOLUTION,
            MATERIALS.YA_ZHEN_SOLUTION,
            MATERIALS.LIQUID_XI_RANG
        ]
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
        allowedMaterials: [
            MATERIALS.INDUSTRIAL_EXPLOSIVE,
            MATERIALS.LOW_CAPACITY_FIELD_BATTERY,
            MATERIALS.MEDIUM_CAPACITY_FIELD_BATTERY,
            MATERIALS.HIGH_CAPACITY_FIELD_BATTERY,
            MATERIALS.YA_ZHEN_INJECTION,
            MATERIALS.JIN_CAO_BEVERAGE,
            MATERIALS.LOW_CAPACITY_WULING_BATTERY
        ]
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
        allowedMaterials: [
            MATERIALS.COMPACT_BLUE_IRON_POWDER,
            MATERIALS.HIGH_CRYSTAL_POWDER,
            MATERIALS.COMPACT_SOURCE_POWDER,
            MATERIALS.COMPACT_CARBON_POWDER,
            MATERIALS.COMPACT_CRYSTAL_POWDER,
            MATERIALS.FINE_GROUND_QIAO_FLOWER_POWDER,
            MATERIALS.FINE_GROUND_GAN_SHI_POWDER
        ]
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
        allowedMaterials: [
            MATERIALS.LIQUID_XI_RANG,
            MATERIALS.JIN_CAO_SOLUTION,
            MATERIALS.YA_ZHEN_SOLUTION
        ]
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
        allowedMaterials: [
            MATERIALS.XI_RANG
        ]
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
        allowedMaterials: []
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
        allowedMaterials: []
    }
];

export const getMachineConfig = (id: string) => MACHINES.find(m => m.id === id);
