/**
 * 用户认证路由
 * POST /api/auth/register - 注册
 * POST /api/auth/login    - 登录
 * GET  /api/auth/me       - 当前用户信息
 */
import express from 'express';
import { insertRecord, findRecords } from '../services/DataStore.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { username, password, phone, email, role = 'user' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码必填' });
    }

    // 检查是否已存在
    const existing = findRecords('users', u => u.username === username);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: '用户名已存在' });
    }

    // 简单哈希（生产环境建议用bcrypt）
    const hashedPassword = Buffer.from(password).toString('base64');

    const user = insertRecord('users', {
      username,
      password: hashedPassword,
      phone: phone || '',
      email: email || '',
      role, // 'admin' | 'user'
      createdAt: new Date().toISOString()
    });

    const token = signToken({ id: user.id, username, role });

    res.json({
      success: true,
      data: {
        id: user.id,
        username,
        role,
        token
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码必填' });
    }

    const hashedPassword = Buffer.from(password).toString('base64');
    const users = findRecords('users', u => u.username === username && u.password === hashedPassword);

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    const user = users[0];
    const token = signToken({ id: user.id, username: user.username, role: user.role });

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        token
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me - 获取当前登录用户
router.get('/me', requireAuth, (req, res) => {
  try {
    const users = findRecords('users', u => u.id === req.user.id);
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    const user = users[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
