import type { Recipe } from '../types';
import { MATERIALS } from './items';

// Placeholder recipes only for data-structure validation and integration tests.
// These values do NOT represent final or authoritative in-game production data.
export const RECIPES: Recipe[] = [
  {
    id: 'recipe-crusher-blue-iron-powder',
    name: '藍鐵礦粉碎（示例）',
    machineId: 'crusher',
    durationSeconds: 6,
    inputs: [
      { materialId: MATERIALS.BLUE_IRON_ORE.id, amount: 2 }
    ],
    outputs: [
      { materialId: MATERIALS.BLUE_IRON_POWDER.id, amount: 3 }
    ],
    notes: 'placeholder: ore -> intermediate'
  },
  {
    id: 'recipe-assembler-iron-parts',
    name: '鐵製零件製作（示例）',
    machineId: 'assembler',
    durationSeconds: 8,
    inputs: [
      { materialId: MATERIALS.BLUE_IRON_POWDER.id, amount: 2 }
    ],
    outputs: [
      { materialId: MATERIALS.IRON_PARTS.id, amount: 1 }
    ],
    notes: 'placeholder: intermediate -> end-like product'
  },
  {
    id: 'recipe-refinery-multi-io-example',
    name: '複合精煉（多輸入示例）',
    machineId: 'refinery',
    durationSeconds: 10,
    inputs: [
      { materialId: MATERIALS.BLUE_IRON_BLOCK.id, amount: 1 },
      { materialId: MATERIALS.COMPACT_CRYSTAL.id, amount: 1 }
    ],
    outputs: [
      { materialId: MATERIALS.STEEL_INGOT.id, amount: 1 },
      { materialId: MATERIALS.HIGH_CRYSTAL_FIBER.id, amount: 1 }
    ],
    notes: 'placeholder: multi-input / multi-output sample'
  }
];
