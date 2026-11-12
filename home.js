document.addEventListener("DOMContentLoaded", function () {

    // Lightweight responsive 2D canvas background; no Three.js or geometry nodes.
    const background = document.getElementById("homeBackground");
    if (background) {
        const context = background.getContext("2d");
        let width = 0, height = 0, pointerX = .5, pointerY = .5;
        const resize = () => { const ratio = Math.min(devicePixelRatio || 1, 2); width = innerWidth; height = innerHeight; background.width = width * ratio; background.height = height * ratio; background.style.width = `${width}px`; background.style.height = `${height}px`; context.setTransform(ratio, 0, 0, ratio, 0, 0); };
        const draw = time => { const t = time * .00002; const gradient = context.createLinearGradient(0, 0, width, height); gradient.addColorStop(0, "#071a2f"); gradient.addColorStop(.5, `hsl(${190 + Math.sin(t) * 12}, 68%, 13%)`); gradient.addColorStop(1, "#101b3b"); context.fillStyle = gradient; context.fillRect(0, 0, width, height); for (let i = 0; i < 18; i++) { const x = ((i * 173 + time * .012 * (i % 3 + 1)) % (width + 140)) - 70 + (pointerX - .5) * 24; const y = ((i * 97 + time * .008 * (i % 2 + 1)) % (height + 140)) - 70 + (pointerY - .5) * 18; const radius = 70 + (i % 4) * 24; const glow = context.createRadialGradient(x, y, 0, x, y, radius); glow.addColorStop(0, i % 2 ? "rgba(45, 212, 191, .13)" : "rgba(56, 189, 248, .11)"); glow.addColorStop(1, "rgba(15, 23, 42, 0)"); context.fillStyle = glow; context.fillRect(x - radius, y - radius, radius * 2, radius * 2); } requestAnimationFrame(draw); };
        addEventListener("resize", resize); addEventListener("pointermove", event => { pointerX = event.clientX / innerWidth; pointerY = event.clientY / innerHeight; }); resize(); requestAnimationFrame(draw);
    }

    // =====================================
    // 1. FEATURE SHOWCASE
    // =====================================

    const features = [
        {
            icon: "📷",
            tag: "FAST & SIMPLE",
            title: "Instant QR Check-in",
            description:
                "Scan a session QR code to record attendance quickly and conveniently."
        },
        {
            icon: "📊",
            tag: "TRACK YOUR PROGRESS",
            title: "Attendance Insights",
            description:
                "View your attendance records and understand your class attendance patterns."
        },
        {
            icon: "📚",
            tag: "STAY ORGANIZED",
            title: "Manage Your Courses",
            description:
                "Keep your courses organized and make it easier to keep track of your classes."
        },
        {
            icon: "🔒",
            tag: "YOUR ACCOUNT",
            title: "Personal Student Profile",
            description:
                "Access your student information and manage your profile in one convenient place."
        }
    ];

    let currentFeature = 0;

    const featureIcon = document.getElementById("featureIcon");
    const featureTag = document.getElementById("featureTag");
    const featureTitle = document.getElementById("featureTitle");
    const featureDescription =
        document.getElementById("featureDescription");

    const prevButton = document.getElementById("prevFeature");
    const nextButton = document.getElementById("nextFeature");
    const featureDots = document.querySelectorAll(".feature-dot");

    function showFeature(index) {
    currentFeature = (index + features.length) % features.length;

    const showcase = document.getElementById("featureShowcase");

    function updateFeature() {
        const feature = features[currentFeature];

        if (featureIcon) featureIcon.textContent = feature.icon;
        if (featureTag) featureTag.textContent = feature.tag;
        if (featureTitle) featureTitle.textContent = feature.title;
        if (featureDescription) {
            featureDescription.textContent = feature.description;
        }

        featureDots.forEach(function (dot, dotIndex) {
            const isActive = dotIndex === currentFeature;

            dot.classList.toggle("active", isActive);
            dot.setAttribute("aria-pressed", String(isActive));
        });

        if (showcase) {
            showcase.classList.remove("feature-changing");
        }
    }

    if (showcase) {
        showcase.classList.add("feature-changing");
        setTimeout(updateFeature, 400);
    } else {
        updateFeature();
    }
}

    if (prevButton) {
        prevButton.addEventListener("click", function () {
            showFeature(currentFeature - 1);
        });
    }

    if (nextButton) {
        nextButton.addEventListener("click", function () {
            showFeature(currentFeature + 1);
        });
    }

    featureDots.forEach(function (dot, index) {
        dot.addEventListener("click", function () {
            showFeature(index);
        });
    });

    // Start with the first feature.
showFeature(0);

// Automatically switch features every 4 seconds.
let featureTimer = setInterval(function () {
    showFeature(currentFeature + 1);
}, 4000);

// Pause the automatic slideshow when the user hovers over it.
const showcase = document.getElementById("featureShowcase");

if (showcase) {
    showcase.addEventListener("mouseenter", function () {
        clearInterval(featureTimer);
    });

    showcase.addEventListener("mouseleave", function () {
        clearInterval(featureTimer);

        featureTimer = setInterval(function () {
            showFeature(currentFeature + 1);
        }, 4000);
    });
}


    // =====================================
    // 2. QR CHECK-IN BUTTON
    // =====================================

    const qrButton = document.getElementById("qrButton");

    if (qrButton) {
        qrButton.addEventListener("click", function () {
            const savedSession = sessionStorage.getItem("smartAttendLoggedInStudent") || localStorage.getItem("smartAttendUser");

            if (savedSession) {
                // Student has a session: open the dashboard's scan section.
                window.location.href =
                    "student-dashboard.html#scan";
            } else {
                // Student needs to sign in first.
                window.location.href = "login.html";
            }
        });
    }


    // =====================================
    // 3. NAVIGATION LINKS
    // =====================================

    const studentLinks = document.querySelectorAll(
        'a[href="student-dashboard.html"]'
    );

    studentLinks.forEach(function (link) {
        link.addEventListener("click", function (event) {
            const savedSession = sessionStorage.getItem("smartAttendLoggedInStudent") || localStorage.getItem("smartAttendUser");

            if (!savedSession) {
                event.preventDefault();
                window.location.href = "login.html";
            }
        });
    });


    // =====================================
    // 4. UPDATE LOGIN LINKS
    // =====================================

    const loginLinks = document.querySelectorAll(
        'a[href="login.html"]'
    );

    loginLinks.forEach(function (link) {
        const savedSession = sessionStorage.getItem(
            "smartAttendLoggedInStudent"
        );

        if (savedSession && link.textContent.trim().toLowerCase() === "get started") {
            link.href = "student-dashboard.html";
            link.textContent = "My Dashboard";
        }
    });


    // =====================================
    // 5. SMOOTH SCROLL FOR PAGE SECTIONS
    // =====================================

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener("click", function (event) {
            const targetId = link.getAttribute("href");

            if (!targetId || targetId === "#") {
                return;
            }

            const target = document.querySelector(targetId);

            if (target) {
                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });

});
