const loggedInAdmin = JSON.parse(
    localStorage.getItem("smartAttendAdmin") || "null"
);
const adminToken = localStorage.getItem("smartAttendAdminToken");

// Return to login if no administrator session exists.
if (!loggedInAdmin || !adminToken) {
    window.location.replace("admin-login.html");
} else {
    const adminName = document.getElementById("adminName");
    const adminWelcome = document.getElementById("adminWelcome");
    const adminId = document.getElementById("adminId");
    const adminEmail = document.getElementById("adminEmail");
    const avatar = document.querySelector(".avatar");

    if (adminName) {
        adminName.textContent = loggedInAdmin.username || loggedInAdmin.name;
    }

    if (adminWelcome) {
        const firstName = (loggedInAdmin.username || loggedInAdmin.name).trim().split(/\s+/)[0];
        adminWelcome.textContent = `Welcome back, ${firstName}! 👋`;
    }

    if (adminId) {
        adminId.textContent = loggedInAdmin.admin_id || loggedInAdmin.adminId || "—";
    }

    if (adminEmail) {
        adminEmail.textContent = loggedInAdmin.email;
    }

    if (avatar) {
        avatar.textContent = (loggedInAdmin.username || loggedInAdmin.name).trim().charAt(0).toUpperCase();
    }
}

// Log out of the administrator dashboard.
const adminLogout = document.getElementById("adminLogout");

if (adminLogout) {
    adminLogout.addEventListener("click", function () {
        localStorage.removeItem("smartAttendAdminToken");
        localStorage.removeItem("smartAttendAdmin");
        window.location.href = "admin-login.html";
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const API = window.SMARTATTEND_API_URL || window.location.origin;
    const status = document.getElementById("auditStatus");
    try {
        const response = await fetch(`${API}/admin/overview`, { headers: { Authorization: `Bearer ${adminToken}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Audit unavailable");
        document.getElementById("totalStudents").textContent = data.students;
        document.getElementById("totalLecturers").textContent = data.lecturers;
        document.getElementById("totalCourses").textContent = data.courses;
        document.getElementById("totalAttendance").textContent = data.attendance;
        const activityTable = document.getElementById("activityTable"); activityTable.replaceChildren();
        if (!data.activity.length) { activityTable.innerHTML = `<tr><td colspan="6">No database activity yet.</td></tr>`; } else data.activity.forEach(item => { const row = document.createElement("tr"); const values = [item.recorded_at, item.username, item.course_code || "—", item.status, item.location_verified ? "Verified" : "Rejected", item.selfie_path ? "Saved" : "Missing"]; values.forEach((value, index) => { const cell = document.createElement("td"); cell.textContent = value; if ((index === 4 || index === 5) && value === "Verified" || value === "Saved") cell.className = "verified"; row.appendChild(cell); }); activityTable.appendChild(row); });
        status.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    } catch (error) { status.textContent = error.message; status.className = "audit-status unverified"; }
    if (window.THREE) { const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 100), renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("adminScene"), alpha: true }); renderer.setSize(innerWidth, innerHeight); camera.position.z = 6; const geometry = new THREE.IcosahedronGeometry(2.7, 2), material = new THREE.MeshBasicMaterial({ color: 0x2dd4bf, wireframe: true, transparent: true, opacity: .35 }), mesh = new THREE.Mesh(geometry, material); scene.add(mesh); const animate = () => { mesh.rotation.x += .0005; mesh.rotation.y += .001; renderer.render(scene, camera); requestAnimationFrame(animate); }; animate(); }
});
