<template>
  <div>
    <el-card>
      <template #header>
        <el-space wrap>
          <span>意向客户管理</span>
          <el-input v-model="search" placeholder="搜索姓名/电话" style="width:180px" clearable />
          <el-select v-model="filterStatus" clearable placeholder="状态" style="width:130px">
            <el-option label="新登记" value="new" />
            <el-option label="初筛中" value="screening" />
            <el-option label="评估中" value="evaluating" />
            <el-option label="跟进中" value="following" />
            <el-option label="已签约" value="signed" />
            <el-option label="已放弃" value="dropped" />
          </el-select>
          <el-button type="primary" @click="openCreateDialog">+ 新增客户</el-button>
        </el-space>
      </template>
      <el-table :data="displayedInvestors" stripe v-loading="loading">
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="city" label="城市" width="100" />
        <el-table-column prop="area_sqm" label="面积(㎡)" width="100">
          <template #default="{ row }"><span style="color:#666">{{ row.area_sqm?.toLocaleString() }}</span></template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-select v-model="row.status" size="small" style="width:100px"
              :type="STATUS_TYPE[row.status]" @change="updateStatus(row)">
              <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="reportCount" label="报告" width="70" align="center">
          <template #default="{ row }">
            <el-badge :value="row.reportCount || 0" :max="99" v-if="row.reportCount" />
            <span v-else style="color:#ccc">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="lastContactAt" label="最近联系" width="110">
          <template #default="{ row }">
            <span style="color:#999;font-size:12px">{{ formatDate(row.lastContactAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="跟进记录" show-overflow-tooltip>
          <template #default="{ row }">
            <span style="color:#555;font-size:12px">{{ row.latestNote || row.notes || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="startEval(row)">评估</el-button>
            <el-button size="small" @click="openTimelineDialog(row)">跟进</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:12px" background layout="prev,pager,next" :total="investors.length" v-model:current-page="page" :page-size="20" />
    </el-card>

    <!-- 新增客户弹窗 -->
    <el-dialog v-model="showCreateDialog" title="新增意向客户" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="姓名" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="电话" required><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="微信"><el-input v-model="form.wechat" /></el-form-item>
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
        <el-form-item label="初始备注"><el-input v-model="form.notes" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">保存</el-button>
      </template>
    </el-dialog>

    <!-- 跟进记录弹窗 -->
    <el-dialog v-model="showTimelineDialog" :title="'跟进记录 - ' + (timelineTarget?.name || '')" width="600px">
      <div v-if="timelineTarget">
        <el-timeline>
          <el-timeline-item v-for="(entry, i) in timelineEntries" :key="i"
            :timestamp="entry.time" :color="entry.type === 'contact' ? '#e94560' : '#909399'" placement="top">
            <el-card size="small">
              <el-tag size="small" :type="entry.type === 'contact' ? 'primary' : 'info'">{{ entry.type === 'contact' ? '联系' : '系统' }}</el-tag>
              <span style="margin-left:8px;color:#333">{{ entry.content }}</span>
            </el-card>
          </el-timeline-item>
          <el-timeline-item timestamp="当前状态" color="#4CAF50" placement="top">
            <el-card size="small">
              <el-tag :type="STATUS_TYPE[timelineTarget.status]">{{ STATUS_LABEL[timelineTarget.status] || timelineTarget.status }}</el-tag>
              <span style="margin-left:8px;color:#999">登记于 {{ formatDate(timelineTarget.createdAt) }}</span>
            </el-card>
          </el-timeline-item>
        </el-timeline>

        <el-divider>添加跟进记录</el-divider>
        <el-input v-model="newNote" type="textarea" :rows="2" placeholder="输入本次跟进内容..." style="margin-bottom:8px" />
        <el-button type="primary" size="small" @click="addNote">记录联系</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const STATUS_LABEL = {
  new: '新登记', screening: '初筛中', evaluating: '评估中',
  following: '跟进中', signed: '已签约', dropped: '已放弃'
}
const STATUS_TYPE = {
  new: 'info', screening: 'warning', evaluating: 'warning',
  following: '', signed: 'success', dropped: 'danger'
}

const investors = ref([])
const search = ref('')
const filterStatus = ref('')
const showCreateDialog = ref(false)
const showTimelineDialog = ref(false)
const timelineTarget = ref(null)
const timelineEntries = ref([])
const newNote = ref('')
const loading = ref(false)
const page = ref(1)

const form = ref({
  name: '', phone: '', wechat: '', city: '', city_tier: '2',
  area_sqm: 3000, budget: 500, property_address: '', notes: ''
})

const displayedInvestors = computed(() => {
  let list = investors.value
  if (filterStatus.value) list = list.filter(i => i.status === filterStatus.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(i => (i.name||'').toLowerCase().includes(q) || (i.phone||'').includes(q))
  }
  return list.slice((page.value - 1) * 20, page.value * 20)
})

function formatDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('zh-CN')
}

async function loadInvestors() {
  loading.value = true
  try {
    const r = await api.getInvestors({ limit: 500 })
    investors.value = r.data || []
    // 加载每个投资人的报告数
    const reportsR = await api.getReports({ limit: 500 })
    const reports = reportsR.data || []
    investors.value.forEach(inv => {
      const related = reports.filter(r => r.investor_id === inv.id)
      inv.reportCount = related.length
      inv.lastContactAt = inv.lastContactAt || (related.length ? related[0].generatedAt : null)
      // 从备注中提取最新一条跟进
      if (inv.notes) {
        const lines = inv.notes.split('\n').filter(Boolean)
        inv.latestNote = lines[lines.length - 1]
      }
    })
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function openCreateDialog() {
  form.value = { name: '', phone: '', wechat: '', city: '', city_tier: '2', area_sqm: 3000, budget: 500, property_address: '', notes: '' }
  showCreateDialog.value = true
}

async function handleCreate() {
  if (!form.value.name || !form.value.phone) { ElMessage.warning('姓名和电话必填'); return }
  try {
    await api.createInvestor(form.value)
    ElMessage.success('添加成功')
    showCreateDialog.value = false
    loadInvestors()
  } catch (err) { ElMessage.error('添加失败') }
}

async function updateStatus(row) {
  try {
    await api.updateInvestor(row.id, { status: row.status, lastContactAt: new Date().toISOString() })
    ElMessage.success('状态已更新')
  } catch (err) { ElMessage.error('更新失败') }
}

async function handleDelete(id) {
  await ElMessageBox.confirm('确认删除该客户？', '提示', { type: 'warning' })
  try { await api.deleteInvestor(id); ElMessage.success('已删除'); loadInvestors() }
  catch (err) { ElMessage.error('删除失败') }
}

function startEval(row) {
  window.location.href = `/evaluate?investor_id=${row.id}&city=${row.city}&city_tier=${row.city_tier}&area_sqm=${row.area_sqm}&budget=${row.budget}`
}

function openTimelineDialog(row) {
  timelineTarget.value = row
  // 解析备注中的历史记录
  const entries = []
  if (row.notes) {
    const lines = row.notes.split('\n').filter(Boolean)
    lines.forEach((line, i) => {
      // 支持 [YYYY-MM-DD] 格式的时间戳
      const tsMatch = line.match(/^\[(\d{4}-\d{2}-\d{2})\]\s*(.*)/)
      if (tsMatch) {
        entries.push({ time: tsMatch[1], content: tsMatch[2], type: 'contact' })
      } else if (line.trim()) {
        entries.push({ time: '', content: line, type: 'contact' })
      }
    })
  }
  timelineEntries.value = entries.reverse()
  newNote.value = ''
  showTimelineDialog.value = true
}

async function addNote() {
  if (!newNote.value.trim()) return
  const entry = `[${new Date().toISOString().split('T')[0]}] ${newNote.value.trim()}`
  const notes = timelineTarget.value.notes
    ? timelineTarget.value.notes + '\n' + entry
    : entry
  try {
    await api.updateInvestor(timelineTarget.value.id, {
      notes,
      lastContactAt: new Date().toISOString()
    })
    ElMessage.success('跟进记录已添加')
    newNote.value = ''
    loadInvestors()
    // 刷新时间线
    const prev = timelineEntries.value
    timelineEntries.value = [{ time: new Date().toLocaleDateString('zh-CN'), content: newNote.value, type: 'contact' }, ...prev]
  } catch (err) { ElMessage.error('添加失败') }
}

onMounted(loadInvestors)
</script>
