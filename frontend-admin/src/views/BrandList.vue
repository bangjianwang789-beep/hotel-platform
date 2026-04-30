<template>
  <div>
    <el-card>
      <template #header>
        <el-space>
          <span>品牌数据库</span>
          <el-input v-model="search" placeholder="搜索品牌/集团" style="width:200px" clearable />
          <el-select v-model="filterTier" placeholder="档次" clearable style="width:140px">
            <el-option label="奢华" value="luxury" />
            <el-option label="高端" value="upper-upscale" />
            <el-option label="中高端" value="upscale" />
            <el-option label="中端偏上" value="mid-upscale" />
            <el-option label="中端" value="mid" />
            <el-option label="经济型" value="economy" />
          </el-select>
        </el-space>
      </template>
      <el-table :data="filteredBrands" stripe v-loading="loading">
        <el-table-column prop="brand_name" label="品牌名称" width="140" />
        <el-table-column prop="brand_group" label="酒店集团" width="180" />
        <el-table-column prop="tier" label="档次" width="100">
          <template #default="{ row }">
            <el-tag :type="TIER_TYPE[row.tier] || ''" size="small">{{ TIER_LABELS[row.tier] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="renovation_cost_per_room" label="单房改造(元)" width="120">
          <template #default="{ row }">{{ row.renovation_cost_per_room?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="management_fee_pct" label="管理费%" width="90">
          <template #default="{ row }">{{ row.management_fee_pct }}%</template>
        </el-table-column>
        <el-table-column prop="min_rooms" label="最低房间数" width="100" />
        <el-table-column prop="franchise_fee_one_time" label="加盟费(元)" width="120">
          <template #default="{ row }">{{ row.franchise_fee_one_time?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="typical_guest_profile" label="典型客群" />
        <el-table-column prop="break_even_months" label="回本周期(月)" width="110" />
      </el-table>
      <el-pagination style="margin-top:12px" background layout="prev,pager,next" :total="total" v-model:current-page="page" :page-size="20" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'

const TIER_LABELS = { luxury:'奢华','upper-upscale':'高端',upscale:'中高端','mid-upscale':'中端偏上',mid:'中端',economy:'经济型' }
const TIER_TYPE  = { luxury:'danger','upper-upscale':'warning',upscale:'success','mid-upscale':'','mid':'info',economy:'' }

const brands = ref([])
const search = ref('')
const filterTier = ref('')
const loading = ref(false)
const page = ref(1)

const filteredBrands = computed(() => {
  let list = brands.value
  if (filterTier.value) list = list.filter(b => b.tier === filterTier.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(b => b.brand_name.toLowerCase().includes(q) || b.brand_group.toLowerCase().includes(q))
  }
  return list.slice((page.value - 1) * 20, page.value * 20)
})
const total = computed(() => filteredBrands.value.length)

onMounted(async () => {
  loading.value = true
  try { const r = await api.getBrands(); brands.value = r.data || r.brands || [] }
  catch (err) { console.error(err) }
  finally { loading.value = false }
})
</script>
