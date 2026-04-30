/**
 * 酒店投资评估引擎 v3（数据驱动重构版）
 * 
 * 输入维度（7个真实可量化因子）：
 *   D1 城市能级     - 1线/2线/3线 + 具体城市（影响租金基准、品牌准入）
 *   D2 租金负担     - 元/㎡/月 + 月租总额（直接决定利润空间）
 *   D3 物业体量     - 总面积㎡ → 推算房间数（决定品牌匹配门槛）
 *   D4 改造成本     - 元/间（与品牌档次真实区间匹配）
 *   D5 运营成本     - 元/间/天（影响GOP）
 *   D6 竞争密度     - 周边3km竞品数量（市场红海程度）
 *   D7 客源结构     - 商务/旅游/休闲/长住/亲子（决定ADR天花板）
 * 
 * 输出维度（4个核心财务指标）：
 *   O1 综合评分     - 0-100，加权综合
 *   O2 品牌推荐     - 按匹配度排序 + 适配理由
 *   O3 投资回报     - 回本周期/年净利润/盈亏平衡入住率
 *   O4 风险信号     - 触发哪些红灯/黄灯条件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── 品牌数据库 ─────────────────────────────────────────
const BRAND_DATA_PATH = path.resolve(__dirname, '../../../brand-data/all_brands.json');

// ─── 城市等级评分 ─────────────────────────────────────────
// 城市等级系数：反映城市整体消费力和商务流量
const CITY_TIER_SCORE = { '1': 92, '2': 75, '3': 58, '4': 40 };

// ─── 租金承受力评分 ────────────────────────────────────────
// 核心逻辑：租金是利润的最大变量。租金越高，评分越低。
// 合理区间：一线城市40-80元/㎡/月，二线25-55，三线15-35
const RENT_SCORE_MATRIX = {
  '1': { excellent: [40, 65], good: [65, 80], fair: [80, 100], poor: 100 },
  '2': { excellent: [25, 45], good: [45, 55], fair: [55, 75], poor: 75 },
  '3': { excellent: [15, 28], good: [28, 35], fair: [35, 50], poor: 50 },
  '4': { excellent: [10, 18], good: [18, 25], fair: [25, 40], poor: 40 }
};

function scoreRent(rentPerSqm, cityTier) {
  const matrix = RENT_SCORE_MATRIX[cityTier] || RENT_SCORE_MATRIX['2'];
  if (rentPerSqm <= matrix.excellent[1]) return 92;
  if (rentPerSqm <= matrix.fair[0]) return 75;
  if (rentPerSqm <= matrix.fair[1]) return 55;
  return Math.max(15, 35 - (rentPerSqm - matrix.fair[1]) * 0.8);
}

// ─── 面积/房间数评分 ───────────────────────────────────────
// 关键约束：各档次品牌有最低房间数要求
// luxury:120+, upper-upscale:50-150, upscale:60-100, mid-upscale:60-80, mid:50-60, economy:30-50
function scoreRoomCount(roomCount) {
  if (!roomCount || roomCount < 30) return 20;
  if (roomCount >= 80 && roomCount <= 150) return 92;
  if (roomCount >= 50 && roomCount < 80) return 78;
  if (roomCount > 150 && roomCount <= 250) return 72;
  if (roomCount > 250) return 60;
  return 50;
}

// ─── 改造成本评分 ─────────────────────────────────────────
// 核心逻辑：改造成本必须与品牌档次匹配。过高浪费，过低不达标。
const RENOVATION_TIER_MAP = {
  luxury:        { min: 200000, max: 250000, ideal: 230000 },
  'upper-upscale': { min: 130000, max: 200000, ideal: 155000 },
  upscale:       { min: 90000,  max: 130000, ideal: 110000 },
  'mid-upscale': { min: 80000,  max: 100000, ideal: 88000 },
  mid:           { min: 65000,  max: 75000,  ideal: 70000 },
  economy:       { min: 45000,  max: 68000,  ideal: 55000 }
};

function scoreRenovation(budgetPerRoom, cityTier) {
  // 各档次城市对同一档次品牌的改造成本期望不同
  // 一线城市材料/人工溢价15-25%
  const tierMultiplier = { '1': 1.20, '2': 1.05, '3': 0.90, '4': 0.80 };
  const mult = tierMultiplier[cityTier] || 1.0;
  
  let bestScore = 0;
  let matchedTier = null;
  
  for (const [tier, range] of Object.entries(RENOVATION_TIER_MAP)) {
    const adjMin = range.min * mult;
    const adjMax = range.max * mult;
    const adjIdeal = range.ideal * mult;
    
    if (budgetPerRoom >= adjMin && budgetPerRoom <= adjMax * 1.15) {
      // 命中该档次区间
      const distFromIdeal = Math.abs(budgetPerRoom - adjIdeal) / adjIdeal;
      const s = Math.max(55, 95 - distFromIdeal * 40);
      if (s > bestScore) { bestScore = s; matchedTier = tier; }
    } else if (budgetPerRoom < adjMin) {
      // 预算低于该档次最低要求
      const s = Math.max(20, (budgetPerRoom / adjMin) * 55);
      if (s > bestScore) { bestScore = s; matchedTier = tier + '(偏低)'; }
    } else {
      // 预算高于该档次上限
      const overflow = (budgetPerRoom - adjMax) / adjMax;
      const s = Math.max(15, 50 - overflow * 50);
      if (s > bestScore) { bestScore = s; matchedTier = tier + '(偏高)'; }
    }
  }
  
  return { score: Math.round(bestScore), matchedTier };
}

// ─── 运营成本评分 ─────────────────────────────────────────
function scoreOperatingCost(costPerRoomDay, cityTier) {
  // 一线城市运营成本更高（人工、能耗溢价）
  const tierBaseline = { '1': 145, '2': 118, '3': 95, '4': 78 };
  const baseline = tierBaseline[cityTier] || 118;

  if (costPerRoomDay <= baseline * 0.85) return 90;
  if (costPerRoomDay <= baseline) return 75;
  if (costPerRoomDay <= baseline * 1.20) return 60;
  if (costPerRoomDay <= baseline * 1.50) return 45;
  return 30;
}

// ─── 竞争密度评分 ─────────────────────────────────────────
function scoreCompetition(count3km) {
  if (!count3km || count3km === 0) return 95;
  if (count3km <= 2) return 85;
  if (count3km <= 5) return 70;
  if (count3km <= 10) return 52;
  if (count3km <= 20) return 35;
  return 18;
}

// ─── 客群结构评分 ─────────────────────────────────────────
function scoreGuestProfile(profile, cityTier) {
  // 高线城市商务比例高，低线城市旅游/休闲比例高
  const weights = {
    '商务': { '1': 90, '2': 82, '3': 70, '4': 60 },
    '旅游': { '1': 78, '2': 85, '3': 88, '4': 80 },
    '休闲': { '1': 75, '2': 80, '3': 82, '4': 75 },
    '会议': { '1': 88, '2': 78, '3': 65, '4': 50 },
    '长住': { '1': 72, '2': 75, '3': 80, '4': 85 },
    '亲子': { '1': 70, '2': 80, '3': 78, '4': 72 },
    '情侣': { '1': 80, '2': 78, '3': 75, '4': 68 }
  };
  
  const scores = weights[profile];
  if (!scores) return 65;
  return scores[cityTier] || 70;
}

// ─── 评估引擎 ─────────────────────────────────────────────
class EvaluationEngine {
  constructor() {
    this.brands = [];
  }

  loadBrands() {
    try {
      const data = fs.readFileSync(BRAND_DATA_PATH, 'utf8');
      this.brands = JSON.parse(data);
      console.log(`[Engine] 加载 ${this.brands.length} 个品牌`);
      return this.brands;
    } catch (err) {
      console.error(`[Engine] 品牌数据加载失败: ${err.message}`);
      return [];
    }
  }

  // ─── 核心评估 ──────────────────────────────────────────
  // input: {
  //   city_tier: '1'|'2'|'3',              // 城市等级
  //   rent_per_sqm: number,                  // 元/㎡/月
  //   area_sqm: number,                    // 物业总面积
  //   renovation_budget_per_room: number,   // 元/间
  //   operating_cost_per_room_day: number, // 元/间/天
  //   competition_count_3km: number,       // 竞品数量
  //   guest_profile: string,               // 客群类型
  //   investor_capital_yuan?: number,      // 投资人资金（元），可选
  //   monthly_rent_yuan?: number,          // 月租总额（元），可选
  // }
  evaluate(input) {
    if (this.brands.length === 0) this.loadBrands();

    const d = this._normalize(input);
    
    // ── 7维评分 ──
    const dimCity      = CITY_TIER_SCORE[d.city_tier] || 65;
    const dimRent      = scoreRent(d.rent_per_sqm, d.city_tier);
    const dimArea      = scoreRoomCount(d.room_count);
    const renoResult   = scoreRenovation(d.renovation_budget_per_room, d.city_tier);
    const dimReno      = renoResult.score;
    const dimOpCost    = scoreOperatingCost(d.operating_cost_per_room_day, d.city_tier);
    const dimCompetition = scoreCompetition(d.competition_count_3km);
    const dimGuest     = scoreGuestProfile(d.guest_profile, d.city_tier);

    // ── 加权综合评分 ──
    const weights = {
      dimCity: 0.12,
      dimRent: 0.15,       // 租金权重最高，因为是最大成本变量
      dimArea: 0.12,
      dimReno: 0.18,       // 改造成本决定品牌匹配上限
      dimOpCost: 0.13,
      dimCompetition: 0.15,
      dimGuest: 0.15
    };

    const overallScore = Math.round(
      (dimCity   * weights.dimCity +
       dimRent   * weights.dimRent +
       dimArea   * weights.dimArea +
       dimReno   * weights.dimReno +
       dimOpCost * weights.dimOpCost +
       dimCompetition * weights.dimCompetition +
       dimGuest  * weights.dimGuest) * 10
    ) / 10;

    // ── 品牌推荐 ──
    const brandMatches = this._matchBrands(d, renoResult.matchedTier);

    // ── 财务测算 ──
    const financials = this._calcFinancials(d, brandMatches.topMatches[0]);

    // ── 风险信号 ──
    const riskSignals = this._detectRisks(d, {
      dimRent, dimCompetition, dimReno, dimArea, dimOpCost
    }, brandMatches.topMatches[0], overallScore);

    return {
      overallScore,
      rating: this._getRating(overallScore),
      dimensions: {
        D1_city_tier:     { label: '城市能级', value: d.city_tier, score: dimCity, weight: '12%' },
        D2_rent_burden:   { label: '租金负担', value: `${d.rent_per_sqm}元/㎡`, score: dimRent, weight: '15%' },
        D3_property_size: { label: '物业体量', value: `${d.room_count}间`, score: dimArea, weight: '12%' },
        D4_renovation:    { label: '改造成本', value: `${Math.round(d.renovation_budget_per_room/10000)}万/间`, score: dimReno, matchedTier: renoResult.matchedTier, weight: '18%' },
        D5_operating:     { label: '运营成本', value: `${d.operating_cost_per_room_day}元/间/天`, score: dimOpCost, weight: '13%' },
        D6_competition:   { label: '竞争密度', value: `${d.competition_count_3km}家/3km`, score: dimCompetition, weight: '15%' },
        D7_guest_profile: { label: '客群结构', value: d.guest_profile, score: dimGuest, weight: '15%' }
      },
      brandMatches,
      financials,
      riskSignals,
      timestamp: new Date().toISOString()
    };
  }

  // ─── 品牌匹配（核心方法） ───────────────────────────────
  // 匹配策略：先用城市+改造成本双约束筛选，再用得分排序
  _matchBrands(d, suggestedTier) {
    const cityTier = d.city_tier || '2';
    
    // 城市等级对应的合理档次范围
    const TIER_BY_CITY = {
      '1': ['luxury', 'upper-upscale', 'upscale', 'mid-upscale', 'mid'],
      '2': ['upper-upscale', 'upscale', 'mid-upscale', 'mid', 'economy'],
      '3': ['mid-upscale', 'mid', 'economy'],
      '4': ['economy', 'mid']
    };
    const allowedTiers = TIER_BY_CITY[cityTier] || TIER_BY_CITY['2'];

    const renoBudget = d.renovation_budget_per_room;

    const scored = this.brands
      .filter(b => allowedTiers.includes(b.tier))
      .map(brand => {
        const reasons = [];
        let matchScore = 0;

        // ── 改造成本匹配（最重要，占40分）─
        const renoRange = RENOVATION_TIER_MAP[brand.tier] || { min: 50000, max: 100000 };
        const inRange = renoBudget >= renoRange.min * 0.85 && renoBudget <= renoRange.max * 1.20;
        if (inRange) {
          const mid = (renoRange.min + renoRange.max) / 2;
          const dist = Math.abs(renoBudget - mid) / mid;
          matchScore += 40 - dist * 20;
          reasons.push(`✅ 改造成本${Math.round(renoBudget/10000)}万/间匹配${brand.tier}区间`);
        } else if (renoBudget < renoRange.min) {
          matchScore += 15;
          reasons.push(`⚠️ 改造成本偏低(${Math.round(renoBudget/10000)}万<${Math.round(renoRange.min/10000)}万最低要求)`);
        } else {
          matchScore += 10;
          reasons.push(`⚠️ 改造成本偏高(${Math.round(renoBudget/10000)}万>${Math.round(renoRange.max/10000)}万建议上限)`);
        }

        // ── 房间数匹配（占25分）─
        const minRooms = brand.min_rooms || 50;
        if (d.room_count >= minRooms) {
          matchScore += 25;
          reasons.push(`✅ 房间数${d.room_count}间满足${brand.brand_name}最低${minRooms}间要求`);
        } else {
          matchScore += Math.max(0, (d.room_count / minRooms) * 15);
          reasons.push(`❌ 房间数${d.room_count}间不足${brand.brand_name}最低${minRooms}间`);
        }

        // ── 管理费合理性（占20分）─
        const mgmtFee = brand.management_fee_pct || 6;
        if (mgmtFee <= 6) {
          matchScore += 20;
          reasons.push(`✅ 管理费${mgmtFee}%合理`);
        } else if (mgmtFee <= 8) {
          matchScore += 14;
          reasons.push(`⚠️ 管理费${mgmtFee}%偏高`);
        } else {
          matchScore += 8;
          reasons.push(`❌ 管理费${mgmtFee}%偏高`);
        }

        // ── 加盟费一次性（占15分）─
        const franchiseFee = brand.franchise_fee_one_time || 100000;
        if (franchiseFee <= 200000) {
          matchScore += 15;
        } else if (franchiseFee <= 500000) {
          matchScore += 10;
        } else {
          matchScore += 5;
        }
        reasons.push(`💰 加盟费${Math.round(franchiseFee/10000)}万`);

        return {
          brand,
          totalMatchScore: Math.min(100, Math.round(matchScore)),
          reasons
        };
      })
      .sort((a, b) => b.totalMatchScore - a.totalMatchScore)
      .slice(0, 5);

    return {
      topMatches: scored.map(s => ({
        brand_name: s.brand.brand_name,
        brand_group: s.brand.brand_group,
        tier: s.brand.tier,
        match_score: s.totalMatchScore,
        match_reasons: s.reasons,
        mgmt_fee_pct: s.brand.management_fee_pct,
        franchise_fee_yuan: s.brand.franchise_fee_one_time,
        reno_cost_brand: s.brand.renovation_cost_per_room,
        min_rooms: s.brand.min_rooms,
        target_city_tiers: s.brand.target_city_tiers,
        break_even_months: s.brand.break_even_months,
        estimated: s.brand.estimated || false
      })),
      total_candidates: scored.length
    };
  }

  // ─── 财务测算 ─────────────────────────────────────────
  _calcFinancials(d, topBrand) {
    if (!topBrand) return null;

    const rooms = d.room_count;
    const area = d.area_sqm;
    const renoBudget = d.renovation_budget_per_room;
    const opCostDay = d.operating_cost_per_room_day;
    const monthlyRent = d.monthly_rent_yuan || (area * d.rent_per_sqm);
    const mgmtFeePct = topBrand.mgmt_fee_pct || 6;

    // ── 预估ADR（根据档次）─
    const adrByTier = {
      luxury: 680, 'upper-upscale': 420, upscale: 290,
      'mid-upscale': 205, mid: 155, economy: 112
    };
    const adr = adrByTier[topBrand.tier] || 180;

    // ── 年化收入（75%入住率）─
    const annualRevenue = rooms * adr * 365 * 0.75;
    const annualOpCost = rooms * opCostDay * 365;
    const annualMgmtFee = annualRevenue * (mgmtFeePct / 100);
    const annualRent = monthlyRent * 12;

    const gop = annualRevenue - annualOpCost - annualMgmtFee;
    const netProfit = gop - annualRent;

    // ── 总投资 ──
    const totalInvest = rooms * renoBudget + (topBrand.franchise_fee_yuan || 0);

    // ── 回本周期 ──
    const paybackYears = netProfit > 0 ? totalInvest / netProfit : null;

    // ── 盈亏平衡入住率 ──
    const dailyRoomCost = (annualRent + annualOpCost + annualMgmtFee) / 365 / rooms;
    const breakevenOcc = dailyRoomCost / adr;

    return {
      recommended_brand: topBrand.brand_name,
      brand_tier: topBrand.tier,
      estimated_adr_yuan: adr,
      assume_occupy_rate: 0.75,
      annual_revenue_yuan: Math.round(annualRevenue),
      annual_gop_yuan: Math.round(gop),
      gop_margin_pct: Math.round((gop / annualRevenue) * 1000) / 10,
      annual_rent_yuan: Math.round(annualRent),
      annual_net_profit_yuan: Math.round(netProfit),
      net_margin_pct: Math.round((netProfit / annualRevenue) * 1000) / 10,
      total_invest_yuan: Math.round(totalInvest),
      payback_years: paybackYears ? Math.round(paybackYears * 10) / 10 : null,
      breakeven_occupy_rate: Math.round(breakevenOcc * 1000) / 10,
      financial_verdict: netProfit > 0
        ? `✅ 年净利润${Math.round(netProfit/10000)}万元，回本周期约${Math.round(paybackYears)}年`
        : `⚠️ 年亏损${Math.round(Math.abs(netProfit)/10000)}万元，盈亏平衡需${Math.round(breakevenOcc*100)}%入住率`
    };
  }

  // ─── 风险信号 ─────────────────────────────────────────
  _detectRisks(d, scores, topBrand, overallScore) {
    const risks = [];

    if (scores.dimRent > 0 && scores.dimRent < 40) {
      risks.push({ level: 'HIGH', signal: `租金过高（${d.rent_per_sqm}元/㎡），年租金${Math.round(d.area_sqm * d.rent_per_sqm * 12 / 10000)}万元，严重挤压利润` });
    }

    if (scores.dimCompetition < 40) {
      risks.push({ level: 'HIGH', signal: `竞争激烈（${d.competition_count_3km}家/3km），市场已红海化` });
    }

    if (scores.dimReno < 45) {
      risks.push({ level: 'HIGH', signal: `改造成本预算(${Math.round(d.renovation_budget_per_room/10000)}万/间)与任何品牌档次均不匹配` });
    }

    if (d.room_count < 30) {
      risks.push({ level: 'HIGH', signal: `房间数${d.room_count}间过少，无法达到任何品牌最低要求` });
    }

    if (topBrand && topBrand.payback_years && topBrand.payback_years > 10) {
      risks.push({ level: 'MEDIUM', signal: `预估回本周期${topBrand.payback_years}年，超过合理投资周期` });
    }

    if (topBrand && topBrand.breakeven_occupy_rate > 85) {
      risks.push({ level: 'MEDIUM', signal: `盈亏平衡入住率需${topBrand.breakeven_occupy_rate}%，运营压力极大` });
    }

    if (scores.dimOpCost < 50) {
      risks.push({ level: 'MEDIUM', signal: `运营成本偏高（${d.operating_cost_per_room_day}元/间/天），需加强成本管控` });
    }

    if (overallScore < 55) {
      risks.push({ level: 'HIGH', signal: `综合评分${overallScore}分，标的整体质量欠佳，建议重新筛选` });
    }

    return risks;
  }

  // ─── 工具方法 ─────────────────────────────────────────
  _normalize(input) {
    const area = input.area_sqm || 2000;
    const roomCount = input.room_count_estimate || Math.max(30, Math.floor(area / 35));
    return {
      city_tier: input.city_tier || '2',
      rent_per_sqm: input.rent_per_sqm || 45,
      area_sqm: area,
      room_count: input.room_count_estimate || roomCount,
      renovation_budget_per_room: input.renovation_budget_per_room || 80000,
      operating_cost_per_room_day: input.operating_cost_per_room_day || 120,
      competition_count_3km: input.competition_count_3km || 5,
      guest_profile: input.guest_profile || '商务',
      investor_capital_yuan: input.investor_capital_yuan || 0,
      monthly_rent_yuan: input.monthly_rent_yuan || (area * (input.rent_per_sqm || 45))
    };
  }

  _getRating(score) {
    if (score >= 82) return { grade: 'S', label: '极优质标的', color: '#00C853' };
    if (score >= 72) return { grade: 'A', label: '优质标的', color: '#4CAF50' };
    if (score >= 62) return { grade: 'B', label: '良好标的', color: '#FF9800' };
    if (score >= 52) return { grade: 'C', label: '一般标的', color: '#FF5722' };
    if (score >= 42) return { grade: 'D', label: '风险较高', color: '#F44336' };
    return { grade: 'F', label: '不建议投资', color: '#B71C1C' };
  }

  getAllBrands() {
    if (this.brands.length === 0) this.loadBrands();
    return this.brands;
  }

  matchBrands(input, topN = 5) {
    if (this.brands.length === 0) this.loadBrands();
    const d = this._normalize(input);
    const renoResult = scoreRenovation(d.renovation_budget_per_room, d.city_tier);
    return this._matchBrands(d, renoResult.matchedTier);
  }

  quickCalc(input) {
    if (this.brands.length === 0) this.loadBrands();
    const result = this.evaluate(input);
    return {
      overallScore: result.overallScore,
      rating: result.rating,
      topBrand: result.brandMatches?.topMatches?.[0] || null,
      financials: result.financials,
      risks: result.riskSignals
    };
  }
}

export default new EvaluationEngine();
