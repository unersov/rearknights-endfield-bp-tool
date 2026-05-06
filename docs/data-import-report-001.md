# Data Import Report 001

## 1) Source files read
- `src/types.ts`
- `src/config/materials.ts`
- `src/config/machines.ts`
- `src/config/recipes.ts`
- `src/config/index.ts`
- `src/config/validateGameData.ts`
- `docs/auto-planner-discovery.md` (read-only)

> Blocker: `docs/info2update.csv` and `docs/notes4ai` are not present in the current repository snapshot, so a full CSV-driven import could not be executed in this change.

## 2) CSV mapping plan (prepared)
Defined target mapping for future import:
- 名称 -> `name`
- 英文名称 -> `nameEn`
- 物品分类 -> `itemCategory`
- 仓库分类 -> `storageCategory`
- 稀有度 -> `rarity`
- 是否液体/可否排放 -> `state` + `canDump`
- 发电量 -> `powerGenerationRaw`
- Unnamed: 7 -> `isSourceProduct` / `isRecyclable` / `isFinalProduct` / `isBottle` + `notes`

## 3) Code files updated in this pass
- `src/types.ts`: added planner-oriented material fields/types (non-breaking optional fields).
- `src/config/validateGameData.ts`: expanded validation rules for material schema consistency.

## 4) Current material stats (legacy dataset only)
- 材料总数: pending CSV import
- 液体材料数量: pending CSV import
- 可排放液体数量: pending CSV import
- 不可排放液体数量: pending CSV import
- 源头产物数量: pending CSV import
- 可循环材料数量: pending CSV import
- 终端产物数量: pending CSV import
- 瓶子数量: pending CSV import
- 有发电量字段的材料数量: pending CSV import

## 5) Data quality lists
- 重复/可疑英文名: pending CSV import
- 缺失英文名: pending CSV import
- 无法识别分类/稀有度/仓库分类: pending CSV import

## 6) Manual review needed
1. Add `docs/info2update.csv` into repo.
2. Add `docs/notes4ai` into repo.
3. Confirm whether existing legacy `name` should continue as UI display primary field.

## 7) Update locations (future)
- 更新材料: `src/config/materials.ts`
- 更新设施: `src/config/machines.ts`
- 录入配方: `src/config/recipes.ts`
- 数据校验: `src/config/validateGameData.ts`

## 可能可以清理的文件
> 只列候选，不删除。

1. `src/config/recipes.ts`
- 当前作用: placeholder 配方样例。
- 主要内容: 示例结构，非完整真实数据。
- 可能不再需要原因: 当前任务聚焦材料，配方数据可能与后续真实录入冲突。
- 删除风险: 中等；`validateGameData` 当前会读取该文件。
- 建议: 需要人工判断（暂保留）。

2. `docs/auto-planner-discovery.md`
- 当前作用: 早期调研文档。
- 主要内容: 结构盘点与架构建议。
- 可能不再需要原因: 部分内容可能过时。
- 删除风险: 中等；仍有历史决策参考价值。
- 建议: 保留。
