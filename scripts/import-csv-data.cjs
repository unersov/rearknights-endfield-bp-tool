const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');

const root = path.resolve(__dirname, '..');
const docsDir = path.join(root, 'docs');
const srcConfigDir = path.join(root, 'src', 'config');

const read = (file) => {
  const buffer = fs.readFileSync(path.join(root, file));
  const utf8 = buffer.toString('utf8').replace(/^\uFEFF/, '');
  if (!utf8.includes('\uFFFD')) return utf8;
  return new TextDecoder('gb18030').decode(buffer).replace(/^\uFEFF/, '');
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);

  const headers = rows.shift().map((header) => header.trim());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, (values[index] ?? '').trim()])));
};

const toSnakeId = (name) => {
  const id = name
    .normalize('NFKD')
    .replace(/\[[^\]]+\]/g, (match) => ` ${match.slice(1, -1)} `)
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return id || 'unknown';
};

const toKebabId = (name) => {
  const id = name
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return id || 'unknown';
};

const toConstKey = (id) => id.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();

const itemCategoryMap = {
  '自然资源': 'natural_resource',
  '采集材料': 'gatherable',
  '珍贵材料': 'rare_material',
  '工业产物': 'aic_product',
  '可用道具': 'usable_item',
  '功能道具': 'functional_item',
};

const storageCategoryMap = {
  '矿物': 'minerals',
  '植物': 'plants',
  '产物': 'products',
  '采集材料': 'gatherables',
  '培养素材': 'progression',
  '可用道具': 'usables',
  '生产工具': 'production',
  '': 'none',
};

const rarityMap = {
  '灰色': 'gray',
  '绿色': 'green',
  '蓝色': 'blue',
  '紫色': 'purple',
  '金色': 'gold',
  '橙色': 'orange',
};

const facilityCategoryMap = {
  '资源开采': 'resourcing',
  '物流': 'logistics',
  '物流设备': 'logistics',
  '仓库存取': 'storage',
  '基础生产': 'production',
  '合成制造': 'processing',
  '电力供应': 'power',
  '电力': 'power',
  '功能设备': 'core',
};

const colorByRarity = {
  gray: 'rgba(255,255,255,0.3)',
  green: 'rgba(170,255,170,0.3)',
  blue: 'rgba(170,221,255,0.3)',
  purple: 'rgba(204,136,255,0.3)',
  gold: 'rgba(255,215,128,0.3)',
  orange: 'rgba(255,170,85,0.3)',
  unknown: 'rgba(255,255,255,0.3)',
};

const sideMap = { L: 'left', R: 'right', U: 'top', D: 'bottom' };

const parsePorts = (raw, warnings, facilityName, fieldName) => {
  if (!raw) return [];
  return raw
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .flatMap((token) => {
      const match = token.match(/^(\d+),(\d+)([LRUD])$/);
      if (!match) {
        warnings.push(`[Facility:${facilityName}] Cannot parse ${fieldName} port token: ${token}`);
        return [];
      }
      return [{ x: Number(match[1]), y: Number(match[2]), side: sideMap[match[3]] }];
    });
};

const iconByFacilityId = {
  'automation-core': 'protocol-core',
  'item-control-port': 'item-input-port',
  splitter: 'splitter',
  'belt-bridge': 'logistics-bridge',
  converger: 'merger',
  'pipe-control-port': 'item-input-port',
  'pipe-splitter': 'splitter',
  'pipe-bridge': 'logistics-bridge',
  'pipe-converger': 'merger',
  belt: 'logistics-bridge',
  pipe: 'logistics-bridge',
  'protocol-stash': 'protocol-storage',
  'depot-loader': 'warehouse-storage-port',
  'depot-unloader': 'warehouse-pickup-port',
  'fluid-tank': 'protocol-storage',
  'depot-bus-section': 'warehouse-storage-pickup-line-segment',
  'depot-bus-port': 'warehouse-storage-pickup-line-source-pile',
  'conduit-inlet': 'warehouse-storage-port',
  'conduit-outlet': 'warehouse-pickup-port',
  'conduit-inlet-manifold': 'warehouse-storage-port',
  'conduit-outlet-manifold': 'warehouse-pickup-port',
  'refining-unit': 'refinery',
  'shredding-unit': 'crusher',
  fittinguhit: 'component-assembler',
  'mouldling-unit': 'molder',
  'planting-unit': 'planter',
  'seed-picking-unit': 'seedHarvester',
  'water-treatment-unit': 'refinery',
  'gearing-unit': 'component-assembler',
  'filling-unit': 'filler',
  'packaging-unit': 'sealer',
  'grinding-unit': 'grinder',
  'reactor-crucible': 'reactor',
  'expanded-crucible': 'reactor',
  'forge-of-the-sky': 'tian-you-hong-furnace',
  'puritication-unit': 'refinery',
  'separating-unit': 'sealer',
  'electric-pylon': 'supply-pole',
  'xiranite-pylon': 'supply-pole',
  'thermal-bank': 'thermal-pool',
};

const itemRows = parseCsv(read('docs/info2update_items.csv'));
const facilityRows = parseCsv(read('docs/info2update_facilities.csv'));
const warnings = [];
const errors = [];

const items = itemRows.map((row, index) => {
  const name = row['名称'];
  const nameEn = row['英文名称'];
  const id = toSnakeId(nameEn);
  const liquidRaw = row['是否液体/可否排放'];
  const notes = row[''] || '';
  const state = liquidRaw.includes('液体') ? 'liquid' : 'solid';

  if (!name) errors.push(`[Item row ${index + 2}] Missing Chinese name`);
  if (!nameEn) errors.push(`[Item row ${index + 2}] Missing English name`);
  if (!itemCategoryMap[row['物品分类']]) warnings.push(`[Item:${id}] Unknown item category: ${row['物品分类']}`);
  if (!storageCategoryMap[row['仓库分类']]) warnings.push(`[Item:${id}] Unknown storage category: ${row['仓库分类']}`);
  if (!rarityMap[row['稀有度']]) warnings.push(`[Item:${id}] Unknown rarity: ${row['稀有度']}`);

  return {
    key: toConstKey(id),
    id,
    name,
    icon: index,
    itemCategory: itemCategoryMap[row['物品分类']] || 'unknown',
    storageCategory: storageCategoryMap[row['仓库分类']] || 'unknown',
    rarity: rarityMap[row['稀有度']] || 'unknown',
    state,
    canDump: liquidRaw.includes('可排放') && !liquidRaw.includes('不可排放'),
    isSourceProduct: notes.includes('源头产物'),
    isRecyclable: notes.includes('可循环'),
    isFinalProduct: notes.includes('终端产物'),
    isBottle: notes.includes('瓶子'),
    nameEn,
    powerGenerationRaw: row['发电量'] || undefined,
    notes: notes || undefined,
  };
});

const facilities = facilityRows.map((row, index) => {
  const name = row['名称'];
  const nameEn = row['英文名'];
  const id = toKebabId(nameEn);
  const rarity = rarityMap[row['品质']] || 'unknown';
  const category = facilityCategoryMap[row['分类']] || 'misc';
  const sizeMatch = row['占地尺寸（x*y）'].match(/^(\d+)\s*\*\s*(\d+)$/);
  const width = sizeMatch ? Number(sizeMatch[1]) : 0;
  const height = sizeMatch ? Number(sizeMatch[2]) : 0;
  const inputs = [
    ...parsePorts(row['物品输入口及朝向（x,y）'], warnings, id, 'item input'),
    ...parsePorts(row['管道输入口及朝向（x,y）'], warnings, id, 'pipe input'),
  ];
  const outputs = [
    ...parsePorts(row['物品输出口及朝向（x,y）'], warnings, id, 'item output'),
    ...parsePorts(row['管道输出口及朝向（x,y）'], warnings, id, 'pipe output'),
  ];

  if (!name) errors.push(`[Facility row ${index + 2}] Missing Chinese name`);
  if (!nameEn) errors.push(`[Facility row ${index + 2}] Missing English name`);
  if (!facilityCategoryMap[row['分类']]) warnings.push(`[Facility:${id}] Unknown category: ${row['分类']}`);
  if (!sizeMatch) errors.push(`[Facility:${id}] Missing or invalid size: ${row['占地尺寸（x*y）']}`);

  for (const [type, ports] of [['input', inputs], ['output', outputs]]) {
    ports.forEach((port, portIndex) => {
      if (port.x < 0 || port.y < 0 || port.x >= width || port.y >= height) {
        errors.push(`[Facility:${id}] ${type} port #${portIndex} out of bounds: ${port.x},${port.y}`);
      }
    });
  }

  return {
    id,
    name,
    nameEn,
    power: row['耗电量'] === '' ? 0 : Number(row['耗电量']),
    width,
    height,
    inputs,
    outputs,
    color: colorByRarity[rarity],
    icon: iconByFacilityId[id],
    category,
    rarity,
    notes: row['备注/放置限制'] || undefined,
  };
});

const collectDuplicates = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

for (const id of collectDuplicates(items.map((item) => item.id))) errors.push(`[Item] Duplicate id: ${id}`);
for (const name of collectDuplicates(items.map((item) => item.nameEn))) errors.push(`[Item] Duplicate English name: ${name}`);
for (const name of collectDuplicates(items.map((item) => item.name))) errors.push(`[Item] Duplicate Chinese name: ${name}`);
for (const id of collectDuplicates(facilities.map((facility) => facility.id))) errors.push(`[Facility] Duplicate id: ${id}`);
for (const name of collectDuplicates(facilities.map((facility) => facility.nameEn))) errors.push(`[Facility] Duplicate English name: ${name}`);
for (const name of collectDuplicates(facilities.map((facility) => facility.name))) errors.push(`[Facility] Duplicate Chinese name: ${name}`);

for (const facility of facilities) {
  if (!facility.icon) warnings.push(`[Facility:${facility.id}] No local asset mapping found; toolbar will fall back to id image`);
}

const suspiciousNames = [
  ['fittinguhit', 'FittingUhit looks like a typo of Fitting Unit'],
  ['puritication-unit', 'Puritication Unit looks like a typo of Purification Unit'],
  ['mouldling-unit', 'Mouldling Unit may be intentional, but spelling is unusual'],
  ['inert_xirconn_effluent', 'Inert Xirconn Effluent uses Xirconn while related items use Xircon'],
  ['anhethyst_fiber', 'Anhethyst Fiber may be intentional, but spelling is unusual'],
];

for (const [id, message] of suspiciousNames) {
  if (items.some((item) => item.id === id) || facilities.some((facility) => facility.id === id)) {
    warnings.push(`[Spelling] ${message}`);
  }
}

const tsHeader = '// Generated from docs/info2update_items.csv and docs/info2update_facilities.csv. Do not edit by hand.\n';
const itemEntries = items
  .map((item) => {
    const { key, ...data } = item;
    return `  ${key}: ${JSON.stringify(data)}`;
  })
  .join(',\n');

const facilitiesEntries = facilities
  .map((facility) => {
    const data = { ...facility };
    return `  {\n${Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `    ${key}: ${JSON.stringify(value)},`)
      .join('\n')}\n    allowedItems: Object.values(ITEMS),\n  }`;
  })
  .join(',\n');

fs.writeFileSync(
  path.join(srcConfigDir, 'items.ts'),
  `${tsHeader}import type { Item } from '../types';\n\nexport const ITEMS: Record<string, Item> = {\n${itemEntries}\n};\n\nexport const MATERIALS = ITEMS;\n`,
  'utf8',
);

fs.writeFileSync(
  path.join(srcConfigDir, 'facilities.ts'),
  `${tsHeader}import type { FacilityConfig } from '../types';\nimport { ITEMS } from './items';\n\nexport const FACILITIES: FacilityConfig[] = [\n${facilitiesEntries}\n];\n\nexport const MACHINES = FACILITIES;\nexport const getFacilityConfig = (id: string) => FACILITIES.find(facility => facility.id === id);\nexport const getMachineConfig = getFacilityConfig;\n`,
  'utf8',
);

const report = [
  '# Data Import Report',
  '',
  `Source items CSV: docs/info2update_items.csv`,
  `Source facilities CSV: docs/info2update_facilities.csv`,
  '',
  `Imported items: ${items.length}`,
  `Imported facilities: ${facilities.length}`,
  '',
  '## Errors',
  errors.length === 0 ? 'No blocking data errors found.' : errors.map((error) => `- ${error}`).join('\n'),
  '',
  '## Warnings / Manual Review',
  warnings.length === 0 ? 'No obvious data issues found.' : warnings.map((warning) => `- ${warning}`).join('\n'),
  '',
  '## Notes',
  '- Facility item and pipe ports were merged into the existing `inputs` / `outputs` structure because the app currently has a single port model.',
  '- `allowedItems` is populated from the new `ITEMS` list for every facility. Legacy `allowedMaterials` is kept as a type-level compatibility field but is no longer emitted in new facility data.',
  '- `RECIPES` are not generated here because the facility CSV does not contain recipe rows.',
  '',
].join('\n');

fs.writeFileSync(path.join(docsDir, 'data-import-report-002.md'), report, 'utf8');

console.log(`Imported ${items.length} items and ${facilities.length} facilities.`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
