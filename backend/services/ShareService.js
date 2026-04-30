/**
 * 报告分享服务
 * 生成分享Token，支持限时/限次访问
 */
import { v4 as uuidv4 } from 'uuid';

// 分享链接默认有效期：30天
const DEFAULT_EXPIRY_DAYS = 30;

function generateShareToken() {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

/**
 * 为报告生成分享链接
 * @param {Object} report - 完整报告数据
 * @param {Object} options - { expiresDays: number }
 * @returns {{ shareToken: string, shareUrl: string, expiresAt: string }}
 */
function createShareLink(report, options = {}) {
  const shareToken = generateShareToken();
  const expiresDays = options.expiresDays || DEFAULT_EXPIRY_DAYS;
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

  return {
    shareToken,
    shareUrl: `/share/${shareToken}`,
    expiresAt,
  };
}

/**
 * 验证分享Token是否有效
 * @param {Object} report - 报告数据
 * @param {string} token - 待验证的分享Token
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateShareToken(report, token) {
  if (!report.shareToken || report.shareToken !== token) {
    return { valid: false, reason: '链接无效或已失效' };
  }

  if (report.shareExpiresAt) {
    const expiresAt = new Date(report.shareExpiresAt);
    if (Date.now() > expiresAt.getTime()) {
      return { valid: false, reason: '链接已过期' };
    }
  }

  return { valid: true };
}

export { generateShareToken, createShareLink, validateShareToken };
