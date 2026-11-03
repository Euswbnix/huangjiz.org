// Starfield background, taken from huangjiz.com (Euswbnix/Euswbnix.github.io, initStarfield).
// Differences from there: it fills the window instead of the hero section, and with
// prefers-reduced-motion it draws one still frame instead of animating.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

(function initStarfield() {
  const container = document.getElementById('fx-bg');
  if (!container) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = window.innerWidth, h = window.innerHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
  camera.position.z = 1;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const starCount = 18000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(starCount * 3);
  const col = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const twinklePhase = new Float32Array(starCount);
  const twinkleSpeed = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const r = 300 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i3 + 2] = r * Math.cos(phi);

    const temp = Math.random();
    if (temp < 0.15) {
      col[i3] = 1.0; col[i3+1] = 0.85 + Math.random()*0.1; col[i3+2] = 0.7 + Math.random()*0.15;
    } else if (temp < 0.35) {
      col[i3] = 0.9 + Math.random()*0.1; col[i3+1] = 0.9 + Math.random()*0.1; col[i3+2] = 1.0;
    } else {
      col[i3] = 0.7 + Math.random()*0.3; col[i3+1] = 0.8 + Math.random()*0.2; col[i3+2] = 1.0;
    }
    const base = 0.18 + Math.pow(Math.random(), 2.7) * 2.1;
    const rareBoost = Math.random() < 0.025 ? 0.8 + Math.random() * 1.6 : 0;
    sizes[i] = base + rareBoost;
    twinklePhase[i] = Math.random() * Math.PI * 2.0;
    twinkleSpeed[i] = 0.015 + Math.random() * 0.05;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('twinklePhase', new THREE.BufferAttribute(twinklePhase, 1));
  geo.setAttribute('twinkleSpeed', new THREE.BufferAttribute(twinkleSpeed, 1));

  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute float size;
      attribute float twinklePhase;
      attribute float twinkleSpeed;
      varying vec3 vColor;
      varying float vSize;
      uniform float uTime;
      void main() {
        vColor = color;
        vSize = size;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float twinkle = 0.84 + 0.16 * sin(uTime * twinkleSpeed + twinklePhase);
        gl_PointSize = size * twinkle * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vSize;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float alpha = 1.0 - smoothstep(0.0, 1.0, d);
        alpha *= 0.85;
        if (vSize > 1.0) {
          float glow = exp(-d * d * 1.5) * 0.4;
          alpha += glow;
        }
        gl_FragColor = vec4(vColor, alpha);
      }
    `
  });
  const stars = new THREE.Points(geo, starMat);
  scene.add(stars);

  const galaxyGeo = new THREE.SphereGeometry(350, 64, 64);
  const galaxyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPos;
      void main() {
        vUv = uv;
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vPos;
      uniform float uTime;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }
      void main() {
        float dist = abs(vUv.x - 0.48);
        float band = exp(-pow(dist * 7.0, 2.0));

        float n = noise(vUv * 12.0) * 0.5 + noise(vUv * 24.0) * 0.25 + noise(vUv * 48.0) * 0.125;
        band *= (0.6 + n * 0.8);

        vec3 deepBlue = vec3(0.03, 0.06, 0.25);
        vec3 brightBlue = vec3(0.15, 0.25, 0.65);
        vec3 white = vec3(0.7, 0.75, 0.9);

        float coreDist = distance(vUv, vec2(0.48, 0.55));
        float core = exp(-pow(coreDist * 8.0, 2.0));

        vec3 color = mix(deepBlue, brightBlue, band);
        color = mix(color, white, core * 0.7);
        color += vec3(0.1, 0.15, 0.4) * noise(vUv * 6.0 + uTime * 0.01) * band * 0.5;

        float dustDark = noise(vUv * 15.0 + 3.0);
        color *= 1.0 - dustDark * 0.25 * band;

        float alpha = band * 0.65 + core * 0.4;

        gl_FragColor = vec4(color, alpha);
      }
    `
  });
  const galaxy = new THREE.Mesh(galaxyGeo, galaxyMat);
  galaxy.rotation.z = 0.3;
  scene.add(galaxy);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85);
  bloom.threshold = 0.15;
  bloom.strength = 1.0;
  bloom.radius = 0.6;
  composer.addPass(bloom);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const meteors = [];
  let nextMeteorAt = 0;
  window.addEventListener('pointermove', e => {
    mouse.tx = ((e.clientX / w) - 0.5) * 0.08;
    mouse.ty = ((e.clientY / h) - 0.5) * 0.05;
  });

  function spawnMeteor(now) {
    const segments = 48;
    // Realistic meteor angle: diagonal, upper area to lower, slight variation
    const baseAngle = -(Math.PI * 0.18 + Math.random() * Math.PI * 0.14);
    const vx = Math.cos(baseAngle);
    const vy = Math.sin(baseAngle);
    const speed = 0.7 + Math.random() * 0.6;
    const trailLen = 18 + Math.random() * 22;
    const z = -80 - Math.random() * 80;

    const posArr = new Float32Array((segments + 1) * 3);
    const colArr = new Float32Array((segments + 1) * 3);

    // Derive spawn bounds from the camera frustum at this depth so meteors
    // are always visible regardless of aspect ratio (portrait mobile vs landscape desktop).
    const dist = Math.abs(camera.position.z - z);
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    const halfW = halfH * camera.aspect;
    // Spawn anywhere across the full width, in the upper ~40% of the frame
    const sx = (Math.random() - 0.5) * halfW * 2.2;
    const sy = halfH * (0.15 + Math.random() * 0.4);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments; // 0 = tail, 1 = head
      posArr[i*3]   = sx - vx * trailLen * (1 - t);
      posArr[i*3+1] = sy - vy * trailLen * (1 - t);
      posArr[i*3+2] = z;
      const b = Math.pow(t, 1.8);
      colArr[i*3]   = b * 0.88;
      colArr[i*3+1] = b * 0.92;
      colArr[i*3+2] = b * 1.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colArr, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const line = new THREE.Line(geo, mat);
    scene.add(line);

    meteors.push({ line, geo, mat, vx: vx * speed, vy: vy * speed, born: now, life: 700 + Math.random() * 500 });
  }

  function onResize() {
    w = window.innerWidth; h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    if (still) composer.render();
  }
  window.addEventListener('resize', onResize);

  function animate(t) {
    if (!still) requestAnimationFrame(animate);
    const time = t * 0.001;
    starMat.uniforms.uTime.value = time;
    galaxyMat.uniforms.uTime.value = time;

    stars.rotation.y += 0.00015;
    stars.rotation.x += 0.00005;

    mouse.x += (mouse.tx - mouse.x) * 0.03;
    mouse.y += (mouse.ty - mouse.y) * 0.03;
    camera.rotation.y = mouse.x;
    camera.rotation.x = mouse.y;

    const nowMs = t || performance.now();
    if (!still && nowMs > nextMeteorAt) {
      if (Math.random() < 0.62) spawnMeteor(nowMs);
      nextMeteorAt = nowMs + 5200 + Math.random() * 6800;
    }

    for (let i = meteors.length - 1; i >= 0; i -= 1) {
      const m = meteors[i];
      const age = nowMs - m.born;
      if (age > m.life) {
        scene.remove(m.line);
        m.geo.dispose();
        m.mat.dispose();
        meteors.splice(i, 1);
        continue;
      }
      const k = age / m.life;
      const opacity = k < 0.08 ? k / 0.08 : Math.pow(1 - k, 1.6);
      m.mat.opacity = opacity * 0.9;
      m.line.position.x += m.vx;
      m.line.position.y += m.vy;
    }

    composer.render();
  }

  // A failed WebGL context throws above, leaving the CSS gradient on #fx-bg as the background.
  requestAnimationFrame(animate);
})();
