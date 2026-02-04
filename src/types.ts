export type MachineId = string;

export interface Point {
  x: number;
  y: number;
}

export interface Material {
  id: string;
  name: string;
  icon: number; // Represents the image number
}

export interface MachineConfig {
  id: string; // e.g., 'miner', 'furnace'
  name: string;
  power: number;
  width: number;
  height: number;
  // Ports relative to top-left (0,0) of the machine
  inputs: PortConfig[];
  outputs: PortConfig[];
  color: string;
  icon?: string; // Lucide icon name or similar (optional for now)
  supplyRange?: number; // Radius/Size of power supply (if this is a power source)
  category: string; // 'processing' | 'production' | 'power'
  allowedMaterials?: Material[]; // Materials that can be put into this machine
}

export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface PortConfig {
  x: number;
  y: number;
  side: Side;
}

export type Direction = 0 | 1 | 2 | 3; // 0: Up, 1: Right, 2: Down, 3: Left (Clockwise)

export interface PlacedMachine {
  id: MachineId; // unique instance id (UUID)
  machineId: string; // refers to MachineConfig.id
  x: number;
  y: number;
  rotation: Direction; // Default 0
  selectedMaterialId?: string;
}

export interface Connection {
  id: string;
  fromOriginal: { machineId: MachineId; portIndex: number }; // Output port
  toOriginal: { machineId: MachineId; portIndex: number } | null; // Input port (null if dangling/end of line)
  // For simplicity initially, let's track the PATH of proper grid points
  path: Point[];
}

export const GameMode = {
  BUILD: 'BUILD',
  WIRE: 'WIRE',
  BOX_SELECT: 'BOX_SELECT',
  MOVE_SELECTION: 'MOVE_SELECTION'
} as const;

export type GameMode = typeof GameMode[keyof typeof GameMode];
