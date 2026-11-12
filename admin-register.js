const adminRegisterForm = document.getElementById("adminRegisterForm");
const registerMessage = document.getElementById("registerMessage");

adminRegisterForm.addEventListener("submit", async function (event) {
    return; // Backend registration handler is defined below.
    event.preventDefault();

    const name = document.getElementById("adminName").value.trim();
    const email = document.getElementById("adminEmail").value.trim().toLowerCase();
    const adminId = document.getElementById("adminId").value.trim();
    const password = document.getElementById("adminPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Check that both passwords match.
    if (password !== confirmPassword) {
        registerMessage.textContent = "Passwords do not match.";
        registerMessage.style.color = "red";
        return;
    }

    // Require a password of at least 8 characters.
    if (password.length < 8) {
        registerMessage.textContent = "Your password must contain at least 8 characters.";
        registerMessage.style.color = "red";
        return;
    }

    // Read previously registered prototype accounts.
    const admins = JSON.parse(localStorage.getItem("smartAttendAdmins") || "[]");

    // Prevent duplicate email addresses and administrator IDs.
    const accountExists = admins.some(function (admin) {
        return admin.email === email || admin.adminId.toLowerCase() === adminId.toLowerCase();
    });

    if (accountExists) {
        registerMessage.textContent = "This email or Administrator ID is already registered.";
        registerMessage.style.color = "red";
        return;
    }

    try {
        // Hash the password for this front-end prototype.
        const passwordBytes = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", passwordBytes);
        const passwordHash = Array.from(new Uint8Array(hashBuffer))
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");

        const newAdmin = {
            name: name,
            email: email,
            adminId: adminId,
            passwordHash: passwordHash
        };

        admins.push(newAdmin);
        localStorage.setItem("smartAttendAdmins", JSON.stringify(admins));

        registerMessage.textContent = "Registration successful! You can now log in.";
        registerMessage.style.color = "green";

        adminRegisterForm.reset();

    } catch (error) {
        registerMessage.textContent = "Registration failed. Please try again using Live Server.";
        registerMessage.style.color = "red";
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("adminRegisterForm");
    const message = document.getElementById("registerMessage");
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const password = document.getElementById("adminPassword").value;
        if (password !== document.getElementById("confirmPassword").value) { message.textContent = "Passwords do not match."; return; }
        try {
            const response = await fetch(`${window.SMARTATTEND_API_URL || "http://localhost:3001"}/admin/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: document.getElementById("adminName").value.trim(), email: document.getElementById("adminEmail").value.trim().toLowerCase(), admin_id: document.getElementById("adminId").value.trim(), password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Administrator registration failed.");
            message.textContent = "Registration successful. You can now log in.";
            form.reset();
        } catch (error) { message.textContent = error.message || "Unable to reach the backend."; }
    });
});
