import { MACHINES } from './machines';
import { MATERIALS } from './materials';
import { RECIPES } from './recipes';
import type { ItemCategory, Rarity, StorageCategory } from '../types';

export interface ValidationResult { valid: boolean; errors: string[]; warnings: string[]; }
const collectDuplicateValues = (values: string[]) => [...new Set(values.filter((v,i)=>values.indexOf(v)!==i))];

const ITEM_CATEGORIES: ItemCategory[] = ['natural_resource','gatherable','rare_material','aic_product','usable_item','functional_item','unknown'];
const STORAGE_CATEGORIES: StorageCategory[] = ['minerals','plants','products','gatherables','progression','usables','production','none','unknown'];
const RARITIES: Rarity[] = ['gray','green','blue','purple','gold','orange','unknown'];

export const validateGameData = (): ValidationResult => {
  const errors: string[] = []; const warnings: string[] = [];
  const materialList = Object.values(MATERIALS);

  for (const id of collectDuplicateValues(materialList.map(m => m.id))) errors.push(`[Material] Duplicate id: ${id}`);
  for (const id of collectDuplicateValues(MACHINES.map(m => m.id))) errors.push(`[Machine] Duplicate id: ${id}`);
  for (const id of collectDuplicateValues(RECIPES.map(r => r.id))) errors.push(`[Recipe] Duplicate id: ${id}`);

  materialList.forEach((m) => {
    if (!m.nameZh?.trim()) errors.push(`[Material:${m.id}] nameZh is required`);
    if (!m.itemCategory || !ITEM_CATEGORIES.includes(m.itemCategory)) errors.push(`[Material:${m.id}] invalid itemCategory: ${m.itemCategory}`);
    if (!m.storageCategory || !STORAGE_CATEGORIES.includes(m.storageCategory)) errors.push(`[Material:${m.id}] invalid storageCategory: ${m.storageCategory}`);
    if (!m.rarity || !RARITIES.includes(m.rarity)) errors.push(`[Material:${m.id}] invalid rarity: ${m.rarity}`);
    if (!m.state || !['solid','liquid'].includes(m.state)) errors.push(`[Material:${m.id}] invalid state: ${m.state}`);
    if (m.state === 'liquid' && typeof m.canDump !== 'boolean') errors.push(`[Material:${m.id}] liquid material must have explicit canDump boolean`);
    if (m.state === 'solid' && m.canDump) warnings.push(`[Material:${m.id}] solid material should not have canDump=true`);
    if (m.state !== 'liquid' && m.storageCategory === 'none') warnings.push(`[Material:${m.id}] non-liquid material has storageCategory=none`);
    if (m.powerGenerationRaw !== undefined && typeof m.powerGenerationRaw !== 'string') errors.push(`[Material:${m.id}] powerGenerationRaw must be string when provided`);
    if (m.isBottle && m.state === 'liquid') warnings.push(`[Material:${m.id}] isBottle=true but state=liquid`);
    if (m.isFinalProduct && m.isSourceProduct) warnings.push(`[Material:${m.id}] isFinalProduct and isSourceProduct are both true`);
  });

  const machineIdSet = new Set(MACHINES.map(m => m.id));
  const materialIdSet = new Set(materialList.map(m => m.id));
  MACHINES.forEach(machine => {
    [...machine.inputs.map((p,i)=>['input',p,i] as const), ...machine.outputs.map((p,i)=>['output',p,i] as const)].forEach(([t,p,i])=>{
      if (p.x < 0 || p.y < 0 || p.x >= machine.width || p.y >= machine.height) errors.push(`[Machine:${machine.id}] ${t} port #${i} out of bounds`);
    });
  });
  RECIPES.forEach(recipe => {
    if (!machineIdSet.has(recipe.machineId)) errors.push(`[Recipe:${recipe.id}] Unknown machineId: ${recipe.machineId}`);
    if (!(recipe.durationSeconds > 0)) errors.push(`[Recipe:${recipe.id}] durationSeconds must be > 0`);
    if (recipe.inputs.length === 0) errors.push(`[Recipe:${recipe.id}] inputs must have at least 1 item`);
    if (recipe.outputs.length === 0) errors.push(`[Recipe:${recipe.id}] outputs must have at least 1 item`);
    recipe.inputs.forEach((item, idx) => { if (!materialIdSet.has(item.materialId)) errors.push(`[Recipe:${recipe.id}] input #${idx} unknown materialId: ${item.materialId}`); if (!(item.amount > 0)) errors.push(`[Recipe:${recipe.id}] input #${idx} amount must be > 0`); });
    recipe.outputs.forEach((item, idx) => { if (!materialIdSet.has(item.materialId)) errors.push(`[Recipe:${recipe.id}] output #${idx} unknown materialId: ${item.materialId}`); if (!(item.amount > 0)) errors.push(`[Recipe:${recipe.id}] output #${idx} amount must be > 0`); });
  });

  return { valid: errors.length === 0, errors, warnings };
};
