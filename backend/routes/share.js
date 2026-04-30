/**
 * 公开分享路由 - 独立挂载在 /api/share
 * GET /api/share/:token - 公开访问分享报告（无需登录）
 */
import express from 'express';
import { findRecords } from '../services/DataStore.js';
import { validateShareToken } from '../services/ShareService.js';

const router = express.Router();

router.get('/:token', (req, res) => {
  try {
    const { token } = req.params;
    const list = findRecords('reports', r => r.shareToken === token);

    if (!list.length) {
      return res.status(404).json({ success: false, error: '分享链接无效或已失效' });
    }

    const report = list[0];
    const validation = validateShareToken(report, token);
    if (!validation.valid) {
      return res.status(410).json({ success: false, error: validation.reason });
    }

    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
