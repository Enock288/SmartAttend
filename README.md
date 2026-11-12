# SmartAttend full-stack setup

## Node/Express API (optional)

1. Install dependencies: `npm install`.
2. Start the API and static frontend: `npm start`.
3. Open `http://localhost:3000/login.html`.

The API creates `database.db` automatically. Its active endpoints are:

```js
await fetch('http://localhost:3000/register', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'Ada Lovelace', email: 'ada@example.com', password: 'correct-horse-battery', role: 'student' })
});

const login = await fetch('http://localhost:3000/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'ada@example.com', password: 'correct-horse-battery' })
});
const { user } = await login.json();
localStorage.setItem('smartAttendUser', JSON.stringify(user));

await fetch('http://localhost:3000/attendance', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: user.id, status: 'Present' })
});
```

Passwords are hashed with bcrypt. Do not commit `database.db` or use the permissive CORS setting unchanged in production.

## Java/SQLite API (current frontend integration)

The Java implementation is in [`backend/server.java`](./backend/server.java). It uses Java 17, SQLite, PBKDF2 password hashing, and the same three routes. Install Maven, then run:

```powershell
cd backend
mvn compile exec:java
```

It listens on port `3001`. Serve the static frontend from the project root (for example with VS Code Live Server at `http://localhost:5500`), then open `http://localhost:5500/login.html`. The frontend pages already set the Java API URL to port `3001`.

The Java API includes the standard routes plus administrator authentication and audit access:

- `POST /register`
- `POST /login`
- `POST /attendance`
- `POST /admin/register`
- `POST /admin/login`
- `GET /admin/overview` (requires `Authorization: Bearer <admin-token>`)

If you add a new page that uses the Java API, set this before its frontend script:

```html
<script>window.SMARTATTEND_API_URL = 'http://localhost:3001';</script>
```

Use either Node or Java as the API server for a given frontend session, not both for the same routes. The frontend login is [`login.html`](./login.html), registration is [`register.html`](./register.html), administrator pages are [`admin-login.html`](./admin-login.html), [`admin-register.html`](./admin-register.html), and [`admin-dashboard.html`](./admin-dashboard.html), and the student dashboard entry point is [`student-dashboard.html`](./student-dashboard.html).

For production, replace the in-memory administrator token store, use HTTPS with secure HttpOnly cookies or short-lived signed tokens, restrict CORS to the deployed frontend origin, and move deployment-specific API URLs into environment configuration. Never commit generated SQLite databases, uploaded selfies, `node_modules`, or build output; these are covered by [`.gitignore`](./.gitignore).
