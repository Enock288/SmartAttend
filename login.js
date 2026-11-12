document.addEventListener("DOMContentLoaded", function () {
    // Get the login form elements
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");

    const emailInput = loginForm
        ? loginForm.querySelector('input[type="email"]')
        : null;

    const passwordInput = loginForm
        ? loginForm.querySelector(
            'input[name="password"], input[type="password"]'
        )
        : null;

    // -----------------------------------
    // 1. SHOW AND HIDE PASSWORD
    // -----------------------------------

    const togglePassword = document.getElementById("togglePassword");

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", function () {
            const isPasswordHidden = passwordInput.type === "password";

            passwordInput.type = isPasswordHidden ? "text" : "password";

            // Update the button label
            togglePassword.textContent = isPasswordHidden ? "Hide" : "Show";

            togglePassword.setAttribute(
                "aria-label",
                isPasswordHidden ? "Hide password" : "Show password"
            );
        });
    }

    // -----------------------------------
    // 2. LOGIN FORM VALIDATION
    // -----------------------------------

    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();

            if (loginMessage) {
                loginMessage.textContent = "";
            }

            const email = emailInput
                ? emailInput.value.trim().toLowerCase()
                : "";

            const password = passwordInput
                ? passwordInput.value
                : "";

            if (!email || !password) {
                showMessage("Please enter your email and password.");
                return;
            }

            // -----------------------------------
            // 3. FIND THE REGISTERED STUDENT
            // -----------------------------------

            let students = [];

            try {
                students = JSON.parse(
                    localStorage.getItem("smartAttendStudents") || "[]"
                );

                if (!Array.isArray(students)) {
                    students = [];
                }
            } catch (error) {
                showMessage("Could not read registered accounts.");
                return;
            }

            const student = students.find(function (item) {
                return (
                    item.email &&
                    item.email.trim().toLowerCase() === email &&
                    item.password === password
                );
            });

            if (!student) {
                showMessage(
                    "Incorrect email or password. Please check your details or create an account."
                );
                return;
            }

            // -----------------------------------
            // 4. SAVE THE CURRENT LOGIN SESSION
            // -----------------------------------

            sessionStorage.setItem(
                "smartAttendLoggedInStudent",
                JSON.stringify({
                    name: student.name || student.fullName || "Student",
                    email: student.email,
                    studentId: student.studentId || ""
                })
            );

            // -----------------------------------
            // 5. OPEN THE STUDENT DASHBOARD
            // -----------------------------------

            window.location.href = "student dashboard.html";
        });
    }

    // Display messages on the login page
    function showMessage(message) {
        if (loginMessage) {
            loginMessage.textContent = message;
        } else {
            alert(message);
        }
    }

    // -----------------------------------
    // 6. FORGOT PASSWORD MESSAGE
    // -----------------------------------

    const forgotPassword = document.getElementById("forgotPassword");

    if (forgotPassword) {
        forgotPassword.addEventListener("click", function (event) {
            event.preventDefault();

            showMessage(
                "Password recovery is not available yet. Please contact the administrator."
            );
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const message = document.getElementById('loginMessage');
  const button = form?.querySelector('.login-button');
  const password = document.getElementById('password');
  const toggle = document.getElementById('togglePassword');
  const API_URL = window.SMARTATTEND_API_URL || window.location.origin;
  const show = (text, ok = false) => { message.textContent = text; message.className = `login-message message${ok ? ' success' : ''}`; };
  toggle?.addEventListener('click', () => { const hidden = password.type === 'password'; password.type = hidden ? 'text' : 'password'; toggle.textContent = hidden ? 'HIDE' : 'SHOW'; });
  form?.addEventListener('submit', async event => {
    event.preventDefault(); show(''); button.disabled = true;
    const payload = { email: document.getElementById('email').value.trim().toLowerCase(), password: password.value, role: document.getElementById('role')?.value || 'student' };
    try {
      const response = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed.');
      if (data.user.role !== payload.role) throw new Error(`This account is registered as ${data.user.role}.`);
      localStorage.setItem('smartAttendUser', JSON.stringify(data.user));
      sessionStorage.setItem('smartAttendLoggedInStudent', JSON.stringify({ name: data.user.username, email: data.user.email, studentId: data.user.id }));
      show('Login successful. Opening your dashboard…', true);
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      setTimeout(() => { window.location.href = redirect || (data.user.role === 'lecturer' ? 'lecturer dashboard.html' : 'student dashboard.html'); }, 450);
    } catch (error) { show(error.message || 'Unable to reach the backend.'); button.disabled = false; }
  });

  if (window.THREE) {
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, .1, 100), renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('scene'), alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight); camera.position.z = 7;
    const points = [], geometry = new THREE.BufferGeometry(); for (let i = 0; i < 380; i++) points.push((Math.random() - .5) * 15, (Math.random() - .5) * 10, (Math.random() - .5) * 7);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); const material = new THREE.PointsMaterial({ color: 0x52f6dd, size: .025, transparent: true, opacity: .7 }); const stars = new THREE.Points(geometry, material); scene.add(stars);
    const mouse = { x: 0, y: 0 }; addEventListener('pointermove', e => { mouse.x = (e.clientX / innerWidth - .5) * .5; mouse.y = (e.clientY / innerHeight - .5) * .5; });
    const animate = () => { stars.rotation.y += .0008; stars.rotation.x += (mouse.y - stars.rotation.x) * .01; camera.position.x += (mouse.x - camera.position.x) * .01; renderer.render(scene, camera); requestAnimationFrame(animate); }; animate();
    addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  }
  const card = document.querySelector('[data-tilt]'); card?.addEventListener('pointermove', e => { const box = card.getBoundingClientRect(); card.style.transform = `perspective(900px) rotateX(${-(e.clientY - box.top - box.height / 2) / 35}deg) rotateY(${(e.clientX - box.left - box.width / 2) / 35}deg)`; }); card?.addEventListener('pointerleave', () => { card.style.transform = ''; });
});
