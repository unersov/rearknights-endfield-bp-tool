# Auto Planner 技术调研（阶段 1：只做结构盘点）

> 目标：在不改动现有编辑器逻辑的前提下，为后续加入“自动规划器（Auto Planner）”准备技术基础。

## 1) 项目整体结构

这是一个 **React + TypeScript + Vite** 的前端单页应用，核心结构如下：

- `src/components/`：UI 组件（网格编辑器、工具栏、蓝图列表、对话框等）。
- `src/store/`：状态管理（`zustand`），编辑器主要业务逻辑集中在 `gameStore.ts`。
- `src/config/`：静态配置数据（机器定义、物品定义、网格预设等）。
- `src/utils/`：工具函数（寻路、旋转端口、蓝图存储、分享压缩编码等）。
- `src/types.ts`：当前全局核心类型（机器实例、连接、材质、端口等）。
- `src/App.tsx`：应用入口流程（启动加载、蓝图载入/保存、视图切换）。

当前代码形态更偏向 **“蓝图编辑器”**，而不是“产线仿真器/规划器”。

---

## 2) 游戏数据存放位置（机器 / 建筑 / 物品 / 配方 / 传送带 / 管道 / 连接器）

### 2.1 机器 / 建筑定义

主要在：

- `src/config/machines.ts`

这里定义了机器（含建筑）清单 `MACHINES`，每个条目包含：

- `id`, `name`
- 占地：`width`, `height`
- 端口：`inputs`, `outputs`
- `category`（core/logistics/storage/production/processing/power）
- `power`, `supplyRange`
- `allowedMaterials`

这份配置是当前编辑器“可放置对象”的唯一主数据源。

### 2.2 物品定义

主要在：

- `src/config/materials.ts`

以 `MATERIALS: Record<string, Material>` 形式维护物品字典，字段主要有：

- `id`
- `name`
- `icon`

物品会被机器配置中的 `allowedMaterials` 引用，用于 UI 选择“机器显示图标/物料标记”。

### 2.3 配方数据（Recipe）

**当前未发现独立“配方表”或“生产链配方图”定义文件。**

仓库中没有看到专门的 `recipes.ts/json` 或类似“输入→输出、耗时、每分钟产量”的结构；现有 `allowedMaterials` 更像“机器可选择的展示物料”，不是完整生产配方。

### 2.4 传送带 / 管道 / 连接器

- 逻辑连接用 `Connection`（路径点数组）表示，见 `src/types.ts`。
- 编辑器连线、路径预览、自动寻路在 `src/store/gameStore.ts` + `src/utils/gridUtils.ts`。
- 连接视觉是 `Grid.tsx` 的 SVG polyline（类名 `conveyor-*`）。
- “连接器/跨线”目前通过自动创建 `logistics-bridge` 机器实现（连线交叉时在交点生成桥）。

**管道（液体流体网络）目前未见独立系统。**

---

## 3) 蓝图数据结构定义位置

### 3.1 核心结构

- `src/utils/storage.ts`
  - `interface Blueprint`
  - `Blueprint.data` 包含：
    - `machines: PlacedMachine[]`
    - `connections: Connection[]`
    - `gridWidth`, `gridHeight`
    - `actualWidth`, `actualHeight`

### 3.2 分享压缩结构

- `src/utils/shareUtils.ts`
  - `MinifiedBlueprint`
  - `MinifiedMachine`
  - `MinifiedConnection`

这里将蓝图结构做压缩（pako + base64url）用于 URL 分享。

---

## 4) 模拟逻辑在哪里实现

### 4.1 现状结论

**目前没有“生产仿真（Simulation）”模块。**

当前“逻辑计算”主要是编辑器层面的：

- 放置碰撞检测：`checkCollision`（`src/utils/gridUtils.ts`）
- 连线寻路：`findPath`（A*，`src/utils/gridUtils.ts`）
- 电力覆盖检测：`isMachinePowered`（`src/utils/machineUtils.ts`）
- 选区/复制/移动/插入蓝图/撤销重做：`src/store/gameStore.ts`

### 4.2 对自动规划器的意义

后续的 Auto Planner 需要新增一层与编辑器解耦的“产线模型计算域”（graph + flow + rate）。目前仓库还没有这层。

---

## 5) UI 组件在哪里

主要在：

- `src/components/Grid.tsx`：主编辑画布（机器渲染、连接渲染、交互输入）。
- `src/components/Machine.tsx`：单机体渲染、端口点击、材质选择入口。
- `src/components/Toolbar.tsx`：工具与机器面板。
- `src/components/BlueprintList.tsx`：蓝图列表与打开/插入。
- `src/components/MaterialSelector.tsx`：机器物料图标选择弹窗。
- `src/components/SaveDialog.tsx`、`ShareModal.tsx`、`Settings.tsx` 等为辅助 UI。
- `src/App.tsx`：视图切换（list/editor/about/settings）与启动流程。

---

## 6) 如何在不破坏现有编辑器的前提下加入 Auto Planner

建议采用“**旁路扩展（sidecar）**”策略：

### 6.1 架构边界建议

1. **保持 `gameStore` 仅负责编辑器状态**（放置/连线/框选/蓝图读写）。
2. 新建独立规划域（例如未来放在 `src/planner/`）：
   - 数据模型：Recipe、FactoryNode、FlowEdge、Constraint
   - 求解流程：需求展开（BOM）→ 机器数估算 → 物流带宽估算 → 瓶颈识别
3. 用“适配层”做互转：
   - Planner 输出 → Blueprint draft（`PlacedMachine[] + Connection[]`）
   - 不直接侵入现有 `Grid` 交互代码
4. UI 先从最小入口开始：
   - 先做“只读结果面板/弹窗”（不改编辑器主交互）
   - 再做“插入到当前蓝图”按钮，复用已有 `startInsertBlueprint` 流程

### 6.2 推荐分阶段

- Phase A（纯计算，无落图）：
  - 输入目标产物与速率，输出机器需求、上游需求、瓶颈。
- Phase B（半自动落图）：
  - 输出“模块化子蓝图”（如某中间品产线块），复用现有插入/移动机制。
- Phase C（全自动布局）：
  - 引入布局算法（栅格打包 + 连线代价优化 + 约束满足）。

这样可以保证每阶段都不需要重写当前编辑器核心。

---

## 7) 下一步可能需要修改的文件（仅建议，当前未修改）

> 本次不改逻辑，仅列“下一阶段最可能触及点”。

### 核心新增（建议新文件）

- `src/planner/types.ts`（新增）
  - 定义 Recipe / ItemRate / MachineSpec / PlannerResult / Bottleneck。
- `src/planner/solver.ts`（新增）
  - 生产链求解与机器数估算。
- `src/planner/blueprintAdapter.ts`（新增）
  - 规划结果到 `Blueprint.data` 的转换。

### 现有文件潜在改动点（后续）

- `src/types.ts`
  - 可考虑补充与规划相关的跨模块通用类型（或保持 planner 内聚）。
- `src/config/machines.ts`
  - 若要精确计算，需要增加机器“加工速度、并行槽、功耗等可计算字段”。
- `src/config/materials.ts`
  - 可补充层级标签、体积/堆叠或流体标记（若后续需要物流估算）。
- `src/App.tsx`
  - 增加 Auto Planner 入口与视图路由（不干扰 editor）。
- `src/store/gameStore.ts`
  - 最小化改动：仅增加“接收 planner 结果并插入草稿”的 action（可选）。

---

## 8) 风险点 / 不清楚点

1. **缺失配方权威数据源**：当前没有完整 recipe 数据与机器工艺参数，自动规划器无法做可信产率计算。
2. **连接语义偏“几何”而非“物流网络”**：`Connection.path` 是几何线段，不含流量/方向容量模型。
3. **机器 `allowedMaterials` 语义不等于 recipe**：它更像 UI 选择范围，不能直接用于工艺推导。
4. **蓝图连接允许悬空端**：`toOriginal` 可为 `null`，规划器落图后需处理未闭环网络校验。
5. **缺少模拟结果类型**：当前没有统一的 `SimulationResult/PlannerResult` 接口。
6. **多语言/命名一致性风险**：数据以中文名为主，后续算法层建议稳定使用英文 id，UI 再映射本地化文案。

---

## TypeScript 类型定义盘点（你关心的 6 类）

### A. 建筑 / 机器

已存在：

- `MachineConfig`（`src/types.ts`）
- `PlacedMachine`（`src/types.ts`）
- `MachineId`（`src/types.ts`）

### B. 配方

- **未发现明确 Recipe 类型定义**（当前无独立配方建模类型）。

### C. 物品

已存在：

- `Material`（`src/types.ts`）

### D. 连接

已存在：

- `Connection`（`src/types.ts`）
- `PortConfig`（`src/types.ts`）
- `Point`（`src/types.ts`）
- `Side`（`src/types.ts`）

### E. 蓝图布局

已存在：

- `Blueprint`（`src/utils/storage.ts`）
- `Blueprint.data`（同文件内内联结构）
- 分享压缩结构：`MinifiedBlueprint` / `MinifiedMachine` / `MinifiedConnection`（`src/utils/shareUtils.ts`）

### F. 模拟结果

- **未发现 SimulationResult / PlannerResult 类型定义**。

---

## 本次结论（可直接行动）

- 当前项目是一个成熟的“编辑器 + 蓝图存储/分享”系统；自动规划器应以“独立计算域 + 适配层”接入。
- 下一步最关键不是 UI，而是先补齐：
  1) 配方与机器工艺参数数据模型；
  2) 规划结果类型；
  3) 规划结果到蓝图的转换策略。

这三步完成后，再做最小 UI 入口，风险最低。
