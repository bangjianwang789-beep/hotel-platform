import express from 'express';
import { insertRecord, findRecords, updateRecord, deleteRecord } from '../services/DataStore.js';

const router = express.Router();

// GET /api/investors - 列表
router.get('/', (req, res) => {
  try {
    const { city, status, page = 1, limit = 20 } = req.query;
    let list = findRecords('investors');
    if (city) list = list.filter(i => i.city === city);
    if (status) list = list.filter(i => i.status === status);
    const total = list.length;
    const paged = list.slice((page - 1) * limit, page * limit);
    res.json({ success: true, total, page: +page, data: paged });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/investors - 新建
router.post('/', (req, res) => {
  try {
    const { name, phone, city, city_tier, budget, area_sqm, property_address, status = 'new', notes } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, error: 'name和phone必填' });
    const record = insertRecord('investors', { name, phone, city, city_tier, budget, area_sqm, property_address, status, notes });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/investors/:id
router.get('/:id', (req, res) => {
  try {
    const list = findRecords('investors', r => r.id === req.params.id);
    if (!list.length) return res.status(404).json({ success: false, error: '未找到' });
    res.json({ success: true, data: list[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/investors/:id
router.put('/:id', (req, res) => {
  try {
    const updated = updateRecord('investors', req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: '未找到' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/investors/:id
router.delete('/:id', (req, res) => {
  try {
    const ok = deleteRecord('investors', req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: '未找到' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
