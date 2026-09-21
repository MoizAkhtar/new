const cursor = document.querySelector('.cursor');
const slides = [...document.querySelectorAll('.slide')];
const dots = [...document.querySelectorAll('.dot')];
let index = 0;
let timer;
let touchStart = 0;

const motionStyle = document.createElement('style');
motionStyle.textContent = `
  .visual { perspective: 900px; transform-style: preserve-3d; }
  .visual canvas { transition: filter .45s ease, opacity .45s ease; }
  .visual:hover canvas { filter: drop-shadow(0 0 28px #62f5ff99) brightness(1.18); }
  .slide { will-change: transform, opacity; }
  .slide.leaving { display: grid; animation: nebulaLeave .65s cubic-bezier(.7,0,.3,1) both; }
  .slide.entering { display: grid; animation: nebulaEnter .95s cubic-bezier(.16,1,.3,1) both; }
  @keyframes nebulaEnter { from { opacity: 0; transform: translate3d(8vw,0,-120px) scale(.9) rotateY(-8deg); filter: blur(10px); } to { opacity: 1; transform: none; filter: blur(0); } }
  @keyframes nebulaLeave { from { opacity: 1; transform: none; } to { opacity: 0; transform: translate3d(-8vw,0,-100px) scale(.92) rotateY(8deg); filter: blur(8px); } }
  @media (max-width:760px) { .slide.leaving,.slide.entering { display:block; } }
`;
document.head.appendChild(motionStyle);

window.addEventListener('pointermove', (event) => {
  if (cursor) { cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`; }
}, { passive: true });

function show(next, direction = 1) {
  const nextIndex = (next + slides.length) % slides.length;
  if (nextIndex === index || !slides.length) return;
  const oldSlide = slides[index];
  const newSlide = slides[nextIndex];
  oldSlide.classList.remove('active', 'entering');
  oldSlide.classList.add('leaving');
  newSlide.classList.remove('leaving');
  newSlide.classList.add('active', 'entering');
  index = nextIndex;
  dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  const current = document.querySelector('.current');
  if (current) current.textContent = String(index + 1).padStart(2, '0');
  setTimeout(() => { oldSlide.classList.remove('leaving'); newSlide.classList.remove('entering'); }, 980);
  // Give the current Three.js scene a short cinematic impulse.
  worlds.forEach(world => { world.burst = world.element.closest('.slide') === newSlide ? direction : 0; });
}
function autoplay() { clearInterval(timer); timer = setInterval(() => show(index + 1, 1), 6500); }
document.querySelector('.next')?.addEventListener('click', () => { show(index + 1, 1); autoplay(); });
document.querySelector('.prev')?.addEventListener('click', () => { show(index - 1, -1); autoplay(); });
dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i, i >= index ? 1 : -1); autoplay(); }));
document.querySelector('[data-go]')?.addEventListener('click', () => document.querySelector('.showcase')?.scrollIntoView({ behavior: 'smooth' }));
document.querySelector('.menu')?.addEventListener('click', () => document.querySelector('.topbar nav')?.classList.toggle('open'));
document.querySelector('.slider')?.addEventListener('touchstart', e => { touchStart = e.changedTouches[0].screenX; }, { passive: true });
document.querySelector('.slider')?.addEventListener('touchend', e => { const delta = e.changedTouches[0].screenX - touchStart; if (Math.abs(delta) > 45) show(index + (delta < 0 ? 1 : -1), delta < 0 ? 1 : -1); autoplay(); }, { passive: true });
autoplay();

const state = { mouseX: 0, mouseY: 0, targetX: 0, targetY: 0, scroll: window.scrollY, scrollVelocity: 0, previousScroll: window.scrollY };
window.addEventListener('pointermove', e => {
  state.targetX = (e.clientX / window.innerWidth - .5) * 2;
  state.targetY = (e.clientY / window.innerHeight - .5) * 2;
}, { passive: true });
window.addEventListener('scroll', () => { state.scroll = window.scrollY; }, { passive: true });

const worlds = [];
const threeScript = document.createElement('script');
threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
threeScript.onload = initThreeScenes;
threeScript.onerror = () => document.body.classList.add('three-unavailable');
document.head.appendChild(threeScript);

function makeParticleRing(color, radius, count = 100, y = 0, tilt = 0) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const wobble = (Math.random() - .5) * .055;
    positions.push(Math.cos(angle) * (radius + wobble), y + (Math.random() - .5) * .035, Math.sin(angle) * (radius + wobble));
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size: .028, transparent: true, opacity: .85, blending: THREE.AdditiveBlending }));
  points.rotation.x = tilt;
  return points;
}

function initThreeScenes() {
  const visuals = [...document.querySelectorAll('.visual')];
  const palette = [0x62f5ff, 0x8d71ff, 0x3478ff];
  visuals.forEach((element, sceneIndex) => {
    if (element.querySelector('canvas') || !window.THREE) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
    camera.position.set(0, 0, 5.2);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    element.appendChild(renderer.domElement);
    const color = palette[sceneIndex % palette.length];
    const wire = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: .82, blending: THREE.AdditiveBlending });
    const fill = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .055, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const group = new THREE.Group();
    const type = element.classList.contains('hero-orbit') ? 'hero' : element.classList.contains('contact-visual') ? 'contact' : element.closest('.slide')?.querySelector('.art-meta')?.textContent || '';
    let geometry = type.includes('PLATFORM') ? new THREE.BoxGeometry(1.55, 1.55, 1.55) : type.includes('COMPUTER') ? new THREE.SphereGeometry(1.15, 32, 20) : type === 'hero' || type === 'contact' ? new THREE.IcosahedronGeometry(1.08, 2) : new THREE.TorusKnotGeometry(1.02, .27, 128, 20);
    const object = new THREE.Mesh(geometry, wire);
    const inner = new THREE.Mesh(geometry.clone(), fill);
    inner.scale.setScalar(.93);
    group.add(object, inner);
    scene.add(group);

    // Multiple independently tilted rings create the layered orbit depth.
    const rings = [
      new THREE.Mesh(new THREE.TorusGeometry(1.42, .012, 8, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .72, blending: THREE.AdditiveBlending })),
      new THREE.Mesh(new THREE.TorusGeometry(1.72, .008, 8, 112), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .25, blending: THREE.AdditiveBlending })),
      new THREE.Mesh(new THREE.TorusGeometry(2.02, .006, 8, 128), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .3, blending: THREE.AdditiveBlending }))
    ];
    rings[0].rotation.set(.75, .18, -.35); rings[1].rotation.set(1.3, -.6, .45); rings[2].rotation.set(.25, .9, .8);
    rings.forEach(ring => scene.add(ring));
    const particleRings = [makeParticleRing(color, 1.48, 120, 0, .72), makeParticleRing(0xffffff, 1.78, 90, 0, 1.3), makeParticleRing(color, 2.05, 130, 0, .25)];
    particleRings.forEach(ring => scene.add(ring));
    const particles = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color, size: .018, transparent: true, opacity: .7, blending: THREE.AdditiveBlending }));
    const particlePositions = [];
    for (let i = 0; i < 280; i += 1) particlePositions.push((Math.random() - .5) * 5.4, (Math.random() - .5) * 5.4, (Math.random() - .5) * 3.6);
    particles.geometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    scene.add(particles);
    const resize = () => { const box = element.getBoundingClientRect(); renderer.setSize(Math.max(1, box.width), Math.max(1, box.height), false); camera.aspect = box.width / Math.max(1, box.height); camera.updateProjectionMatrix(); };
    resize(); new ResizeObserver(resize).observe(element);
    worlds.push({ element, scene, camera, renderer, group, rings, particleRings, particles, phase: Math.random() * 8, burst: 0 });
  });
  requestAnimationFrame(render);
}

function render(now) {
  requestAnimationFrame(render);
  state.mouseX += (state.targetX - state.mouseX) * .075;
  state.mouseY += (state.targetY - state.mouseY) * .075;
  state.scrollVelocity += ((state.scroll - state.previousScroll) - state.scrollVelocity) * .1;
  state.previousScroll += state.scrollVelocity;
  worlds.forEach(world => {
    const rect = world.element.getBoundingClientRect();
    if (rect.bottom < -150 || rect.top > window.innerHeight + 150) return;
    const speed = Math.min(2.2, 1 + Math.abs(state.scrollVelocity) * .018);
    const parallax = Math.min(1, Math.max(-1, -rect.top / window.innerHeight));
    world.group.rotation.y += (.006 + Math.abs(state.scrollVelocity) * .001) * speed;
    world.group.rotation.x += .002 + state.mouseY * .004;
    world.group.rotation.z += state.mouseX * .002;
    world.group.position.x += (state.mouseX * .38 - world.group.position.x) * .055;
    world.group.position.y += (-state.mouseY * .28 + parallax * .16 - world.group.position.y) * .045;
    const pulse = 1 + Math.sin(now * .0011 + world.phase) * .055 + Math.min(.25, Math.abs(state.scrollVelocity) * .008) + Math.abs(world.burst) * .05;
    world.group.scale.setScalar(pulse);
    world.rings.forEach((ring, i) => { ring.rotation.z += (.0015 + i * .0007) * speed * (i % 2 ? -1 : 1); ring.rotation.x += state.mouseY * .0008; });
    world.particleRings.forEach((ring, i) => { ring.rotation.y += (.002 + i * .0008) * speed * (i % 2 ? -1 : 1); ring.rotation.z += state.mouseX * .0005; });
    world.particles.rotation.y -= .0012 * speed; world.particles.rotation.x += .00045;
    world.burst *= .92;
    world.camera.position.x += (state.mouseX * .24 - world.camera.position.x) * .035;
    world.camera.position.y += (-state.mouseY * .16 - world.camera.position.y) * .035;
    world.camera.lookAt(0, 0, 0);
    world.renderer.render(world.scene, world.camera);
  });
}
