<template>
  <div class="share-page">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading" style="font-size:40px;color:#e94560"><Loading /></el-icon>
      <p style="color:#999;margin-top:12px">正在加载报告...</p>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="error-state">
      <el-result icon="error" title="报告不可用" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="$router.push('/login')">登录管理后台</el-button>
        </template>
      </el-result>
    </div>

    <!-- 报告内容 -->
    <div v-else-if="report" class="report-content">
      <!-- 封面区 -->
      <div class="report-cover">
        <div class="cover-brand">酒店投资评估报告</div>
        <div class="cover-name">{{ report.property?.name || '未命名物业' }}</div>
        <div class="cover-city">{{ report.property?.city }} · {{ report.property?.city_tier }}线城市</div>
        <div class="cover-score" :style="{ color: report.evaluation?.rating?.color || '#e94560' }">
          {{ report.evaluation?.overallScore }}
        </div>
        <div class="cover-grade">综合评级：{{ report.evaluation?.rating?.grade }} {{ report.evaluation?.rating?.label }}</div>
        <div class="cover-meta">报告编号：{{ report.id }} · 生成时间：{{ formatDate(report.generatedAt) }}</div>
      </div>

      <!-- 物业信息 -->
      <div class="section-card">
        <div class="section-title">一、物业基本信息</div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="城市等级">{{ report.property?.city_tier }}线城市</el-descriptions-item>
          <el-descriptions-item label="物业面积">{{ report.property?.area_sqm }}㎡</el-descriptions-item>
          <el-descriptions-item label="预估房间数">{{ report.property?.room_count_estimate }}间</el-descriptions-item>
          <el-descriptions-item label="租金水平">{{ report.property?.rent_per_sqm }}元/㎡/月</el-descriptions-item>
          <el-descriptions-item label="改造成本">{{ ((report.property?.renovation_budget_per_room || 0) / 10000).toFixed(0) }}万元/间</el-descriptions-item>
          <el-descriptions-item label="日运营成本">{{ report.property?.operating_cost_per_room_day }}元/间/天</el-descriptions-item>
          <el-descriptions-item label="竞争态势">{{ report.property?.competition_count_3km }}家/3km</el-descriptions-item>
          <el-descriptions-item label="主要客群">{{ report.property?.guest_profile }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 评分维度 -->
      <div class="section-card">
        <div class="section-title">二、10维评估结果</div>
        <div class="dim-bars">
          <div v-for="(dim, key) in report.evaluation?.dimensions" :key="key" class="dim-row">
            <span class="dim-label">{{ dim.label }}</span>
            <div class="dim-bar-bg">
              <div class="dim-bar-fill" :style="{ width: dim.score + '%', background: scoreColor(dim.score) }"></div>
            </div>
            <span class="dim-score">{{ dim.score }}分</span>
          </div>
        </div>
      </div>

      <!-- 品牌推荐 -->
      <div class="section-card">
        <div class="section-title">三、品牌推荐</div>
        <div class="brand-list">
          <div v-for="(brand, i) in report.brandMatches" :key="i" class="brand-item" :class="{ 'top': i === 0 }">
            <div class="brand-rank">#{{ i + 1 }}</div>
            <div class="brand-info">
              <div class="brand-name">{{ brand.brand_name }}</div>
              <div class="brand-tier">{{ brand.tier }}</div>
            </div>
            <div class="brand-score">{{ brand.match_score }}分</div>
          </div>
        </div>
      </div>

      <!-- 财务测算 -->
      <div class="section-card">
        <div class="section-title">四、财务测算</div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="推荐品牌">{{ report.financials?.recommended_brand }}</el-descriptions-item>
          <el-descriptions-item label="品牌档次">{{ report.financials?.brand_tier }}</el-descriptions-item>
          <el-descriptions-item label="预估ADR">{{ report.financials?.estimated_adr_yuan }}元/间夜</el-descriptions-item>
          <el-descriptions-item label="假设入住率">{{ ((report.financials?.assume_occupy_rate || 0) * 100).toFixed(0) }}%</el-descriptions-item>
          <el-descriptions-item label="年营业收入">{{ ((report.financials?.annual_revenue_yuan || 0) / 10000).toFixed(0) }}万元</el-descriptions-item>
          <el-descriptions-item label="年度GOP">{{ ((report.financials?.annual_gop_yuan || 0) / 10000).toFixed(0) }}万元 ({{ report.financials?.gop_margin_pct }}%)</el-descriptions-item>
          <el-descriptions-item label="年净利润">{{ ((report.financials?.annual_net_profit_yuan || 0) / 10000).toFixed(0) }}万元</el-descriptions-item>
          <el-descriptions-item label="总投资额">{{ ((report.financials?.total_invest_yuan || 0) / 10000).toFixed(0) }}万元</el-descriptions-item>
          <el-descriptions-item label="回本周期">{{ report.financials?.payback_years ? report.financials.payback_years + '年' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="盈亏平衡入住率">{{ report.financials?.breakeven_occupy_rate ? report.financials.breakeven_occupy_rate + '%' : '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-alert v-if="report.financials?.financial_verdict" :title="report.financials.financial_verdict"
          :type="report.financials.annual_net_profit_yuan > 0 ? 'success' : 'warning'" style="margin-top:12px" />
      </div>

      <!-- 风险信号 -->
      <div v-if="report.evaluation?.riskSignals?.length" class="section-card">
        <div class="section-title">⚠️ 风险提示</div>
        <el-alert v-for="(risk, i) in report.evaluation.riskSignals" :key="i"
          :title="risk.signal" :type="risk.level === 'HIGH' ? 'error' : 'warning'" show-icon style="margin-bottom:8px" />
      </div>

      <div class="report-footer">
        本报告由酒店投资品牌匹配 SaaS 系统生成 · 仅供参考，不构成投资建议
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import api from '../api'

const route = useRoute()
const report = ref(null)
const loading = ref(true)
const error = ref('')

function formatDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN')
}

function scoreColor(score) {
  if (score >= 70) return '#4CAF50'
  if (score >= 50) return '#FF9800'
  return '#F44336'
}

onMounted(async () => {
  const token = route.params.token
  try {
    const r = await api.getSharedReport(token)
    if (r.success) {
      report.value = r.data
    } else {
      error.value = r.error || '报告不存在或链接已失效'
    }
  } catch (e) {
    error.value = '报告不存在或链接已失效'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.share-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.report-content {
  max-width: 800px;
  margin: 0 auto;
}

.report-cover {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #fff;
  text-align: center;
  padding: 48px 24px;
  border-radius: 16px;
  margin-bottom: 20px;
}

.cover-brand {
  font-size: 14px;
  letter-spacing: 3px;
  color: #e94560;
  margin-bottom: 12px;
}

.cover-name {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 6px;
}

.cover-city {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 24px;
}

.cover-score {
  font-size: 80px;
  font-weight: bold;
  line-height: 1;
}

.cover-grade {
  font-size: 18px;
  margin-top: 8px;
}

.cover-meta {
  font-size: 11px;
  color: #666;
  margin-top: 16px;
}

.section-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #1a1a2e;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e94560;
}

.dim-bars { display: flex; flex-direction: column; gap: 14px; }
.dim-row { display: flex; align-items: center; gap: 10px; }
.dim-label { width: 80px; font-size: 13px; color: #555; flex-shrink: 0; }
.dim-bar-bg { flex: 1; height: 10px; background: #eee; border-radius: 5px; overflow: hidden; }
.dim-bar-fill { height: 100%; border-radius: 5px; }
.dim-score { width: 45px; text-align: right; font-size: 12px; font-weight: bold; color: #333; flex-shrink: 0; }

.brand-list { display: flex; flex-direction: column; gap: 10px; }
.brand-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #fafafa; border-radius: 8px; border-left: 3px solid #ddd; }
.brand-item.top { background: #fff5f7; border-left-color: #e94560; }
.brand-rank { font-size: 20px; font-weight: bold; color: #ccc; width: 36px; }
.brand-item.top .brand-rank { color: #e94560; }
.brand-info { flex: 1; }
.brand-name { font-weight: bold; font-size: 15px; color: #1a1a2e; }
.brand-tier { font-size: 12px; color: #999; text-transform: uppercase; }
.brand-score { font-size: 18px; font-weight: bold; color: #4CAF50; }

.report-footer {
  text-align: center;
  color: #bbb;
  font-size: 12px;
  padding: 20px;
}
</style>
