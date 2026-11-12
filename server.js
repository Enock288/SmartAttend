const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));
app.use(cors());
app.use(express.json({ limit: '32kb' }));
app.use(express.static(__dirname));

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'lecturer')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late')), recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
});

const validRoles = new Set(['student', 'lecturer']);
const validStatuses = new Set(['Present', 'Absent', 'Late']);
const clean = value => typeof value === 'string' ? value.trim() : '';
const errorResponse = (res, status, error) => res.status(status).json({ error });
const publicUser = row => ({ id: row.id, username: row.username, email: row.email, role: row.role });
function query(sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (e, row) => e ? reject(e) : resolve(row))); }
function run(sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, function (e) { e ? reject(e) : resolve(this); })); }

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/register', async (req, res) => {
  const username = clean(req.body?.username), email = clean(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const role = clean(req.body?.role || 'student').toLowerCase();
  if (username.length < 2 || username.length > 80) return errorResponse(res, 400, 'Username must be 2–80 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse(res, 400, 'Enter a valid email address.');
  if (password.length < 8 || password.length > 128) return errorResponse(res, 400, 'Password must be 8–128 characters.');
  if (!validRoles.has(role)) return errorResponse(res, 400, 'Role must be student or lecturer.');
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', [username, email, hash, role]);
    const user = await query('SELECT id, username, email, role FROM users WHERE id = ?', [result.lastID]);
    res.status(201).json({ message: 'User registered successfully.', user: publicUser(user) });
  } catch (e) { if (e.code === 'SQLITE_CONSTRAINT') return errorResponse(res, 409, 'That email is already registered.'); console.error(e); errorResponse(res, 500, 'Could not create the account.'); }
});

app.post('/login', async (req, res) => {
  const email = clean(req.body?.email).toLowerCase(), password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) return errorResponse(res, 400, 'Email and password are required.');
  try { const row = await query('SELECT * FROM users WHERE email = ?', [email]); if (!row || !(await bcrypt.compare(password, row.password))) return errorResponse(res, 401, 'Invalid email or password.'); res.json({ message: 'Login successful.', user: publicUser(row) }); }
  catch (e) { console.error(e); errorResponse(res, 500, 'Could not complete login.'); }
});

app.post('/attendance', async (req, res) => {
  const userId = Number(req.body?.user_id), status = clean(req.body?.status);
  if (!Number.isInteger(userId) || userId < 1) return errorResponse(res, 400, 'user_id must be a positive integer.');
  if (!validStatuses.has(status)) return errorResponse(res, 400, 'Status must be Present, Absent, or Late.');
  try { if (!await query('SELECT id FROM users WHERE id = ?', [userId])) return errorResponse(res, 404, 'User not found.'); const result = await run('INSERT INTO attendance (user_id, status) VALUES (?, ?)', [userId, status]); res.status(201).json({ message: 'Attendance recorded.', attendanceId: result.lastID, user_id: userId, status }); }
  catch (e) { console.error(e); errorResponse(res, 500, 'Could not record attendance.'); }
});

app.use((e, _req, res, _next) => e instanceof SyntaxError ? errorResponse(res, 400, 'Request body must be valid JSON.') : errorResponse(res, 500, 'Unexpected server error.'));
app.listen(PORT, () => console.log(`SmartAttend API running at http://localhost:${PORT}`));
