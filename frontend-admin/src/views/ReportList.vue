<template>
  <div>
    <el-card>
      <template #header>
        <el-space>
          <span>评估报告历史</span>
          <el-button type="primary" @click="$router.push('/evaluate')">+ 新建评估</el-button>
        </el-space>
      </template>
      <el-table :data="reports" stripe v-loading="loading">
        <el-table-column prop="id" label="报告ID" width="220" show-overflow-tooltip />
        <el-table-column prop="property.name" label="物业名称" width="150" />
        <el-table-column prop="property.city" label="城市" width="80" />
        <el-table-column prop="evaluation.overallScore" label="评分" width="80">
          <template #default="{ row }">
            <span :style="{ color: row.evaluation?.rating?.color || '#666', fontWeight:'bold' }">{{ row.evaluation?.overallScore }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="evaluation.rating.label" label="等级" width="90">
          <template #default="{ row }">
            <el-tag :color="row.evaluation?.rating?.color" style="color:#fff">{{ row.evaluation?.rating?.grade }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="brandMatches" label="推荐品牌" width="120">
          <template #default="{ row }">{{ row.brandMatches?.[0]?.brand_name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="financials.payback_years" label="回本周期(年)" width="110">
          <template #default="{ row }">{{ row.financials?.payback_years || '-' }}</template>
        </el-table-column>
        <el-table-column prop="financials.annual_net_profit_yuan" label="年净利润(元)" width="120">
          <template #default="{ row }">{{ row.financials?.annual_net_profit_yuan ? (row.financials.annual_net_profit_yuan/10000).toFixed(0)+'万' : '-' }}</template>
        </el-table-column>
        <el-table-column prop="generatedAt" label="评估时间" width="160">
          <template #default="{ row }">{{ new Date(row.generatedAt).toLocaleString('zh-CN') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">查看</el-button>
            <el-button size="small" type="primary" @click="downloadPdf(row)">下载PDF</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:12px" background layout="prev,pager,next" :total="reports.length" v-model:current-page="page" :page-size="20" />
    </el-card>

    <!-- 报告详情 -->
    <el-dialog v-model="detailVisible" title="评估报告详情" width="800px">
      <div v-if="detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="物业名称">{{ detail.property?.name }}</el-descriptions-item>
          <el-descriptions-item label="城市">{{ detail.property?.city }} ({{ detail.property?.city_tier }}线城市)</el-descriptions-item>
          <el-descriptions-item label="综合评分"><span style="font-weight:bold; color:#e94560">{{ detail.evaluation?.overallScore }}</span></el-descriptions-item>
          <el-descriptions-item label="评级">{{ detail.evaluation?.rating?.label }}</el-descriptions-item>
          <el-descriptions-item label="推荐品牌">{{ detail.brandMatches?.[0]?.brand_name }}</el-descriptions-item>
          <el-descriptions-item label="年净利润">{{ detail.financials?.annual_net_profit_yuan ? (detail.financials.annual_net_profit_yuan/10000).toFixed(0)+'万元' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="回本周期" :span="2">{{ detail.financials?.payback_years }}年</el-descriptions-item>
        </el-descriptions>
        <h4 style="margin-top:16px">推荐品牌</h4>
        <el-table :data="detail.brandMatches" stripe size="small">
          <el-table-column prop="brand_name" label="品牌" />
          <el-table-column prop="tier" label="档次" />
          <el-table-column prop="match_score" label="匹配分" />
          <el-table-column prop="franchise_fee" label="加盟费" />
          <el-table-column prop="management_fee_pct" label="管理费%" />
          <el-table-column prop="payback_years" label="回本周期" />
        </el-table>
        <div v-if="detail.evaluation?.riskSignals?.length" style="margin-top:16px">
          <h4>风险信号</h4>
          <el-alert v-for="(r,i) in detail.evaluation.riskSignals" :key="i" :title="r.signal" :type="r.level==='HIGH'?'error':'warning'" show-icon style="margin-bottom:8px" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const reports = ref([])
const loading = ref(false)
const page = ref(1)
const detailVisible = ref(false)
const detail = ref(null)

function loadReports() {
  loading.value = true
  api.getReports({ limit: 500 })
    .then(r => { reports.value = r.data || [] })
    .catch(console.error)
    .finally(() => { loading.value = false })
}

function viewDetail(row) { detail.value = row; detailVisible.value = true }

function downloadPdf(row) {
  window.open(`/api/reports/${row.id}/pdf`, '_blank')
}

onMounted(loadReports)
</script>
