/**
 * 简易JSON文件数据持久化层
 * 路径: ./data/{collection}.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readCollection(name) {
  ensureDataDir();
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return []; }
}

export function writeCollection(name, data) {
  ensureDataDir();
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export function insertRecord(name, record) {
  const col = readCollection(name);
  const withId = { ...record, id: record.id || `id_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, createdAt: record.createdAt || new Date().toISOString() };
  col.push(withId);
  writeCollection(name, col);
  return withId;
}

export function findRecords(name, predicate = () => true) {
  return readCollection(name).filter(predicate);
}

export function updateRecord(name, id, updates) {
  const col = readCollection(name);
  const idx = col.findIndex(r => r.id === id);
  if (idx === -1) return null;
  col[idx] = { ...col[idx], ...updates, updatedAt: new Date().toISOString() };
  writeCollection(name, col);
  return col[idx];
}

export function deleteRecord(name, id) {
  const col = readCollection(name);
  const filtered = col.filter(r => r.id !== id);
  if (filtered.length === col.length) return false;
  writeCollection(name, filtered);
  return true;
}
