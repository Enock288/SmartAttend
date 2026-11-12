(function () {
  function startCyberScene() {
    const canvas = document.getElementById("cyberScene");
    if (!canvas || !window.THREE) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 100);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(innerWidth, innerHeight);
    camera.position.z = 7;
    const group = new THREE.Group();
    const palette = document.body.classList.contains("lecturer-theme") ? 0x8b5cf6 : 0x22d3ee;
    const material = new THREE.MeshBasicMaterial({ color: palette, wireframe: true, transparent: true, opacity: .34 });
    for (let i = 0; i < 20; i++) {
      const node = new THREE.Mesh(new THREE.IcosahedronGeometry(.14 + Math.random() * .28, 1), material);
      node.position.set((Math.random() - .5) * 12, (Math.random() - .5) * 8, (Math.random() - .5) * 4);
      group.add(node);
    }
    scene.add(group);
    let targetX = 0, targetY = 0;
    addEventListener("pointermove", event => { targetX = (event.clientX / innerWidth - .5) * .65; targetY = (event.clientY / innerHeight - .5) * .45; });
    addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
    function animate() { group.rotation.y += .0012; group.rotation.x += .0004; camera.position.x += (targetX - camera.position.x) * .025; camera.position.y += (-targetY - camera.position.y) * .025; renderer.render(scene, camera); requestAnimationFrame(animate); }
    animate();
  }

  function startTiltCards() {
    const cards = document.querySelectorAll(".card, .panel, .content-card, .stat-card, .insight-card, .feature-showcase, .benefit-card, .step-card, .welcome-section");
    cards.forEach(card => {
      card.addEventListener("pointermove", event => {
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - .5;
        const y = (event.clientY - bounds.top) / bounds.height - .5;
        card.style.setProperty("--tilt-x", `${(-y * 4).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${(x * 4).toFixed(2)}deg`);
        card.classList.add("cyber-hover");
      });
      card.addEventListener("pointerleave", () => { card.style.setProperty("--tilt-x", "0deg"); card.style.setProperty("--tilt-y", "0deg"); card.classList.remove("cyber-hover"); });
    });
  }

  document.addEventListener("DOMContentLoaded", () => { startCyberScene(); startTiltCards(); });
})();
