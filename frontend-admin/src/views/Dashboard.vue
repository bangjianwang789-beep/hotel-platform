<template>
  <div>
    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="text-align:center">
            <div style="font-size:36px; color:#e94560; font-weight:bold">{{ stats.brands }}</div>
            <div style="color:#666">品牌总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="text-align:center">
            <div style="font-size:36px; color:#0f9b0f; font-weight:bold">{{ stats.investors }}</div>
            <div style="color:#666">意向客户</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="text-align:center">
            <div style="font-size:36px; color:#409eff; font-weight:bold">{{ stats.reports }}</div>
            <div style="color:#666">评估报告</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="text-align:center">
            <div style="font-size:36px; color:#ff9800; font-weight:bold">{{ stats.averageScore }}</div>
            <div style="color:#666">平均评分</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card>
          <template #header><span>最近评估报告</span></template>
          <el-table :data="recentReports" stripe>
            <el-table-column prop="property.name" label="物业名称" />
            <el-table-column prop="evaluation.overallScore" label="综合评分">
              <template #default="{ row }">
                <el-tag :color="row.evaluation?.rating?.color || '#999'" style="color:#fff">{{ row.evaluation?.overallScore }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="evaluation.rating.label" label="等级" />
            <el-table-column prop="brandMatches[0].brand_name" label="推荐品牌" />
            <el-table-column prop="generatedAt" label="时间">
              <template #default="{ row }">{{ new Date(row.generatedAt).toLocaleDateString('zh-CN') }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header><span>快捷操作</span></template>
          <el-space direction="vertical" style="width:100%" :size="12">
            <el-button type="primary" style="width:100%" @click="$router.push('/evaluate')">新建物业评估</el-button>
            <el-button type="success" style="width:100%" @click="$router.push('/investors')">添加意向客户</el-button>
            <el-button style="width:100%" @click="$router.push('/reports')">查看全部报告</el-button>
          </el-space>
        </el-card>
        <el-card style="margin-top:16px">
          <template #header><span>品牌档次分布</span></template>
          <div v-for="g in tierGroups" :key="g.tier" style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f0f0f0">
            <span>{{ g.label }}</span>
            <el-tag size="small">{{ g.count }}</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const stats = ref({ brands: 0, investors: 0, reports: 0, averageScore: 0 })
const recentReports = ref([])
const tierGroups = ref([])

onMounted(async () => {
  try {
    const [brands, investors, reports] = await Promise.all([
      api.getBrands(),
      api.getInvestors({ limit: 1 }),
      api.getReports({ limit: 100 })
    ])
    stats.value.brands = brands.count || 0
    stats.value.investors = investors.total || 0
    stats.value.reports = reports.total || 0
    const scores = (reports.data || []).map(r => r.evaluation?.overallScore).filter(Boolean)
    stats.value.averageScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0
    recentReports.value = (reports.data || []).slice(0, 5)

    // 品牌档次分布
    const tiers = {}
    ;(brands.data || []).forEach(b => { tiers[b.tier] = (tiers[b.tier] || 0) + 1 })
    const TIER_LABELS = { luxury: '奢华', 'upper-upscale': '高端', upscale: '中高端', 'mid-upscale': '中端偏上', mid: '中端', economy: '经济型' }
    tierGroups.value = Object.entries(tiers).map(([tier, count]) => ({ tier, label: TIER_LABELS[tier] || tier, count }))
  } catch (err) {
    console.error(err)
  }
})
</script>
