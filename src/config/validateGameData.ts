import { MACHINES } from './machines';
import { MATERIALS } from './materials';
import { RECIPES } from './recipes';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const collectDuplicateValues = (values: string[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates];
};

export const validateGameData = (): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const materialList = Object.values(MATERIALS);

  // 1. Material id duplicates
  for (const id of collectDuplicateValues(materialList.map(m => m.id))) {
    errors.push(`[Material] Duplicate id: ${id}`);
  }

  // 2. Machine id duplicates
  for (const id of collectDuplicateValues(MACHINES.map(m => m.id))) {
    errors.push(`[Machine] Duplicate id: ${id}`);
  }

  // 3. Recipe id duplicates
  for (const id of collectDuplicateValues(RECIPES.map(r => r.id))) {
    errors.push(`[Recipe] Duplicate id: ${id}`);
  }

  const machineIdSet = new Set(MACHINES.map(m => m.id));
  const materialIdSet = new Set(materialList.map(m => m.id));

  // 10. Machine ports within width/height bounds
  MACHINES.forEach(machine => {
    const validatePort = (
      port: { x: number; y: number; side: string },
      portType: 'input' | 'output',
      idx: number
    ) => {
      if (port.x < 0 || port.y < 0 || port.x >= machine.width || port.y >= machine.height) {
        errors.push(
          `[Machine:${machine.id}] ${portType} port #${idx} out of bounds: (${port.x},${port.y}) not in [0..${machine.width - 1}] x [0..${machine.height - 1}]`
        );
      }
    };

    machine.inputs.forEach((port, idx) => validatePort(port, 'input', idx));
    machine.outputs.forEach((port, idx) => validatePort(port, 'output', idx));
  });

  RECIPES.forEach(recipe => {
    // 4. Recipe machine exists
    if (!machineIdSet.has(recipe.machineId)) {
      errors.push(`[Recipe:${recipe.id}] Unknown machineId: ${recipe.machineId}`);
    }

    // 7. durationSeconds > 0
    if (!(recipe.durationSeconds > 0)) {
      errors.push(`[Recipe:${recipe.id}] durationSeconds must be > 0`);
    }

    // 8. inputs/outputs length > 0
    if (recipe.inputs.length === 0) {
      errors.push(`[Recipe:${recipe.id}] inputs must have at least 1 item`);
    }
    if (recipe.outputs.length === 0) {
      errors.push(`[Recipe:${recipe.id}] outputs must have at least 1 item`);
    }

    recipe.inputs.forEach((item, idx) => {
      // 5. input material exists
      if (!materialIdSet.has(item.materialId)) {
        errors.push(`[Recipe:${recipe.id}] input #${idx} unknown materialId: ${item.materialId}`);
      }
      // 9. amount > 0
      if (!(item.amount > 0)) {
        errors.push(`[Recipe:${recipe.id}] input #${idx} amount must be > 0`);
      }
    });

    recipe.outputs.forEach((item, idx) => {
      // 6. output material exists
      if (!materialIdSet.has(item.materialId)) {
        errors.push(`[Recipe:${recipe.id}] output #${idx} unknown materialId: ${item.materialId}`);
      }
      // 9. amount > 0
      if (!(item.amount > 0)) {
        errors.push(`[Recipe:${recipe.id}] output #${idx} amount must be > 0`);
      }
    });
  });

  if (materialList.some(m => m.state === undefined || m.category === undefined || m.isFinalProduct === undefined)) {
    warnings.push('[Material] Some new planner fields are not filled yet (state/category/isFinalProduct).');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};
