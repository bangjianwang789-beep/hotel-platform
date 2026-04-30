import express from 'express';
import { insertRecord } from '../services/DataStore.js';
import EvaluationEngine from '../services/EvaluationEngine.js';

const router = express.Router();

let brandsLoaded = false;
function ensureBrands() {
  if (!brandsLoaded) {
    EvaluationEngine.loadBrands();
    brandsLoaded = true;
  }
}

// POST /api/evaluate - 完整评估（不持久化，仅计算）
router.post('/evaluate', (req, res) => {
  try {
    ensureBrands();
    const result = EvaluationEngine.evaluate(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Evaluate]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/match-brands - 快速品牌匹配
router.post('/match-brands', (req, res) => {
  try {
    ensureBrands();
    const { input, topN = 5 } = req.body;
    const result = EvaluationEngine.matchBrands(input, topN);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[MatchBrands]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/quick-calc - 快速测算（同时记录）
router.post('/quick-calc', (req, res) => {
  try {
    ensureBrands();
    const input = req.body;
    const result = EvaluationEngine.quickCalc(input);

    // 顺便记录到历史（可选，静默失败）
    try {
      insertRecord('quick_calcs', { input, result: { overallScore: result.overallScore, rating: result.rating } });
    } catch (_) {}

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[QuickCalc]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/brands - 获取所有品牌
router.get('/brands', (req, res) => {
  try {
    ensureBrands();
    const brands = EvaluationEngine.getAllBrands();
    const { tier, group } = req.query;
    let filtered = brands;
    if (tier) filtered = filtered.filter(b => b.tier === tier);
    if (group) filtered = filtered.filter(b => (b.brand_group || '').includes(group));
    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/brands/:name - 按名称查品牌
router.get('/brands/:name', (req, res) => {
  try {
    ensureBrands();
    const brands = EvaluationEngine.getAllBrands();
    const name = decodeURIComponent(req.params.name);
    const match = brands.find(b => (b.brand_name || '').includes(name) || (b.brand_group || '').includes(name));
    if (!match) return res.status(404).json({ success: false, error: '品牌未找到' });
    res.json({ success: true, data: match });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dimensions - 评估维度说明
router.get('/dimensions', (req, res) => {
  res.json({
    success: true,
    data: [
      { key: 'city_tier', label: '城市等级', desc: '1线/2线/3线/4线城市', weight: '12%' },
      { key: 'location_type', label: '商圈地位', desc: 'CBD/核心商圈/副核心/交通枢纽/景区/区域/社区/郊区', weight: '10%' },
      { key: 'rent_per_sqm', label: '租金水平', desc: '元/㎡/月，与城市等级匹配评分', weight: '10%' },
      { key: 'area_sqm', label: '物业面积', desc: '总面积㎡，影响房间数和品牌适配', weight: '8%' },
      { key: 'room_count_estimate', label: '预估房间数', desc: '影响运营效率和品牌达标', weight: '12%' },
      { key: 'renovation_budget_per_room', label: '单房改造预算', desc: '元/间，与品牌档次匹配', weight: '12%' },
      { key: 'operating_cost_per_room_day', label: '日运营成本', desc: '元/间/天，影响GOP', weight: '8%' },
      { key: 'competition_count_3km', label: '竞争态势', desc: '周边3km竞品数量，越少越好', weight: '8%' },
      { key: 'guest_profile', label: '客群类型', desc: '商务/旅游/休闲/会议/长住/亲子/情侣', weight: '10%' },
      { key: 'investor_capital', label: '投资人资金', desc: '万元，资金实力评分', weight: '12%' },
      { key: 'risk_appetite', label: '风险偏好', desc: 'high/medium/low', weight: '10%' }
    ]
  });
});

export default router;
