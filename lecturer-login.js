const lecturerLoginForm = document.getElementById("lecturerLoginForm");
const loginMessage = document.getElementById("loginMessage");

lecturerLoginForm.addEventListener("submit", function (event) {
    return; // API-backed lecturer login is defined below.
    event.preventDefault();

    const email = document.getElementById("lecturerEmail")
        .value.trim().toLowerCase();

    const password = document.getElementById("lecturerPassword").value;

    let lecturers;

    try {
        lecturers = JSON.parse(
            localStorage.getItem("smartAttendLecturers") || "[]"
        );

        if (!Array.isArray(lecturers)) {
            lecturers = [];
        }
    } catch (error) {
        showLoginMessage("Unable to read saved accounts. Please try again.", false);
        return;
    }

    const lecturer = lecturers.find(function (item) {
        return item.email.toLowerCase() === email &&
               item.password === password;
    });

    if (!lecturer) {
        showLoginMessage(
            "Incorrect email or password. Please check your details.",
            false
        );
        return;
    }

    const loggedInLecturer = {
        name: lecturer.name,
        staffId: lecturer.staffId,
        email: lecturer.email,
        department: lecturer.department
    };

    sessionStorage.setItem(
        "smartAttendLoggedInLecturer",
        JSON.stringify(loggedInLecturer)
    );

    showLoginMessage("Login successful! Opening your dashboard...", true);

    setTimeout(function () {
        window.location.href = "lecturer%20dashboard.html";
    }, 1000);
});

function showLoginMessage(message, success) {
    loginMessage.textContent = message;
    loginMessage.style.color = success ? "#0f766e" : "#dc2626";
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("lecturerLoginForm");
    const message = document.getElementById("loginMessage");
    const API = window.SMARTATTEND_API_URL || "http://localhost:3001";
    form?.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            const response = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: document.getElementById("lecturerEmail").value.trim().toLowerCase(), password: document.getElementById("lecturerPassword").value }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Login failed.");
            if (data.user.role !== "lecturer") throw new Error("This account is not a lecturer account.");
            localStorage.setItem("smartAttendUser", JSON.stringify(data.user));
            message.textContent = "Login successful. Opening your dashboard…";
            message.style.color = "#0f766e";
            setTimeout(() => { window.location.href = "lecturer dashboard.html"; }, 450);
        } catch (error) { message.textContent = error.message; message.style.color = "#dc2626"; }
    });
});
