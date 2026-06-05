/**
 * HTML Export
 * ───────────
 * Builds a self-contained HTML file from a generated website config.
 * Embeds Three.js via CDN for portability.
 */

import type { GeneratedWebsite, Business, SceneType } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getSceneScript(sceneType: SceneType, _palette?: GeneratedWebsite["color_palette"]): string {
  const scenes: Record<SceneType, string> = {
    tropical: `
      const geometry = new THREE.IcosahedronGeometry(1.5, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0xF59E0B, metalness: 0.3, roughness: 0.7 });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Palm-like particles
      const particles = new THREE.BufferGeometry();
      const count = 800;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i*3]   = (Math.random()-0.5)*20;
        positions[i*3+1] = (Math.random()-0.5)*20;
        positions[i*3+2] = (Math.random()-0.5)*20;
      }
      particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pMat = new THREE.PointsMaterial({ color: 0xFFD700, size: 0.05 });
      scene.add(new THREE.Points(particles, pMat));

      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      const dir = new THREE.DirectionalLight(0xF59E0B, 1.5);
      dir.position.set(5,5,5);
      scene.add(ambient, dir);

      camera.position.set(0, 0, 5);
      function animate() {
        requestAnimationFrame(animate);
        mesh.rotation.y += 0.003;
        renderer.render(scene, camera);
      }
      animate();`,

    mountain: `
      const geo = new THREE.ConeGeometry(2, 3, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x4A90D9, wireframe: true });
      const mountain = new THREE.Mesh(geo, mat);
      scene.add(mountain);
      const fog = new THREE.Fog(0x0a0a1f, 8, 25);
      scene.fog = fog;
      const ambient = new THREE.AmbientLight(0x3B82F6, 0.8);
      const dir = new THREE.DirectionalLight(0xffffff, 1);
      dir.position.set(-5,8,3);
      scene.add(ambient, dir);
      camera.position.set(0,2,6);
      let t = 0;
      function animate() {
        requestAnimationFrame(animate);
        t += 0.005;
        camera.position.y = 2 + Math.sin(t) * 0.3;
        mountain.rotation.y += 0.002;
        renderer.render(scene, camera);
      }
      animate();`,

    urban: `
      const group = new THREE.Group();
      for (let i = 0; i < 20; i++) {
        const h = Math.random()*3+0.5;
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(0.3,h,0.3),
          new THREE.MeshStandardMaterial({ color: 0x1E3A5F, emissive: 0x0066FF, emissiveIntensity: 0.3 })
        );
        b.position.set((Math.random()-0.5)*6, h/2-1.5, (Math.random()-0.5)*6);
        group.add(b);
      }
      scene.add(group);
      const ambient = new THREE.AmbientLight(0x111133, 1);
      const point = new THREE.PointLight(0x00AAFF, 2, 10);
      point.position.set(0,3,2);
      scene.add(ambient, point);
      camera.position.set(0,1,6);
      function animate() {
        requestAnimationFrame(animate);
        group.rotation.y += 0.002;
        renderer.render(scene, camera);
      }
      animate();`,

    coastal: `
      const waveGeo = new THREE.PlaneGeometry(20, 20, 60, 60);
      const waveMat = new THREE.MeshStandardMaterial({ color: 0x0EA5E9, wireframe: true, opacity: 0.7, transparent: true });
      const wave = new THREE.Mesh(waveGeo, waveMat);
      wave.rotation.x = -Math.PI/2;
      scene.add(wave);
      const ambient = new THREE.AmbientLight(0x0EA5E9, 0.8);
      const dir = new THREE.DirectionalLight(0xffffff, 1);
      dir.position.set(0,10,5);
      scene.add(ambient, dir);
      camera.position.set(0,3,7);
      camera.lookAt(0,0,0);
      let t = 0;
      function animate() {
        requestAnimationFrame(animate);
        t += 0.02;
        const pos = waveGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i); const y = pos.getY(i);
          pos.setZ(i, Math.sin(x*0.5+t)*0.3 + Math.cos(y*0.5+t)*0.3);
        }
        pos.needsUpdate = true;
        renderer.render(scene, camera);
      }
      animate();`,

    jungle: `
      const group = new THREE.Group();
      const shades = [0x1a472a, 0x2d6a4f, 0x40916c, 0x52b788];
      for (let i = 0; i < 15; i++) {
        const geo = new THREE.SphereGeometry(Math.random()*0.8+0.3, 8, 8);
        const mat = new THREE.MeshStandardMaterial({ color: shades[Math.floor(Math.random()*shades.length)] });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((Math.random()-0.5)*8, (Math.random()-0.5)*4, (Math.random()-0.5)*8);
        group.add(mesh);
      }
      scene.add(group);
      const fog = new THREE.Fog(0x0a1f0a, 5, 20);
      scene.fog = fog;
      const ambient = new THREE.AmbientLight(0x2d6a4f, 1.2);
      const dir = new THREE.DirectionalLight(0x90FF90, 0.8);
      dir.position.set(3,8,3);
      scene.add(ambient, dir);
      camera.position.set(0,1,6);
      function animate() {
        requestAnimationFrame(animate);
        group.rotation.y += 0.001;
        renderer.render(scene, camera);
      }
      animate();`,
  };

  return scenes[sceneType] ?? scenes.tropical;
}

export function buildHtmlExport(
  website: GeneratedWebsite,
  business: Business
): string {
  const { tagline, about_text, features, color_palette, opening_message, scene_type } = website;
  const { name, city, country, rating } = business;
  const pal = color_palette;

  const featureHTML = (features ?? [])
    .map(
      (f) => `
    <div class="feature-card">
      <div class="feature-icon">${f.icon}</div>
      <h3 class="feature-title">${f.title}</h3>
      <p class="feature-desc">${f.description}</p>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name} — ${city}, ${country}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --primary: ${pal?.primary ?? "#10B981"};
    --accent:  ${pal?.accent  ?? "#F59E0B"};
    --bg:      ${pal?.background ?? "#0A0A0F"};
    --text:    ${pal?.text    ?? "#F8F8FF"};
  }
  body { font-family: 'Georgia', serif; background: var(--bg); color: var(--text); }
  #hero { position: relative; width: 100%; height: 100vh; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  #three-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .hero-overlay { position: relative; z-index: 2; text-align: center; padding: 2rem; }
  .hero-badge { display: inline-block; padding: 0.4rem 1rem; border: 1px solid var(--accent); color: var(--accent); font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 1.5rem; border-radius: 999px; }
  .hero-name { font-size: clamp(2.5rem,7vw,5rem); font-weight: 700; line-height: 1.1; margin-bottom: 1rem; }
  .hero-tagline { font-size: clamp(1rem,2.5vw,1.5rem); opacity: 0.85; max-width: 600px; margin: 0 auto 2rem; }
  .hero-cta { display: inline-block; padding: 0.9rem 2.5rem; background: var(--primary); color: #fff; text-decoration: none; border-radius: 8px; font-size: 1rem; font-weight: 600; transition: opacity 0.2s; }
  .hero-cta:hover { opacity: 0.9; }
  section { padding: 5rem 2rem; max-width: 1100px; margin: 0 auto; }
  .section-label { font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); margin-bottom: 1rem; }
  .section-title { font-size: 2.5rem; font-weight: 700; margin-bottom: 1.5rem; }
  .about-text { font-size: 1.15rem; line-height: 1.8; opacity: 0.85; max-width: 700px; }
  .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
  .feature-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 2rem; transition: transform 0.2s; }
  .feature-card:hover { transform: translateY(-4px); }
  .feature-icon { font-size: 2.5rem; margin-bottom: 1rem; }
  .feature-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
  .feature-desc { opacity: 0.75; font-size: 0.9rem; line-height: 1.6; }
  .opening-banner { background: linear-gradient(135deg, var(--primary), var(--accent)); padding: 3rem 2rem; text-align: center; }
  .opening-banner p { font-size: 1.4rem; font-weight: 600; }
  footer { text-align: center; padding: 2rem; opacity: 0.4; font-size: 0.85rem; }
  @media (max-width: 768px) { .features-grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>

<section id="hero">
  <canvas id="three-canvas"></canvas>
  <div class="hero-overlay">
    <div class="hero-badge">Now Open · ${city}, ${country}</div>
    <h1 class="hero-name">${name}</h1>
    <p class="hero-tagline">${tagline ?? ""}</p>
    <a href="#about" class="hero-cta">Discover More</a>
  </div>
</section>

${opening_message ? `<div class="opening-banner"><p>✨ ${opening_message}</p></div>` : ""}

<section id="about">
  <div class="section-label">Our Story</div>
  <h2 class="section-title">Welcome to ${name}</h2>
  <p class="about-text">${about_text ?? ""}</p>
</section>

<section id="features">
  <div class="section-label">What We Offer</div>
  <h2 class="section-title">Experience the Difference</h2>
  <div class="features-grid">${featureHTML}</div>
</section>

<section id="contact">
  <div class="section-label">Find Us</div>
  <h2 class="section-title">Visit ${name}</h2>
  <p class="about-text">${city}, ${country}${rating ? ` · Rated ${rating}/5` : ""}</p>
</section>

<footer>© ${new Date().getFullYear()} ${name} · Built with SEA New Openings</footer>

<script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
${getSceneScript(scene_type, pal)}
</script>
</body>
</html>`;
}
