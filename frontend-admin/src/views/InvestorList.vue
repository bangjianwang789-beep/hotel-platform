<template>
  <div>
    <el-card>
      <template #header>
        <el-space wrap>
          <span>意向客户管理</span>
          <el-input v-model="search" placeholder="搜索姓名/电话" style="width:180px" clearable />
          <el-select v-model="filterStatus" clearable placeholder="状态" style="width:130px">
            <el-option label="新登记" value="new" />
            <el-option label="跟进中" value="following" />
            <el-option label="已成交" value="closed" />
          </el-select>
          <el-button type="primary" @click="showDialog = true">+ 新增客户</el-button>
        </el-space>
      </template>
      <el-table :data="displayedInvestors" stripe v-loading="loading">
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="city" label="城市" width="100" />
        <el-table-column prop="city_tier" label="城市等级" width="100">
          <template #default="{ row }">{{ row.city_tier }}线城市</template>
        </el-table-column>
        <el-table-column prop="area_sqm" label="物业面积(㎡)" width="110">
          <template #default="{ row }">{{ row.area_sqm?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="budget" label="预算(万元)" width="100">
          <template #default="{ row }">{{ row.budget }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="STATUS_TYPE[row.status] || ''" size="small">{{ STATUS_LABEL[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" show-overflow-tooltip />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="startEval(row)">评估物业</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:12px" background layout="prev,pager,next" :total="investors.length" v-model:current-page="page" :page-size="20" />
    </el-card>

    <!-- 新增客户弹窗 -->
    <el-dialog v-model="showDialog" title="新增意向客户" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="姓名" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="电话" required><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="城市"><el-input v-model="form.city" /></el-form-item>
        <el-form-item label="城市等级">
          <el-select v-model="form.city_tier" style="width:100%">
            <el-option label="一线城市" value="1" /><el-option label="二线城市" value="2" />
            <el-option label="三线城市" value="3" /><el-option label="四线城市" value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="物业面积(㎡)"><el-input-number v-model="form.area_sqm" :min="500" :step="100" style="width:100%" /></el-form-item>
        <el-form-item label="预算(万元)"><el-input-number v-model="form.budget" :min="0" :step="50" style="width:100%" /></el-form-item>
        <el-form-item label="物业地址"><el-input v-model="form.property_address" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.notes" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const STATUS_LABEL = { new:'新登记', following:'跟进中', closed:'已成交' }
const STATUS_TYPE  = { new:'', following:'warning', closed:'success' }

const investors = ref([])
const search = ref('')
const filterStatus = ref('')
const showDialog = ref(false)
const loading = ref(false)
const page = ref(1)

const form = ref({ name:'', phone:'', city:'', city_tier:'2', area_sqm:3000, budget:500, property_address:'', notes:'' })

const displayedInvestors = computed(() => {
  let list = investors.value
  if (filterStatus.value) list = list.filter(i => i.status === filterStatus.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(i => (i.name||'').toLowerCase().includes(q) || (i.phone||'').includes(q))
  }
  return list.slice((page.value - 1) * 20, page.value * 20)
})

function loadInvestors() {
  loading.value = true
  api.getInvestors({ limit: 500 })
    .then(r => { investors.value = r.data || [] })
    .catch(console.error)
    .finally(() => { loading.value = false })
}

async function handleCreate() {
  if (!form.value.name || !form.value.phone) { ElMessage.warning('姓名和电话必填'); return }
  try {
    await api.createInvestor(form.value)
    ElMessage.success('添加成功')
    showDialog.value = false
    loadInvestors()
  } catch (err) { ElMessage.error('添加失败') }
}

async function handleDelete(id) {
  await ElMessageBox.confirm('确认删除该客户？', '提示', { type: 'warning' })
  try { await api.deleteInvestor(id); ElMessage.success('已删除'); loadInvestors() }
  catch (err) { ElMessage.error('删除失败') }
}

function startEval(row) {
  // 跳转评估页并带入客户信息
  window.location.href = `/evaluate?investor_id=${row.id}&city=${row.city}&city_tier=${row.city_tier}&area_sqm=${row.area_sqm}&budget=${row.budget}`
}

onMounted(loadInvestors)
</script>
