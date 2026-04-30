# 酒店投资品牌匹配平台 — 开发文档

> 基于用户实际业务需求整理，供开发团队（老三 + Hermes）使用。
> 版本：v1.0 | 日期：2026-04-30

---

## 一、项目背景与愿景

### 业务定位
**精准匹配的酒店投资评估 SaaS 平台** — 输入物业数据，一键输出品牌推荐 + 投前评估报告，帮助投资人在签约前做出科学决策。

### 核心价值
- 将资深从业者（用户）的**人工评估经验**固化为**可复用的智能引擎**
- 打破信息不对称：品牌方参数透明化，投资人自主比较
- 收费模式：评估报告按次/按月订阅收费

### 目标客户
| 客户类型 | 描述 |
|---------|------|
| 个人投资者 | 手握物业找品牌，3-5线城市为主 |
| 机构投资者 | 酒店管理公司、地产公司 |
| 在营酒店业主 | 升级改造、品牌更换 |
| 同业开发者 | 加盟商网络（复用本平台作为工具）|

### 竞争参考
- 指点网（zhidian.com）— 撮合平台
- 酒店之家 APP — 信息展示
- 其他撮合平台

---

## 二、数据体系

### 2.1 品牌数据库

**数据来源：** 锦江、华住（如家）、首旅、亚朵、尚客优、艺龙、国际品牌（希尔顿/万豪/温德姆/雅高）

**数据结构（all_brands.json）：**
```json
{
  "brand_group": "锦江国际酒店集团",
  "brand_name": "7天酒店",
  "tier": "economy",           // luxury/upper-upscale/upscale/mid-upscale/mid/economy
  "franchise_fee_one_time": 70000,   // 一次性加盟费（元）
  "management_fee_pct": 5.0,        // 管理费百分比
  "marketing_fee_pct": 2.0,          // 营销费百分比
  "renovation_cost_per_room": 55000, // 单房改造成本（元）
  "min_rooms": 50,                   // 最低房间数要求
  "min_area_sqm": 1500,              // 最低物业面积
  "target_city_tiers": ["1","2","3"], // 目标城市等级
  "typical_guest_profile": "商务出差、穷游", // 典型客群
  "break_even_months": 24,           // 回本周期（月）
  "franchise_contact": "",            // 加盟联系人
  "data_source": "搜索估算",          // 数据来源
  "estimated": true,                 // 是否为估算数据
  "notes": "备注信息"
}
```

**当前数据量：** 60+ 品牌，覆盖 7 大集团

**数据维护策略：**
- 优先从品牌方官网/公开材料抓取
- 标注 `estimated: true` 的数据需逐步用真实数据替换
- 建立品牌方商务联系人字段（用户可直接对接到品牌方）

---

## 三、评估引擎（核心）

### 3.1 评估维度（10维）

| # | 维度 | 输入字段 | 评分逻辑 |
|---|------|---------|---------|
| D1 | 城市能级 | `city_tier` (1/2/3/4线) | 城市消费力系数 |
| D2 | 商圈地位 | `location_type` (CBD/核心/副核心/交通枢纽/景区/区域/社区/郊区) | 商圈繁华度 |
| D3 | 租金负担 | `rent_per_sqm` (元/㎡/月) | 与城市合理区间对比，越低越好 |
| D4 | 物业体量 | `area_sqm` / `room_count` | 房间数是否满足品牌最低要求 |
| D5 | 改造成本 | `renovation_budget_per_room` (元/间) | 与品牌档次要求区间匹配度 |
| D6 | 运营成本 | `operating_cost_per_room_day` (元/间/天) | 与城市基准线对比 |
| D7 | 竞争密度 | `competition_count_3km` (3km内竞品数) | 越少越好 |
| D8 | 客群结构 | `guest_profile` (商务/旅游/休闲/会议/长住/亲子/情侣) | 与品牌典型客群匹配 |
| D9 | 资本实力 | `investor_capital` (万元) | 与项目总投资需求匹配 |
| D10 | 风险偏好 | `risk_appetite` (high/medium/low) | 影响推荐品牌档次倾向 |

### 3.2 权重体系
```
D1城市能级:   12%
D2商圈地位:   10%
D3租金负担:   10%
D4物业体量:    8%
D5改造成本:   12%
D6运营成本:    8%
D7竞争密度:    8%
D8客群结构:   10%
D9资本实力:   12%
D10风险偏好:  10%
```

### 3.3 输出结果
```json
{
  "overallScore": 78.5,        // 综合评分 0-100
  "rating": {                 // 等级
    "grade": "A",
    "label": "优质标的",
    "color": "#4CAF50"
  },
  "dimensions": {             // 各维度得分
    "dim1_city": 92,
    "dim2_location": 85,
    ...
  },
  "brandMatches": {           // 品牌推荐
    "topMatches": [
      {
        "brand_name": "全季",
        "brand_group": "华住集团",
        "tier": "upscale",
        "match_score": 88.5,
        "match_reasons": ["改造成本适配", "商圈匹配", ...],
        "franchise_fee": 80000,
        "management_fee_pct": 6.0,
        "renovation_cost_per_room": 90000,
        "min_rooms": 60,
        "break_even_months": 28
      }
    ],
    "total_candidates": 12
  },
  "financials": {             // 投资财务测算
    "estimated_room_rate": 280,    // 预计均价（元/间夜）
    "assume_occupy_rate": 0.75,   // 假设入住率
    "annual_revenue_yuan": 6130000,
    "annual_gop_yuan": 2450000,
    "annual_rent_yuan": 1800000,
    "annual_net_profit_yuan": 650000,
    "total_invest_yuan": 7200000,
    "payback_years": 7.2,
    "break_even_rooms": 52
  },
  "riskSignals": [            // 风险信号
    { "level": "MEDIUM", "signal": "回本周期偏长（7.2年）" }
  ],
  "timestamp": "2026-04-30T08:00:00Z"
}
```

---

## 四、产品功能规划

### 4.1 模块优先级

| 优先级 | 模块 | 说明 |
|--------|------|------|
| P0 | 评估引擎 | 核心算法，直接决定平台价值 |
| P0 | 品牌数据库 | 支撑引擎的数据基础 |
| P1 | 管理后台 | 品牌管理 + 评估记录 + 意向客户管理 |
| P1 | 评估报告生成 | PDF/HTML 报告，可分享 |
| P2 | 微信小程序 | 获客入口（等 AppID） |
| P2 | 用户注册/登录 | 报告付费、数据沉淀 |
| P3 | 品牌方后台 | 品牌方查看自己品牌的被评估数据 |

### 4.2 评估记录管理
- 每次评估自动保存记录
- 记录包含：输入参数 → 评估结果 → 推荐品牌 → 投资人信息
- 支持按时间/城市/品牌筛选
- 方便销售团队跟单

### 4.3 意向客户管理（CRM）
- 字段：姓名、电话、微信、意向城市、物业概况、评估记录、最近联系时间
- 支持标注：初筛中/评估中/跟进中/已签约/已放弃

### 4.4 报告功能
- 一键生成 HTML/PDF 评估报告
- 报告内容：物业概况 + 10维评分雷达图 + 品牌推荐 + 财务测算 + 风险提示
- 可生成分享链接（限时/限次）

---

## 五、技术架构

### 5.1 技术栈
```
后端：Node.js + Express（ES Modules）
前端：Vue3 + Vite
数据：JSON 文件存储（DataStore.js）
      → 后续可迁移至 SQLite（无需额外部署DB）
```

### 5.2 项目结构
```
hotel-platform/
├── backend/
│   ├── app.js              # Express 入口
│   ├── routes/
│   │   ├── brands.js       # 品牌数据 API
│   │   ├── evaluation.js   # 评估引擎 API
│   │   ├── investors.js    # 意向客户 API
│   │   └── reports.js      # 报告生成 API
│   ├── services/
│   │   ├── EvaluationEngine.js  # 10维评估引擎
│   │   ├── DataStore.js    # JSON 数据持久化
│   │   └── ReportGenerator.js  # 报告生成
│   ├── models/
│   │   ├── Brand.js
│   │   ├── Evaluation.js
│   │   └── Investor.js
│   └── package.json
├── brand-data/
│   ├── all_brands.json     # 合并后的品牌库
│   ├── jinjiang.json
│   ├── huazhu.json
│   ├── btg.json
│   ├── yaduo.json
│   ├── shangkeyou.json
│   └── international.json
└── frontend-admin/         # Vue3 管理后台
    ├── src/
    │   ├── views/
    │   │   ├── Dashboard.vue
    │   │   ├── Evaluation.vue
    │   │   ├── BrandList.vue
    │   │   ├── InvestorList.vue
    │   │   └── ReportList.vue
    │   └── api/index.js
    └── dist/               # 构建产物
```

### 5.3 API 设计
```
GET  /health                   # 健康检查
GET  /api/brands               # 品牌列表（支持 tier/group 筛选）
GET  /api/brands/:name         # 品牌详情
GET  /api/dimensions           # 评估维度说明
POST /api/evaluate             # 完整评估（输入 → 完整报告）
POST /api/match-brands         # 仅品牌匹配
POST /api/quick-calc           # 快速测算
GET  /api/investors            # 客户列表
POST /api/investors            # 创建客户
PUT  /api/investors/:id        # 更新客户
DELETE /api/investors/:id      # 删除客户
GET  /api/reports              # 报告列表
GET  /api/reports/:id          # 报告详情
POST /api/reports/generate     # 生成报告
```

---

## 六、非功能需求

### 6.1 数据准确性
- 品牌数据优先使用品牌方官方公开数据
- 评估算法参数需可配置（方便根据实际案例调优）
- 用户评估记录不删除，用于算法迭代

### 6.2 安全
- 管理后台需登录验证（JWT）
- 报告分享链接使用一次性 token
- 敏感客户数据加密存储

### 6.3 扩展性
- 评估维度权重体系可配置
- 支持未来新增品牌数据源（API 接入）
- 小程序和网页端共用同一套 API

---

## 七、当前进度

| 模块 | 状态 | 说明 |
|------|------|------|
| 品牌数据库 | ✅ 完成 | 7大集团，60+品牌，JSON 格式 |
| 评估引擎 | ✅ 完成 | 10维评分，品牌匹配，财务测算 |
| 后端 API | ✅ 完成 | Express 路由，数据持久化 |
| 管理后台 | ✅ 完成 | Vue3 + Vite，5个页面 |
| 小程序接入 | ⏳ 待办 | 等微信 AppID |
| 用户认证 | ⏳ 待办 | JWT 登录 |
| 报告 PDF 导出 | ⏳ 待办 | 报告生成器完善 |
| 品牌方后台 | ⏳ 待办 | P3 |

---

## 八、待优化项（v1.1）

1. **评估引擎参数校准** — 用真实签约案例校准评分参数
2. **品牌数据完整化** — 补充所有品牌的真实加盟费、管理费数据（目前部分为估算）
3. **竞争数据采集** — 接入地图 API 自动获取周边竞品数据
4. **PDF 报告模板** — 品牌化报告，支持生成二维码分享
5. **微信消息推送** — 评估完成后通过微信/短信通知投资人
