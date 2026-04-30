/**
 * PDF报告生成服务
 * 使用pdfkit生成专业的酒店投资评估报告
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../../reports');

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * 生成PDF报告
 * @param {Object} report - 报告数据（来自 /api/reports/:id）
 * @returns {Promise<string>} PDF文件路径
 */
function generateReportPdf(report) {
  return new Promise((resolve, reject) => {
    ensureOutputDir();

    const fileName = `report_${report.id}_${Date.now()}.pdf`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // ── 封面 ──────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8f9fa');

    // 顶部装饰线
    doc.fillColor('#e94560')
       .rect(0, 0, doc.page.width, 6)
       .fill();

    // 主标题
    doc.fillColor('#1a1a2e')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('酒店投资评估报告', 50, 100, { align: 'center' });

    // 副标题
    doc.fillColor('#666')
       .fontSize(14)
       .font('Helvetica')
       .text('HOTEL INVESTMENT EVALUATION REPORT', 50, 145, { align: 'center' });

    // 分隔线
    doc.strokeColor('#e94560')
       .lineWidth(2)
       .moveTo(150, 170)
       .lineTo(450, 170)
       .stroke();

    // 物业名称
    doc.fillColor('#333')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text(report.property?.name || '未命名物业', 50, 200, { align: 'center' });

    // 城市
    doc.fillColor('#666')
       .fontSize(12)
       .font('Helvetica')
       .text(`${report.property?.city || ''} · ${report.property?.city_tier || ''}线城市`, 50, 230, { align: 'center' });

    // 评分大字
    const score = report.evaluation?.overallScore || 0;
    const rating = report.evaluation?.rating || {};
    doc.fillColor(rating.color || '#e94560')
       .fontSize(72)
       .font('Helvetica-Bold')
       .text(score.toString(), 50, 270, { align: 'center' });

    doc.fillColor('#333')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text(`综合评级: ${rating.grade || '-'} ${rating.label || ''}`, 50, 355, { align: 'center' });

    // 报告信息
    doc.fillColor('#999')
       .fontSize(10)
       .text(`报告编号: ${report.id}`, 50, 420, { align: 'center' })
       .text(`生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}`, 50, 435, { align: 'center' })
       .text('酒店投资品牌匹配 SaaS 系统', 50, 450, { align: 'center' });

    // ── 第二页：物业概况 ───────────────────────────────────
    doc.addPage();

    // 顶部色条
    doc.fillColor('#e94560')
       .rect(0, 0, doc.page.width, 4)
       .fill();

    pageHeader(doc, '一、物业基本信息');

    const property = report.property || {};
    const dims = report.evaluation?.dimensions || {};

    const propData = [
      ['城市等级', `${property.city_tier || '-'}线城市`],
      ['物业面积', `${property.area_sqm || '-'} ㎡`],
      ['预估房间数', `${property.room_count_estimate || '-'} 间`],
      ['租金水平', `${property.rent_per_sqm || '-'} 元/㎡/月`],
      ['改造成本', `${((property.renovation_budget_per_room) || 0) / 10000} 万元/间`],
      ['日运营成本', `${property.operating_cost_per_room_day || '-'} 元/间/天`],
      ['竞争态势', `${property.competition_count_3km || '-'} 家/3km`],
      ['客群类型', property.guest_profile || '-'],
    ];

    drawTable(doc, [
      ['维度', '数值', '说明'],
      ...propData.map((r, i) => {
        const key = Object.keys(dims)[i];
        return [r[0], r[1], dims[key]?.matchedTier || ''];
      })
    ], { colWidths: [120, 150, 200] });

    // ── 第三页：评分雷达 ───────────────────────────────────
    doc.addPage();
    doc.fillColor('#e94560')
       .rect(0, 0, doc.page.width, 4)
       .fill();

    pageHeader(doc, '二、10维评估结果');

    const dimOrder = ['D1_city_tier', 'D2_rent_burden', 'D3_property_size', 'D4_renovation',
      'D5_operating', 'D6_competition', 'D7_guest_profile'];

    let y = 80;
    for (const key of dimOrder) {
      const dim = dims[key];
      if (!dim) continue;

      // 维度名称
      doc.fillColor('#333')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(dim.label, 50, y);

      // 条形背景
      doc.fillColor('#e0e0e0')
         .rect(180, y + 2, 280, 16)
         .fill();

      // 条形填充
      const barWidth = (dim.score / 100) * 280;
      const barColor = dim.score >= 70 ? '#4CAF50' : dim.score >= 50 ? '#FF9800' : '#F44336';
      doc.fillColor(barColor)
         .rect(180, y + 2, barWidth, 16)
         .fill();

      // 分数
      doc.fillColor('#333')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(`${dim.score}分`, 470, y);

      // 权重
      doc.fillColor('#999')
         .fontSize(9)
         .font('Helvetica')
         .text(`权重${dim.weight}`, 510, y);

      y += 28;
    }

    // 风险信号
    if (report.evaluation?.riskSignals?.length) {
      y += 10;
      doc.fillColor('#333')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('风险预警', 50, y);
      y += 20;

      for (const risk of report.evaluation.riskSignals) {
        const typeColor = risk.level === 'HIGH' ? '#F44336' : '#FF9800';
        doc.fillColor(typeColor)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(`${risk.level === 'HIGH' ? '● 高风险' : '● 中风险'}`, 50, y);
        doc.fillColor('#555')
           .font('Helvetica')
           .text(risk.signal, 130, y, { width: 400 });
        y += 22;
      }
    }

    // ── 第四页：品牌推荐 ───────────────────────────────────
    doc.addPage();
    doc.fillColor('#e94560')
       .rect(0, 0, doc.page.width, 4)
       .fill();

    pageHeader(doc, '三、品牌匹配推荐');

    const brands = report.brandMatches || [];
    let brandY = 80;

    for (let i = 0; i < brands.length; i++) {
      const brand = brands[i];
      const isTop = i === 0;

      // 卡片背景
      doc.fillColor(isTop ? '#fff5f7' : '#fafafa')
         .rect(50, brandY, 500, 90)
         .fill();

      if (isTop) {
        doc.fillColor('#e94560')
           .rect(50, brandY, 4, 90)
           .fill();
      }

      // 排名
      doc.fillColor(isTop ? '#e94560' : '#999')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text(`#${i + 1}`, 60, brandY + 10);

      // 品牌名
      doc.fillColor('#1a1a2e')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(brand.brand_name, 100, brandY + 12);

      // 档次标签
      doc.fillColor('#e94560')
         .fontSize(9)
         .text(brand.tier?.toUpperCase() || '', 100, brandY + 32);

      // 匹配分
      doc.fillColor('#4CAF50')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text(`${brand.match_score}分`, 400, brandY + 10);

      doc.fillColor('#999')
         .fontSize(9)
         .text('匹配度', 400, brandY + 30);

      // 详细信息
      const infoY = brandY + 48;
      doc.fillColor('#666')
         .fontSize(9)
         .font('Helvetica')
         .text(`管理费: ${brand.mgmt_fee_pct || '-'}%  |  加盟费: ${((brand.franchise_fee_yuan) || 0 / 10000).toFixed(0)}万  |  最低房间: ${brand.min_rooms || '-'}间`, 100, infoY);

      brandY += 100;
    }

    // ── 第五页：财务测算 ───────────────────────────────────
    doc.addPage();
    doc.fillColor('#e94560')
       .rect(0, 0, doc.page.width, 4)
       .fill();

    pageHeader(doc, '四、财务测算');

    const fin = report.financials || {};

    const finData = [
      ['指标', '数值'],
      ['推荐品牌', fin.recommended_brand || '-'],
      ['品牌档次', fin.brand_tier || '-'],
      ['预估ADR', `${fin.estimated_adr_yuan || '-'} 元/间夜`],
      ['假设入住率', `${((fin.assume_occupy_rate) * 100).toFixed(0)}%`],
      ['年营业收入', `${((fin.annual_revenue_yuan) || 0) / 10000} 万元`],
      ['年运营成本', `${((fin.annual_op_cost_yuan) || 0) / 10000} 万元`],
      ['年管理费', `${((fin.annual_mgmt_fee_yuan) || 0) / 10000} 万元`],
      ['年租金支出', `${((fin.annual_rent_yuan) || 0) / 10000} 万元`],
      ['年度GOP', `${((fin.annual_gop_yuan) || 0) / 10000} 万元 (GOP率: ${fin.gop_margin_pct || '-'}%)`],
      ['年净利润', `${((fin.annual_net_profit_yuan) || 0) / 10000} 万元 (净利率: ${fin.net_margin_pct || '-'}%)`],
      ['总投资额', `${((fin.total_invest_yuan) || 0) / 10000} 万元`],
      ['回本周期', fin.payback_years ? `${fin.payback_years} 年` : '-'],
      ['盈亏平衡入住率', fin.breakeven_occupy_rate ? `${fin.breakeven_occupy_rate}%` : '-'],
    ];

    drawTable(doc, finData, { colWidths: [200, 270], headerColor: '#e94560' });

    // 财务结论
    if (fin.financial_verdict) {
      const isProfit = fin.financial_verdict.includes('年净利润');
      doc.moveDown(2);
      doc.fillColor(isProfit ? '#4CAF50' : '#FF9800')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(fin.financial_verdict, 50);
    }

    // ── 页脚 ──────────────────────────────────────────────
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fillColor('#ccc')
         .fontSize(8)
         .text(`第 ${i + 1} / ${pageCount} 页`, 50, doc.page.height - 40, { align: 'center' })
         .text('酒店投资品牌匹配 SaaS · 报告仅供投资参考，不构成投资建议', 50, doc.page.height - 28, { align: 'center' });
    }

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

// ─── 工具函数 ─────────────────────────────────────────────

function pageHeader(doc, title) {
  doc.fillColor('#1a1a2e')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text(title, 50, 30);
  doc.moveDown(1);
}

function drawTable(doc, rows, opts = {}) {
  const { colWidths = [], headerColor = '#f5f5f5', startY = 70 } = opts;
  const rowHeight = 24;
  const colCount = colWidths.length;

  let y = startY;

  rows.forEach((row, rowIndex) => {
    const isHeader = rowIndex === 0;

    // 背景
    doc.fillColor(isHeader ? headerColor : (rowIndex % 2 === 0 ? '#fff' : '#fafafa'))
       .rect(50, y, colWidths.reduce((a, b) => a + b, 0), rowHeight)
       .fill();

    // 边框线
    doc.strokeColor('#ddd')
       .lineWidth(0.5)
       .rect(50, y, colWidths.reduce((a, b) => a + b, 0), rowHeight)
       .stroke();

    let x = 55;
    row.forEach((cell, colIndex) => {
      doc.fillColor(isHeader ? '#333' : '#555')
         .fontSize(isHeader ? 10 : 9)
         .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
         .text(String(cell), x, y + 7, { width: colWidths[colIndex] - 10, continued: colIndex < colCount - 1 });
      x += colWidths[colIndex];
    });

    y += rowHeight;
  });

  return y;
}

export { generateReportPdf };
