# 前端本地处理链路工程方案

## 1. 目标

本方案用于定义用户端“某一期详情页”的本地数据处理链路。

页面目标不是展示解析过程，而是稳定、高效地展示以下结果：

- 开奖信息
- 统计概要
- 号码柱状图
- 生肖柱状图
- 订单明细

前端本地解析仅作为内部实现手段，不向用户暴露“邮件如何拆单”。

## 2. 页面输入

单期详情页路由：

- `/expects/:expect`

后端返回的核心输入分为两类：

### 2.1 快照数据

来自 `expect_snapshots`。

```ts
type SnapshotDetail = {
  account: string;
  expect: string;
  receivedAt: string;
  rawBody: string;
  messageChunks: string[];
};
```

### 2.2 开奖数据

来自 `draw_results`。

```ts
type DrawResult = {
  expect: string;
  openTime: string;
  type: string;
  openCode: string; // "37,32,46,25,39,30,29"
  wave: string; // "blue,green,red,blue,green,red,red"
  zodiac: string; // "马,猪,鸡,马,龙,牛,虎"
  verify: boolean;
};
```

### 2.3 页面接口建议

建议用户端详情接口直接一次返回：

```ts
type ExpectDetailResponse = {
  snapshot: SnapshotDetail;
  drawResult: DrawResult | null;
};
```

这样前端进入详情页后，只发一次请求即可完成结算渲染。

## 3. 本地处理总流程

页面数据流固定为 6 个阶段：

1. 拉取详情数据
2. 标准化输入
3. 本地解析订单
4. 结合开奖数据计算中奖与派彩
5. 生成统计概要和图表聚合数据
6. 根据用户交互做轻量重排和筛选

其中：

- 阶段 1 到阶段 5 属于“基础计算链路”
- 阶段 6 属于“交互视图链路”

## 4. 数据处理分层

### 4.1 第一层：原始输入层

这一层只保存接口原始返回值，不做业务推导。

```ts
type ExpectDetailRawState = {
  snapshot: SnapshotDetail | null;
  drawResult: DrawResult | null;
  loading: boolean;
  error: string | null;
};
```

职责：

- 负责请求和错误状态
- 不参与排序、统计和图表逻辑

### 4.2 第二层：标准化层

这一层负责把原始接口数据转成更适合前端处理的结构。

```ts
type NormalizedDrawResult = {
  expect: string;
  openTime: string;
  numbers: string[]; // ["37", "32", "46", "25", "39", "30", "29"]
  waves: string[];   // ["blue", ...]
  zodiacs: string[]; // ["马", ...]
  verify: boolean;
};
```

处理内容：

- `openCode` 拆成 7 个两位号码
- `wave` 拆成数组
- `zodiac` 拆成数组
- 移除空格和异常分隔符

这一层不做结算，只做结构整理。

### 4.3 第三层：订单解析层

该层输入为 `messageChunks`，输出为结构化订单列表。

```ts
type ParsedOrder = {
  id: string;
  orderNo: number;
  raw: string;
  content: string;
  betCount: number;
  unitPrice: number;
  amount: number;
  values: string[];
  zodiacs: string[];
  type: "number" | "zodiac" | "mixed" | "review";
  status: "ok" | "review";
};
```

说明：

- `id` 用于 React 渲染和筛选稳定性
- `orderNo` 为页面展示序号
- `content` 为用户可见订单内容
- `values` 为号码集合
- `zodiacs` 为生肖集合
- `status=review` 表示可疑单或待人工确认单

### 4.4 第四层：结算层

该层将 `ParsedOrder[]` 与 `NormalizedDrawResult` 合并，计算用户实际关心的结果字段。

```ts
type SettledOrder = ParsedOrder & {
  hitStatus: "win" | "lose" | "partial" | "pending";
  hitNumbers: string[];
  hitZodiacs: string[];
  payout: number;
  resultText: string;
};
```

字段说明：

- `hitStatus`
  - `pending`：暂无开奖数据
  - `win`：中奖
  - `lose`：未中奖
  - `partial`：部分命中
- `payout`
  - 派彩金额
- `resultText`
  - 页面上直接显示的“派彩/结果”

### 4.5 第五层：聚合层

该层只从 `SettledOrder[]` 计算页面概要和图表数据。

```ts
type SummaryMetrics = {
  orderCount: number;
  winOrderCount: number;
  loseOrderCount: number;
  winAmount: number;
  profit: number;
};

type NumberBarItem = {
  number: string;
  amount: number;
  isDrawn: boolean;
  wave: "red" | "blue" | "green" | null;
  zodiac: string | null;
};

type ZodiacBarItem = {
  zodiac: string;
  amount: number;
  isDrawn: boolean;
};
```

### 4.6 第六层：视图层

这一层只做“显示变化”，不改动底层计算结果。

```ts
type DetailViewState = {
  orderFilter: "all" | "win" | "lose";
  orderKeyword: string;
  numberSortMode: "natural" | "amountDesc";
  zodiacSortMode: "natural" | "amountDesc";
  showAllNumberBars: boolean;
  showAllZodiacBars: boolean;
};
```

## 5. 哪些数据只算一次

以下数据在接口数据不变的情况下，只计算一次：

### 5.1 标准化开奖数据

输入：

- `drawResult`

输出：

- `NormalizedDrawResult`

触发条件：

- 仅当接口返回的开奖数据变化时重算

### 5.2 结构化订单列表

输入：

- `snapshot.messageChunks`

输出：

- `ParsedOrder[]`

触发条件：

- 仅当该期快照变化时重算

### 5.3 结算后的订单列表

输入：

- `ParsedOrder[]`
- `NormalizedDrawResult`

输出：

- `SettledOrder[]`

触发条件：

- 订单数据变化
- 开奖数据变化

### 5.4 概要统计

输入：

- `SettledOrder[]`

输出：

- `SummaryMetrics`

触发条件：

- 仅当 `SettledOrder[]` 变化时重算

### 5.5 图表基础聚合数据

输入：

- `SettledOrder[]`
- `NormalizedDrawResult`

输出：

- `NumberBarItem[]` 的基础数组
- `ZodiacBarItem[]` 的基础数组

触发条件：

- 仅当 `SettledOrder[]` 或 `NormalizedDrawResult` 变化时重算

说明：

- 这里生成的是“未排序基础数组”
- 号码图基础数组固定为 `01-49`
- 生肖图基础数组固定为 `鼠牛虎兔龙蛇马羊猴鸡狗猪`

## 6. 哪些数据只做轻量重排

以下交互不允许触发重新解析订单，也不允许重新结算：

### 6.1 号码柱状图排序切换

支持：

- `natural`：按 `01-49`
- `amountDesc`：按金额从高到低，相同金额按号码升序

实现要求：

- 仅对基础 `NumberBarItem[]` 排序
- 不重新扫描 `messageChunks`

### 6.2 生肖柱状图排序切换

支持：

- `natural`：按固定生肖顺序
- `amountDesc`：按金额从高到低，相同金额按生肖固定顺序

实现要求：

- 仅对基础 `ZodiacBarItem[]` 排序
- 不重新做号码映射

### 6.3 图表显示全部/仅显示有金额

支持：

- 显示全部
- 仅显示 `amount > 0`

实现要求：

- 基于已生成图表数组做过滤
- 不触发任何业务重算

### 6.4 订单表筛选

支持：

- 全部
- 仅中奖
- 仅未中奖
- 关键词搜索

实现要求：

- 基于 `SettledOrder[]` 做 filter
- 不重新生成订单

## 7. 推荐实现结构

建议将本地处理拆成 4 个纯函数层和 1 个页面编排层。

### 7.1 纯函数层

目录建议：

```text
packages/parser/
  src/
    normalize/
      normalize-draw-result.ts
    parse/
      parse-orders.ts
    settle/
      settle-orders.ts
    aggregate/
      build-summary-metrics.ts
      build-number-bars.ts
      build-zodiac-bars.ts
```

要求：

- 全部纯函数
- 不依赖 DOM
- 不依赖 React
- 可单测

### 7.2 页面编排层

目录建议：

```text
apps/web/src/features/expect-detail/
  hooks/
    useExpectDetailQuery.ts
    useExpectDetailComputed.ts
  components/
    ExpectHeader.tsx
    SummaryCards.tsx
    NumberBarChart.tsx
    ZodiacBarChart.tsx
    OrderTable.tsx
```

职责：

- 请求接口
- 组合纯函数结果
- 管理排序、筛选、搜索等视图状态

## 8. 推荐 Hook 设计

### 8.1 `useExpectDetailQuery`

职责：

- 拉取 `/api/user/expects/:expect`
- 管理 loading / error / data

返回：

```ts
type UseExpectDetailQueryResult = {
  data: ExpectDetailResponse | null;
  loading: boolean;
  error: string | null;
};
```

### 8.2 `useExpectDetailComputed`

职责：

- 接收接口数据
- 完成标准化、解析、结算、聚合
- 输出页面需要的稳定结构

返回：

```ts
type UseExpectDetailComputedResult = {
  drawResult: NormalizedDrawResult | null;
  settledOrders: SettledOrder[];
  summary: SummaryMetrics;
  numberBarsBase: NumberBarItem[];
  zodiacBarsBase: ZodiacBarItem[];
};
```

要求：

- 内部使用 `useMemo`
- 依赖项只绑定原始接口数据
- 不依赖排序、筛选 UI 状态

### 8.3 `useExpectDetailViewModel`

职责：

- 管理页面的交互状态
- 在基础数据上做排序和筛选

返回：

```ts
type UseExpectDetailViewModelResult = {
  summary: SummaryMetrics;
  visibleOrders: SettledOrder[];
  visibleNumberBars: NumberBarItem[];
  visibleZodiacBars: ZodiacBarItem[];
  viewState: DetailViewState;
  actions: {
    setOrderFilter: (value: DetailViewState["orderFilter"]) => void;
    setOrderKeyword: (value: string) => void;
    setNumberSortMode: (value: DetailViewState["numberSortMode"]) => void;
    setZodiacSortMode: (value: DetailViewState["zodiacSortMode"]) => void;
    setShowAllNumberBars: (value: boolean) => void;
    setShowAllZodiacBars: (value: boolean) => void;
  };
};
```

## 9. 页面渲染顺序

详情页按以下顺序渲染：

1. 期号和开奖头部
2. 统计概要
3. 号码柱状图
4. 生肖柱状图
5. 订单明细

对应组件顺序：

```text
ExpectHeader
SummaryCards
NumberBarChart
ZodiacBarChart
OrderTable
```

## 10. 性能控制原则

### 10.1 同一期进入页面时只做一次完整业务计算

完整业务计算指：

- 标准化开奖
- 解析订单
- 结算订单
- 生成概要
- 生成基础图表数据

这些步骤只在数据源变化时触发，禁止随着每次筛选和排序反复执行。

### 10.2 图表交互只排序不重算

图表切换：

- 按号码顺序
- 按金额排序
- 显示全部
- 仅显示有金额

都只能在已有数组上完成。

### 10.3 表格交互只筛选不重算

订单表的关键词搜索、中奖筛选，都只对 `SettledOrder[]` 做轻量过滤。

### 10.4 大表优先优化表格，不优先优化图表

如果未来单期订单很多：

- 优先给订单表做分页或虚拟滚动
- 图表仍保留完整聚合视图

原因：

- 号码图最多 49 项
- 生肖图最多 12 项
- 真正占渲染成本的是长表格

## 11. 结算与图表口径

### 11.1 统计概要

- `订单数量`：订单条数
- `中奖订单数`：`hitStatus=win` 或 `partial` 的订单数
- `未中奖订单数`：`hitStatus=lose` 的订单数
- `中奖金额`：所有订单 `payout` 之和
- `盈利`：`中奖金额 - 订单总金额`

### 11.2 号码柱状图

统计口径：

- 每个号码的累计投注金额

例如：

- 一条订单命中 `01,03,24,34`
- 单价为 `16`
- 则号码图中 `01/03/24/34` 都累计 `16`

### 11.3 生肖柱状图

统计口径：

- 每个生肖的累计投注金额

说明：

- 若订单主体为号码，则先映射号码所属生肖，再累加金额
- 若订单主体为生肖，则直接按对应生肖累加

## 12. 异常与降级

### 12.1 无开奖数据

页面允许先展示：

- 订单内容
- 订单金额
- 图表分布

但：

- `中奖情况` 显示为 `待开奖`
- `派彩/结果` 显示为 `待开奖`
- `中奖金额` 为 `0`
- `盈利` 显示为 `待开奖`

### 12.2 解析异常订单

若订单无法可靠解析：

- 订单仍进入列表
- `status=review`
- `中奖情况` 显示为 `待确认`
- `派彩/结果` 显示为 `规则待确认`

禁止直接丢单。

## 13. 单测建议

至少覆盖以下测试：

1. 同一期详情数据只触发一次解析和一次结算
2. 切换号码图排序不会重新解析订单
3. 切换生肖图排序不会重新结算
4. 订单搜索只过滤已生成订单
5. 无开奖数据时页面可正常展示订单和图表
6. 开奖后可正确更新中奖情况和派彩结果
7. 号码图固定输出 49 项
8. 生肖图固定输出 12 项

## 14. 最终结论

前端本地处理链路应采用“重计算前置、轻交互后置”的结构：

- 接口返回后，先一次性完成标准化、解析、结算、聚合
- 页面交互阶段只允许做排序、筛选、显示切换
- 图表和表格都基于稳定的结构化结果渲染

这样可以保证：

- 用户进入详情页时计算口径稳定
- 切换图表排序时响应快
- 数据量增长后，仍能优先定位表格渲染而不是业务计算作为优化重点
