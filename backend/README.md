# SmartAttend Java backend

This is the Java 17 implementation of the API. It creates `database-java.db`, hashes passwords with PBKDF2, uses prepared SQL statements, and creates `users`, `courses`, `attendance_sessions`, and `attendance` tables. Attendance records include `session_id`, `selfie_path`, and `location_verified`.

From the repository root:

```powershell
cd backend
mvn compile exec:java
```

The Java API listens on `http://localhost:3001`. To use it from the existing frontend, add this before `login.js` (and `register.js`) or change the default in those files:

```html
<script>window.SMARTATTEND_API_URL = 'http://localhost:3001';</script>
```

The Node API remains available on port 3000 and serves the frontend. Use one backend at a time.

Additional routes:

- `GET /courses` — list courses for the lecturer dashboard.
- `POST /lecturer/create-course` — create a course with `lecturer_id`, `course_code`, and `course_name`.
- `POST /lecturer/create-session` — create a session with `lecturer_id`, `course_id`, `date`, and `time`; the response includes a unique token whose decoded payload contains the course name, date, and time.
- `POST /attendance/scan` — accepts `user_id`, `token`, `latitude`, `longitude`, and a base64 `selfie_data` image. It rejects duplicate scans, rejects coordinates outside the Palm University College geofence, saves the selfie under `uploads/selfies/`, and only then inserts the attendance record.

The geofence is currently a 750-metre radius around the configured Palm University College campus center in Manya Jorpanya, Shai Hills. Replace `campusLat`, `campusLon`, and `radiusMeters` in `server.java` with surveyed boundary coordinates before production deployment.
