const adminLoginForm = document.getElementById("adminLoginForm");
const loginMessage = document.getElementById("loginMessage");

adminLoginForm.addEventListener("submit", async function (event) {
    return; // Backend authentication handler is defined below.
    event.preventDefault();

    const email = document.getElementById("adminEmail")
        .value.trim().toLowerCase();

    const password = document.getElementById("adminPassword").value;

    const admins = JSON.parse(
        localStorage.getItem("smartAttendAdmins") || "[]"
    );

    const admin = admins.find(function (account) {
        return account.email === email;
    });

    if (!admin) {
        loginMessage.textContent = "Invalid email or password.";
        loginMessage.style.color = "red";
        return;
    }

    try {
        const passwordBytes = new TextEncoder().encode(password);

        const hashBuffer = await crypto.subtle.digest(
            "SHA-256",
            passwordBytes
        );

        const passwordHash = Array.from(new Uint8Array(hashBuffer))
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");

        if (passwordHash !== admin.passwordHash) {
            loginMessage.textContent = "Invalid email or password.";
            loginMessage.style.color = "red";
            return;
        }

        sessionStorage.setItem(
            "smartAttendLoggedInAdmin",
            JSON.stringify({
                name: admin.name,
                email: admin.email,
                adminId: admin.adminId
            })
        );

        loginMessage.textContent = "Login successful! Opening dashboard...";
        loginMessage.style.color = "green";

        // We will create this dashboard page in the next step.
        window.location.href = "admin-dashboard.html";

    } catch (error) {
        loginMessage.textContent =
            "Login could not be completed. Please use Live Server and try again.";
        loginMessage.style.color = "red";
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("adminLoginForm");
    const message = document.getElementById("loginMessage");
    form.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            const response = await fetch(`${window.SMARTATTEND_API_URL || "http://localhost:3001"}/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: document.getElementById("adminEmail").value.trim().toLowerCase(), password: document.getElementById("adminPassword").value }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Administrator login failed.");
            localStorage.setItem("smartAttendAdminToken", data.token);
            localStorage.setItem("smartAttendAdmin", JSON.stringify(data.user));
            message.textContent = "Login successful. Opening dashboard…";
            window.location.href = "admin-dashboard.html";
        } catch (error) { message.textContent = error.message || "Unable to reach the backend."; }
    });
});
