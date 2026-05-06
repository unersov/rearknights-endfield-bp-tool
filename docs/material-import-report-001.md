# 材料数据库导入报告 001

## 1) 本次读取的源文件
- `docs/info2update.csv`
- `docs/notes4ai`

## 2) 最终替换/修改的代码文件
- `src/config/materials.ts`（已按 CSV 全量替换旧材料数据）
- `src/types.ts`（扩展 Material 与相关枚举类型）
- `src/config/validateGameData.ts`（扩展数据审查规则）
- `src/config/machines.ts`（将硬编码材料白名单改为 `Object.values(MATERIALS)` 以兼容新材料键名）

## 3) CSV 字段到 Material 字段映射
- 名称 -> `name`
- 英文名称 -> `nameEn`
- 物品分类 -> `itemCategory`（中文映射到枚举）
- 仓库分类 -> `storageCategory`（中文映射到枚举；液体自然资源空白时映射为 `none`）
- 稀有度 -> `rarity`（中文映射到枚举）
- 是否液体/可否排放 -> `state` / `canDump`
- 发电量 -> `powerGenerationRaw`（保留原始字符串，不换算）
- 备注列 -> `isSourceProduct` / `isRecyclable` / `isFinalProduct` / `isBottle` / `notes`

## 4) 统计
- 材料总数：95
- 液体材料数量：11
- 可排放液体数量：6
- 不可排放液体数量：5
- 源头产物数量：6
- 可循环材料数量：12
- 终端产物数量：23
- 瓶子数量：6
- 有发电量字段的材料数量：6

## 5) 数据审查发现的问题
- 重复英文名：
  - Cuprium Bottle（lines 63,64）
  - Cryston Part（lines 67,68,69）
  - HC Valley Battery（lines 79,80,81）
  - Buckflower Powder（lines 83,84）
- 生成后的重复 id（已自动加 `_2`、`_3` 后缀规避冲突）：
  - `cuprium_bottle`
  - `cryston_part`
  - `hc_valley_battery`
  - `buckflower_powder`

## 6) 后续维护建议
- 继续更新材料：修改 `docs/info2update.csv` 后，同步更新 `src/config/materials.ts`。
- 录入设施：修改 `src/config/machines.ts`。
- 录入配方：修改 `src/config/recipes.ts`（或后续新增专门配方数据文件并在 `src/config/index.ts` 导出）。

## 可能可以清理的文件
- 路径：`docs/data-import-report-001.md`
  - 当前作用：早期导入报告。
  - 内容概述：历史一次数据导入记录与说明。
  - 可能不再需要的原因：与本次新报告职责重叠，可能造成文档分散。
  - 删除风险：丢失历史变更背景与排错线索。
  - 建议：需要人工判断。

- 路径：`docs/auto-planner-discovery.md`
  - 当前作用：自动规划相关探索文档。
  - 内容概述：规划器发现与研究记录。
  - 可能不再需要的原因：若后续路线完全调整，历史草案可能过时。
  - 删除风险：该文件可能仍被团队流程引用；且本次任务明确禁止修改该文件。
  - 建议：保留。
