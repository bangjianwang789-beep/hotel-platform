/**
 * 评估引擎详细校准测试脚本
 */
import engine from './services/EvaluationEngine.js';

engine.loadBrands();

const testCases = [
  {
    name: '上海中档酒店',
    city_tier: '1', rent_per_sqm: 55, area_sqm: 3500,
    room_count_estimate: 100, renovation_budget_per_room: 100000,
    operating_cost_per_room_day: 130, competition_count_3km: 8, guest_profile: '商务',
  },
  {
    name: '成都经济型',
    city_tier: '2', rent_per_sqm: 30, area_sqm: 2500,
    room_count_estimate: 80, renovation_budget_per_room: 60000,
    operating_cost_per_room_day: 95, competition_count_3km: 15, guest_profile: '旅游',
  },
  {
    name: '三线优质物业',
    city_tier: '3', rent_per_sqm: 18, area_sqm: 2000,
    room_count_estimate: 60, renovation_budget_per_room: 70000,
    operating_cost_per_room_day: 85, competition_count_3km: 2, guest_profile: '休闲',
  },
  {
    name: '广州高端酒店',
    city_tier: '1', rent_per_sqm: 70, area_sqm: 5000,
    room_count_estimate: 140, renovation_budget_per_room: 160000,
    operating_cost_per_room_day: 160, competition_count_3km: 12, guest_profile: '商务',
  },
  {
    name: '北京豪华酒店',
    city_tier: '1', rent_per_sqm: 80, area_sqm: 6000,
    room_count_estimate: 120, renovation_budget_per_room: 220000,
    operating_cost_per_room_day: 180, competition_count_3km: 6, guest_profile: '商务',
  },
];

console.log('=== 评估引擎完整校准报告 ===\n');

for (const tc of testCases) {
  const result = engine.evaluate(tc);
  const dims = result.dimensions;
  const fin = result.financials;
  const brand = result.brandMatches?.topMatches?.[0];

  console.log('■ ' + tc.name);
  console.log('  综合: ' + result.overallScore + '分 [' + result.rating.grade + '] ' + result.rating.label);
  console.log('  推荐: ' + (brand ? brand.brand_name + ' (匹配' + brand.match_score + '分)' : '无'));
  if (fin) {
    const profit = fin.annual_net_profit_yuan > 0 ? '+' + (fin.annual_net_profit_yuan/10000).toFixed(1) + '万' : (fin.annual_net_profit_yuan/10000).toFixed(1) + '万亏损';
    console.log('  财务: ADR=' + fin.estimated_adr_yuan + '元 回本=' + (fin.payback_years || 'N/A') + '年 净利=' + profit);
    console.log('       总投资=' + (fin.total_invest_yuan/10000).toFixed(0) + '万 年营=' + (fin.annual_revenue_yuan/10000).toFixed(0) + '万 GOP=' + (fin.annual_gop_yuan/10000).toFixed(0) + '万(' + fin.gop_margin_pct + '%)');
  }
  console.log('  7维: D1城=' + dims.D1_city_tier.score + ' D2租=' + dims.D2_rent_burden.score + ' D3面=' + dims.D3_property_size.score + ' D4改=' + dims.D4_renovation.score + ' D5运=' + dims.D5_operating.score + ' D6竞=' + dims.D6_competition.score + ' D7客=' + dims.D7_guest_profile.score);
  if (result.riskSignals.length > 0) {
    console.log('  风险: ' + result.riskSignals.map(r => '[' + r.level + '] ' + r.signal).join(' | '));
  } else {
    console.log('  风险: 无');
  }
  console.log('');
}

// 权重合理性分析
console.log('=== 权重合理性分析 ===');
console.log('当前权重: D1=12% D2=15% D3=12% D4=18% D5=13% D6=15% D7=15%');
console.log('建议保持 D4(改造成本)最高权重18% - 决定品牌匹配上限');
console.log('建议保持 D2(租金)D6(竞争)D7(客群)各15% - 核心利润变量');
console.log('');
console.log('=== 待优化项 ===');
console.log('1. 城市等级分档可更细化(1线特/1线普/强2线等)');
console.log('2. 竞争密度建议增加"同类品牌竞争数"维度');
console.log('3. 运营成本基准值可按地区进一步细分');
console.log('4. 可增加"租金与营收比"综合指标作为风控阈值');
