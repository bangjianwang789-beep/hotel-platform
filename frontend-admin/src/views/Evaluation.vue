<template>
  <div>
    <el-row :gutter="16">
      <!-- 左侧：表单 -->
      <el-col :span="12">
        <el-card>
          <template #header><span>物业信息录入</span></template>
          <el-form :model="form" label-width="120px" @submit.prevent="handleEvaluate">
            <el-form-item label="物业名称"><el-input v-model="form.name" placeholder="如：上海市静安区物业" /></el-form-item>
            <el-form-item label="城市"><el-input v-model="form.city" placeholder="如：上海" /></el-form-item>
            <el-form-item label="城市等级" required>
              <el-select v-model="form.city_tier" style="width:100%">
                <el-option label="一线城市" value="1" /><el-option label="二线城市" value="2" />
                <el-option label="三线城市" value="3" /><el-option label="四线城市" value="4" />
              </el-select>
            </el-form-item>
            <el-form-item label="商圈类型">
              <el-select v-model="form.location_type" style="width:100%">
                <el-option label="CBD" value="CBD" /><el-option label="核心商圈" value="核心商圈" />
                <el-option label="副核心" value="副核心" /><el-option label="交通枢纽" value="交通枢纽" />
                <el-option label="景区周边" value="景区周边" /><el-option label="区域中心" value="区域中心" />
                <el-option label="社区" value="社区" /><el-option label="郊区" value="郊区" />
              </el-select>
            </el-form-item>
            <el-form-item label="租金(元/㎡/月)" required>
              <el-input-number v-model="form.rent_per_sqm" :min="5" :max="300" :step="1" style="width:100%" />
            </el-form-item>
            <el-form-item label="物业面积(㎡)" required>
              <el-input-number v-model="form.area_sqm" :min="500" :step="100" style="width:100%" />
            </el-form-item>
            <el-form-item label="预估房间数">
              <el-input-number v-model="form.room_count_estimate" :min="20" :max="500" :step="5" style="width:100%" />
            </el-form-item>
            <el-form-item label="改造成本(元/间)" required>
              <el-input-number v-model="form.renovation_budget_per_room" :min="10000" :max="500000" :step="5000" style="width:100%" />
            </el-form-item>
            <el-form-item label="日运营成本(元/间)">
              <el-input-number v-model="form.operating_cost_per_room_day" :min="30" :max="500" :step="5" style="width:100%" />
            </el-form-item>
            <el-form-item label="周边竞品数量">
              <el-input-number v-model="form.competition_count_3km" :min="0" :max="50" style="width:100%" />
            </el-form-item>
            <el-form-item label="主要客群">
              <el-select v-model="form.guest_profile" style="width:100%">
                <el-option label="商务出差" value="商务" /><el-option label="旅游度假" value="旅游" />
                <el-option label="休闲娱乐" value="休闲" /><el-option label="会议团队" value="会议" />
                <el-option label="长住客" value="长住" /><el-option label="亲子家庭" value="亲子" />
                <el-option label="情侣" value="情侣" />
              </el-select>
            </el-form-item>
            <el-form-item label="投资人资金(万元)">
              <el-input-number v-model="form.investor_capital" :min="0" :max="10000" :step="50" style="width:100%" />
            </el-form-item>
            <el-form-item label="风险偏好">
              <el-radio-group v-model="form.risk_appetite">
                <el-radio label="high">激进</el-radio><el-radio label="medium">稳健</el-radio><el-radio label="low">保守</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" native-type="submit" :loading="loading" style="width:100%">开始评估</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧：结果 -->
      <el-col :span="12">
        <div v-if="result">
          <!-- 综合评分 -->
          <el-card style="margin-bottom:16px; text-align:center">
            <div :style="{ fontSize:'72px', fontWeight:'bold', color: result.evaluation?.rating?.color || '#e94560' }">
              {{ result.evaluation?.overallScore }}
            </div>
            <div style="font-size:20px; color:#666; margin-top:8px">{{ result.evaluation?.rating?.label }}</div>
            <div style="margin-top:12px">
              <el-tag v-if="result.evaluation?.riskSignals?.length" type="danger" size="large">⚠ {{ result.evaluation.riskSignals.length }}项风险信号</el-tag>
            </div>
          </el-card>

          <!-- 品牌推荐 -->
          <el-card style="margin-bottom:16px">
            <template #header><span>品牌推荐 Top {{ result.brandMatches?.length }}</span></template>
            <el-table :data="result.brandMatches" stripe size="small">
              <el-table-column prop="brand_name" label="品牌" width="110" />
              <el-table-column prop="tier" label="档次" width="90" />
              <el-table-column prop="match_score" label="匹配分" width="70">
                <template #default="{ row }"><b>{{ row.match_score }}</b></template>
              </el-table-column>
              <el-table-column prop="franchise_fee" label="加盟费" width="90">
                <template #default="{ row }">{{ row.franchise_fee ? (row.franchise_fee/10000).toFixed(1)+'万' : '-' }}</template>
              </el-table-column>
              <el-table-column prop="management_fee_pct" label="管理费" width="70" />
              <el-table-column prop="match_reasons" label="匹配理由" show-overflow-tooltip />
            </el-table>
          </el-card>

          <!-- 财务测算 -->
          <el-card v-if="result.financials" style="margin-bottom:16px">
            <template #header><span>投资回报测算</span></template>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="预估房价">{{ result.financials.estimated_room_rate }}元/晚</el-descriptions-item>
              <el-descriptions-item label="年营收">{{ (result.financials.annual_revenue_yuan/10000).toFixed(0) }}万元</el-descriptions-item>
              <el-descriptions-item label="年GOP">{{ (result.financials.annual_gop_yuan/10000).toFixed(0) }}万元</el-descriptions-item>
              <el-descriptions-item label="年净利润">{{ (result.financials.annual_net_profit_yuan/10000).toFixed(0) }}万元</el-descriptions-item>
              <el-descriptions-item label="回本周期">{{ result.financials.payback_years }}年</el-descriptions-item>
              <el-descriptions-item label="总投资">{{ (result.financials.total_invest_yuan/10000).toFixed(0) }}万元</el-descriptions-item>
            </el-descriptions>
            <el-alert v-if="result.financials.notes" :title="result.financials.notes" type="info" show-icon style="margin-top:12px" />
          </el-card>

          <!-- 风险信号 -->
          <el-card v-if="result.evaluation?.riskSignals?.length">
            <template #header><span>风险信号</span></template>
            <el-alert v-for="(r,i) in result.evaluation.riskSignals" :key="i"
              :title="r.signal" :type="r.level==='HIGH'?'error':'warning'" show-icon style="margin-bottom:8px" />
          </el-card>

          <!-- 保存报告 -->
          <div style="margin-top:16px; text-align:center">
            <el-button type="success" size="large" @click="saveReport">保存此报告</el-button>
            <el-button v-if="savedReportId" type="primary" size="large" @click="handleShare">分享报告</el-button>
          </div>
        </div>
        <el-empty v-else description="填写左侧表单，点击「开始评估」查看结果" />
      </el-col>
    </el-row>

    <!-- 分享对话框 -->
    <el-dialog v-model="shareDialogVisible" title="分享报告" width="500px">
      <el-alert type="info" :closable="false" style="margin-bottom:16px">
        分享链接有效期30天，无需登录即可查看完整报告内容。
      </el-alert>
      <el-input v-model="shareUrl" readonly style="margin-bottom:12px">
        <template #append>
          <el-button @click="copyShareUrl">复制链接</el-button>
        </template>
      </el-input>
      <div style="color:#999;font-size:12px">
        分享链接仅供投资人查看，不可用于商业转载。如需关闭访问，请联系管理员。
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const form = ref({
  name: '', city: '', city_tier: '2', location_type: 'CBD',
  rent_per_sqm: 50, area_sqm: 3000, room_count_estimate: 80,
  renovation_budget_per_room: 80000, operating_cost_per_room_day: 120,
  competition_count_3km: 5, guest_profile: '商务',
  investor_capital: 500, risk_appetite: 'medium'
})

const result = ref(null)
const loading = ref(false)
const savedReportId = ref(null)
const shareDialogVisible = ref(false)
const shareUrl = ref('')

async function handleEvaluate() {
  loading.value = true
  try {
    const r = await api.evaluate(form.value)
    result.value = r.data || r
    savedReportId.value = null
  } catch (err) {
    ElMessage.error('评估失败：' + err.message)
  } finally {
    loading.value = false
  }
}

async function saveReport() {
  if (!result.value) return
  try {
    const r = await api.generateReport({ property: form.value, report_type: 'comprehensive' })
    savedReportId.value = r.data?.id || null
    ElMessage.success('报告已保存')
  } catch (err) {
    ElMessage.error('保存失败')
  }
}

async function handleShare() {
  if (!savedReportId.value) {
    ElMessage.warning('请先保存报告')
    return
  }
  try {
    const r = await api.createShareLink(savedReportId.value, 30)
    if (r.success && r.data) {
      const fullUrl = window.location.origin + '/share/' + r.data.shareToken
      shareUrl.value = fullUrl
      shareDialogVisible.value = true
    }
  } catch (err) {
    ElMessage.error('生成分享链接失败')
  }
}

function copyShareUrl() {
  navigator.clipboard.writeText(shareUrl.value).then(() => {
    ElMessage.success('链接已复制到剪贴板')
  })
}

onMounted(() => {
  const p = new URLSearchParams(window.location.search)
  if (p.get('city')) form.value.city = p.get('city')
  if (p.get('city_tier')) form.value.city_tier = p.get('city_tier')
  if (p.get('area_sqm')) form.value.area_sqm = +p.get('area_sqm')
  if (p.get('budget')) form.value.investor_capital = +p.get('budget')
})
</script>
