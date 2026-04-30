import express from 'express';
import { insertRecord, findRecords } from '../services/DataStore.js';
import evaluationEngine from '../services/EvaluationEngine.js';
import { generateReportPdf } from '../services/PdfReportService.js';

const router = express.Router();

// GET /api/reports - 历史报告列表
router.get('/', (req, res) => {
  try {
    const { investor_id, page = 1, limit = 20 } = req.query;
    let list = findRecords('reports');
    if (investor_id) list = list.filter(r => r.investor_id === investor_id);
    list = list.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    const total = list.length;
    res.json({ success: true, total, page: +page, data: list.slice((page - 1) * limit, page * limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reports/generate - 生成评估报告（持久化）
router.post('/generate', (req, res) => {
  try {
    const { property, investor_id, report_type = 'comprehensive' } = req.body;
    if (!property) return res.status(400).json({ error: 'property required' });

    // 加载品牌数据
    evaluationEngine.loadBrands();

    // 执行评估
    const evaluation = evaluationEngine.evaluate(property);
    const brandMatches = evaluationEngine.matchBrands(property, 5);
    const financials = evaluation.financials;

    const report = {
      investor_id: investor_id || null,
      report_type,
      generatedAt: new Date().toISOString(),
      property: {
        name: property.name || '未命名物业',
        city: property.city,
        city_tier: property.city_tier,
        location_type: property.location_type,
        rent_per_sqm: property.rent_per_sqm,
        area_sqm: property.area_sqm,
        room_count_estimate: property.room_count_estimate,
        renovation_budget_per_room: property.renovation_budget_per_room,
        operating_cost_per_room_day: property.operating_cost_per_room_day,
        competition_count_3km: property.competition_count_3km,
        guest_profile: property.guest_profile,
        investor_capital: property.investor_capital,
        risk_appetite: property.risk_appetite,
      },
      evaluation: {
        overallScore: evaluation.overallScore,
        rating: evaluation.rating,
        dimensions: evaluation.dimensions,
        riskSignals: evaluation.riskSignals,
      },
      brandMatches: brandMatches.topMatches,
      financials,
    };

    const saved = insertRecord('reports', report);
    res.json({ success: true, data: saved });
  } catch (err) {
    console.error('[ReportGenerate]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/:id
router.get('/:id', (req, res) => {
  try {
    const list = findRecords('reports', r => r.id === req.params.id);
    if (!list.length) return res.status(404).json({ success: false, error: '报告未找到' });
    res.json({ success: true, data: list[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/:id/pdf - 下载PDF版本
router.get('/:id/pdf', async (req, res) => {
  try {
    const list = findRecords('reports', r => r.id === req.params.id);
    if (!list.length) return res.status(404).json({ success: false, error: '报告未找到' });

    const report = list[0];
    const filePath = await generateReportPdf(report);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.property?.name || 'report'}_评估报告.pdf"`);
    res.sendFile(filePath);
  } catch (err) {
    console.error('[ReportPDF]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
