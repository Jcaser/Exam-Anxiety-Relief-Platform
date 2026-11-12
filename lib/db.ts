/**
 * 清绪之屿 · 本地数据库（SQLite，node:sqlite）
 * 用户 / 会话 / 每用户日记密码 / 伙伴设定 / 日记数据，全部服务端存储与鉴权。
 */
import { DatabaseSync } from "node:sqlite";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// dev 热重载时复用同一个连接，避免多实例写锁
const g = globalThis as unknown as { __islandDb?: DatabaseSync };
if (!g.__islandDb) g.__islandDb = new DatabaseSync(path.join(DATA_DIR, "island.db"));
export const db = g.__islandDb;

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pw_hash TEXT NOT NULL,
    pw_salt TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    diary_pw_hash TEXT,
    diary_pw_salt TEXT,
    companion TEXT
  );
  CREATE TABLE IF NOT EXISTS diary_pages (
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    at INTEGER NOT NULL,
    mood TEXT,
    card TEXT,
    PRIMARY KEY (user_id, date)
  );
`);

/* ── 密码哈希（scrypt + 随机盐） ── */
export function hashPassword(pw: string, salt?: string) {
  const s = salt || randomBytes(16).toString("hex");
  const h = scryptSync(pw, s, 64).toString("hex");
  return { hash: h, salt: s };
}

export function verifyPassword(pw: string, salt: string, hash: string) {
  const h = scryptSync(pw, salt, 64);
  const stored = Buffer.from(hash, "hex");
  return h.length === stored.length && timingSafeEqual(h, stored);
}

/* ── 会话 ── */
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 天滑动过期

export function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  db.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
  ).run(token, userId, Date.now() + SESSION_TTL);
  return { token, maxAge: SESSION_TTL / 1000 };
}

export function destroySession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export type User = { id: number; username: string; created_at: number };

export function userByToken(token: string | undefined): User | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as any;
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    destroySession(token);
    return null;
  }
  return { id: row.id, username: row.username, created_at: row.created_at };
}

/** 服务端鉴权：从请求 cookie 取当前用户（权限隔离的核心） */
export function userFromRequest(req: Request): User | null {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)island_session=([^;]+)/);
  return userByToken(m ? decodeURIComponent(m[1]) : undefined);
}

export function sessionCookie(token: string, maxAge: number) {
  return `island_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAge)}`;
}

export function clearCookie() {
  return "island_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

/* ── 用户设置（日记密码 / 伙伴） ── */
export function getSettings(userId: number) {
  const row = db
    .prepare("SELECT * FROM user_settings WHERE user_id = ?")
    .get(userId) as any;
  return row || { user_id: userId, diary_pw_hash: null, diary_pw_salt: null, companion: null };
}

export function saveDiaryPassword(userId: number, pw: string) {
  const { hash, salt } = hashPassword(pw);
  getSettings(userId);
  db.prepare(
    `INSERT INTO user_settings (user_id, diary_pw_hash, diary_pw_salt) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET diary_pw_hash = excluded.diary_pw_hash, diary_pw_salt = excluded.diary_pw_salt`
  ).run(userId, hash, salt);
}

export function saveCompanion(userId: number, companion: unknown) {
  getSettings(userId);
  db.prepare(
    `INSERT INTO user_settings (user_id, companion) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET companion = excluded.companion`
  ).run(userId, JSON.stringify(companion));
}

export function getCompanion(userId: number): unknown | null {
  const s = getSettings(userId);
  if (!s?.companion) return null;
  try {
    return JSON.parse(s.companion);
  } catch {
    return null;
  }
}

/* ── 日记数据（每用户隔离） ── */
export type DiaryRow = { date: string; text: string; at: number; mood: string | null; card: string | null };

export function listDiary(userId: number): Record<string, DiaryRow> {
  const rows = db
    .prepare("SELECT date, text, at, mood, card FROM diary_pages WHERE user_id = ?")
    .all(userId) as any[];
  const out: Record<string, DiaryRow> = {};
  for (const r of rows) {
    out[r.date] = { date: r.date, text: r.text, at: r.at, mood: r.mood, card: r.card };
  }
  return out;
}

export function upsertDiary(
  userId: number,
  date: string,
  patch: { text?: string; at?: number; mood?: string | null; card?: string | null }
) {
  db.prepare(
    `INSERT INTO diary_pages (user_id, date, text, at, mood, card)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
       text = COALESCE(?, text),
       at = COALESCE(?, at),
       mood = ?,
       card = ?`
  ).run(
    userId,
    date,
    patch.text ?? "",
    patch.at ?? Date.now(),
    patch.mood ?? null,
    patch.card ?? null,
    patch.text ?? null,
    patch.at ?? null,
    patch.mood === undefined ? null : patch.mood,
    patch.card === undefined ? null : patch.card
  );
}

/* ── 分享小屋（社区感受分享，所有用户可见） ── */
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    mood TEXT,
    anonymous INTEGER NOT NULL DEFAULT 0,
    resonates INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS post_resonates (
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, user_id)
  );
`);

export type PostRow = {
  id: number;
  user_id: number;
  text: string;
  mood: string | null;
  anonymous: number;
  resonates: number;
  created_at: number;
  username: string | null;
};

export function createPost(userId: number, text: string, mood: string | null, anonymous: boolean) {
  const info = db
    .prepare("INSERT INTO posts (user_id, text, mood, anonymous, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(userId, text.slice(0, 800), mood, anonymous ? 1 : 0, Date.now());
  return Number(info.lastInsertRowid);
}

export function listPosts(opts: { mood?: string | null; mine?: number | null } = {}) {
  let sql = `SELECT p.*, CASE WHEN p.anonymous=1 THEN NULL ELSE u.username END AS username
             FROM posts p JOIN users u ON u.id = p.user_id WHERE 1=1`;
  const args: any[] = [];
  if (opts.mood) {
    sql += " AND p.mood = ?";
    args.push(opts.mood);
  }
  if (opts.mine) {
    sql += " AND p.user_id = ?";
    args.push(opts.mine);
  }
  sql += " ORDER BY p.created_at DESC LIMIT 200";
  return db.prepare(sql).all(...args) as PostRow[];
}

export function resonatePost(postId: number, userId: number) {
  const exists = db
    .prepare("SELECT 1 FROM post_resonates WHERE post_id = ? AND user_id = ?")
    .get(postId, userId);
  if (exists) {
    db.prepare("DELETE FROM post_resonates WHERE post_id = ? AND user_id = ?").run(postId, userId);
    db.prepare("UPDATE posts SET resonates = resonates - 1 WHERE id = ?").run(postId);
  } else {
    db.prepare("INSERT INTO post_resonates (post_id, user_id) VALUES (?, ?)").run(postId, userId);
    db.prepare("UPDATE posts SET resonates = resonates + 1 WHERE id = ?").run(postId);
  }
  const r = db.prepare("SELECT resonates FROM posts WHERE id = ?").get(postId) as any;
  return r?.resonates ?? 0;
}

export function userResonated(postId: number, userId: number) {
  return !!db
    .prepare("SELECT 1 FROM post_resonates WHERE post_id = ? AND user_id = ?")
    .get(postId, userId);
}
