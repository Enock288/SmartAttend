document.addEventListener("DOMContentLoaded", function () {
    document.querySelector('a[href="#student dashboard"]')?.setAttribute("href", "#dashboard");
    // 1. Get saved courses from My Courses
    const STORAGE_KEY = "smartAttendCourses";
    const ATTENDANCE_KEY = "smartAttendAttendance";

    const totalClasses = document.getElementById("totalClasses");
    const classesAttended = document.getElementById("classesAttended");
    const classesMissed = document.getElementById("classesMissed");
    const attendanceRate = document.getElementById("attendanceRate");

    const classesSection = document.getElementById("classes");
    const emptyState = document.querySelector("#classes .empty-state");

    let courses = [];
    let attendanceRecords = [];

    try {
        courses = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        attendanceRecords =
            JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || [];

        if (!Array.isArray(courses)) courses = [];
        if (!Array.isArray(attendanceRecords)) attendanceRecords = [];
    } catch (error) {
        console.error("Could not load saved dashboard data:", error);
    }

    // 2. Create a place to display saved courses
    let courseList = document.getElementById("dashboardCourseList");

    if (!courseList && classesSection) {
        courseList = document.createElement("div");
        courseList.id = "dashboardCourseList";

        const heading = classesSection.querySelector(".panel-heading");

        if (heading) {
            heading.insertAdjacentElement("afterend", courseList);
        } else {
            classesSection.appendChild(courseList);
        }
    }

    // 3. Display courses on the dashboard
    function displayCourses() {
        if (!courseList) return;

        courseList.replaceChildren();

        if (courses.length === 0) {
            if (emptyState) emptyState.style.display = "block";
            return;
        }

        if (emptyState) emptyState.style.display = "none";

        courses.forEach(function (course) {
            const card = document.createElement("div");
            card.className = "dashboard-course-card";

            const name = document.createElement("h3");
            name.textContent = course.name || "Unnamed course";

            const code = document.createElement("p");
            code.textContent = "Course code: " + (course.code || "Not provided");

            const day = document.createElement("p");
            day.textContent = "Day: " + (course.day || "Not provided");

            const time = document.createElement("p");
            time.textContent =
                "Time: " + (course.startTime || "--:--") +
                " – " + (course.endTime || "--:--");

            const venue = document.createElement("p");
            venue.textContent = "Venue: " + (course.venue || "Not provided");

            card.append(name, code, day, time, venue);
            courseList.appendChild(card);
        });
    }

    // 4. Update dashboard statistics
    function updateStatistics() {
        const attended = attendanceRecords.length;
        const missed = 0;
        const rate = attended > 0
            ? Math.round((attended / (attended + missed)) * 100)
            : 0;

        if (totalClasses) {
            totalClasses.textContent = courses.length;
        }

        if (classesAttended) {
            classesAttended.textContent = attended;
        }

        if (classesMissed) {
            classesMissed.textContent = missed;
        }

        if (attendanceRate) {
            attendanceRate.textContent = rate + "%";
        }
        updateInsights(attended, courses.length);
    }

    function updateInsights(attended, total) {
        const percentage = total > 0 ? Math.min(100, Math.round((attended / total) * 100)) : 0;
        const ring = document.getElementById("progressRing"); if (ring) ring.style.setProperty("--progress", percentage + "%");
        const value = document.getElementById("progressValue"); if (value) value.textContent = percentage + "%";
        const streak = document.getElementById("streakCount"); if (streak) streak.textContent = `${attended} day${attended === 1 ? "" : "s"}`;
        drawCampusMap();
    }

    function drawCampusMap(latitude, longitude) {
        const canvas = document.getElementById("campusMap"); if (!canvas) return;
        const context = canvas.getContext("2d"), width = canvas.width, height = canvas.height;
        context.clearRect(0, 0, width, height); context.fillStyle = "#ecfeff"; context.fillRect(0, 0, width, height);
        context.strokeStyle = "#99f6e4"; context.lineWidth = 3; context.beginPath(); context.arc(width / 2, height / 2, 45, 0, Math.PI * 2); context.stroke();
        context.fillStyle = "#0f766e"; context.font = "12px Arial"; context.fillText("Palm campus", width / 2 - 35, height / 2 + 4);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) { const x = Math.max(10, Math.min(width - 10, width / 2 + ((longitude - .1415) * 1200))); const y = Math.max(10, Math.min(height - 10, height / 2 - ((latitude - 5.8065) * 1200))); context.fillStyle = "#ef4444"; context.beginPath(); context.arc(x, y, 8, 0, Math.PI * 2); context.fill(); context.fillStyle = "#991b1b"; context.font = "bold 11px Arial"; context.fillText("You", x + 11, y + 4); const status = document.getElementById("mapStatus"); if (status) status.textContent = "Live location active. Red marker shows your position."; }
    }
    drawCampusMap();
    let locationWatchId = null;
    function requestLiveLocation() {
        const status = document.getElementById("mapStatus");
        const button = document.getElementById("locateButton");
        if (!navigator.geolocation) { if (status) status.textContent = "Geolocation is not supported by this browser."; return; }
        if (status) status.textContent = "Requesting your live location…";
        if (button) { button.disabled = true; button.textContent = "Locating…"; }
        const update = position => { drawCampusMap(position.coords.latitude, position.coords.longitude); if (button) { button.disabled = false; button.textContent = "Location Enabled"; } };
        const fail = error => { if (button) { button.disabled = false; button.textContent = "Try Location Again"; } if (status) status.textContent = error.code === 1 ? "Location permission was denied. Allow it in your browser settings." : "Unable to read your location. Check GPS and try again."; };
        navigator.geolocation.getCurrentPosition(update, fail, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
        if (locationWatchId === null) locationWatchId = navigator.geolocation.watchPosition(update, fail, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    }
    document.getElementById("locateButton")?.addEventListener("click", requestLiveLocation);

    displayCourses();
    updateStatistics();

    // 5. Connect the Scan Attendance button to the QR scanner
    const scanButton = document.getElementById("scanButton");
    const scanMessage = document.getElementById("scanMessage");

    let qrScanner = null;
    let activeStream = null;
    let uploadedSelfieData = null;
    document.getElementById("selfieUpload")?.addEventListener("change", event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { uploadedSelfieData = reader.result; document.getElementById("captureMessage").textContent = "Selfie image selected. Verify your GPS to continue."; }; reader.readAsDataURL(file); });

    async function beginSecureScan(token) {
        const capture = document.getElementById("securityCapture");
        const video = document.getElementById("selfieVideo");
        const captureMessage = document.getElementById("captureMessage");
        const user = JSON.parse(localStorage.getItem("smartAttendUser") || "null");
        if (!user?.id) { if (scanMessage) scanMessage.textContent = "Please log in again before recording attendance."; return; }
        capture.hidden = false;
        requestLiveLocation();
        captureMessage.textContent = "Allow camera access, then capture your selfie.";
        try { activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }); video.srcObject = activeStream; } catch (error) { captureMessage.textContent = "Camera unavailable. Upload a selfie image below to continue."; }
        document.getElementById("captureSelfieButton").onclick = async function () {
            captureMessage.textContent = "Checking your live location…";
            if (!navigator.geolocation) { captureMessage.textContent = "This browser does not support geolocation."; return; }
            navigator.geolocation.getCurrentPosition(async position => {
                drawCampusMap(position.coords.latitude, position.coords.longitude);
                const canvas = document.getElementById("selfieCanvas"); canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480; if (!uploadedSelfieData) { if (!activeStream) { captureMessage.textContent = "Capture a webcam selfie or upload an image first."; return; } canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height); } const selfieData = uploadedSelfieData || canvas.toDataURL("image/jpeg", .82);
                try { const response = await fetch(`${window.SMARTATTEND_API_URL || "http://localhost:3001"}/attendance/scan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, user_id: user.id, latitude: position.coords.latitude, longitude: position.coords.longitude, selfie_data: selfieData }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Attendance scan failed."); attendanceRecords.push({ id: result.attendanceId, status: "Present", timestamp: new Date().toISOString(), session_id: result.session_id }); localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendanceRecords)); updateStatistics(); captureMessage.textContent = "Attendance recorded: selfie and GPS verified."; if (scanMessage) scanMessage.textContent = "Secure attendance recorded successfully."; setTimeout(closeCapture, 1200); } catch (error) { captureMessage.textContent = error.message; }
            }, () => { captureMessage.textContent = "Location access is required. Enable GPS and try again."; }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        };
        document.getElementById("cancelCaptureButton").onclick = closeCapture;
        function closeCapture() { activeStream?.getTracks().forEach(track => track.stop()); activeStream = null; uploadedSelfieData = null; video.srcObject = null; document.getElementById("selfieUpload").value = ""; capture.hidden = true; }
    }

    if (scanButton) {
        scanButton.addEventListener("click", async function () {
            if (typeof Html5Qrcode === "undefined") {
                if (scanMessage) {
                    scanMessage.textContent =
                        "QR scanner library not loaded. Check your internet connection.";
                }
                return;
            }

            if (qrScanner) return;

            const reader = document.getElementById("qr-reader");

            if (!reader) {
                if (scanMessage) {
                    scanMessage.textContent =
                        "Please add the qr-reader container to your dashboard HTML.";
                }
                return;
            }

            qrScanner = new Html5Qrcode("qr-reader");

            if (scanMessage) {
                scanMessage.textContent =
                    "Starting camera. Please allow camera access.";
            }

            try {
                await qrScanner.start(
                    { facingMode: "environment" },
                    {
    fps: 15,
    qrbox: function (viewfinderWidth, viewfinderHeight) {
        const size = Math.floor(
            Math.min(viewfinderWidth, viewfinderHeight) * 0.75
        );

        return {
            width: size,
            height: size
        };
    }
},

                    async function (decodedText) {
                        if (scanMessage) {
                            scanMessage.textContent = "QR code scanned. Recording attendance…";
                        }

                        await beginSecureScan(decodedText);

                        try {
                            await qrScanner.stop();
                            qrScanner.clear();
                        } catch (error) {
                            console.error("Could not stop scanner:", error);
                        }

                        qrScanner = null;
                    },

                    function () {
                        // Wait until a QR code is detected.
                    }
                );

                if (scanMessage) {
                    scanMessage.textContent =
                        "Camera ready. Point it at the class QR code.";
                }
            } catch (error) {
                if (scanMessage) {
                    scanMessage.textContent =
                        "Camera could not start. Allow camera access and try again.";
                }

                qrScanner = null;
                console.error("Scanner error:", error);
            }
        });
    }

    // 6. Connect the Log Out links
    document.querySelectorAll('a[href="login.html"]').forEach(function (link) {
        if (link.textContent.trim().toLowerCase().includes("log out")) {
            link.addEventListener("click", function () {
                // This is only a navigation action; real authentication
                // and session logout must be implemented separately.
            });
        }
    });
});



/* Personalize the student dashboard greeting */
const studentWelcome = document.getElementById("studentWelcome");

const loggedInStudent = JSON.parse(
    sessionStorage.getItem("smartAttendLoggedInStudent")
);

if (studentWelcome && loggedInStudent && loggedInStudent.name) {
    const firstName = loggedInStudent.name.trim().split(/\s+/)[0];
    studentWelcome.textContent = `Welcome, ${firstName} 👋`;
}
