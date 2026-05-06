export type FacilityId = string;
export type MachineId = FacilityId;

export interface Point { x: number; y: number; }

export type ItemCategory = 'natural_resource' | 'gatherable' | 'rare_material' | 'aic_product' | 'usable_item' | 'functional_item' | 'unknown';
export type StorageCategory = 'minerals' | 'plants' | 'products' | 'gatherables' | 'progression' | 'usables' | 'production' | 'none' | 'unknown';
export type Rarity = 'gray' | 'green' | 'blue' | 'purple' | 'gold' | 'orange' | 'unknown';
export type ItemState = 'solid' | 'liquid';
export type MaterialState = ItemState;

export interface Item {
  id: string;
  name: string;
  icon: number;
  nameEn?: string;
  itemCategory?: ItemCategory;
  storageCategory?: StorageCategory;
  rarity?: Rarity;
  state?: ItemState;
  canDump?: boolean;
  category?: 'ore' | 'plant' | 'industrial' | 'usable_item' | 'unknown';
  isSourceProduct?: boolean;
  isRecyclable?: boolean;
  isFinalProduct?: boolean;
  isBottle?: boolean;
  powerGenerationRaw?: string;
  notes?: string;
}

export type Material = Item;

export type RecipeId = string;
export interface RecipeItemAmount { materialId: string; amount: number; }
export interface Recipe { id: RecipeId; name: string; machineId: string; durationSeconds: number; inputs: RecipeItemAmount[]; outputs: RecipeItemAmount[]; notes?: string; }

export interface FacilityConfig { id: string; name: string; nameEn?: string; power: number; width: number; height: number; inputs: PortConfig[]; outputs: PortConfig[]; color: string; icon?: string; supplyRange?: number; category: string; rarity?: Rarity; notes?: string; allowedItems?: Item[]; allowedMaterials?: Item[]; }
export type MachineConfig = FacilityConfig;
export type Side = 'top' | 'right' | 'bottom' | 'left';
export interface PortConfig { x: number; y: number; side: Side; }
export type Direction = 0 | 1 | 2 | 3;
export interface PlacedFacility { id: FacilityId; machineId: string; x: number; y: number; rotation: Direction; selectedItemId?: string; selectedMaterialId?: string; }
export type PlacedMachine = PlacedFacility;
export interface Connection { id: string; fromOriginal: { machineId: MachineId; portIndex: number }; toOriginal: { machineId: MachineId; portIndex: number } | null; path: Point[]; }
export const GameMode = { BUILD: 'BUILD', WIRE: 'WIRE', BOX_SELECT: 'BOX_SELECT', MOVE_SELECTION: 'MOVE_SELECTION' } as const;
export type GameMode = typeof GameMode[keyof typeof GameMode];
