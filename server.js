const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const databasePath = process.env.DB_PATH || path.join(__dirname, 'database.db');
const db = new sqlite3.Database(databasePath);
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean);
const isAllowedOrigin = origin => !origin || !allowedOrigins.length || allowedOrigins.includes(origin) || /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/i.test(origin);
app.use(cors(allowedOrigins.length ? { origin: (origin, callback) => callback(null, isAllowedOrigin(origin)) } : undefined));
app.use(express.json({ limit: '32kb' }));
app.use(express.static(__dirname));

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'lecturer')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late')), recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY AUTOINCREMENT, course_code TEXT NOT NULL UNIQUE COLLATE NOCASE, course_name TEXT NOT NULL, lecturer_id INTEGER NOT NULL, FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS attendance_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL, token TEXT NOT NULL UNIQUE, FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE)`);
  db.run('ALTER TABLE attendance ADD COLUMN session_id INTEGER', () => {});
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_user_session ON attendance(user_id, session_id) WHERE session_id IS NOT NULL');
});

const validRoles = new Set(['student', 'lecturer']);
const validStatuses = new Set(['Present', 'Absent', 'Late']);
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();
const adminTokens = new Set();
const clean = value => typeof value === 'string' ? value.trim() : '';
const qrToken = value => { try { return new URL(value, 'http://smartattend.local').searchParams.get('session') || value; } catch (_) { return value; } };
const errorResponse = (res, status, error) => res.status(status).json({ error });
const publicUser = row => ({ id: row.id, username: row.username, email: row.email, role: row.role });
function query(sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (e, row) => e ? reject(e) : resolve(row))); }
function run(sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, function (e) { e ? reject(e) : resolve(this); })); }
function all(sql, params = []) { return new Promise((resolve, reject) => db.all(sql, params, (e, rows) => e ? reject(e) : resolve(rows))); }

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

app.post('/admin/register', (_req, res) => errorResponse(res, 403, 'Administrator registration is disabled.'));

app.post('/admin/login', (req, res) => {
  const email = clean(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) return errorResponse(res, 401, 'Invalid administrator email or password.');
  const token = require('crypto').randomUUID();
  adminTokens.add(token);
  res.json({ message: 'Administrator login successful.', token, user: { id: 0, username: 'Administrator', email: ADMIN_EMAIL, admin_id: 'SYSTEM-ADMIN' } });
});

app.get('/admin/overview', async (req, res) => {
  const token = (req.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!adminTokens.has(token)) return errorResponse(res, 401, 'Administrator authentication is required.');
  try {
    const users = await all('SELECT id, username, email, role, created_at FROM users ORDER BY id DESC');
    const attendance = await all(`SELECT a.id, a.status, a.recorded_at, u.username, c.course_code,
      s.date, s.time, 1 AS location_verified
      FROM attendance a JOIN users u ON u.id = a.user_id
      LEFT JOIN attendance_sessions s ON s.id = a.session_id
      LEFT JOIN courses c ON c.id = s.course_id
      ORDER BY a.id DESC LIMIT 50`);
    res.json({ users, activity: attendance, students: users.filter(user => user.role === 'student').length, lecturers: users.filter(user => user.role === 'lecturer').length, courses: (await query('SELECT COUNT(*) AS count FROM courses')).count, attendance: (await query('SELECT COUNT(*) AS count FROM attendance')).count });
  } catch (e) { console.error(e); errorResponse(res, 500, 'Could not load administrator data.'); }
});

app.post('/attendance', async (req, res) => {
  return errorResponse(res, 403, 'Attendance can only be recorded by scanning a valid session QR code.');
  /* Legacy manual attendance requests are intentionally disabled. */
  const userId = Number(req.body?.user_id), status = clean(req.body?.status);
  if (!Number.isInteger(userId) || userId < 1) return errorResponse(res, 400, 'user_id must be a positive integer.');
  if (!validStatuses.has(status)) return errorResponse(res, 400, 'Status must be Present, Absent, or Late.');
  try { if (!await query('SELECT id FROM users WHERE id = ?', [userId])) return errorResponse(res, 404, 'User not found.'); const result = await run('INSERT INTO attendance (user_id, status) VALUES (?, ?)', [userId, status]); res.status(201).json({ message: 'Attendance recorded.', attendanceId: result.lastID, user_id: userId, status }); }
  catch (e) { console.error(e); errorResponse(res, 500, 'Could not record attendance.'); }
});

app.post('/attendance/scan', async (req, res) => {
  const userId = Number(req.body?.user_id);
  const token = qrToken(clean(req.body?.token));
  if (!Number.isInteger(userId) || userId < 1 || !token) return errorResponse(res, 400, 'A valid QR token and student account are required.');
  try {
    const student = await query('SELECT id, username, email FROM users WHERE id = ? AND role = \'student\'', [userId]);
    if (!student) return errorResponse(res, 403, 'Only registered students can record attendance.');
    const session = await query(`SELECT s.id, s.course_id, s.date, s.time, c.course_code, c.course_name
      FROM attendance_sessions s JOIN courses c ON c.id = s.course_id WHERE s.token = ?`, [token]);
    if (!session) return errorResponse(res, 404, 'Invalid or expired QR code.');
    const duplicate = await query('SELECT id FROM attendance WHERE user_id = ? AND session_id = ?', [userId, session.id]);
    if (duplicate) return errorResponse(res, 409, 'You have already recorded attendance for this session.');
    const result = await run('INSERT INTO attendance (user_id, status, session_id) VALUES (?, ?, ?)', [userId, 'Present', session.id]);
    const record = await query(`SELECT a.id, a.status, a.recorded_at, s.date, s.time, c.course_code, c.course_name
      FROM attendance a JOIN attendance_sessions s ON s.id = a.session_id JOIN courses c ON c.id = s.course_id WHERE a.id = ?`, [result.lastID]);
    res.status(201).json({ message: 'Attendance recorded.', attendanceId: result.lastID, session_id: session.id, recorded_at: record.recorded_at, record });
  } catch (e) { if (e.code === 'SQLITE_CONSTRAINT') return errorResponse(res, 409, 'You have already recorded attendance for this session.'); console.error(e); errorResponse(res, 500, 'Could not record attendance.'); }
});

app.get('/student/attendance', async (req, res) => {
  const userId = Number(req.query.user_id);
  if (!Number.isInteger(userId) || userId < 1) return errorResponse(res, 400, 'user_id is required.');
  try {
    const records = await all(`SELECT a.id, a.status, a.recorded_at, s.date, s.time, c.course_code, c.course_name
      FROM attendance a JOIN attendance_sessions s ON s.id = a.session_id JOIN courses c ON c.id = s.course_id
      WHERE a.user_id = ? ORDER BY a.recorded_at DESC`, [userId]);
    res.json({ records });
  } catch (e) { console.error(e); errorResponse(res, 500, 'Could not load attendance records.'); }
});

app.get('/lecturer/overview', async (req, res) => {
  const lecturerId = Number(req.query.lecturer_id);
  if (!Number.isInteger(lecturerId) || lecturerId < 1) return errorResponse(res, 400, 'lecturer_id is required.');
  try {
    const courses = await all('SELECT id, course_code, course_name, lecturer_id FROM courses WHERE lecturer_id = ? ORDER BY course_code', [lecturerId]);
    const origin = req.get('Origin') || `http://localhost:${PORT}`;
    const sessions = (await all(`SELECT s.id, s.course_id, c.course_code, c.course_name, s.date, s.time, s.token,
      (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id) AS scan_count
      FROM attendance_sessions s JOIN courses c ON c.id = s.course_id
      WHERE c.lecturer_id = ? ORDER BY s.id DESC`, [lecturerId])).map(session => ({ ...session, token: new URL(`/student dashboard.html?session=${encodeURIComponent(session.token)}`, origin).toString() }));
    const attendance = await all(`SELECT a.id, a.status, a.recorded_at, u.username, c.course_code, c.course_name, s.date, s.time
      FROM attendance a JOIN users u ON u.id = a.user_id
      LEFT JOIN attendance_sessions s ON s.id = a.session_id
      LEFT JOIN courses c ON c.id = s.course_id
      WHERE c.lecturer_id = ? ORDER BY a.id DESC`, [lecturerId]);
    res.json({ courses, sessions, attendance });
  } catch (e) { console.error(e); errorResponse(res, 500, 'Could not load lecturer data.'); }
});

app.post('/lecturer/create-course', async (req, res) => {
  const lecturerId = Number(req.body?.lecturer_id);
  const courseCode = clean(req.body?.course_code).toUpperCase();
  const courseName = clean(req.body?.course_name);
  if (!Number.isInteger(lecturerId) || lecturerId < 1 || !courseCode || !courseName) return errorResponse(res, 400, 'lecturer_id, course_code, and course_name are required.');
  try {
    const lecturer = await query('SELECT id FROM users WHERE id = ? AND role = \'lecturer\'', [lecturerId]);
    if (!lecturer) return errorResponse(res, 403, 'Only lecturers can create courses.');
    const result = await run('INSERT INTO courses (course_code, course_name, lecturer_id) VALUES (?, ?, ?)', [courseCode, courseName, lecturerId]);
    res.status(201).json({ message: 'Course created.', course: { id: result.lastID, course_code: courseCode, course_name: courseName, lecturer_id: lecturerId } });
  } catch (e) { if (e.code === 'SQLITE_CONSTRAINT') return errorResponse(res, 409, 'Course code already exists.'); console.error(e); errorResponse(res, 500, 'Could not create course.'); }
});

app.post('/lecturer/create-session', async (req, res) => {
  const lecturerId = Number(req.body?.lecturer_id);
  const courseId = Number(req.body?.course_id);
  const date = clean(req.body?.date), time = clean(req.body?.time);
  if (!Number.isInteger(lecturerId) || !Number.isInteger(courseId) || !date || !time) return errorResponse(res, 400, 'lecturer_id, course_id, date, and time are required.');
  try {
    const course = await query('SELECT id, course_name FROM courses WHERE id = ? AND lecturer_id = ?', [courseId, lecturerId]);
    if (!course) return errorResponse(res, 404, 'Course not found for this lecturer.');
    const token = Buffer.from(JSON.stringify({ course_id: courseId, date, time, nonce: `${Date.now()}-${Math.random()}` })).toString('base64url');
    const result = await run('INSERT INTO attendance_sessions (course_id, date, time, token) VALUES (?, ?, ?, ?)', [courseId, date, time, token]);
    const origin = req.get('Origin') || `http://localhost:${PORT}`;
    res.status(201).json({ message: 'Attendance session created.', session: { id: result.lastID, course_id: courseId, course_name: course.course_name, date, time, token: new URL(`/student dashboard.html?session=${encodeURIComponent(token)}`, origin).toString() } });
  } catch (e) { console.error(e); errorResponse(res, 500, 'Could not create attendance session.'); }
});

app.use((e, _req, res, _next) => e instanceof SyntaxError ? errorResponse(res, 400, 'Request body must be valid JSON.') : errorResponse(res, 500, 'Unexpected server error.'));
if (require.main === module) app.listen(PORT, () => console.log(`SmartAttend API running on port ${PORT}`));

module.exports = app;
