/* SMARTATTEND LECTURER DASHBOARD */

const loggedInLecturer = JSON.parse(
    localStorage.getItem("smartAttendUser") || sessionStorage.getItem("smartAttendLoggedInLecturer") || "null"
);

// Require a lecturer login before showing the dashboard.
if (!loggedInLecturer || loggedInLecturer.role !== "lecturer") {
    window.location.replace("lecturer-login.html");
} else {
    startLecturerDashboard();
}

document.addEventListener("DOMContentLoaded", async function () {
    const user = JSON.parse(localStorage.getItem("smartAttendUser") || "null");
    if (!user || user.role !== "lecturer") return;
    const API = window.SMARTATTEND_API_URL || "http://localhost:3001";
    const message = document.createElement("p"); message.id = "apiMessage"; message.className = "api-message";
    document.querySelector("#sessions .section-heading")?.after(message);
    const courseForm = document.getElementById("courseForm");
    const sessionForm = document.getElementById("sessionForm");
    const courseList = document.getElementById("courseList");
    const courseSelect = document.getElementById("sessionCourse");
    const sessionList = document.getElementById("sessionList");
    const qrDisplay = document.getElementById("qrDisplay");
    let courses = [];
    let sessions = [];
    const courseCatalog = [
        { code: "BSC-CS", name: "BSc. Computer Science" },
        { code: "BSC-BIT", name: "BSc. Business Information Technology" },
        { code: "BSC-BA", name: "BSc. Business Administration" }
    ];
    const showMessage = (text, ok = false) => { message.textContent = text; message.className = `api-message${ok ? " success" : ""}`; };
    const request = async (path, options = {}) => { const response = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...options }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Request failed."); return data; };
    function renderCourses() { courseSelect.replaceChildren(new Option("Choose a course", "")); courseList.replaceChildren(); courses.forEach(course => { courseSelect.appendChild(new Option(`${course.course_code} — ${course.course_name}`, course.id)); const card = document.createElement("article"); card.className = "course-item"; card.innerHTML = `<strong>${course.course_code}</strong><span>${course.course_name}</span>`; courseList.appendChild(card); }); courseCatalog.filter(item => !courses.some(course => course.course_name === item.name)).forEach(item => courseSelect.appendChild(new Option(item.name, `catalog:${item.code}`))); if (!courses.length) courseList.innerHTML = `<div class="empty-state"><h3>No courses yet</h3><p>Select a course above when creating your first session.</p></div>`; document.getElementById("courseCount").textContent = courses.length; }
    function renderSession(session) { const card = document.createElement("article"); card.className = "session-item api-session"; card.innerHTML = `<strong>${session.course_name}</strong><span>${session.date} at ${session.time}</span>`; const button = document.createElement("button"); button.className = "small-button"; button.textContent = "Show QR"; button.onclick = () => { qrDisplay.classList.remove("hidden"); qrDisplay.replaceChildren(); const title = document.createElement("h3"); title.textContent = `${session.course_name} · ${session.date} ${session.time}`; const code = document.createElement("div"); qrDisplay.append(title, code); if (window.QRCode) new QRCode(code, { text: session.token, width: 260, height: 260, correctLevel: QRCode.CorrectLevel.M }); else showMessage("QR library is still loading. Try again."); }; card.appendChild(button); sessionList.prepend(card); }
    async function loadDashboardData() { const overview = await request(`/lecturer/overview?lecturer_id=${encodeURIComponent(user.id)}`, { method: "GET" }); courses = overview.courses || []; sessions = overview.sessions || []; renderCourses(); sessionList.replaceChildren(); sessions.forEach(renderSession); if (!sessions.length) sessionList.innerHTML = `<div class="empty-state"><h3>No sessions created</h3><p>Create a course and then start an attendance session.</p></div>`; document.getElementById("sessionCount").textContent = sessions.length; document.getElementById("attendanceCount").textContent = (overview.attendance || []).length; document.getElementById("attendanceRate").textContent = overview.attendance?.length ? "100%" : "—"; const attendanceList = document.getElementById("attendanceList"); if (overview.attendance?.length) attendanceList.innerHTML = `<table><thead><tr><th>Student</th><th>Course</th><th>Date</th><th>Status</th></tr></thead><tbody>${overview.attendance.map(item => `<tr><td>${item.username}</td><td>${item.course_code}</td><td>${item.date} ${item.time}</td><td>${item.status}</td></tr>`).join("")}</tbody></table>`; }
    try { await loadDashboardData(); } catch (error) { showMessage(error.message); }
    courseForm?.addEventListener("submit", async event => { event.preventDefault(); try { await request("/lecturer/create-course", { method: "POST", body: JSON.stringify({ lecturer_id: user.id, course_code: document.getElementById("courseCode").value.trim().toUpperCase(), course_name: document.getElementById("courseTitle").value.trim() }) }); await loadDashboardData(); courseForm.reset(); courseForm.classList.add("hidden"); showMessage("Course created successfully.", true); } catch (error) { showMessage(error.message); } });
    sessionForm?.addEventListener("submit", async event => { event.preventDefault(); const value = document.getElementById("sessionCourse").value; let selected = courses.find(course => String(course.id) === value); try { if (!selected && value.startsWith("catalog:")) { const catalogItem = courseCatalog.find(item => `catalog:${item.code}` === value); const created = await request("/lecturer/create-course", { method: "POST", body: JSON.stringify({ lecturer_id: user.id, course_code: `${catalogItem.code}-${user.id}`, course_name: catalogItem.name }) }); selected = created.course; } if (!selected) return showMessage("Choose a course first."); const data = await request("/lecturer/create-session", { method: "POST", body: JSON.stringify({ lecturer_id: user.id, course_id: selected.id, date: document.getElementById("sessionDate").value, time: document.getElementById("sessionTime").value }) }); await loadDashboardData(); sessionForm.reset(); sessionForm.classList.add("hidden"); showMessage("Secure QR session created.", true); showQr(data.session); } catch (error) { showMessage(error.message); } });
    const showQr = session => { qrDisplay.classList.remove("hidden"); qrDisplay.replaceChildren(); const title = document.createElement("h3"); title.textContent = `${session.course_name} · ${session.date} ${session.time}`; const code = document.createElement("div"); qrDisplay.append(title, code); if (window.QRCode) new QRCode(code, { text: session.token, width: 260, height: 260, correctLevel: QRCode.CorrectLevel.M }); const close = document.createElement("button"); close.type = "button"; close.className = "secondary-button"; close.textContent = "Hide QR Code"; close.onclick = () => qrDisplay.classList.add("hidden"); qrDisplay.appendChild(close); qrDisplay.scrollIntoView({ behavior: "smooth", block: "center" }); };
    document.getElementById("addCourseButton")?.addEventListener("click", () => { courseForm.classList.toggle("hidden"); document.getElementById("courses").scrollIntoView({ behavior: "smooth" }); });
    document.getElementById("cancelCourseButton")?.addEventListener("click", () => { courseForm.reset(); courseForm.classList.add("hidden"); });
    const openSession = () => { sessionForm.classList.remove("hidden"); document.getElementById("sessions").scrollIntoView({ behavior: "smooth" }); };
    document.getElementById("openSessionForm")?.addEventListener("click", openSession);
    document.getElementById("createSessionShortcut")?.addEventListener("click", openSession);
    document.getElementById("cancelSessionButton")?.addEventListener("click", () => { sessionForm.reset(); sessionForm.classList.add("hidden"); });
    document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => { document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active")); link.classList.add("active"); }));
    document.getElementById("headerLecturerName").textContent = user.username; document.getElementById("welcomeLecturerName").textContent = user.username.split(" ")[0]; document.getElementById("profileLecturerName").textContent = user.username; document.getElementById("profileLecturerEmail").textContent = user.email; document.getElementById("logoutButton")?.addEventListener("click", () => { localStorage.removeItem("smartAttendUser"); window.location.href = "login.html"; });
});

function startLecturerDashboard() {
    return; // API-backed dashboard is initialized below.
    const lecturerEmail = loggedInLecturer.email.toLowerCase();
    const storageSuffix = encodeURIComponent(lecturerEmail);

    const coursesKey = "smartAttendCourses_" + storageSuffix;
    const sessionsKey = "smartAttendSessions_" + storageSuffix;
    const recordsKey = "smartAttendAttendance_" + storageSuffix;

    let courses = readList(coursesKey);
    let sessions = readList(sessionsKey);
    let attendanceRecords = readList(recordsKey);

    // DISPLAY LECTURER DETAILS

    document.getElementById("headerLecturerName").textContent =
        loggedInLecturer.name;

    document.getElementById("welcomeLecturerName").textContent =
        loggedInLecturer.name.split(" ")[0];

    document.getElementById("profileLecturerName").textContent =
        loggedInLecturer.name;

    document.getElementById("profileLecturerEmail").textContent =
        loggedInLecturer.email;

    document.getElementById("profileLecturerStaffId").textContent =
        "Staff ID: " + loggedInLecturer.staffId;

    document.getElementById("profileLecturerDepartment").textContent =
        "Department: " + loggedInLecturer.department;

    // SET TODAY'S DATE AS THE DEFAULT SESSION DATE

    const today = new Date();
    const localToday =
        today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");

    document.getElementById("sessionDate").value = localToday;
    document.getElementById("sessionDate").min = localToday;

    // READ AND SAVE DATA

    function readList(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch (error) {
            return [];
        }
    }

    function saveData() {
        try {
            localStorage.setItem(coursesKey, JSON.stringify(courses));
            localStorage.setItem(sessionsKey, JSON.stringify(sessions));
            localStorage.setItem(recordsKey, JSON.stringify(attendanceRecords));
            return true;
        } catch (error) {
            alert("Could not save data. Check your browser storage.");
            return false;
        }
    }

    // UPDATE DASHBOARD STATISTICS

    function updateStats() {
        document.getElementById("courseCount").textContent = courses.length;
        document.getElementById("sessionCount").textContent = sessions.length;
        document.getElementById("attendanceCount").textContent =
            attendanceRecords.length;

        const totalExpected = attendanceRecords.reduce(function (sum, record) {
            return sum + (Number(record.expected) || 0);
        }, 0);

        const totalPresent = attendanceRecords.reduce(function (sum, record) {
            return sum + (Number(record.present) || 0);
        }, 0);

        document.getElementById("attendanceRate").textContent =
            totalExpected > 0
                ? Math.round((totalPresent / totalExpected) * 100) + "%"
                : "—";
    }

    // SHOW OR HIDE FORMS

    const courseForm = document.getElementById("courseForm");
    const sessionForm = document.getElementById("sessionForm");
    const qrDisplay = document.getElementById("qrDisplay");

    document.getElementById("addCourseButton").addEventListener("click", function () {
        courseForm.classList.toggle("hidden");
        if (!courseForm.classList.contains("hidden")) {
            document.getElementById("courseCode").focus();
        }
    });

    document.getElementById("cancelCourseButton").addEventListener("click", function () {
        courseForm.reset();
        courseForm.classList.add("hidden");
    });

    document.getElementById("openSessionForm").addEventListener("click", function () {
        sessionForm.classList.toggle("hidden");
        if (!sessionForm.classList.contains("hidden")) {
            refreshCourseOptions();
        }
    });

    document.getElementById("cancelSessionButton").addEventListener("click", function () {
        sessionForm.reset();
        document.getElementById("sessionDate").value = localToday;
        sessionForm.classList.add("hidden");
    });

    document.getElementById("createSessionShortcut").addEventListener("click", function () {
        sessionForm.classList.remove("hidden");
        refreshCourseOptions();
        document.getElementById("sessions").scrollIntoView({ behavior: "smooth" });
    });

    // ADD A COURSE

    courseForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const code = document.getElementById("courseCode").value.trim().toUpperCase();
        const title = document.getElementById("courseTitle").value.trim();
        const level = document.getElementById("courseLevel").value;

        const exists = courses.some(function (course) {
            return course.code.toLowerCase() === code.toLowerCase();
        });

        if (exists) {
            alert("You have already added this course code.");
            return;
        }

        courses.push({
            id: createId(),
            code: code,
            title: title,
            level: level
        });

        if (!saveData()) {
            courses.pop();
            return;
        }

        courseForm.reset();
        courseForm.classList.add("hidden");
        renderCourses();
        updateStats();
    });

    function renderCourses() {
        const courseList = document.getElementById("courseList");

        if (courses.length === 0) {
            courseList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="book-open"></i>
                    <h3>No courses added yet</h3>
                    <p>Choose “Add Course” to add your first course.</p>
                </div>`;
        } else {
            courseList.replaceChildren();

            courses.forEach(function (course) {
                const card = document.createElement("article");
                card.className = "course-item";

                const code = document.createElement("span");
                code.className = "course-code";
                code.textContent = course.code;

                const title = document.createElement("h3");
                title.textContent = course.title;

                const level = document.createElement("p");
                level.textContent = "Level: " + course.level;

                const actions = document.createElement("div");
                actions.className = "item-actions";

                const createButton = document.createElement("button");
                createButton.type = "button";
                createButton.className = "small-button";
                createButton.textContent = "Create Session";
                createButton.addEventListener("click", function () {
                    sessionForm.classList.remove("hidden");
                    refreshCourseOptions();
                    document.getElementById("sessionCourse").value = course.id;
                    document.getElementById("sessions").scrollIntoView({
                        behavior: "smooth"
                    });
                });

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.className = "small-button danger";
                deleteButton.textContent = "Remove";
                deleteButton.addEventListener("click", function () {
                    const hasSessions = sessions.some(function (session) {
                        return session.courseId === course.id;
                    });

                    if (hasSessions) {
                        alert("This course has attendance sessions. Close or remove those sessions first.");
                        return;
                    }

                    if (confirm("Remove " + course.code + " from your course list?")) {
                        courses = courses.filter(function (item) {
                            return item.id !== course.id;
                        });

                        if (saveData()) {
                            renderCourses();
                            refreshCourseOptions();
                            updateStats();
                        }
                    }
                });

                actions.append(createButton, deleteButton);
                card.append(code, title, level, actions);
                courseList.appendChild(card);
            });
        }

        refreshCourseOptions();
        refreshIcons();
    }

    // FILL THE COURSE SELECT MENU

    function refreshCourseOptions() {
        const select = document.getElementById("sessionCourse");
        const previousValue = select.value;

        select.replaceChildren();

        const firstOption = document.createElement("option");
        firstOption.value = "";
        firstOption.textContent = courses.length
            ? "Select a course"
            : "Add a course first";

        select.appendChild(firstOption);

        courses.forEach(function (course) {
            const option = document.createElement("option");
            option.value = course.id;
            option.textContent = course.code + " — " + course.title;
            select.appendChild(option);
        });

        if (courses.some(function (course) {
            return course.id === previousValue;
        })) {
            select.value = previousValue;
        }
    }

    // CREATE AN ATTENDANCE SESSION AND QR CODE

    sessionForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const courseId = document.getElementById("sessionCourse").value;
        const date = document.getElementById("sessionDate").value;
        const duration = Number(document.getElementById("sessionDuration").value);

        const course = courses.find(function (item) {
            return item.id === courseId;
        });

        if (!course) {
            alert("Please add and select a course first.");
            return;
        }

        if (!date || date < localToday) {
            alert("Please choose today or a future date.");
            return;
        }

        const token = createId();

        const session = {
            id: token,
            courseId: course.id,
            courseCode: course.code,
            courseTitle: course.title,
            date: date,
            duration: duration,
            createdAt: new Date().toISOString(),
            status: "Created"
        };

        sessions.push(session);

        if (!saveData()) {
            sessions.pop();
            return;
        }

        sessionForm.reset();
        document.getElementById("sessionDate").value = localToday;
        document.getElementById("sessionDuration").value = "10";
        sessionForm.classList.add("hidden");

        renderSessions();
        updateStats();
        displayQRCode(session);
    });

    function displayQRCode(session) {
        qrDisplay.classList.remove("hidden");
        qrDisplay.replaceChildren();

        const heading = document.createElement("h3");
        heading.textContent = "Session QR Code";

        const details = document.createElement("p");
        details.textContent =
            session.courseCode + " — " + session.courseTitle +
            " | Date: " + session.date +
            " | Duration: " + session.duration + " minutes";

        const qrImage = document.createElement("img");
        qrImage.alt = "QR code for prototype session " + session.id;

        // Prototype only: this QR code encodes session details.
        // It does not submit attendance or verify a student.
        const qrPayload = JSON.stringify({
            app: "SmartAttend",
            type: "prototype-session",
            sessionId: session.id,
            courseCode: session.courseCode,
            date: session.date
        });

        qrImage.src =
            "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
            encodeURIComponent(qrPayload);

        const tokenText = document.createElement("p");
        tokenText.className = "qr-token";
        tokenText.textContent = "Session ID: " + session.id;

        const warning = document.createElement("p");
        warning.textContent =
            "Prototype QR code only. Student check-in and session expiry are not connected yet.";

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "secondary-button";
        closeButton.textContent = "Hide QR Code";
        closeButton.addEventListener("click", function () {
            qrDisplay.classList.add("hidden");
        });

        qrDisplay.append(heading, details, qrImage, tokenText, warning, closeButton);
        qrDisplay.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function renderSessions() {
        const sessionList = document.getElementById("sessionList");
        sessionList.replaceChildren();

        if (sessions.length === 0) {
            sessionList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="qr-code"></i>
                    <h3>No sessions created</h3>
                    <p>Create a course and then start an attendance session.</p>
                </div>`;
            refreshIcons();
            return;
        }

        sessions.slice().reverse().forEach(function (session) {
            const card = document.createElement("article");
            card.className = "session-item";

            const status = document.createElement("span");
            status.className = "course-code";
            status.textContent = session.status;

            const heading = document.createElement("h3");
            heading.textContent = session.courseCode + " — " + session.courseTitle;

            const date = document.createElement("p");
            date.textContent = "Date: " + session.date;

            const duration = document.createElement("p");
            duration.textContent = "Duration: " + session.duration + " minutes";

            const actions = document.createElement("div");
            actions.className = "item-actions";

            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.className = "small-button";
            viewButton.textContent = "View QR Code";
            viewButton.addEventListener("click", function () {
                displayQRCode(session);
            });

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "small-button danger";
            removeButton.textContent = "Remove";
            removeButton.addEventListener("click", function () {
                if (confirm("Remove this prototype session?")) {
                    sessions = sessions.filter(function (item) {
                        return item.id !== session.id;
                    });

                    if (saveData()) {
                        renderSessions();
                        updateStats();
                        qrDisplay.classList.add("hidden");
                    }
                }
            });

            actions.append(viewButton, removeButton);
            card.append(status, heading, date, duration, actions);
            sessionList.appendChild(card);
        });

        refreshIcons();
    }

    // ATTENDANCE AND REPORT PLACEHOLDERS

    function renderAttendance() {
        const container = document.getElementById("attendanceList");
        container.replaceChildren();

        if (attendanceRecords.length === 0) {
            const message = document.createElement("p");
            message.className = "muted-text";
            message.textContent =
                "No student attendance records yet. Student check-in will be added in a later step.";
            container.appendChild(message);
            return;
        }

        attendanceRecords.forEach(function (record) {
            const item = document.createElement("p");
            item.className = "muted-text";
            item.textContent =
                record.courseCode + ": " + record.present +
                " present out of " + record.expected + " expected.";
            container.appendChild(item);
        });
    }

    // NAVIGATION

    document.querySelectorAll(".nav-link").forEach(function (link) {
        link.addEventListener("click", function () {
            document.querySelectorAll(".nav-link").forEach(function (item) {
                item.classList.remove("active");
            });

            link.classList.add("active");
            document.getElementById("sidebar").classList.remove("open");
        });
    });

    document.getElementById("menuButton").addEventListener("click", function () {
        document.getElementById("sidebar").classList.toggle("open");
    });

    // LOG OUT

    document.getElementById("logoutButton").addEventListener("click", function () {
        if (confirm("Are you sure you want to log out?")) {
            sessionStorage.removeItem("smartAttendLoggedInLecturer");
            window.location.href = "lecturer-login.html";
        }
    });

    function createId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }

        return "session-" + Date.now() + "-" +
            Math.random().toString(36).slice(2, 10);
    }

    function refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // INITIALISE DASHBOARD

    renderCourses();
    renderSessions();
    renderAttendance();
    updateStats();
    refreshIcons();
}
