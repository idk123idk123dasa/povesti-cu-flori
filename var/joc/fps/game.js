import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const MOVE_SPEED    = 7;
const SPRINT_SPEED  = 11;
const JUMP_VEL      = 8.5;
const GRAVITY       = 26;
const EYE_HEIGHT    = 1.65;
const P_HALF        = 0.38;   // half-width of player AABB
const SENSITIVITY   = 0.0022;
const FIRE_RATE_MS  = 95;
const DAMAGE        = 28;
const MAG_SIZE      = 30;
const RELOAD_MS     = 2100;
const BOT_HP        = 100;
const BOT_SPEED     = 3.4;
const BOT_FIRE_MS   = 720;
const BOT_DAMAGE    = 10;
const BOT_RANGE     = 32;
const BOT_COUNT     = 5;
const KILLS_TO_WIN  = 5;
const FOV           = 75;

/* ═══════════════════════════════════════════════
   DOM REFS
═══════════════════════════════════════════════ */
const $lobby      = document.getElementById('lobby-ui');
const $hud        = document.getElementById('hud');
const $instruct   = document.getElementById('instructions');
const $gameover   = document.getElementById('game-over');
const $winScreen  = document.getElementById('win-screen');
const $deathScr   = document.getElementById('death-screen');
const $teamModal  = document.getElementById('team-selection-modal');
const $modeModal  = document.getElementById('mode-selection-modal');
const $freezeMsg  = document.getElementById('freeze-time-msg');

/* ═══════════════════════════════════════════════
   THREE.JS GLOBALS
═══════════════════════════════════════════════ */
let scene, camera, renderer;
const clock = new THREE.Clock(false);

/* ═══════════════════════════════════════════════
   GAME STATE
═══════════════════════════════════════════════ */
let gameRunning  = false;
let gameOver     = false;
let playerHP     = 100;
let playerMoney  = 800;
let buyMenuOpen  = false;
let ammo         = MAG_SIZE;
let gameMode     = 'bot'; // 'bot' | 'network'
let reloading    = false;
let reloadEnd    = 0;
let lastShot     = 0;
let kills        = 0;
let deaths       = 0;
let playerScore  = 0;
let botScore     = 0;
let playerGold   = parseInt(localStorage.getItem('fps_gold') || '0');
let ownedKnives  = JSON.parse(localStorage.getItem('fps_knives') || '["k_plain"]');
let equippedKnife = localStorage.getItem('fps_knife') || 'k_plain';
let velY         = 0;
let onGround     = false;
let bots         = [];
let colBoxes     = [];    // static collision {min, max} plain objects
let selectedTeam = 'CT';
let weaponMesh   = null;
let bobTime      = 0;
let isLocked     = false;
let scopedIn     = false;
let currentWeapon = 'rifle'; // 'rifle' | 'pistol' | 'knife'
let inspecting   = false;
let inspectTime  = 0;
let knifeAnim    = 0; // butterfly knife flip progress 0..1
let knifeFlipping = false;

/* ═══════════════════════════════════════════════
   INPUT
═══════════════════════════════════════════════ */
const keys = {};
document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (!gameRunning) return;
    if (e.code === 'KeyB') { buyMenuOpen ? closeBuyMenu() : openBuyMenu(); return; }
    if (buyMenuOpen) return;
    if (e.code === 'KeyR' && !reloading && ammo < MAG_SIZE && currentWeapon !== 'knife') startReload();
    if (e.code === 'KeyF') startInspect();
    if (e.code === 'Digit1') switchWeapon('rifle');
    if (e.code === 'Digit2') switchWeapon('pistol');
    if (e.code === 'Digit3') switchWeapon('knife');
    e.preventDefault();
}, { passive: false });
document.addEventListener('keyup', e => { keys[e.code] = false; });

/* ═══════════════════════════════════════════════
   POINTER LOCK (manual — no PointerLockControls)
═══════════════════════════════════════════════ */
function requestLock() {
    renderer.domElement.requestPointerLock().catch(() => {});
}

function setupPointerLock() {
    document.addEventListener('pointerlockchange', () => {
        isLocked = document.pointerLockElement === renderer.domElement;
        if (!isLocked && gameRunning && !gameOver) {
            setTimeout(() => {
                if (!isLocked && gameRunning && !gameOver) requestLock();
            }, 120);
        }
    });

    document.addEventListener('mousemove', e => {
        if (!isLocked) return;
        // Scale sensitivity by FOV ratio so 180° turn = same mouse distance scoped or not
        const sens = SENSITIVITY * (camera.fov / FOV);
        camera.rotation.y -= e.movementX * sens;
        camera.rotation.x = Math.max(-1.4, Math.min(1.4,
            camera.rotation.x - e.movementY * sens
        ));
    });

    renderer.domElement.addEventListener('click', () => {
        if (gameRunning && !gameOver && !isLocked) requestLock();
    });

    document.addEventListener('mousedown', e => {
        if (e.button === 0 && gameRunning && !gameOver) {
            e.preventDefault();
            if (gameMode === 'network') tryShootNet(); else tryShoot();
        }
    });

    document.addEventListener('contextmenu', e => e.preventDefault());
}

/* ═══════════════════════════════════════════════
   THREE.JS INIT
═══════════════════════════════════════════════ */
function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0xabd4ed, 0.015);

    camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.05, 200);
    camera.rotation.order = 'YXZ';
    camera.position.set(0, EYE_HEIGHT, 0);
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Ambient
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    // Sun
    const sun = new THREE.DirectionalLight(0xffe8a0, 1.3);
    sun.position.set(40, 70, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
    sun.shadow.camera.top  =  80; sun.shadow.camera.bottom = -80;
    sun.shadow.camera.far  = 300;
    scene.add(sun);

    window.addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });

    setupPointerLock();
}

/* ═══════════════════════════════════════════════
   MAP BUILDER
═══════════════════════════════════════════════ */
const MAT = {
    ground:  new THREE.MeshLambertMaterial({ color: 0xd4c49a }),
    wall:    new THREE.MeshLambertMaterial({ color: 0xc8b88a }),
    crate:   new THREE.MeshLambertMaterial({ color: 0x8b6914 }),
    metal:   new THREE.MeshLambertMaterial({ color: 0x6a7a8a }),
    dark:    new THREE.MeshLambertMaterial({ color: 0x3a3a3a }),
    red:     new THREE.MeshLambertMaterial({ color: 0x8b2020 }),
    blue:    new THREE.MeshLambertMaterial({ color: 0x203080 }),
};

function box(x, y, z, w, h, d, mat, addCollision = true) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (addCollision) {
        colBoxes.push({
            minX: x - w / 2, maxX: x + w / 2,
            minY: y,         maxY: y + h,
            minZ: z - d / 2, maxZ: z + d / 2,
            mesh
        });
    }
    return mesh;
}

function buildMap() {
    // Ground
    {
        const geo = new THREE.PlaneGeometry(120, 120);
        const m = new THREE.Mesh(geo, MAT.ground);
        m.rotation.x = -Math.PI / 2;
        m.receiveShadow = true;
        scene.add(m);
    }

    const W = 50, D = 50; // half-extents of arena

    // Outer walls (no collision object needed — just block with inside faces)
    const wallH = 5;
    // N/S walls
    box(0,  0,  D, W*2, wallH, 1, MAT.wall);
    box(0,  0, -D, W*2, wallH, 1, MAT.wall);
    // E/W walls
    box( W, 0,  0, 1, wallH, D*2, MAT.wall);
    box(-W, 0,  0, 1, wallH, D*2, MAT.wall);

    // Floor detail strips
    box(0, 0, 0, 100, 0.05, 100, MAT.ground, false);

    // ── COVER ──────────────────────────────────────────
    // Center structure
    box(0,   0,  0,  6,  2.5, 2, MAT.wall);
    box(0,   0,  0,  2,  2.5, 6, MAT.wall);

    // T side (z > 0)
    box(-12, 0, 20, 2, 2, 6, MAT.crate);
    box( 12, 0, 20, 2, 2, 6, MAT.crate);
    box(  0, 0, 28, 6, 1.2, 2, MAT.crate);
    box( -5, 0, 35, 4, 2.5, 4, MAT.wall);
    box(  5, 0, 35, 4, 2.5, 4, MAT.wall);
    box(-20, 0, 30, 2, 2, 2, MAT.crate);
    box( 20, 0, 30, 2, 2, 2, MAT.crate);
    box(-15, 0, 40, 6, 3, 1, MAT.wall);
    box( 15, 0, 40, 6, 3, 1, MAT.wall);

    // CT side (z < 0)
    box(-12, 0, -20, 2, 2, 6, MAT.metal);
    box( 12, 0, -20, 2, 2, 6, MAT.metal);
    box(  0, 0, -28, 6, 1.2, 2, MAT.metal);
    box( -5, 0, -35, 4, 2.5, 4, MAT.wall);
    box(  5, 0, -35, 4, 2.5, 4, MAT.wall);
    box(-20, 0, -30, 2, 2, 2, MAT.metal);
    box( 20, 0, -30, 2, 2, 2, MAT.metal);
    box(-15, 0, -40, 6, 3, 1, MAT.wall);
    box( 15, 0, -40, 6, 3, 1, MAT.wall);

    // Mid-field cover
    box(-22, 0,  8, 1.5, 2, 8, MAT.wall);
    box( 22, 0,  8, 1.5, 2, 8, MAT.wall);
    box(-22, 0, -8, 1.5, 2, 8, MAT.wall);
    box( 22, 0, -8, 1.5, 2, 8, MAT.wall);

    // Pillars
    box(-35, 0,  15, 2, 4, 2, MAT.dark);
    box( 35, 0,  15, 2, 4, 2, MAT.dark);
    box(-35, 0, -15, 2, 4, 2, MAT.dark);
    box( 35, 0, -15, 2, 4, 2, MAT.dark);

    // Raised platforms
    box(-30, 0, 0, 8, 1, 6, MAT.metal);
    box( 30, 0, 0, 8, 1, 6, MAT.metal);

    // Spawn markers
    box(0, 0,  44, 4, 0.1, 4, MAT.red,  false);
    box(0, 0, -44, 4, 0.1, 4, MAT.blue, false);
}

/* ═══════════════════════════════════════════════
   WEAPON MODEL  — AK-47 style, detailed
═══════════════════════════════════════════════ */
// ── Shared materials ─────────────────────────────
const wMat = {
    black:  new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
    dark:   new THREE.MeshLambertMaterial({ color: 0x111111 }),
    metal:  new THREE.MeshLambertMaterial({ color: 0x2a2a2a }),
    wood:   new THREE.MeshLambertMaterial({ color: 0x5c3010 }),
    woodL:  new THREE.MeshLambertMaterial({ color: 0x7a4520 }),
    grey:   new THREE.MeshLambertMaterial({ color: 0x3a3a3a }),
    silver: new THREE.MeshLambertMaterial({ color: 0xaaaaaa }),
    pistolB:new THREE.MeshLambertMaterial({ color: 0x2a2a35 }),
    blade:  new THREE.MeshLambertMaterial({ color: 0xd0d8e0 }),
    handle: new THREE.MeshLambertMaterial({ color: 0x111a11 }),
};

function makePart(parent, x, y, z, w, h, d, mat, rx=0, ry=0, rz=0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
}

// AKM .obj model — loaded async, cached here
let _akModelTemplate = null;

const _akMats = [
    new THREE.MeshPhongMaterial({ color: 0x2e2e2e, specular: 0x888888, shininess: 60, side: THREE.DoubleSide }),
    new THREE.MeshPhongMaterial({ color: 0x1a1a1a, specular: 0x555555, shininess: 90, side: THREE.DoubleSide }),
    new THREE.MeshPhongMaterial({ color: 0x6b4020, specular: 0x331a00, shininess: 20, side: THREE.DoubleSide }),
    new THREE.MeshPhongMaterial({ color: 0x888888, specular: 0xaaaaaa, shininess: 120, side: THREE.DoubleSide }),
];

// Karambit OBJ: flat in XY plane, Y longest axis (range ~9.8), center X=2.4 Y=0.46
let _karambitTemplate = null;
function preloadKarambit() {
    return new Promise(resolve => {
        new OBJLoader().load('karambit.obj', obj => {
            const SCALE = 0.020;
            obj.scale.setScalar(SCALE);
            obj.position.set(-2.399 * SCALE, -0.463 * SCALE, 0.287 * SCALE);
            obj.traverse(child => {
                if (child.isMesh) { child.castShadow = false; child.receiveShadow = false; }
            });
            _karambitTemplate = obj;
            resolve();
        }, undefined, () => resolve());
    });
}

function preloadAK() {
    return new Promise(resolve => {
        new OBJLoader().load('ak47.obj', obj => {
            // Model: barrel runs along +X axis, range ~223cm, center at X≈49cm
            // Center the model around grip area (X≈50cm) then scale to scene units
            const SCALE = 0.0028;
            const offsetX = -49.45 * SCALE;
            const offsetY =  0.43 * SCALE;
            const offsetZ = -0.98 * SCALE;

            let meshIdx = 0;
            obj.traverse(child => {
                if (child.isMesh) {
                    const name = (child.name || '').toLowerCase();
                    if (name.includes('wood') || name.includes('stok') || name.includes('grip')) {
                        child.material = _akMats[2];
                    } else if (name.includes('sight') || name.includes('chrome')) {
                        child.material = _akMats[3];
                    } else {
                        child.material = meshIdx % 2 === 0 ? _akMats[0] : _akMats[1];
                    }
                    meshIdx++;
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
            });

            obj.scale.setScalar(SCALE);
            obj.position.set(offsetX, offsetY, offsetZ);
            _akModelTemplate = obj;
            resolve();
        }, undefined, () => resolve());
    });
}

function buildRifle() {
    const g = new THREE.Group();

    if (_akModelTemplate) {
        const clone = _akModelTemplate.clone(true);
        clone.position.copy(_akModelTemplate.position);

        // Barrel runs along +X → rotate Y=+90° so barrel points toward -Z (forward)
        clone.rotation.set(0, Math.PI / 2, 0);

        g.add(clone);
        // Position: right side, below crosshair, close to camera
        g.position.set(0.22, -0.22, -0.35);
        g.rotation.set(0.04, 0.05, 0.0);
    } else {
        // Fallback procedural if model not loaded yet
        const p = (x,y,z,w,h,d,mat,rx=0,ry=0,rz=0) => makePart(g,x,y,z,w,h,d,mat,rx,ry,rz);
        p(0,0,0,0.055,0.09,0.38,wMat.black);
        p(0,-0.025,0.02,0.05,0.05,0.32,wMat.metal);
        p(0,0.025,-0.30,0.022,0.022,0.28,wMat.dark);
        p(0,0.052,0.04,0.05,0.012,0.22,wMat.metal);
        p(0,0.01,-0.18,0.06,0.045,0.20,wMat.wood);
        p(0,-0.072,0.10,0.042,0.09,0.055,wMat.black,0.22);
        p(0,-0.085,0.045,0.046,0.095,0.075,wMat.black,-0.12);
        p(0,-0.005,0.21,0.048,0.065,0.14,wMat.wood);
        g.position.set(0.21,-0.21,-0.32);
        g.rotation.y = 0.04;
    }
    return g;
}

function buildPistol() {
    const g = new THREE.Group();
    const p = (x,y,z,w,h,d,mat,rx=0,ry=0,rz=0) => makePart(g,x,y,z,w,h,d,mat,rx,ry,rz);
    // Slide
    p(0, 0.01, -0.02,  0.042, 0.065, 0.2,  wMat.pistolB);
    // Frame / lower
    p(0,-0.025,-0.005, 0.038, 0.045, 0.16, wMat.black);
    // Barrel
    p(0, 0.01,-0.155,  0.018, 0.018, 0.09, wMat.dark);
    // Grip
    p(0,-0.07, 0.055,  0.036, 0.085, 0.055,wMat.pistolB,0.12);
    p(0,-0.09, 0.068,  0.032, 0.035, 0.038,wMat.black, 0.25);
    // Trigger + guard
    p(0,-0.03, 0.045,  0.007, 0.025, 0.01, wMat.dark,  0.2);
    p(0,-0.045,0.04,   0.008, 0.006, 0.055,wMat.black);
    // Magazine
    p(0,-0.055,0.048,  0.032, 0.065, 0.042,wMat.metal,-0.05);
    // Slide serrations
    p(0.022,0.01,-0.06,0.003, 0.065, 0.008,wMat.grey);
    p(0.022,0.01,-0.04,0.003, 0.065, 0.008,wMat.grey);
    p(0.022,0.01,-0.02,0.003, 0.065, 0.008,wMat.grey);
    // Sights
    p(0, 0.046,-0.11,  0.004, 0.012, 0.004,wMat.silver);
    p(0, 0.046, 0.045, 0.016, 0.008, 0.005,wMat.silver);
    g.position.set(0.19,-0.20,-0.28);
    g.rotation.y = 0.03;
    return g;
}

// Butterfly knife — two handles that flip open
let knifeGroup, knifeBlade, knifeHandle1, knifeHandle2;
function buildKnife() {
    const skin = KNIFE_SHOP.find(k => k.id === equippedKnife) || KNIFE_SHOP[0];
    const bCol = skin.color || 0xb0b8c8;
    const g = new THREE.Group();

    if (_karambitTemplate) {
        const clone = _karambitTemplate.clone(true);
        const mat = new THREE.MeshPhongMaterial({ color: bCol, specular: 0xffffff, shininess: 160, side: THREE.DoubleSide });
        clone.traverse(child => { if (child.isMesh) child.material = mat; });
        // Blade along Y axis. Tilt Z so blade points upper-left (CS2 hold style)
        clone.rotation.set(0.25, Math.PI, -0.65);
        g.add(clone);
        knifeGroup = g;
        g.position.set(0.28, -0.20, -0.28);
        g.rotation.set(0, 0, 0);
        return g;
    }

    // Fallback: simple box knife if OBJ not loaded
    knifeBlade = new THREE.Group();
    const bladeMain = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.008, 0.22), wMat.blade);
    bladeMain.position.z = -0.09;
    knifeBlade.add(bladeMain);
    // Blade bevel
    const bevel = new THREE.Mesh(
        new THREE.BoxGeometry(0.004, 0.014, 0.20), wMat.silver);
    bevel.position.set(0, -0.005, -0.09);
    knifeBlade.add(bevel);
    // Tip
    const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.008, 0.03), wMat.silver);
    tip.position.z = -0.205;
    tip.rotation.x = 0.3;
    knifeBlade.add(tip);
    g.add(knifeBlade);

    // Handle 1 (latch side)
    knifeHandle1 = new THREE.Group();
    const h1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, 0.014, 0.135), wMat.handle);
    h1.position.z = 0.065;
    knifeHandle1.add(h1);
    const pin1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.006, 0.006), wMat.silver);
    pin1.position.z = -0.002;
    knifeHandle1.add(pin1);
    g.add(knifeHandle1);

    // Handle 2 (safe side)
    knifeHandle2 = new THREE.Group();
    const h2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, 0.014, 0.135), wMat.handle);
    h2.position.z = 0.065;
    knifeHandle2.add(h2);
    const pin2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.006, 0.006), wMat.silver);
    pin2.position.z = -0.002;
    knifeHandle2.add(pin2);
    g.add(knifeHandle2);

    knifeGroup = g;
    g.position.set(0.14,-0.17,-0.22);
    g.rotation.set(0.1, 0.05, 0.08);
    return g;
}

function buildWeapon() {
    if (weaponMesh) camera.remove(weaponMesh);
    let g;
    if      (currentWeapon === 'rifle')  g = buildRifle();
    else if (currentWeapon === 'pistol') g = buildPistol();
    else                                  g = buildKnife();
    camera.add(g);
    weaponMesh = g;
}

function switchWeapon(type) {
    if (type === currentWeapon) return;
    currentWeapon = type;
    inspecting = false;
    knifeFlipping = false;
    knifeAnim = 0;
    // Exit scope if switching away from rifle
    buildWeapon();
    updateHUD();
}

/* ═══════════════════════════════════════════════
   BOT SYSTEM
═══════════════════════════════════════════════ */
const BOT_SPAWNS = [
    { x: -10, z: 22 }, { x: 10, z: 22 }, { x: 0, z: 38 },
    { x: -18, z: 32 }, { x: 18, z: 32 }, { x: -5, z: 15 },
    { x: 5,  z: 15  }, { x: -22, z: 28 }, { x: 22, z: 28 },
    { x: 0, z: 45 }
];

const T_SPAWNS_POS = [
    { x: -3, z: 44, ry: Math.PI }, { x: 3, z: 44, ry: Math.PI },
    { x: 0, z: 42, ry: Math.PI }
];
const CT_SPAWNS_POS = [
    { x: -3, z: -44, ry: 0 }, { x: 3, z: -44, ry: 0 },
    { x: 0, z: -42, ry: 0 }
];

function spawnBot(spawnIndex) {
    const sp = BOT_SPAWNS[spawnIndex % BOT_SPAWNS.length];
    const g = new THREE.Group();

    // Body
    const bodyM = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.0, 0.4),
        new THREE.MeshLambertMaterial({ color: 0xcc3322 })
    );
    bodyM.position.y = 0.9;
    g.add(bodyM);

    // Head
    const headM = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        new THREE.MeshLambertMaterial({ color: 0xf0c090 })
    );
    headM.position.y = 1.6;
    g.add(headM);

    // Gun
    const gunM = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 0.4),
        new THREE.MeshLambertMaterial({ color: 0x111111 })
    );
    gunM.position.set(0.35, 1.1, -0.3);
    g.add(gunM);

    g.position.set(sp.x, 0, sp.z);
    scene.add(g);

    const bot = {
        mesh: g,
        hp: BOT_HP,
        pos: new THREE.Vector3(sp.x, 0, sp.z),
        lastShot: 0,
        state: 'patrol',
        patrolTarget: new THREE.Vector3(sp.x + (Math.random()-0.5)*8, 0, sp.z + (Math.random()-0.5)*8),
        bodyMesh: bodyM,
        headMesh: headM,
        dead: false,
    };
    bots.push(bot);
}

function spawnBots() {
    bots.forEach(b => scene.remove(b.mesh));
    bots = [];
    for (let i = 0; i < BOT_COUNT; i++) spawnBot(i);
}

const _botDir   = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const BOT_HALF  = 0.32; // bot collision half-width

// Cache wall meshes once per frame (reused for all bots)
let _wallMeshCache = null;

function resolveBotCollision(pos) {
    const bx = pos.x, bz = pos.z;
    for (const b of colBoxes) {
        const cx = (b.minX + b.maxX) / 2;
        const cz = (b.minZ + b.maxZ) / 2;
        if (Math.abs(bx - cx) > 8 || Math.abs(bz - cz) > 8) continue;

        const overlapX = bx + BOT_HALF > b.minX && bx - BOT_HALF < b.maxX;
        const overlapZ = bz + BOT_HALF > b.minZ && bz - BOT_HALF < b.maxZ;
        if (!overlapX || !overlapZ) continue;
        // Only block if wall is taller than step height
        if (b.maxY < 0.5) continue;

        const dxL = (bx + BOT_HALF) - b.minX;
        const dxR = b.maxX - (bx - BOT_HALF);
        const dzF = (bz + BOT_HALF) - b.minZ;
        const dzB = b.maxZ - (bz - BOT_HALF);
        const minD = Math.min(dxL, dxR, dzF, dzB);
        if      (minD === dxL) pos.x -= dxL;
        else if (minD === dxR) pos.x += dxR;
        else if (minD === dzF) pos.z -= dzF;
        else                   pos.z += dzB;
    }
    pos.x = Math.max(-49, Math.min(49, pos.x));
    pos.z = Math.max(-49, Math.min(49, pos.z));
}

function hasLineOfSight(fromX, fromZ, toPos) {
    if (!_wallMeshCache) return true;
    _rayOrigin.set(fromX, 1.4, fromZ);
    const target = new THREE.Vector3(toPos.x, EYE_HEIGHT, toPos.z);
    const dir = target.sub(_rayOrigin).normalize();
    const dist = _rayOrigin.distanceTo(new THREE.Vector3(fromX, 1.4, fromZ)) +
                 new THREE.Vector3(fromX, 1.4, fromZ).distanceTo(new THREE.Vector3(toPos.x, EYE_HEIGHT, toPos.z));
    const rc = new THREE.Raycaster(_rayOrigin, dir, 0.1, dist);
    return rc.intersectObjects(_wallMeshCache).length === 0;
}

function updateBots(dt, now) {
    const ppos = camera.position;
    // Rebuild wall mesh cache once per frame
    _wallMeshCache = colBoxes.map(b => b.mesh).filter(Boolean);

    bots.forEach(bot => {
        if (bot.dead) return;

        _toPlayer.copy(ppos).sub(bot.pos);
        _toPlayer.y = 0;
        const dist = _toPlayer.length();

        // Check line-of-sight to decide state
        _rayOrigin.set(bot.pos.x, 1.4, bot.pos.z);
        const targetPt = new THREE.Vector3(ppos.x, EYE_HEIGHT, ppos.z);
        const losDir = new THREE.Vector3().copy(targetPt).sub(_rayOrigin).normalize();
        const losRc = new THREE.Raycaster(_rayOrigin, losDir, 0.1, dist);
        const losBlocked = losRc.intersectObjects(_wallMeshCache).length > 0;

        if (dist < BOT_RANGE && !losBlocked) {
            bot.state = dist < 18 ? 'attack' : 'chase';
            bot.lastSeen = { x: ppos.x, z: ppos.z };
        } else if (bot.lastSeen && dist < BOT_RANGE * 1.5) {
            bot.state = 'chase'; // chase last known position
        } else {
            bot.state = 'patrol';
        }

        // Move
        if (bot.state === 'patrol') {
            _botDir.copy(bot.patrolTarget).sub(bot.pos);
            _botDir.y = 0;
            if (_botDir.length() < 1) {
                bot.patrolTarget.set(
                    bot.pos.x + (Math.random() - 0.5) * 16,
                    0,
                    bot.pos.z + (Math.random() - 0.5) * 16
                );
                bot.patrolTarget.x = Math.max(-45, Math.min(45, bot.patrolTarget.x));
                bot.patrolTarget.z = Math.max(5,   Math.min(45, bot.patrolTarget.z));
            } else {
                _botDir.normalize().multiplyScalar(BOT_SPEED * 0.5 * dt);
                bot.pos.x += _botDir.x;
                bot.pos.z += _botDir.z;
                resolveBotCollision(bot.pos);
            }
        } else if (bot.state === 'chase') {
            const chaseTarget = bot.lastSeen || { x: ppos.x, z: ppos.z };
            _botDir.set(chaseTarget.x - bot.pos.x, 0, chaseTarget.z - bot.pos.z);
            if (_botDir.length() > 0.5) {
                _botDir.normalize().multiplyScalar(BOT_SPEED * dt);
                bot.pos.x += _botDir.x;
                bot.pos.z += _botDir.z;
                resolveBotCollision(bot.pos);
            }
        }
        // attack: stand still

        bot.mesh.position.set(bot.pos.x, 0, bot.pos.z);

        if (bot.state !== 'patrol') {
            bot.mesh.lookAt(ppos.x, bot.pos.y, ppos.z);
        }

        // Shoot — only if LOS clear (already computed above)
        if (bot.state === 'attack' && !losBlocked && now - bot.lastShot > BOT_FIRE_MS) {
            bot.lastShot = now;
            if (Math.random() < 0.9) takeDamage(BOT_DAMAGE);
        }
    });
}

/* ═══════════════════════════════════════════════
   SHOOTING
═══════════════════════════════════════════════ */
const _shootDir  = new THREE.Vector3();
const _shootOrigin = new THREE.Vector3();

function tryShoot() {
    const now = performance.now();
    if (reloading || ammo <= 0) { if (!reloading) startReload(); return; }
    if (now - lastShot < FIRE_RATE_MS) return;
    lastShot = now;
    ammo--;
    if (ammo === 0) startReload();

    // Recoil animation
    if (weaponMesh) {
        weaponMesh.position.z += 0.04;
        weaponMesh.rotation.x -= 0.06;
    }

    camera.getWorldDirection(_shootDir);
    _shootOrigin.copy(camera.position);

    // Raycaster shoot
    const rc = new THREE.Raycaster(_shootOrigin, _shootDir, 0, 80);

    const wallMeshes = colBoxes.map(b => b.mesh).filter(Boolean);
    const wallHits   = rc.intersectObjects(wallMeshes);
    const wallDist   = wallHits.length > 0 ? wallHits[0].distance : Infinity;

    // Wall impact marker
    if (wallHits.length > 0) spawnImpact(wallHits[0].point);

    // Check bots — only hit if no wall is between player and bot
    const botMeshes = bots.filter(b => !b.dead).flatMap(b => [b.bodyMesh, b.headMesh]);
    const botHits   = rc.intersectObjects(botMeshes);
    if (botHits.length > 0 && botHits[0].distance < wallDist) {
        const hitObj = botHits[0].object;
        const bot = bots.find(b => b.bodyMesh === hitObj || b.headMesh === hitObj);
        if (bot && !bot.dead) {
            const isHead = hitObj === bot.headMesh;
            const dmg = isHead ? DAMAGE * 3.5 : DAMAGE;
            bot.hp -= dmg;
            showHitMarker(isHead);
            if (bot.hp <= 0) killBot(bot);
        }
    }

    updateHUD();
}

let hitMarkerTimeout = null;
function showHitMarker(headshot) {
    const el = document.getElementById('crosshair');
    if (!el) return;
    el.style.color = headshot ? '#ff4400' : '#ff0000';
    el.textContent = headshot ? '✦' : '✕';
    clearTimeout(hitMarkerTimeout);
    hitMarkerTimeout = setTimeout(() => {
        el.textContent = '•';
        el.style.color = '#ffffff';
    }, 180);
}

const impacts = [];
function spawnImpact(pos) {
    const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x333333, depthWrite: false })
    );
    m.position.copy(pos).addScalar(0.005);
    scene.add(m);
    impacts.push({ mesh: m, born: performance.now() });
    if (impacts.length > 60) {
        scene.remove(impacts.shift().mesh);
    }
}

function startReload() {
    if (reloading || ammo === MAG_SIZE) return;
    reloading  = true;
    reloadEnd  = performance.now() + RELOAD_MS;
    const el = document.getElementById('ammo-display');
    if (el) el.textContent = 'RELOADING...';
}

function killBot(bot) {
    bot.dead = true;
    bot.mesh.rotation.z = Math.PI / 2;
    bot.mesh.position.y = -0.4;
    kills++;
    playerScore++;
    updateHUD();
    updateScore();

    setTimeout(() => { scene.remove(bot.mesh); }, 4000);

    if (playerScore >= KILLS_TO_WIN) {
        endRound(true);
        return;
    }

    // Respawn bot + buy time pentru jucator
    setTimeout(() => {
        if (!gameRunning) return;
        const idx = bots.indexOf(bot);
        if (idx !== -1) bots.splice(idx, 1);
        spawnBot(Math.floor(Math.random() * BOT_SPAWNS.length));
    }, 3000);

}

/* ═══════════════════════════════════════════════
   PLAYER DAMAGE
═══════════════════════════════════════════════ */
let flashTimeout = null;
function takeDamage(amount) {
    if (!gameRunning || gameOver) return;
    playerHP = Math.max(0, playerHP - amount);
    document.body.style.background = 'radial-gradient(circle, rgba(200,0,0,0.35) 0%, transparent 70%)';
    clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => { document.body.style.background = ''; }, 120);
    updateHUD();
    if (playerHP <= 0) die();
}

function die() {
    deaths++;
    if (gameMode === 'network') {
        document.body.style.background = 'radial-gradient(circle, rgba(200,0,0,0.6) 0%, transparent 80%)';
        setTimeout(() => { document.body.style.background = ''; }, 800);
        return;
    }

    // Bot mode: scor bot++, respawn dupa 3s
    botScore++;
    updateScore();

    isLocked = false;
    document.exitPointerLock();
    document.body.style.background = 'radial-gradient(circle, rgba(200,0,0,0.7) 0%, transparent 80%)';

    if (botScore >= KILLS_TO_WIN) {
        document.body.style.background = '';
        endRound(false);
        return;
    }

    // Respawn dupa 3 secunde
    setTimeout(() => {
        if (!gameRunning) return;
        document.body.style.background = '';
        playerHP = 100;
        ammo = MAG_SIZE;
        reloading = false;
        const spawns = selectedTeam === 'T' ? T_SPAWNS_POS : CT_SPAWNS_POS;
        const sp = spawns[Math.floor(Math.random() * spawns.length)];
        camera.position.set(sp.x, EYE_HEIGHT, sp.z);
        camera.rotation.set(0, sp.ry, 0);
        updateHUD();
        requestLock();
    }, 3000);
}

/* ═══════════════════════════════════════════════
   COLLISION
═══════════════════════════════════════════════ */
function resolveCollisions() {
    const px = camera.position.x;
    const pz = camera.position.z;
    const py = camera.position.y - EYE_HEIGHT; // feet Y

    for (const b of colBoxes) {
        // Skip if clearly far
        const cx = (b.minX + b.maxX) / 2;
        const cz = (b.minZ + b.maxZ) / 2;
        if (Math.abs(px - cx) > 8 || Math.abs(pz - cz) > 8) continue;

        const overlapX = px + P_HALF > b.minX && px - P_HALF < b.maxX;
        const overlapZ = pz + P_HALF > b.minZ && pz - P_HALF < b.maxZ;
        const feetAbove = py >= b.maxY - 0.15;   // standing on top
        const headBelow = py + EYE_HEIGHT * 2 <= b.minY;

        if (!overlapX || !overlapZ) continue;
        if (feetAbove || headBelow) continue;

        // Step-up: can walk onto low obstacles (≤ 0.4m)
        if (b.maxY <= py + 0.4 && velY <= 0) {
            camera.position.y = b.maxY + EYE_HEIGHT;
            velY = 0;
            onGround = true;
            continue;
        }

        // Push out on smallest overlap axis
        const dxL = (px + P_HALF) - b.minX;
        const dxR = b.maxX - (px - P_HALF);
        const dzF = (pz + P_HALF) - b.minZ;
        const dzB = b.maxZ - (pz - P_HALF);

        const minD = Math.min(dxL, dxR, dzF, dzB);
        if      (minD === dxL) camera.position.x -= dxL;
        else if (minD === dxR) camera.position.x += dxR;
        else if (minD === dzF) camera.position.z -= dzF;
        else                   camera.position.z += dzB;
    }

    // World bounds
    camera.position.x = Math.max(-49, Math.min(49, camera.position.x));
    camera.position.z = Math.max(-49, Math.min(49, camera.position.z));
}

/* ═══════════════════════════════════════════════
   PLAYER UPDATE
═══════════════════════════════════════════════ */
const _fwd   = new THREE.Vector3();
const _right = new THREE.Vector3();

function updatePlayer(dt) {
    const sprint = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed  = sprint ? SPRINT_SPEED : MOVE_SPEED;

    // Camera-relative horizontal movement
    camera.getWorldDirection(_fwd);
    _fwd.y = 0;
    if (_fwd.lengthSq() > 0) _fwd.normalize();
    _right.set(-_fwd.z, 0, _fwd.x);

    let mx = 0, mz = 0;
    if (keys['KeyW'] || keys['ArrowUp'])    { mx += _fwd.x;   mz += _fwd.z; }
    if (keys['KeyS'] || keys['ArrowDown'])  { mx -= _fwd.x;   mz -= _fwd.z; }
    if (keys['KeyD'] || keys['ArrowRight']) { mx += _right.x; mz += _right.z; }
    if (keys['KeyA'] || keys['ArrowLeft'])  { mx -= _right.x; mz -= _right.z; }

    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 0) {
        camera.position.x += (mx / len) * speed * dt;
        camera.position.z += (mz / len) * speed * dt;
    }

    // Jump
    if ((keys['Space']) && onGround) {
        velY = JUMP_VEL;
        onGround = false;
        keys['Space'] = false; // consume
    }

    // Gravity
    velY -= GRAVITY * dt;
    camera.position.y += velY * dt;

    // Floor
    const floorY = EYE_HEIGHT;
    if (camera.position.y < floorY) {
        camera.position.y = floorY;
        velY = 0;
        onGround = true;
    }

    // Resolve vs obstacles
    resolveCollisions();

    // View bob
    if (len > 0 && onGround) {
        bobTime += dt * 9;
        if (weaponMesh) {
            weaponMesh.position.y = -0.18 + Math.sin(bobTime) * 0.012;
            weaponMesh.position.x =  0.22 + Math.cos(bobTime * 0.5) * 0.006;
        }
    } else if (weaponMesh) {
        weaponMesh.position.y += (-0.18 - weaponMesh.position.y) * 0.12;
        weaponMesh.position.x += (0.22  - weaponMesh.position.x) * 0.12;
    }

    // Weapon recoil return
    if (weaponMesh) {
        weaponMesh.position.z  += (-.35 - weaponMesh.position.z)  * 0.18;
        weaponMesh.rotation.x  += (0    - weaponMesh.rotation.x)  * 0.18;
    }

    // Reload
    if (reloading && performance.now() >= reloadEnd) {
        reloading = false;
        ammo = MAG_SIZE;
        updateHUD();
    }
}

/* ═══════════════════════════════════════════════
   SCOPE  (E key — only rifle/pistol)
═══════════════════════════════════════════════ */
function toggleScope() {
    if (currentWeapon === 'knife') return;
    scopedIn = !scopedIn;
    camera.fov = scopedIn ? 28 : FOV;
    camera.updateProjectionMatrix();
    const overlay = document.getElementById('scope-overlay');
    if (overlay) overlay.style.display = scopedIn ? 'block' : 'none';
}

/* ═══════════════════════════════════════════════
   INSPECT  (F key)
═══════════════════════════════════════════════ */
const INSPECT_DURATION = 1.8; // seconds

function startInspect() {
    if (inspecting) return;
    if (currentWeapon === 'knife') return;
    inspecting = true;
    inspectTime = 0;
}

/* ═══════════════════════════════════════════════
   WEAPON ANIMATIONS  (called every frame)
═══════════════════════════════════════════════ */

// smooth ease in-out (cubic)
function ease(t) { return t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
// remap t from [a,b] to [0,1], clamped
function remap(t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }

const BFLY_DURATION = 2.0; // seconds for full flip sequence

function updateWeaponAnimations(dt) {
    if (!weaponMesh) return;

    // ── Butterfly knife idle + flip ──────────────────
    if (currentWeapon === 'knife') {
        const now = performance.now() * 0.001;

        if (knifeFlipping) {
            knifeAnim = Math.min(1, knifeAnim + dt / BFLY_DURATION);
            const t = knifeAnim;

            /* CS2-style butterfly flip phases:
               0.00-0.12  safe handle opens  (swings back 180°)
               0.12-0.30  knife drops/tilts  (wrist toss setup)
               0.30-0.55  full spin          (group rotates 360° on Z)
               0.55-0.68  knife returns      (lands back in hand)
               0.68-0.82  bite handle closes (swings forward 180°)
               0.82-1.00  settle back to rest
            */

            // Safe handle (h1): opens from 0 → -π then stays open
            const h1Open = ease(remap(t, 0.00, 0.12));
            // Bite handle (h2): opens with delay → closes
            const h2Open = ease(remap(t, 0.15, 0.30));
            const h2Close= ease(remap(t, 0.68, 0.82));

            if (knifeHandle1) knifeHandle1.rotation.z = -Math.PI * h1Open;
            if (knifeHandle2) knifeHandle2.rotation.z =  Math.PI * Math.max(0, h2Open - h2Close);

            // Whole knife group: toss into the air and spin
            const tossDrop  = ease(remap(t, 0.12, 0.30)); // lift up
            const spinPhase = ease(remap(t, 0.25, 0.60)); // full rotation
            const catchDown = ease(remap(t, 0.55, 0.75)); // come back

            const baseX = 0.1, baseY = -0.17, baseZ = -0.22;
            weaponMesh.position.x = baseX + Math.sin(spinPhase * Math.PI) *  0.06;
            weaponMesh.position.y = baseY + Math.sin(tossDrop  * Math.PI) *  0.12
                                          - Math.sin(catchDown * Math.PI) *  0.08;
            weaponMesh.position.z = baseZ;

            // Spin: two full rotations on X during the toss
            weaponMesh.rotation.x = 0.1  + spinPhase * Math.PI * 2;
            // Side tilt during toss
            weaponMesh.rotation.z = 0.08 + Math.sin(spinPhase * Math.PI) * 0.35;

            // Settle back smoothly after catch
            const settle = ease(remap(t, 0.80, 1.00));
            if (settle > 0) {
                weaponMesh.rotation.x += (0.1  - weaponMesh.rotation.x) * settle * 0.9;
                weaponMesh.rotation.z += (0.08 - weaponMesh.rotation.z) * settle * 0.9;
            }

            if (knifeAnim >= 1) {
                knifeFlipping = false;
                knifeAnim = 0;
                if (knifeHandle1) knifeHandle1.rotation.z = 0;
                if (knifeHandle2) knifeHandle2.rotation.z = 0;
                weaponMesh.position.set(baseX, baseY, baseZ);
                weaponMesh.rotation.set(0.1, 0.05, 0.08);
            }
        } else {
            // Idle: subtle pendulum sway
            const swing = Math.sin(now * 1.4) * 0.018;
            const bob   = Math.cos(now * 2.1) * 0.005;
            weaponMesh.rotation.z = 0.08 + swing;
            weaponMesh.rotation.x = 0.10 + bob;
            weaponMesh.position.y = -0.17 + Math.sin(now * 1.0) * 0.003;
        }
        return;
    }

    // ── Gun inspect animation ────────────────────────
    if (inspecting) {
        inspectTime += dt;
        const t = inspectTime / INSPECT_DURATION;
        if (t >= 1) {
            inspecting = false;
            // Reset
            weaponMesh.rotation.set(0, 0, 0);
            return;
        }
        const phase = t * Math.PI * 2;
        weaponMesh.rotation.y = Math.sin(phase * 0.5) * 0.55;
        weaponMesh.rotation.z = Math.cos(phase) * 0.22;
        weaponMesh.position.y = (currentWeapon === 'rifle' ? -0.21 : -0.20)
                              + Math.sin(t * Math.PI) * 0.06;
        weaponMesh.position.x += (0 - weaponMesh.position.x) * 0.04;
    }
}

/* ═══════════════════════════════════════════════
   ROUND / GAME MANAGEMENT
═══════════════════════════════════════════════ */
function startGame() {
    kills       = 0;
    deaths      = 0;
    playerScore = 0;
    botScore    = 0;
    playerHP    = 100;
    playerMoney = 800;
    ammo        = MAG_SIZE;
    reloading = false;
    velY    = 0;
    onGround = false;
    gameOver = false;
    gameRunning = true;

    // Spawn position
    const spawns = selectedTeam === 'T' ? T_SPAWNS_POS : CT_SPAWNS_POS;
    const sp = spawns[Math.floor(Math.random() * spawns.length)];
    camera.position.set(sp.x, EYE_HEIGHT, sp.z);
    camera.rotation.set(0, sp.ry, 0);

    // UI
    if ($lobby)    $lobby.style.display    = 'none';
    if ($instruct) $instruct.style.display = 'none';
    if ($hud)      $hud.style.display      = 'block';
    if ($gameover) $gameover.style.display = 'none';
    if ($winScreen) $winScreen.style.display = 'none';
    if ($deathScr)  $deathScr.style.display  = 'none';

    spawnBots();
    updateHUD();
    updateScore();
    requestLock();
    clock.start();
    // Apasa B pentru buy menu
}

function endRound(won) {
    gameRunning = false;
    gameOver    = true;
    isLocked    = false;
    closeBuyMenu();
    document.exitPointerLock();

    // Acorda gold
    const goldEarned = won ? 10 : 5;
    playerGold += goldEarned;
    localStorage.setItem('fps_gold', playerGold);
    updateGoldDisplay();
    saveProfileToServer();

    if ($hud) $hud.style.display = 'none';

    if (won) {
        if ($winScreen) {
            $winScreen.style.display = 'block';
            const h = $winScreen.querySelector('h1');
            if (h) h.innerHTML = `YOU WIN<br><span style="font-size:36px;color:#ffd700;text-shadow:0 0 20px #ffd700;">+${goldEarned} GOLD</span>`;
            setTimeout(() => returnToLobby(), 4000);
        }
    } else {
        if ($gameover) {
            $gameover.style.display = 'flex';
            const fs = document.getElementById('final-score');
            if (fs) fs.textContent = `${playerScore} - ${botScore}  |  +${goldEarned} GOLD`;
        }
    }
}

function returnToLobby() {
    gameRunning = false;
    gameOver    = true;
    isLocked    = false;
    clearInterval(moveSendTimer);
    if (roomWS) { roomWS.close(); roomWS = null; }
    netPlayers.forEach(p => scene.remove(p.mesh));
    netPlayers.clear();
    gameMode = 'bot';
    bots.forEach(b => scene.remove(b.mesh));
    bots = [];
    document.exitPointerLock();

    if ($lobby)    $lobby.style.display    = 'flex';
    if ($hud)      $hud.style.display      = 'none';
    if ($gameover) $gameover.style.display = 'none';
    if ($winScreen) $winScreen.style.display = 'none';
    if ($deathScr)  $deathScr.style.display  = 'none';
}

/* ═══════════════════════════════════════════════
   HUD
═══════════════════════════════════════════════ */
function updateHUD() {
    const hp = document.getElementById('health');
    if (hp) hp.textContent = `HP: ${Math.max(0, Math.floor(playerHP))}`;

    const am = document.getElementById('ammo-display');
    if (am) {
        if (currentWeapon === 'knife') am.textContent = '— KNIFE —';
        else if (reloading)            am.textContent = 'RELOADING...';
        else                           am.textContent = `${ammo} / ${MAG_SIZE}`;
    }

    const kl = document.getElementById('kills-display');
    if (kl) kl.textContent = `KILLS: ${kills}  [1]AK [2]USP [3]KNIFE [B]BUY`;

    const md = document.getElementById('money-display');
    if (md) md.textContent = `$${playerMoney}`;
}

function updateScore() {
    const el = document.getElementById('top-score-tile');
    if (el) el.textContent = `${playerScore} - ${botScore}`;
}

function updateGoldDisplay() {
    document.querySelectorAll('.gold-display').forEach(el => {
        el.textContent = `${playerGold} GOLD`;
    });
}

/* ═══════════════════════════════════════════════
   ANIMATE LOOP
═══════════════════════════════════════════════ */
function animate() {
    requestAnimationFrame(animate);

    if (gameRunning) {
        const dt = Math.min(clock.getDelta(), 0.05);
        updatePlayer(dt);
        if (gameMode === 'bot') updateBots(dt, performance.now());
        updateWeaponAnimations(dt);
    } else {
        clock.getDelta();
    }

    renderer.render(scene, camera);
}

/* ═══════════════════════════════════════════════
   LOBBY UI
═══════════════════════════════════════════════ */
function setupLobbyUI() {
    // PLAY button
    const navPlay = document.getElementById('nav-play');
    if (navPlay) navPlay.onclick = () => {
        if ($modeModal) $modeModal.classList.add('active');
    };

    // Close modes
    const closeModes = document.getElementById('close-modes');
    if (closeModes) closeModes.onclick = () => {
        if ($modeModal) $modeModal.classList.remove('active');
    };

    // Mode cards
    document.querySelectorAll('.mode-card').forEach(btn => {
        btn.onclick = () => {
            const mode = btn.dataset.mode;
            if ($modeModal) $modeModal.classList.remove('active');
            if (mode === '1vBot') {
                if ($teamModal) $teamModal.classList.add('active');
            } else {
                joinMatchmaking(mode);
            }
        };
    });

    // Cancel matchmaking
    const cancelBtn = document.getElementById('cancel-matchmaking');
    if (cancelBtn) cancelBtn.onclick = cancelMatchmaking;

    // Team cards
    document.querySelectorAll('.team-card').forEach(card => {
        card.onclick = () => {
            selectedTeam = card.dataset.team;
            if ($teamModal) $teamModal.classList.remove('active');
            startGame();
        };
    });

    // Death screen return
    const deathBtn = document.getElementById('death-return-btn');
    if (deathBtn) {
        deathBtn.style.display = 'block';
        deathBtn.onclick = returnToLobby;
    }

    // Game over return
    const lobbyBtn = document.getElementById('return-to-lobby-btn');
    if (lobbyBtn) lobbyBtn.onclick = returnToLobby;

    // Auth modal
    const loginBtn  = document.getElementById('login-signup-btn');
    const authModal = document.getElementById('auth-modal');
    const closeAuth = document.getElementById('close-auth');
    if (loginBtn && authModal) loginBtn.onclick = () => authModal.classList.add('active');
    if (closeAuth && authModal) closeAuth.onclick = () => authModal.classList.remove('active');

    const tabLogin   = document.getElementById('tab-login');
    const tabSignup  = document.getElementById('tab-signup');
    const loginForm  = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    if (tabLogin) tabLogin.onclick = () => {
        tabLogin.classList.add('active'); tabSignup?.classList.remove('active');
        loginForm?.classList.add('active'); signupForm?.classList.remove('active');
        document.getElementById('auth-error').style.display = 'none';
    };
    if (tabSignup) tabSignup.onclick = () => {
        tabSignup.classList.add('active'); tabLogin?.classList.remove('active');
        signupForm?.classList.add('active'); loginForm?.classList.remove('active');
        document.getElementById('auth-error').style.display = 'none';
    };

    // Login form submit
    loginForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        await authRequest('/auth/login', { username, password });
    });

    // Signup form submit
    signupForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value.trim();
        const password = document.getElementById('signup-password').value;
        await authRequest('/auth/register', { username, password });
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = () => {
        localStorage.removeItem('fps_token');
        localStorage.removeItem('fps_username');
        location.reload();
    };

    // Auto-login if token saved
    const savedToken = localStorage.getItem('fps_token');
    if (savedToken) loadProfileFromServer(savedToken);

    if ($instruct) $instruct.style.display = 'none';
}

/* ── Auth helpers ── */
const AUTH_API = 'https://fps-arena-server.v71247932.workers.dev';
let authToken = localStorage.getItem('fps_token') || null;

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function authRequest(endpoint, body) {
    const el = document.getElementById('auth-error');
    if (el) el.style.display = 'none';
    try {
        const res = await fetch(AUTH_API + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { showAuthError(data.error || 'Eroare'); return; }
        onAuthSuccess(data);
    } catch { showAuthError('Eroare conexiune server'); }
}

async function loadProfileFromServer(token) {
    try {
        const res = await fetch(AUTH_API + '/auth/me', {
            headers: { 'Authorization': 'Bearer ' + token },
        });
        if (!res.ok) { localStorage.removeItem('fps_token'); return; }
        const data = await res.json();
        onAuthSuccess({ ...data, token });
    } catch {}
}

function onAuthSuccess(data) {
    authToken = data.token;
    localStorage.setItem('fps_token', data.token);
    localStorage.setItem('fps_username', data.username);

    // Load player data from server
    playerGold    = data.gold || 0;
    ownedKnives   = data.ownedKnives || ['k_plain'];
    equippedKnife = data.equippedKnife || 'k_plain';
    localStorage.setItem('fps_gold',   playerGold);
    localStorage.setItem('fps_knives', JSON.stringify(ownedKnives));
    localStorage.setItem('fps_knife',  equippedKnife);
    updateGoldDisplay();

    // Update UI
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.classList.remove('active');
    const nameEl = document.getElementById('player-name');
    if (nameEl) nameEl.textContent = data.username.toUpperCase();
    document.querySelector('.user-info').style.display = 'flex';
    document.getElementById('login-signup-btn').style.display = 'none';
}

async function saveProfileToServer() {
    if (!authToken) return;
    try {
        fetch(AUTH_API + '/auth/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
            body: JSON.stringify({ gold: playerGold, ownedKnives, equippedKnife }),
        });
    } catch {}
}

/* ═══════════════════════════════════════════════
   MULTIPLAYER
═══════════════════════════════════════════════ */
const NET_SERVER = 'wss://fps-arena-server.v71247932.workers.dev';

let netPlayerId   = null;
let netRoomId     = null;
let netTeam       = 0;
let matchWS       = null;
let roomWS        = null;
let netPlayers    = new Map(); // id -> { mesh, bodyMesh, headMesh, hp, alive, team }
let moveSendTimer = null;

/* ── Matchmaking ── */
function joinMatchmaking(mode) {
    const name = 'Player' + Math.floor(Math.random() * 9000 + 1000);
    const ws = new WebSocket(`${NET_SERVER}/matchmaking?mode=${mode}&name=${encodeURIComponent(name)}`);
    matchWS = ws;

    const mmModal  = document.getElementById('matchmaking-modal');
    const statusEl = document.getElementById('matchmaking-status');
    const modeEl   = document.getElementById('current-mode-display');
    const foundEl  = document.getElementById('found-count');
    const reqEl    = document.getElementById('required-count');

    if (modeEl) modeEl.textContent = mode;
    if (mmModal) mmModal.classList.add('active');

    ws.onopen = () => { if (statusEl) statusEl.textContent = 'Conectat...'; };

    ws.onmessage = evt => {
        let msg; try { msg = JSON.parse(evt.data); } catch { return; }

        if (msg.type === 'queued') {
            netPlayerId = msg.playerId;
            if (statusEl) statusEl.textContent = 'In coada...';
        }
        if (msg.type === 'queue_pos') {
            if (foundEl) foundEl.textContent = msg.pos;
            if (reqEl)   reqEl.textContent   = msg.required;
        }
        if (msg.type === 'matched') {
            netPlayerId = msg.playerId;
            netRoomId   = msg.roomId;
            netTeam     = msg.team;
            ws.close(); matchWS = null;
            if (mmModal) mmModal.classList.remove('active');
            connectGameRoom(msg.roomId, msg.playerId);
        }
        if (msg.type === 'error') {
            if (statusEl) statusEl.textContent = 'Eroare: ' + (msg.msg || '');
        }
    };

    ws.onclose = () => { if (matchWS === ws) matchWS = null; };
    ws.onerror = () => { if (statusEl) statusEl.textContent = 'Eroare conexiune server!'; };
}

function cancelMatchmaking() {
    if (matchWS) { matchWS.close(); matchWS = null; }
    const mmModal = document.getElementById('matchmaking-modal');
    if (mmModal) mmModal.classList.remove('active');
}

/* ── Game Room ── */
function connectGameRoom(roomId, playerId) {
    const ws = new WebSocket(`${NET_SERVER}/room/${roomId}?playerId=${encodeURIComponent(playerId)}`);
    roomWS = ws;

    ws.onmessage = evt => {
        let msg; try { msg = JSON.parse(evt.data); } catch { return; }
        handleNetMsg(msg);
    };

    ws.onclose = () => {
        if (roomWS === ws) { roomWS = null; if (gameRunning) returnToLobby(); }
    };
    ws.onerror = () => console.warn('[net] room error');
}

function handleNetMsg(msg) {
    switch (msg.type) {
        case 'room_state':
            if (msg.players) {
                Object.entries(msg.players).forEach(([id, p]) => {
                    if (id !== netPlayerId) spawnNetPlayer(id, p);
                });
            }
            setNetStatus('Asteapta toti jucatorii...');
            break;

        case 'player_joined':
            if (msg.id !== netPlayerId) spawnNetPlayer(msg.id, msg);
            break;

        case 'game_start': {
            clearNetStatus();
            const sp = msg.spawns && msg.spawns[netPlayerId];
            if (sp) {
                camera.position.set(sp[0], sp[1], sp[2]);
                camera.rotation.set(0, netTeam === 0 ? 0 : Math.PI, 0);
            }
            startNetGame();
            break;
        }

        case 'player_move':
            if (msg.id !== netPlayerId) moveNetPlayer(msg.id, msg.pos, msg.rot);
            break;

        case 'player_shoot':
            if (msg.id !== netPlayerId && msg.pos && msg.dir) {
                const orig = new THREE.Vector3(msg.pos[0], msg.pos[1], msg.pos[2]);
                const dir  = new THREE.Vector3(msg.dir[0], msg.dir[1], msg.dir[2]).normalize();
                const rc   = new THREE.Raycaster(orig, dir, 0, 80);
                const hits = rc.intersectObjects(colBoxes.map(b => b.mesh).filter(Boolean));
                if (hits.length) spawnImpact(hits[0].point);
            }
            break;

        case 'you_hit':
            playerHP = Math.max(0, msg.hp);
            document.body.style.background = 'radial-gradient(circle, rgba(200,0,0,0.35) 0%, transparent 70%)';
            clearTimeout(flashTimeout);
            flashTimeout = setTimeout(() => { document.body.style.background = ''; }, 150);
            updateHUD();
            if (playerHP <= 0) die();
            break;

        case 'player_hit':
            if (netPlayers.has(msg.id)) netPlayers.get(msg.id).hp = msg.hp;
            break;

        case 'player_killed': {
            const isMe = msg.id === netPlayerId;
            const byMe = msg.by === netPlayerId;
            if (!isMe) killNetPlayer(msg.id);
            if (byMe) { kills++; showHitMarker(false); updateHUD(); }
            const scoreEl = document.getElementById('top-score-tile');
            if (scoreEl && msg.scores) scoreEl.textContent = `${msg.scores[0]} - ${msg.scores[1]}`;
            break;
        }

        case 'respawn': {
            playerHP = 100;
            if (msg.pos) camera.position.set(msg.pos[0], msg.pos[1], msg.pos[2]);
            updateHUD();
            break;
        }

        case 'player_respawn':
            if (msg.id !== netPlayerId) respawnNetPlayer(msg.id, msg.pos);
            break;

        case 'player_left':
            removeNetPlayer(msg.id);
            break;

        case 'game_over':
            endNetGame(msg.winner === netTeam, msg.scores);
            break;

        case 'chat':
            showNetChat(msg.name, msg.text, msg.team);
            break;
    }
}

/* ── Network game lifecycle ── */
function startNetGame() {
    gameMode    = 'network';
    kills       = 0;
    deaths      = 0;
    playerHP    = 100;
    playerMoney = 800;
    ammo        = MAG_SIZE;
    reloading   = false;
    velY        = 0;
    onGround    = false;
    gameOver    = false;
    gameRunning = true;

    if ($lobby)    $lobby.style.display    = 'none';
    if ($instruct) $instruct.style.display = 'none';
    if ($hud)      $hud.style.display      = 'block';
    if ($gameover) $gameover.style.display = 'none';
    if ($winScreen) $winScreen.style.display = 'none';
    if ($deathScr)  $deathScr.style.display  = 'none';

    buildWeapon();
    updateHUD();
    requestLock();
    clock.start();

    // Send position 20×/sec
    moveSendTimer = setInterval(() => {
        if (!roomWS || roomWS.readyState !== WebSocket.OPEN || !gameRunning) return;
        roomWS.send(JSON.stringify({
            type: 'move',
            pos: [camera.position.x, camera.position.y, camera.position.z],
            rot: [camera.rotation.x, camera.rotation.y],
            weapon: currentWeapon === 'rifle' ? 0 : currentWeapon === 'pistol' ? 1 : 2,
        }));
    }, 50);
}

function endNetGame(won, scores) {
    gameRunning = false;
    gameOver    = true;
    isLocked    = false;
    clearInterval(moveSendTimer);
    document.exitPointerLock();
    if ($hud) $hud.style.display = 'none';

    if (won) {
        if ($winScreen) {
            $winScreen.style.display = 'block';
            setTimeout(() => cleanupNet(), 4000);
        }
    } else {
        const scoreEl = document.getElementById('top-score-tile');
        if (scores && scoreEl) scoreEl.textContent = `${scores[0]} - ${scores[1]}`;
        if ($gameover) $gameover.style.display = 'flex';
    }
}

function cleanupNet() {
    clearInterval(moveSendTimer);
    if (roomWS) { roomWS.close(); roomWS = null; }
    netPlayers.forEach(p => scene.remove(p.mesh));
    netPlayers.clear();
    gameMode = 'bot';
    returnToLobby();
}

/* ── Net player meshes ── */
function spawnNetPlayer(id, info) {
    if (netPlayers.has(id)) return;
    const g = new THREE.Group();
    const isT = info.team === 0;

    const bodyM = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.0, 0.4),
        new THREE.MeshLambertMaterial({ color: isT ? 0xcc3322 : 0x2244cc })
    );
    bodyM.position.y = 0.9;
    g.add(bodyM);

    const headM = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        new THREE.MeshLambertMaterial({ color: 0xf0c090 })
    );
    headM.position.y = 1.6;
    g.add(headM);

    const gunM = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 0.4),
        new THREE.MeshLambertMaterial({ color: 0x111111 })
    );
    gunM.position.set(0.35, 1.1, -0.3);
    g.add(gunM);

    if (info.pos) g.position.set(info.pos[0] || 0, 0, info.pos[2] || 0);
    scene.add(g);

    netPlayers.set(id, { mesh: g, bodyMesh: bodyM, headMesh: headM, hp: 100, alive: true, team: info.team });
}

function moveNetPlayer(id, pos, rot) {
    const p = netPlayers.get(id);
    if (!p || !p.alive || !pos) return;
    p.mesh.position.set(pos[0], 0, pos[2]);
    if (rot) p.mesh.rotation.y = rot[1];
}

function killNetPlayer(id) {
    const p = netPlayers.get(id);
    if (!p) return;
    p.alive = false;
    p.mesh.rotation.z = Math.PI / 2;
    p.mesh.position.y = -0.4;
    setTimeout(() => { if (p.mesh) p.mesh.visible = false; }, 3000);
}

function respawnNetPlayer(id, pos) {
    const p = netPlayers.get(id);
    if (!p) return;
    p.alive = true;
    p.mesh.rotation.z = 0;
    p.mesh.position.y = 0;
    p.mesh.visible = true;
    if (pos) p.mesh.position.set(pos[0], 0, pos[2]);
}

function removeNetPlayer(id) {
    const p = netPlayers.get(id);
    if (p) { scene.remove(p.mesh); netPlayers.delete(id); }
}

/* ── Network shooting ── */
const _netShootDir    = new THREE.Vector3();
const _netShootOrigin = new THREE.Vector3();

function tryShootNet() {
    const now = performance.now();
    if (reloading || ammo <= 0) { if (!reloading) startReload(); return; }
    if (now - lastShot < FIRE_RATE_MS) return;
    lastShot = now;
    ammo--;
    if (ammo === 0) startReload();

    if (weaponMesh) { weaponMesh.position.z += 0.04; weaponMesh.rotation.x -= 0.06; }

    camera.getWorldDirection(_netShootDir);
    _netShootOrigin.copy(camera.position);

    // Tell server we shot
    if (roomWS && roomWS.readyState === WebSocket.OPEN) {
        roomWS.send(JSON.stringify({
            type: 'shoot',
            pos: [_netShootOrigin.x, _netShootOrigin.y, _netShootOrigin.z],
            dir: [_netShootDir.x, _netShootDir.y, _netShootDir.z],
            weapon: 0,
        }));
    }

    const rc = new THREE.Raycaster(_netShootOrigin, _netShootDir, 0, 80);
    const wallMeshes = colBoxes.map(b => b.mesh).filter(Boolean);
    const wallHits   = rc.intersectObjects(wallMeshes);
    const wallDist   = wallHits.length > 0 ? wallHits[0].distance : Infinity;
    if (wallHits.length > 0) spawnImpact(wallHits[0].point);

    // Check hits on net players
    const targets = [];
    netPlayers.forEach((p, id) => {
        if (p.alive) { targets.push({ obj: p.bodyMesh, id, head: false }); targets.push({ obj: p.headMesh, id, head: true }); }
    });
    const hits = rc.intersectObjects(targets.map(t => t.obj));
    if (hits.length > 0 && hits[0].distance < wallDist) {
        const found = targets.find(t => t.obj === hits[0].object);
        if (found) {
            const dmg = found.head ? DAMAGE * 3.5 : DAMAGE;
            showHitMarker(found.head);
            if (roomWS && roomWS.readyState === WebSocket.OPEN) {
                roomWS.send(JSON.stringify({ type: 'hit', targetId: found.id, damage: dmg }));
            }
        }
    }
    updateHUD();
}

/* ── UI helpers ── */
function setNetStatus(text) {
    let el = document.getElementById('_net_status');
    if (!el) {
        el = document.createElement('div');
        el.id = '_net_status';
        el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.85);color:#00d2ff;font-size:22px;font-weight:800;letter-spacing:3px;padding:20px 40px;border:1px solid rgba(0,210,255,0.5);border-radius:10px;z-index:900;font-family:Inter,sans-serif;pointer-events:none;text-align:center;';
        document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = 'block';
}
function clearNetStatus() {
    const el = document.getElementById('_net_status');
    if (el) el.style.display = 'none';
}

let _chatTimeout = {};
function showNetChat(name, text, team) {
    let log = document.getElementById('_chat_log');
    if (!log) {
        log = document.createElement('div');
        log.id = '_chat_log';
        log.style.cssText = 'position:fixed;bottom:130px;left:20px;width:320px;z-index:700;pointer-events:none;';
        document.body.appendChild(log);
    }
    const line = document.createElement('div');
    line.style.cssText = `color:${team===0?'#ff8040':'#5588ff'};font-size:14px;margin-bottom:3px;text-shadow:0 0 5px #000;font-family:Inter,sans-serif;background:rgba(0,0,0,0.5);padding:3px 8px;border-radius:4px;`;
    line.textContent = `${name}: ${text}`;
    log.appendChild(line);
    setTimeout(() => { try { log.removeChild(line); } catch {} }, 6000);
}

/* ═══════════════════════════════════════════════
   BUY MENU
═══════════════════════════════════════════════ */
const SHOP_ITEMS = {
    pistols: [
        { id: 'glock',   name: 'Glock-18',       price: 200,  side: '' },
        { id: 'p2000',   name: 'P2000',           price: 200,  side: 'ct' },
        { id: 'dualies', name: 'Dual Berettas',   price: 400,  side: '' },
        { id: 'p250',    name: 'P250',            price: 300,  side: '' },
        { id: 'fiveseven',name:'Five-SeveN',      price: 500,  side: 'ct' },
        { id: 'tec9',    name: 'Tec-9',           price: 500,  side: 't' },
        { id: 'cz75',    name: 'CZ75-Auto',       price: 500,  side: '' },
        { id: 'deagle',  name: 'Desert Eagle',    price: 700,  side: '' },
        { id: 'r8',      name: 'R8 Revolver',     price: 600,  side: '' },
    ],
    smgs: [
        { id: 'mac10',   name: 'MAC-10',          price: 1050, side: 't' },
        { id: 'mp9',     name: 'MP9',             price: 1050, side: 'ct' },
        { id: 'mp7',     name: 'MP7',             price: 1500, side: '' },
        { id: 'mp5sd',   name: 'MP5-SD',          price: 1500, side: '' },
        { id: 'ump45',   name: 'UMP-45',          price: 1200, side: '' },
        { id: 'p90',     name: 'P90',             price: 2350, side: '' },
        { id: 'bizon',   name: 'PP-Bizon',        price: 1400, side: '' },
    ],
    rifles: [
        { id: 'famas',   name: 'FAMAS',           price: 2050, side: 'ct' },
        { id: 'galil',   name: 'Galil AR',        price: 1800, side: 't' },
        { id: 'ak47',    name: 'AK-47',           price: 2700, side: 't' },
        { id: 'm4a4',    name: 'M4A4',            price: 3100, side: 'ct' },
        { id: 'm4a1s',   name: 'M4A1-S',         price: 2900, side: 'ct' },
        { id: 'sg553',   name: 'SG 553',          price: 3000, side: 't' },
        { id: 'aug',     name: 'AUG',             price: 3300, side: 'ct' },
    ],
    snipers: [
        { id: 'ssg08',   name: 'SSG 08',          price: 1700, side: '' },
        { id: 'awp',     name: 'AWP',             price: 4750, side: '' },
        { id: 'g3sg1',   name: 'G3SG1',           price: 5000, side: 't' },
        { id: 'scar20',  name: 'SCAR-20',         price: 5000, side: 'ct' },
    ],
    heavy: [
        { id: 'nova',    name: 'Nova',            price: 1050, side: '' },
        { id: 'xm1014',  name: 'XM1014',          price: 2000, side: '' },
        { id: 'sawedoff',name: 'Sawed-Off',       price: 1100, side: 't' },
        { id: 'mag7',    name: 'MAG-7',           price: 1300, side: 'ct' },
        { id: 'm249',    name: 'M249',            price: 5200, side: '' },
        { id: 'negev',   name: 'Negev',           price: 1700, side: '' },
    ],
    equipment: [
        { id: 'kevlar',  name: 'Kevlar',          price: 650,  side: '' },
        { id: 'kevlarh', name: 'Kevlar + Helmet', price: 1000, side: '' },
        { id: 'defuse',  name: 'Defuse Kit',      price: 400,  side: 'ct' },
        { id: 'zeus',    name: 'Zeus x27',        price: 200,  side: '' },
    ],
    grenades: [
        { id: 'he',      name: 'HE Grenade',      price: 300,  side: '' },
        { id: 'flash',   name: 'Flashbang',       price: 200,  side: '' },
        { id: 'smoke',   name: 'Smoke Grenade',   price: 300,  side: '' },
        { id: 'molotov', name: 'Molotov',         price: 400,  side: 't' },
        { id: 'incend',  name: 'Incendiary',      price: 600,  side: 'ct' },
        { id: 'decoy',   name: 'Decoy Grenade',   price: 50,   side: '' },
    ],
};

let _buyCat = 'pistols';

window._buyItem = function(price) {
    if (playerMoney < price) return;
    playerMoney -= price;
    const moneyEl = document.getElementById('ingame-money');
    if (moneyEl) {
        moneyEl.classList.add('spent');
        setTimeout(() => moneyEl.classList.remove('spent'), 400);
    }
    _renderBuyCat(_buyCat);
    _syncBuyMoney();
    updateHUD();
};

function _syncBuyMoney() {
    const el = document.getElementById('ingame-money');
    if (el) el.textContent = `$${playerMoney}`;
}

function _renderBuyCat(cat) {
    _buyCat = cat;
    const container = document.getElementById('ingame-buy-items');
    if (!container) return;
    const items = SHOP_ITEMS[cat] || [];
    container.innerHTML = items.map(it => {
        const canAfford = playerMoney >= it.price;
        const sideHtml = it.side
            ? `<span class="buy-item-side ${it.side}">${it.side.toUpperCase()}</span>`
            : '';
        return `<div class="buy-item-card${canAfford ? '' : ' disabled'}">
            ${sideHtml}
            <div class="buy-item-name">${it.name}</div>
            <div class="buy-item-price">$${it.price.toLocaleString()}</div>
            <button class="buy-item-btn"${canAfford ? ` onclick="_buyItem(${it.price})"` : ' disabled'}>CUMPARA</button>
        </div>`;
    }).join('');
    document.querySelectorAll('.ingame-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.cat === cat)
    );
}

let _buyTimerInterval = null;
let _buySecondsLeft = 10;

function openBuyMenu() {
    if (!gameRunning || gameOver) return;
    buyMenuOpen = true;
    document.exitPointerLock();
    _syncBuyMoney();
    _renderBuyCat(_buyCat);
    const el = document.getElementById('ingame-buy-menu');
    if (el) el.classList.add('open');

    // 10 second countdown
    _buySecondsLeft = 10;
    _updateBuyTimer();
    clearInterval(_buyTimerInterval);
    _buyTimerInterval = setInterval(() => {
        _buySecondsLeft--;
        _updateBuyTimer();
        if (_buySecondsLeft <= 0) closeBuyMenu();
    }, 1000);
}

function _updateBuyTimer() {
    const el = document.getElementById('buy-countdown');
    if (el) {
        el.textContent = `${_buySecondsLeft}s`;
        el.style.color = _buySecondsLeft <= 3 ? '#ff4444' : '#fbbf24';
    }
}

function closeBuyMenu() {
    buyMenuOpen = false;
    clearInterval(_buyTimerInterval);
    const el = document.getElementById('ingame-buy-menu');
    if (el) el.classList.remove('open');
    if (gameRunning && !gameOver) setTimeout(() => requestLock(), 80);
}

function setupBuyMenu() {
    document.querySelectorAll('.ingame-tab').forEach(tab => {
        tab.addEventListener('click', () => _renderBuyCat(tab.dataset.cat));
    });
    const panel = document.getElementById('ingame-buy-menu');
    if (panel) panel.addEventListener('click', e => {
        if (e.target === panel) closeBuyMenu();
    });
}

/* ═══════════════════════════════════════════════
   KNIFE SHOP (LOBBY)
═══════════════════════════════════════════════ */
const KNIFE_SHOP = [
    { id: 'k_plain',   name: 'Karambit',                price: 0,   color: 0xb0b8c8, hColor: 0x1a1a2e, desc: 'Gratuit — otel clasic' },
    { id: 'k_bluegem', name: 'Karambit | Blue Gem',     price: 100, color: 0x0066ff, hColor: 0x001144, desc: 'Blue Gem Factory New' },
    { id: 'k_fade',    name: 'Karambit | Fade',         price: 100, color: 0xff6600, hColor: 0x660099, desc: 'Full Fade' },
    { id: 'k_tiger',   name: 'Karambit | Tiger Tooth',  price: 100, color: 0xd4a017, hColor: 0x2a1500, desc: 'Tiger Tooth FN' },
    { id: 'k_doppler', name: 'Karambit | Doppler',      price: 100, color: 0x880011, hColor: 0x111111, desc: 'Phase 2' },
    { id: 'k_marble',  name: 'Karambit | Marble Fade',  price: 100, color: 0xff4400, hColor: 0x001188, desc: 'Fire & Ice' },
    { id: 'k_crimson', name: 'Karambit | Crimson Web',  price: 100, color: 0xaa0000, hColor: 0x330000, desc: 'Minimal Wear' },
    { id: 'k_gamma',   name: 'Karambit | Gamma Doppler',price: 100, color: 0x00aa44, hColor: 0x001a0a, desc: 'Emerald' },
];

/* ── Knife 3D preview renderer ── */
let _pvR = null, _pvScene = null, _pvCam = null;
const _thumbCache = {};

function _initPvRenderer() {
    _pvScene = new THREE.Scene();
    _pvScene.background = new THREE.Color(0x080c14);
    _pvCam = new THREE.PerspectiveCamera(42, 1, 0.001, 20);
    _pvCam.position.set(0.08, -0.06, 0.28);
    _pvCam.lookAt(0, 0.02, 0);
    _pvScene.add(new THREE.AmbientLight(0x223355, 1.4));
    const dl = new THREE.DirectionalLight(0xffffff, 4.0);
    dl.position.set(0.5, 1.5, 1.5); _pvScene.add(dl);
    const dl2 = new THREE.DirectionalLight(0x6699ff, 1.5);
    dl2.position.set(-1.5, -0.5, 0.5); _pvScene.add(dl2);
    _pvR = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    _pvR.setSize(200, 200);
}

function _knifeThumb(id) {
    if (_thumbCache[id]) return _thumbCache[id];
    if (!_pvR) _initPvRenderer();
    while (_pvScene.children.length > 3) _pvScene.remove(_pvScene.children[3]);
    _pvScene.add(_buildKnife3D(id));
    _pvR.render(_pvScene, _pvCam);
    _thumbCache[id] = _pvR.domElement.toDataURL();
    return _thumbCache[id];
}

/* ── Karambit model for shop preview ── */
function _buildKnife3D(id) {
    const skin = KNIFE_SHOP.find(k => k.id === id) || KNIFE_SHOP[0];
    const bCol = skin.color  || 0xb0b8c8;
    const hCol = skin.hColor || 0x1a1a2e;
    const g = new THREE.Group();

    // Use real OBJ if loaded
    if (_karambitTemplate) {
        const clone = _karambitTemplate.clone(true);
        const mat = new THREE.MeshPhongMaterial({ color: bCol, specular: 0xffffff, shininess: 160, side: THREE.DoubleSide });
        clone.traverse(child => { if (child.isMesh) child.material = mat; });
        clone.rotation.set(0.4, Math.PI + 0.3, -0.2);
        g.add(clone);
        return g;
    }

    const B  = new THREE.MeshPhongMaterial({ color: bCol, specular: 0xffffff, shininess: 180, side: THREE.DoubleSide });
    const B2 = new THREE.MeshPhongMaterial({ color: new THREE.Color(bCol).multiplyScalar(0.55), specular: 0xaaaaaa, shininess: 80, side: THREE.DoubleSide });
    const H  = new THREE.MeshPhongMaterial({ color: hCol, specular: 0x555566, shininess: 50 });
    const G  = new THREE.MeshPhongMaterial({ color: 0x555566, specular: 0xaaaacc, shininess: 100 });

    // Curved blade — karambit hook
    const segs = 12;
    for (let i = 0; i < segs; i++) {
        const t  = i / (segs - 1);
        const a  = t * Math.PI * 0.82 - Math.PI * 0.06;
        const r  = 0.085;
        const w  = 0.006 + (1 - t) * 0.004;
        const h  = 0.022 - t * 0.014;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.022), t < 0.5 ? B : B2);
        seg.position.set(Math.sin(a) * r - 0.025, 0, -Math.cos(a) * r + 0.005);
        seg.rotation.y = -a;
        g.add(seg);
    }
    // Spine detail
    for (let i = 0; i < 4; i++) {
        const t  = (i + 0.5) / 4;
        const a  = t * Math.PI * 0.82 - Math.PI * 0.06;
        const r  = 0.083;
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.006), G);
        sp.position.set(Math.sin(a) * r - 0.025, 0.012, -Math.cos(a) * r + 0.005);
        sp.rotation.y = -a;
        g.add(sp);
    }
    // Guard / bolster
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.032, 0.012), G);
    guard.position.set(-0.007, 0, 0.006); g.add(guard);
    // Handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.028, 0.076), H);
    handle.position.set(-0.002, 0, 0.054); g.add(handle);
    // Handle texture strips
    for (let i = 0; i < 3; i++) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.004, 0.004), G);
        strip.position.set(-0.002, 0.016, 0.022 + i * 0.022); g.add(strip);
    }
    // Finger ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 10, 20), G);
    ring.position.set(-0.002, 0, 0.100); ring.rotation.x = Math.PI / 2; g.add(ring);
    // Pommel
    const pom = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.010, 0.010, 10), G);
    pom.position.set(-0.002, 0, 0.090); pom.rotation.x = Math.PI / 2; g.add(pom);

    // "In-hand" angle — blade pointing up-left, ring toward viewer
    g.rotation.set(-0.35, -0.55, 0.30);
    g.position.set(0.01, 0.01, 0);
    return g;
}

function renderKnifeShop() {
    const grid = document.getElementById('knife-shop-grid');
    if (!grid) return;
    updateGoldDisplay();
    grid.innerHTML = KNIFE_SHOP.map(k => {
        const owned    = ownedKnives.includes(k.id);
        const equipped = equippedKnife === k.id;
        const canBuy   = !owned && playerGold >= k.price;
        const thumb    = _knifeThumb(k.id);

        let btnLabel, btnStyle;
        if (equipped) {
            btnLabel = 'ECHIPAT ✓';
            btnStyle = 'background:rgba(0,255,150,0.2);border-color:#00ff96;color:#00ff96;';
        } else if (owned) {
            btnLabel = 'ECHIPEAZA';
            btnStyle = 'background:rgba(0,210,255,0.15);border-color:#00d2ff;color:#00d2ff;';
        } else if (canBuy) {
            btnLabel = `CUMPARA — ${k.price} GOLD`;
            btnStyle = 'background:rgba(255,215,0,0.15);border-color:#ffd700;color:#ffd700;';
        } else {
            btnLabel = k.price > 0 ? `${k.price} GOLD` : 'DEFAULT';
            btnStyle = 'opacity:0.35;cursor:not-allowed;';
        }

        const border = equipped ? '2px solid rgba(255,215,0,0.7)' : '1px solid rgba(255,255,255,0.08)';
        const glow   = equipped ? 'box-shadow:0 0 22px rgba(255,215,0,0.25);' : '';

        return `<div style="background:rgba(255,255,255,0.03);border:${border};border-radius:10px;padding:12px 10px;text-align:center;${glow}transition:all 0.2s;">
            <img src="${thumb}" style="width:100%;border-radius:6px;margin-bottom:8px;display:block;" alt="${k.name}">
            <div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:3px;">${k.name}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:10px;">${k.desc}</div>
            <button onclick="_knifeAction('${k.id}',${k.price})" ${(!owned && !canBuy)?'disabled':''} style="width:100%;padding:7px 0;border-radius:5px;border:1px solid;font-size:10px;font-weight:800;letter-spacing:1px;cursor:pointer;${btnStyle}">${btnLabel}</button>
        </div>`;
    }).join('');
}

window._knifeAction = function(id, price) {
    const owned = ownedKnives.includes(id);
    if (!owned) {
        if (playerGold < price) return;
        playerGold -= price;
        localStorage.setItem('fps_gold', playerGold);
        ownedKnives.push(id);
        localStorage.setItem('fps_knives', JSON.stringify(ownedKnives));
    }
    equippedKnife = id;
    localStorage.setItem('fps_knife', id);
    updateGoldDisplay();
    saveProfileToServer();
    renderKnifeShop();
    if (currentWeapon === 'knife') buildWeapon();
};

function setupKnifeShop() {
    const navShop  = document.getElementById('nav-shop');
    const shopModal = document.getElementById('lobby-shop-modal');
    const closeShop = document.getElementById('close-shop');
    if (navShop)    navShop.onclick   = () => { shopModal?.classList.add('active'); renderKnifeShop(); };
    if (closeShop)  closeShop.onclick = () => shopModal?.classList.remove('active');
}

/* ═══════════════════════════════════════════════
   ENTRY POINT
═══════════════════════════════════════════════ */
initThree();
buildMap();
setupLobbyUI();
setupBuyMenu();
setupKnifeShop();
updateGoldDisplay();
Promise.all([preloadAK(), preloadKarambit()]).then(() => {
    buildWeapon();
    // Refresh shop thumbnails with real OBJ if shop is open
    if (document.getElementById('knife-shop-grid')?.children.length > 0) {
        Object.keys(_thumbCache).forEach(k => delete _thumbCache[k]);
        renderKnifeShop();
    }
});
animate();
