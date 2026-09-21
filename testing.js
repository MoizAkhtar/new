const cursor = document.querySelector('.cursor');
const slides = [...document.querySelectorAll('.slide')];
const dots = [...document.querySelectorAll('.dot')];
let index = 0;
let timer;

window.addEventListener('pointermove', (event) => {
  if (cursor) {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  }
}, { passive: true });

function show(next) {
  index = (next + slides.length) % slides.length;
  slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
  dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  const current = document.querySelector('.current');
  if (current) current.textContent = String(index + 1).padStart(2, '0');
}
function autoplay() {
  clearInterval(timer);
  timer = setInterval(() => show(index + 1), 6500);
}
document.querySelector('.next')?.addEventListener('click', () => { show(index + 1); autoplay(); });
document.querySelector('.prev')?.addEventListener('click', () => { show(index - 1); autoplay(); });
dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); autoplay(); }));
document.querySelector('[data-go]')?.addEventListener('click', () => document.querySelector('.showcase')?.scrollIntoView({ behavior: 'smooth' }));
document.querySelector('.menu')?.addEventListener('click', () => document.querySelector('.topbar nav')?.classList.toggle('open'));
let touchStart = 0;
document.querySelector('.slider')?.addEventListener('touchstart', e => { touchStart = e.changedTouches[0].screenX; }, { passive: true });
document.querySelector('.slider')?.addEventListener('touchend', e => { const delta = e.changedTouches[0].screenX - touchStart; if (Math.abs(delta) > 45) show(index + (delta < 0 ? 1 : -1)); autoplay(); }, { passive: true });
autoplay();

// Original Three.js motion system: inspired by interactive portfolio visuals, not copied assets or source.
const threeScript = document.createElement('script');
threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
threeScript.onload = initThreeScenes;
threeScript.onerror = () => document.body.classList.add('three-unavailable');
document.head.appendChild(threeScript);

const state = { mouseX: 0, mouseY: 0, targetX: 0, targetY: 0, scroll: 0, scrollVelocity: 0, previousScroll: window.scrollY };
window.addEventListener('pointermove', e => {
  state.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
  state.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });
window.addEventListener('scroll', () => { state.scroll = window.scrollY; }, { passive: true });

function initThreeScenes() {
  if (!window.THREE) return;
  const visuals = [...document.querySelectorAll('.visual')];
  const worlds = [];
  const palette = [0x62f5ff, 0x8d71ff, 0x3478ff];

  visuals.forEach((element, sceneIndex) => {
    if (element.querySelector('canvas')) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.z = 5.2;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    element.appendChild(renderer.domElement);

    const color = palette[sceneIndex % palette.length];
    const wire = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.72 });
    const glow = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
    const group = new THREE.Group();
    const type = element.classList.contains('hero-orbit') ? 'hero' : element.classList.contains('contact-visual') ? 'contact' : element.closest('.slide')?.querySelector('.art-meta')?.textContent || '';

    if (type === 'hero' || type === 'contact') {
      group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.16, 2), wire));
      group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 2), glow));
    } else if (type.includes('PLATFORM')) {
      group.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), wire));
      group.add(new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.45, 1.45), glow));
    } else if (type.includes('COMPUTER')) {
      group.add(new THREE.Mesh(new THREE.SphereGeometry(1.25, 28, 18), wire));
    } else {
      group.add(new THREE.Mesh(new THREE.TorusKnotGeometry(1.05, .28, 112, 18), wire));
      group.add(new THREE.Mesh(new THREE.TorusGeometry(1.55, .012, 8, 80), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .28 })));
    }
    scene.add(group);

    const particles = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ color, size: .018, transparent: true, opacity: .65 })
    );
    const particlePositions = [];
    for (let i = 0; i < 180; i += 1) particlePositions.push((Math.random() - .5) * 4.8, (Math.random() - .5) * 4.8, (Math.random() - .5) * 2.8);
    particles.geometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    scene.add(particles);

    const resize = () => {
      const box = element.getBoundingClientRect();
      const width = Math.max(1, box.width);
      const height = Math.max(1, box.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    new ResizeObserver(resize).observe(element);
    worlds.push({ element, scene, camera, renderer, group, particles, phase: Math.random() * 8 });
  });

  let last = performance.now();
  function render(now) {
    requestAnimationFrame(render);
    const delta = Math.min(32, now - last);
    last = now;
    state.mouseX += (state.targetX - state.mouseX) * .06;
    state.mouseY += (state.targetY - state.mouseY) * .06;
    state.scrollVelocity += ((state.scroll - state.previousScroll) - state.scrollVelocity) * .08;
    state.previousScroll += state.scrollVelocity;
    worlds.forEach(world => {
      const rect = world.element.getBoundingClientRect();
      const visible = rect.bottom > -100 && rect.top < window.innerHeight + 100;
      if (!visible) return;
      const intensity = Math.min(1.5, 1 + Math.abs(state.scrollVelocity) * .012);
      world.group.rotation.y += (.006 + Math.abs(state.scrollVelocity) * .0008) * intensity;
      world.group.rotation.x += (state.mouseY * .0015) + .002;
      world.group.rotation.z += state.mouseX * .0012;
      world.group.position.x += (state.mouseX * .18 - world.group.position.x) * .035;
      world.group.position.y += (-state.mouseY * .14 - world.group.position.y) * .035;
      world.group.scale.setScalar(1 + Math.sin(now * .0012 + world.phase) * .045 + Math.min(.16, Math.abs(state.scrollVelocity) * .004));
      world.particles.rotation.y -= .0008;
      world.particles.rotation.x += .00035;
      world.renderer.render(world.scene, world.camera);
    });
  }
  requestAnimationFrame(render);
}
