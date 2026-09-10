(function () {
  'use strict';

  const scene = new THREE.Scene();
  const clock = new THREE.Clock();
  scene.background = new THREE.Color(0x83c9f4);
  scene.fog = new THREE.Fog(0x83c9f4, 28, 92);

  const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xeaf8ff, 0x46673c, 1.55));
  const sun = new THREE.DirectionalLight(0xfff0c0, 2.25);
  sun.position.set(-8, 18, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  scene.add(sun);

  function noiseTexture(base, seed) {
    const size = 128, canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    let n = seed >>> 0;
    function rnd() { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    const c = new THREE.Color(base);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const f = 0.8 + rnd() * 0.34;
      ctx.fillStyle = `rgb(${Math.min(255, c.r * 255 * f) | 0},${Math.min(255, c.g * 255 * f) | 0},${Math.min(255, c.b * 255 * f) | 0})`;
      ctx.fillRect(x, y, 1, 1);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
  }

  function bumpTexture(seed) {
    const size = 128, canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    let n = seed >>> 0;
    function rnd() { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    ctx.fillStyle = '#777'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4200; i++) {
      const gray = 65 + (rnd() * 150 | 0);
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      const x = rnd() * size, y = rnd() * size, length = 1 + rnd() * 4;
      ctx.fillRect(x, y, 1, length);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  function material(color, roughness, textured) {
    const options = { color, roughness: roughness === undefined ? 0.88 : roughness, metalness: 0 };
    if (textured) {
      options.map = noiseTexture(color, textured);
      options.color = 0xffffff;
      options.bumpMap = bumpTexture(textured + 91);
      options.bumpScale = 0.035;
    }
    return new THREE.MeshStandardMaterial(options);
  }

  const MAT = {
    fur: material(0xd99b12, 1, 801),
    furLight: material(0xe5aa22, 1, 467),
    muzzle: material(0xe9c7a2, 0.82),
    muzzleDark: material(0x9e6848, 0.9),
    horn: material(0x81705a, 0.72, 94),
    hornTip: material(0x514538, 0.75),
    eyeWhite: material(0xf8edcf, 0.55),
    eye: material(0x251408, 0.35),
    brow: material(0x704309, 0.9),
    innerEar: material(0xbb6e28, 0.95),
    hoof: material(0x5c482f, 0.82),
  };

  function mesh(geometry, mat, pos, scale) {
    const value = new THREE.Mesh(geometry, mat);
    if (pos) value.position.set(pos[0], pos[1], pos[2]);
    if (scale) value.scale.set(scale[0], scale[1], scale[2]);
    value.castShadow = true;
    value.receiveShadow = true;
    return value;
  }

  function ball(mat, pos, scale, segments) {
    return mesh(new THREE.SphereGeometry(1, segments || 32, segments ? Math.floor(segments * 0.7) : 22), mat, pos, scale);
  }

  function capsule(mat, radius, length, pos) {
    return mesh(new THREE.CapsuleGeometry(radius, length, 10, 20), mat, pos);
  }

  function tube(mat, points, radius) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
    return mesh(new THREE.TubeGeometry(curve, 18, radius, 8, false), mat);
  }

  function buildBull() {
    const root = new THREE.Group();
    const model = new THREE.Group();
    root.add(model);

    // 身体比例来自参考图：宽肩、圆腹、短腿，整体保持动画电影式圆润轮廓。
    model.add(ball(MAT.fur, [0, 1.02, 0.03], [0.42, 0.67, 0.30]));
    model.add(ball(MAT.furLight, [0, 1.02, -0.268], [0.29, 0.43, 0.022]));
    model.add(ball(MAT.fur, [0, 1.47, 0], [0.37, 0.23, 0.26]));

    const head = new THREE.Group();
    head.position.set(0, 1.75, -0.04);
    model.add(head);
    head.add(ball(MAT.fur, [0, 0.12, 0], [0.45, 0.43, 0.38]));
    head.add(ball(MAT.furLight, [0, 0.39, -0.1], [0.31, 0.13, 0.23]));

    // 浅桃色的大口鼻明显向前突出。
    head.add(ball(MAT.muzzle, [0, -0.04, -0.38], [0.31, 0.18, 0.16], 36));
    head.add(ball(MAT.muzzleDark, [-0.10, 0.0, -0.525], [0.052, 0.032, 0.018], 20));
    head.add(ball(MAT.muzzleDark, [0.10, 0.0, -0.525], [0.052, 0.032, 0.018], 20));
    head.add(tube(MAT.muzzleDark, [[-0.11, -0.105, -0.515], [0, -0.125, -0.525], [0.12, -0.105, -0.515]], 0.012));

    // 半眯眼、低眉和小瞳孔是参考图最重要的神态。
    [-1, 1].forEach(side => {
      head.add(ball(MAT.eyeWhite, [side * 0.17, 0.18, -0.37], [0.105, 0.058, 0.035], 24));
      head.add(ball(MAT.eye, [side * 0.15, 0.175, -0.405], [0.031, 0.041, 0.018], 18));
      head.add(ball(MAT.fur, [side * 0.17, 0.225, -0.397], [0.12, 0.045, 0.024], 22));
      const innerX = side * 0.07, outerX = side * 0.27;
      head.add(tube(MAT.brow, [[innerX, 0.29, -0.39], [side * 0.17, 0.305, -0.405], [outerX, 0.29, -0.38]], 0.018));

      const ear = new THREE.Group();
      ear.position.set(side * 0.43, 0.18, -0.01);
      ear.rotation.z = side * -0.12;
      ear.add(ball(MAT.fur, [side * 0.11, 0, 0], [0.22, 0.09, 0.085], 26));
      ear.add(ball(MAT.innerEar, [side * 0.13, 0, -0.076], [0.135, 0.045, 0.016], 22));
      head.add(ear);

      const hornPoints = side < 0
        ? [[-0.23, 0.39, 0.02], [-0.30, 0.5, 0.03], [-0.31, 0.64, 0.02]]
        : [[0.23, 0.39, 0.02], [0.30, 0.5, 0.03], [0.31, 0.64, 0.02]];
      head.add(tube(MAT.horn, hornPoints, 0.065));
      const tip = mesh(new THREE.ConeGeometry(0.055, 0.15, 12), MAT.hornTip, [side * 0.31, 0.71, 0.02]);
      tip.rotation.z = side * -0.08;
      head.add(tip);
    });

    function arm(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.39, 1.42, 0);
      pivot.rotation.z = side * 0.07;
      pivot.add(capsule(MAT.fur, 0.105, 0.34, [0, -0.20, 0]));
      const lower = new THREE.Group(); lower.position.y = -0.39;
      lower.add(capsule(MAT.fur, 0.09, 0.27, [0, -0.16, 0]));
      lower.add(ball(MAT.furLight, [0, -0.34, -0.015], [0.11, 0.13, 0.09], 22));
      lower.add(ball(MAT.hoof, [side * -0.042, -0.405, -0.035], [0.043, 0.075, 0.055], 18));
      lower.add(ball(MAT.hoof, [side * 0.042, -0.405, -0.035], [0.043, 0.075, 0.055], 18));
      pivot.add(lower); pivot.userData.lower = lower; model.add(pivot); return pivot;
    }

    function leg(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.16, 0.69, 0.03);
      pivot.add(capsule(MAT.fur, 0.13, 0.32, [0, -0.19, 0]));
      const lower = new THREE.Group(); lower.position.y = -0.41;
      lower.add(capsule(MAT.fur, 0.11, 0.24, [0, -0.14, 0]));
      lower.add(ball(MAT.hoof, [0, -0.31, -0.035], [0.14, 0.095, 0.17], 24));
      lower.add(tube(MAT.hornTip, [[0, -0.34, -0.195], [0, -0.33, -0.12]], 0.009));
      pivot.add(lower); pivot.userData.lower = lower; model.add(pivot); return pivot;
    }

    const armL = arm(-1), armR = arm(1), legL = leg(-1), legR = leg(1);

    const tail = new THREE.Group(); tail.position.set(0, 1.16, 0.27); tail.rotation.x = -0.55;
    tail.add(capsule(MAT.fur, 0.03, 0.26, [0, -0.15, 0]));
    tail.add(ball(MAT.furLight, [0, -0.34, 0], [0.075, 0.1, 0.07], 20));
    model.add(tail);

    root.userData.parts = { model, head, armL, armR, legL, legR, tail };
    root.scale.setScalar(1.12);
    return root;
  }

  const platforms = [], collectibles = [], keys = {};
  const player = { pos: new THREE.Vector3(-5, 2, 0), vel: new THREE.Vector3(), grounded: false, stars: 0, yaw: 0 };
  let started = false, won = false, orbit = 0, runTime = 0;

  const groundMat = material(0x5cac52, 0.92);
  const dirtMat = material(0x9a633d, 1);
  const rockMat = material(0x7895a6, 0.9);

  function platform(x, y, z, width, depth) {
    const group = new THREE.Group();
    const top = mesh(new THREE.BoxGeometry(width, 0.32, depth), groundMat, [0, 0.18, 0]);
    const side = mesh(new THREE.BoxGeometry(width, 1.1, depth), dirtMat, [0, -0.38, 0]);
    group.add(side, top); group.position.set(x, y, z); scene.add(group);
    platforms.push({ x, y, z, width, depth });
  }

  platform(-5, 0, 0, 11, 9); platform(4, 0.7, 0, 5, 6); platform(10, 1.5, 2, 5, 5);
  platform(15, 2.4, -1, 5, 5); platform(20, 3.3, 1, 6, 7); platform(28, 4.1, 0, 9, 9);

  function addStar(x, y, z, index) {
    const star = mesh(new THREE.OctahedronGeometry(0.34), material(0xffd441, 0.35), [x, y, z]);
    star.material.emissive.setHex(0x8f5500); star.material.emissiveIntensity = 0.55;
    scene.add(star); collectibles.push({ mesh: star, base: y, collected: false, index });
  }
  [[-3, 0.8, 1], [0, 0.8, -2], [3, 1.5, 0], [7, 2.3, 1], [10, 3.1, 3], [14, 4, -1], [18, 4.9, 1], [22, 5.8, 0], [27, 6.6, 0]].forEach((p, i) => addStar(p[0], p[1], p[2], i));

  for (let i = 0; i < 36; i++) {
    const rock = mesh(new THREE.DodecahedronGeometry(0.7 + (i % 3) * 0.35, 1), rockMat, [-22 + (i * 17) % 70, -3 - (i % 5) * 2, -30 + (i * 29) % 58]);
    rock.rotation.set(0.3, 0.6, 0.2); scene.add(rock);
  }

  function cloud(x, y, z, scale) {
    const group = new THREE.Group(), cloudMat = material(0xffffff, 1);
    for (let i = 0; i < 5; i++) group.add(ball(cloudMat, [(i - 2) * 0.75, Math.sin(i) * 0.18, 0], [1, 0.65, 1], 16));
    group.position.set(x, y, z); group.scale.setScalar(scale); scene.add(group);
  }
  [[-12, 8, -10, 1.8], [9, 11, -17, 2.4], [25, 10, 13, 2], [45, 9, -5, 1.8]].forEach(p => cloud(p[0], p[1], p[2], p[3]));

  const hero = buildBull();
  scene.add(hero);

  const finish = new THREE.Group();
  const pole = mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 12), material(0xf8f0d7, 0.7), [0, 1.5, 0]);
  const flag = mesh(new THREE.PlaneGeometry(1.3, 0.75), material(0xff7b47, 0.8), [0.66, 2.45, 0]);
  flag.material.side = THREE.DoubleSide; finish.add(pole, flag); finish.position.set(30, 4.3, 0); scene.add(finish);

  const message = document.getElementById('message'), score = document.getElementById('score');
  function say(title, subtitle) {
    message.innerHTML = title + (subtitle ? `<div class="small">${subtitle}</div>` : '');
    message.classList.add('show'); setTimeout(() => message.classList.remove('show'), 2300);
  }
  function reset() {
    player.pos.set(-5, 2, 0); player.vel.set(0, 0, 0); player.stars = 0; player.yaw = 0; won = false;
    collectibles.forEach(c => { c.collected = false; c.mesh.visible = true; });
    score.textContent = '星星 0 / 9'; say('重新出发！', '穿过浮空草原，抵达橙色终点旗。');
  }
  function standingPlatform() {
    let best = null;
    for (const p of platforms) {
      if (Math.abs(player.pos.x - p.x) < p.width / 2 - 0.18 && Math.abs(player.pos.z - p.z) < p.depth / 2 - 0.18 && player.pos.y >= p.y - 0.45 && player.pos.y <= p.y + 0.85) {
        if (!best || p.y > best.y) best = p;
      }
    }
    return best;
  }
  function lerpAngle(current, target, amount) {
    let delta = (target - current + Math.PI) % (Math.PI * 2) - Math.PI;
    return current + delta * amount;
  }

  function touchesPlayer(point) {
    const dx = point.x - player.pos.x;
    const dz = point.z - player.pos.z;
    const closestY = THREE.MathUtils.clamp(point.y, player.pos.y, player.pos.y + 1.95);
    const dy = point.y - closestY;
    return dx * dx + dy * dy + dz * dz < 0.8 * 0.8;
  }

  function updateHero(dt, moving) {
    const parts = hero.userData.parts;
    hero.position.copy(player.pos);
    if (moving) {
      const targetYaw = Math.atan2(-player.vel.x, -player.vel.z);
      player.yaw = lerpAngle(player.yaw, targetYaw, 1 - Math.exp(-12 * dt));
    }
    parts.model.rotation.y = player.yaw;
    const speed = Math.hypot(player.vel.x, player.vel.z);
    runTime += dt * (4 + speed * 1.4);
    const swing = Math.sin(runTime) * Math.min(0.72, speed * 0.14);
    parts.armL.rotation.x = -swing; parts.armR.rotation.x = swing;
    parts.legL.rotation.x = swing; parts.legR.rotation.x = -swing;
    parts.armL.userData.lower.rotation.x = -0.08 - Math.max(0, swing) * 0.3;
    parts.armR.userData.lower.rotation.x = -0.08 - Math.max(0, -swing) * 0.3;
    parts.legL.userData.lower.rotation.x = Math.max(0, -swing) * 0.46;
    parts.legR.userData.lower.rotation.x = Math.max(0, swing) * 0.46;
    parts.head.rotation.x = Math.sin(clock.elapsedTime * 1.4) * 0.015;
    parts.tail.rotation.z = Math.sin(clock.elapsedTime * 3) * 0.18;
    const airborne = !player.grounded;
    parts.armL.rotation.z = airborne ? 0.48 : 0.04;
    parts.armR.rotation.z = airborne ? -0.48 : -0.04;
  }

  function update(dt) {
    if (!started) return;
    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3(-Math.sin(orbit), 0, -Math.cos(orbit));
    // 屏幕右方向必须是 forward 绕 Y 轴逆时针 90°；此前符号相反，导致 A/D 颠倒。
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    if (keys.KeyW) direction.add(forward); if (keys.KeyS) direction.sub(forward);
    if (keys.KeyA) direction.sub(right); if (keys.KeyD) direction.add(right);
    const moving = direction.lengthSq() > 0;
    if (moving) direction.normalize();
    player.vel.x = THREE.MathUtils.damp(player.vel.x, direction.x * 5, 12, dt);
    player.vel.z = THREE.MathUtils.damp(player.vel.z, direction.z * 5, 12, dt);
    player.vel.y -= 16 * dt; player.pos.addScaledVector(player.vel, dt);

    const platformBelow = standingPlatform(); player.grounded = false;
    if (platformBelow && player.vel.y <= 0) { player.pos.y = platformBelow.y + 0.37; player.vel.y = 0; player.grounded = true; }
    if (player.pos.y < -12) reset();
    updateHero(dt, moving);

    collectibles.forEach(c => {
      if (c.collected) return;
      c.mesh.position.y = c.base + Math.sin(clock.elapsedTime * 3 + c.index) * 0.12;
      c.mesh.rotation.y += dt * 2;
      if (touchesPlayer(c.mesh.position)) {
        c.collected = true; c.mesh.visible = false; player.stars++;
        score.textContent = `星星 ${player.stars} / 9`; say('获得一颗星星！');
      }
    });
    flag.rotation.y = Math.sin(clock.elapsedTime * 2) * 0.08;
    if (!won && player.pos.distanceTo(finish.position) < 1.2) { won = true; say('闯关成功！', `收集 ${player.stars} 颗星星。按 R 再玩一次。`); }

    const target = player.pos.clone().add(new THREE.Vector3(Math.sin(orbit) * 6, 3.7, Math.cos(orbit) * 6));
    camera.position.lerp(target, 1 - Math.exp(-5 * dt));
    camera.lookAt(player.pos.x, player.pos.y + 1.12, player.pos.z);
  }

  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' && player.grounded) { player.vel.y = 7.1; player.grounded = false; }
    if (e.code === 'KeyR') reset();
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  let dragging = false, lastX = 0;
  renderer.domElement.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; });
  addEventListener('pointerup', () => { dragging = false; });
  addEventListener('pointermove', e => { if (dragging) { orbit -= (e.clientX - lastX) * 0.008; lastX = e.clientX; } });
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  document.getElementById('play').onclick = () => {
    started = true; document.getElementById('start').style.display = 'none';
    camera.position.set(-5, 4.2, 6); hero.position.copy(player.pos);
    say('出发！', '这是可以从任意角度观察的真实 3D 小牛。');
  };

  (function loop() {
    requestAnimationFrame(loop);
    update(Math.min(clock.getDelta(), 0.04));
    renderer.render(scene, camera);
  })();
})();
