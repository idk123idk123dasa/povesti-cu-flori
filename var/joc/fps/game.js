import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CS2_WEAPONS } from './weapons_cs2.js';

// --- Global Variables ---
let camera, scene, renderer, controls, weapon;
let currentWeaponType = 'pistol'; // pistol, ak47, knife
const HU = 0.1389; // Precise Hammer unit conversion factor (72 HU = 10 Three.js units)

// --- Multiplayer / Networking ---
let peer;
let allConns = []; // Host: all connected clients. Client: only the host connection.
let myId;
let myTeamId = 0; // 0 = Team 1 (Teammate labeling), 1 = Team 2
let isHost = false;
let remotePlayers = {}; // Map of meshes keyed by Peer ID
let playerTeams = {};   // Map of team IDs keyed by Peer ID
let networkReady = false;
let isLobbyOpen = true; // CACHED <!-- id: 19 -->
let isInstructionsOpen = true; // CACHED
let requiredPlayers = 2;
let currentPlayers = 1;
let syncTimer = 0;
const SYNC_RATE = 1000 / 30; // 30 updates per second
let isFiring = false;
let lastShotTime = 0;
let fireRate = 0; // ms between shots
let inspectTimer = 0;
const INSPECT_DURATION = 2.5; // seconds
let recoilCounter = 0; // Counts bullets for spray pattern
const objects = []; // For collision (optional/simple)
const objectBoxes = []; // Precomputed Bounding Boxes for optimization
const enemies = [];
const bullets = [];
const enemyBullets = [];
const impacts = [];
let raycaster;
let droppedWeapons = []; // FIX: Declare droppedWeapons global array <!-- id: 29 -->

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let isCrouching = false;
let spacePressed = false;
const PLAYER_STAND_HEIGHT = 10.0;
const PLAYER_CROUCH_HEIGHT = 6.0;
const PLAYER_EYE_OFFSET = 4.5;
const PLAYER_RADIUS = 3.5; // Thicker radius for better collision


let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Game State
let health = 100;
let score = 0; // Kills? Or rounds?
let isGameOver = false;

// Round System
let playerWins = 0;
let enemyWins = 0;
let opponentWins = 0;
let botMoney = 800; // Bot Economy
let roundActive = false;

// Expose for debugging
window.gameDebug = {
    version: "1.0.5-InputDebug-Visuals",
    get roundActive() { return roundActive; },
    get isGameOver() { return isGameOver; },
    get isPlaying() {
        return roundActive &&
            (!instructionScreen || instructionScreen.style.display !== 'flex') &&
            (!lobbyUI || lobbyUI.style.display !== 'flex');
    },
    get health() { return health; },
    get pos() { return controls ? controls.getObject().position : null; },
    get moveForward() { return moveForward; },
    get isLocked() { return document.pointerLockElement !== null; },
    get selectedTeam() { return selectedTeam; },
    get camera() { return camera; },
    get controls() { return controls; }
};
const MAX_WINS = 10;
const enemiesPerRound = 5;

// AI Logic
const enemyFireRate = 600; // ms (Faster fire rate)
const aiVisionRange = 500;
const enemySpeed = 25; // Faster movement

// Weapon Configs (Ammo)
const weaponConfigs = {
    'primary': { id: 'default', magSize: 30, reserve: 120, name: 'Primary', fireRate: 100 },
    'secondary': { id: 'usp-s', magSize: 12, reserve: 36, name: 'USP-S', fireRate: 200 },
    'knife': { id: 'knife', magSize: Infinity, reserve: Infinity, name: 'Knife', fireRate: 500 },
    'grenade': { id: 'grenade', magSize: 1, reserve: 4, name: 'Grenade', fireRate: 500 }
};

let weaponAmmo = {
    'primary': { mag: 30, reserve: 120 },
    'secondary': { mag: 12, reserve: 36 },
    'knife': { mag: Infinity, reserve: Infinity },
    'grenade': { mag: 1, reserve: 4 }
};

// Skins Database
const skinsDatabase = {
    'ak47': [
        { id: 'default', name: 'Standard', price: 0, color: 0x5c4033 },
        { id: 'hyperbeast', name: 'Hyperbeast', price: 80, color: 0x1a1a1a, accents: 0xff00ff, pattern: 'hyperbeast' },
        { id: 'asiimov', name: 'Asiimov', price: 70, color: 0xffffff, accents: 0xff4500, pattern: 'sci-fi' },
        { id: 'arabesque', name: 'Gold Arabesque', price: 200, color: 0xd4af37, accents: 0x8b4513, pattern: 'engraved' },
        { id: 'dragon-lore', name: 'Dragon Lore', price: 500, color: 0xd4af37, accents: 0x5c4033, pattern: 'dragon' }
    ],
    'm4a4': [
        { id: 'default', name: 'Standard', price: 0, color: 0x1a1a1a },
        { id: 'howl', name: 'Howl', price: 150, color: 0x8b0000, accents: 0xff4500, pattern: 'hyperbeast' },
        { id: 'asiimov', name: 'Asiimov', price: 100, color: 0xffffff, accents: 0xff4500, pattern: 'sci-fi' },
        { id: 'printstream', name: 'M4A1-S Printstream (StatTrak)', price: 400, color: 0xffffff, accents: 0x000000, pattern: 'printstream' }
    ],
    'awp': [
        { id: 'default', name: 'Standard', price: 0, color: 0x2e3b23 },
        { id: 'dragon-lore', name: 'Dragon Lore', price: 500, color: 0xd4af37, accents: 0x8b4513, pattern: 'dragon' },
        { id: 'medusa', name: 'Medusa', price: 300, color: 0x00008b, accents: 0x00ffff, pattern: 'mythic' },
        { id: 'fade', name: 'Fade', price: 100, color: 0xff00ff, accents: 0xffd700, pattern: 'gradient' }
    ],
    'pistol': [
        { id: 'default', name: 'Standard', price: 0, color: 0xffffff },
        { id: 'usp-cortex', name: 'Cortex', price: 5, color: 0x1a1a1a, accents: 0xff69b4, pattern: 'hyperbeast' },
        { id: 'deagle-blaze', name: 'Blaze', price: 20, color: 0x1a1a1a, accents: 0xff4500, pattern: 'gradient' },
        { id: 'glock-fade', name: 'Fade', price: 40, color: 0xff00ff, accents: 0x00ffff, pattern: 'gradient' },
        { id: 'printstream-usp', name: 'USP-S Printstream (StatTrak)', price: 400, color: 0xffffff, accents: 0x000000, pattern: 'printstream' },
        { id: 'printstream-deagle', name: 'Desert Eagle Printstream (StatTrak)', price: 400, color: 0xffffff, accents: 0x000000, pattern: 'printstream' }
    ],
    'knife': [
        { id: 'default', name: 'Standard', price: 0, color: 0x1a1a1a },
        { id: 'doppler', name: 'Doppler', price: 20, color: 0x4b0082, accents: 0xff00ff, pattern: 'gradient' },
        { id: 'lore', name: 'Lore', price: 30, color: 0xd4af37, accents: 0x228b22, pattern: 'engraved' },
        { id: 'marble-fade', name: 'Marble Fade', price: 40, color: 0xff0000, accents: 0x0000ff, pattern: 'gradient' }
    ]
};

let isReloading = false;
let isScoped = false; // Scope state for sniper rifles
let scopeLevel = 0; // 0=none, 1=zoom1, 2=zoom2
const SCOPED_FOV = 20; // Zoomed FOV for scoped weapons
const SCOPE_LEVEL2_FOV = 8; // Double zoom for snipers (AWP/SSG)
const DEFAULT_FOV = 75; // Default FOV

// DOM Elements
const instructionScreen = document.getElementById('instructions');
const hud = document.getElementById('hud');
const gameOverScreen = document.getElementById('game-over');
const healthDisplay = document.getElementById('health');
const winScreen = document.getElementById('win-screen');
const deathScreen = document.getElementById('death-screen');
const finalScoreDisplay = document.getElementById('final-score');
const freezeTimeMsg = document.getElementById('freeze-time-msg');

// Lobby Elements
const lobbyUI = document.getElementById('lobby-ui');
const navPlay = document.getElementById('nav-play');
const navShop = document.getElementById('nav-shop');
const navCollection = document.getElementById('nav-collection');
const modeModal = document.getElementById('mode-selection-modal');
const ammoDisplay = document.getElementById('ammo-display');
const crosshair = document.getElementById('crosshair'); // CACHED <!-- id: 14 -->
const closeModes = document.getElementById('close-modes');
const modeButtons = document.querySelectorAll('.mode-card');

// Matchmaking Elements
const matchmakingModal = document.getElementById('matchmaking-modal');
const matchmakingStatus = document.getElementById('matchmaking-status');
const foundCountDisplay = document.getElementById('found-count');
const requiredCountDisplay = document.getElementById('required-count');
const modeDisplay = document.getElementById('current-mode-display');
const cancelMatchmakingBtn = document.getElementById('cancel-matchmaking');
const authModal = document.getElementById('auth-modal');
const closeAuthBtn = document.getElementById('close-auth');
const userInfo = document.querySelector('.user-info');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authError = document.getElementById('auth-error');
const loginSignupBtn = document.getElementById('login-signup-btn');
const userInfoSection = document.querySelector('.user-info');
const logoutBtn = document.getElementById('logout-btn');

// Team Selection Elements
const teamSelectionModal = document.getElementById('team-selection-modal');
const teamCards = document.querySelectorAll('.team-card');

// Buy Menu Elements
const buyMenuModal = document.getElementById('buy-menu-modal');
const closeBuyMenuBtn = document.getElementById('close-buy-menu');
const playerMoneyDisplay = document.getElementById('player-money');
const buyTimerDisplay = document.getElementById('buy-timer');
const buyTabs = document.querySelectorAll('.buy-tab');
const buyItemsContainer = document.getElementById('buy-items-container');

let currentMode = '1vBot';
let selectedTeam = null; // 'T' or 'CT'
let playerMoney = 800;
let playerInventory = {
    primary: null,
    secondary: null,
    grenades: [],
    equipment: {
        armor: 0,
        helmet: false,
        defuseKit: false
    },
    skins: {
        'ak47': 'default',
        'm4a4': 'default',
        'awp': 'default',
        'pistol': 'default',
        'knife': 'default'
    },
    ownedSkins: ['default']
};
let playerMata = 0; // New currency
let playerKills = 0;
let isBuyPhase = false;
let lastRoundWon = true;
let buyTimerInterval = null;
let buyTimeRemaining = 0; // Current time left in phase
let lastHUDUpdate = 0;
const FOOTSTEP_INTERVAL = 400; // ms

// --- AUDIO SYSTEM --- <!-- id: 34 -->
const audioListener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();
const soundBuffers = {};

const SOUNDS = {
    'shoot': 'https://cdn.pixabay.com/audio/2022/03/10/audio_c0d1b1f6f1.mp3', // Pop/Shot
    'reload': 'https://cdn.pixabay.com/audio/2022/03/15/audio_2d79040182.mp3', // Click/Mechanical
    'footstep': 'https://cdn.pixabay.com/audio/2021/08/04/audio_03d9735d64.mp3', // Thud
    'win': 'https://cdn.pixabay.com/audio/2021/08/04/audio_0621213329.mp3',    // Success
    'loss': 'https://cdn.pixabay.com/audio/2021/08/04/audio_01529124be.mp3',    // Failure
    'hit': 'https://cdn.pixabay.com/audio/2021/08/04/audio_c3e6022e03.mp3',    // Click
    'kill': 'https://cdn.pixabay.com/audio/2022/01/18/audio_27607a5146.mp3',   // Ding
    'hurt': 'https://cdn.pixabay.com/audio/2022/03/10/audio_f94572ef98.mp3',    // Grunt
    'headshot': 'https://cdn.pixabay.com/audio/2021/08/04/audio_3d1a8c0816.mp3' // Splat/Headshot
};

function initAudio() {
    camera.add(audioListener);
    // Preload sounds
    Object.entries(SOUNDS).forEach(([name, url]) => {
        audioLoader.load(url,
            (buffer) => {
                soundBuffers[name] = buffer;
            },
            undefined, // onProgress
            (err) => {
                console.warn(`[AUDIO ERROR] Failed to load sound "${name}" from ${url}. Host might be blocking hotlinks (403).`, err);
            }
        );
    });
}

function playSound(name, volume = 0.5, playbackRate = 1.0) {
    if (soundBuffers[name]) {
        const sound = new THREE.Audio(audioListener);
        sound.setBuffer(soundBuffers[name]);
        sound.setVolume(volume);
        sound.playbackRate = playbackRate;
        sound.play();
    }
}

// --- PERSISTENCE ---
function savePlayerData() {
    const data = {
        mata: playerMata,
        ownedSkins: playerInventory.ownedSkins,
        activeSkins: playerInventory.skins
    };
    localStorage.setItem('fps_player_data', JSON.stringify(data));
}

function loadPlayerData() {
    const saved = localStorage.getItem('fps_player_data');
    if (saved) {
        const data = JSON.parse(saved);
        playerMata = data.mata || 0;
        playerInventory.ownedSkins = data.ownedSkins || ['default'];
        playerInventory.skins = data.activeSkins || { 'ak47': 'default', 'pistol': 'default', 'knife': 'default' };
    }

    // Admin bonus: 10,000 MATA for admin account
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser === 'admin' && playerMata < 10000) {
        playerMata = 10000;
        savePlayerData();
    }
}

// --- AUTH & MISC UI LOGIC (TOP LEVEL) ---

const updateAuthUI = (username) => {
    if (username) {
        if (loginSignupBtn) loginSignupBtn.style.display = 'none';
        if (userInfoSection) userInfoSection.style.display = 'flex';
        const playerNameEl = document.getElementById('player-name');
        if (playerNameEl) playerNameEl.textContent = username.toUpperCase();
    } else {
        if (loginSignupBtn) loginSignupBtn.style.display = 'block';
        if (userInfoSection) userInfoSection.style.display = 'none';
    }
};

const getRegisteredUsers = () => JSON.parse(localStorage.getItem('registeredUsers') || '{}');
const setRegisteredUsers = (users) => localStorage.setItem('registeredUsers', JSON.stringify(users));

const showError = (msg) => {
    if (authError) {
        authError.textContent = msg;
        authError.style.display = 'block';
        setTimeout(() => { authError.style.display = 'none'; }, 3000);
    }
};

// Check for existing session immediately
const currentSession = localStorage.getItem('currentUser');
if (currentSession) updateAuthUI(currentSession);

// Handle pre-filling saved credentials and showing modal
if (loginSignupBtn) {
    loginSignupBtn.onclick = () => {
        authModal.classList.add('active');
        const savedUser = localStorage.getItem('savedUsername');
        const savedPass = localStorage.getItem('savedPassword');
        if (savedUser && savedPass) {
            const userInp = document.getElementById('login-username');
            const passInp = document.getElementById('login-password');
            const remInp = document.getElementById('login-remember');
            if (userInp) userInp.value = savedUser;
            if (passInp) passInp.value = savedPass;
            if (remInp) remInp.checked = true;
        }
    };
}

if (userInfoSection) {
    userInfoSection.onclick = (e) => {
        // Don't open modal if clicking logout
        if (e.target !== logoutBtn) {
            authModal.classList.add('active');
        }
    };
}

if (logoutBtn) {
    logoutBtn.onclick = (e) => {
        e.stopPropagation();
        localStorage.removeItem('currentUser');
        updateAuthUI(null);
    };
}

if (closeAuthBtn) {
    closeAuthBtn.onclick = () => {
        authModal.classList.remove('active');
    };
}

if (tabLogin) {
    tabLogin.onclick = () => {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        if (authError) authError.style.display = 'none';
    };
}

if (tabSignup) {
    tabSignup.onclick = () => {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        if (authError) authError.style.display = 'none';

        // Ensure lobby flag is updated if this transition affects it
        if (lobbyUI.classList.contains('active')) isLobbyOpen = true;
        else isLobbyOpen = false;
    };
}

if (loginForm) {
    loginForm.onsubmit = (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const rememberInput = document.getElementById('login-remember');

        if (!usernameInput || !passwordInput) return;

        const username = usernameInput.value.trim();
        const pass = passwordInput.value;
        const remember = rememberInput ? rememberInput.checked : false;
        const users = getRegisteredUsers();

        if (users[username] && users[username] === pass) {
            localStorage.setItem('currentUser', username);
            if (remember) {
                localStorage.setItem('savedUsername', username);
                localStorage.setItem('savedPassword', pass);
            } else {
                localStorage.removeItem('savedUsername');
                localStorage.removeItem('savedPassword');
            }
            updateAuthUI(username);
            authModal.classList.remove('active');
            loginForm.reset();
        } else {
            showError("Invalid username or password");
        }
    };
}

if (signupForm) {
    signupForm.onsubmit = (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('signup-username');
        const passwordInput = document.getElementById('signup-password');

        if (!usernameInput || !passwordInput) return;

        const username = usernameInput.value.trim();
        const pass = passwordInput.value;
        const users = getRegisteredUsers();

        if (users[username]) {
            showError("Username already taken!");
        } else {
            users[username] = pass;
            setRegisteredUsers(users);
            localStorage.setItem('currentUser', username);
            updateAuthUI(username);
            authModal.classList.remove('active');
            signupForm.reset();
        }
    };
}

if (cancelMatchmakingBtn) {
    cancelMatchmakingBtn.onclick = () => {
        if (peer) peer.destroy();
        matchmakingModal.classList.remove('active');
        modeModal.classList.add('active');
    };
}

// Controls Listeners Definition
function setupControlsListeners() {
    if (controls) {
        controls.addEventListener('lock', () => {
            if (instructionScreen) { instructionScreen.style.display = 'none'; isInstructionsOpen = false; }
            if (lobbyUI) { lobbyUI.style.display = 'none'; isLobbyOpen = false; }
            if (hud) hud.style.display = 'block';
        });

        controls.addEventListener('unlock', () => {
            if (isGameOver) return;
            if (roundActive) {
                if (instructionScreen) {
                    instructionScreen.style.display = 'flex';
                    isInstructionsOpen = true;
                    instructionScreen.innerHTML = '<div id="instructions-content"><h1>GAME PAUSED</h1><p>Click to Resume</p></div>';
                }
            }
        });
    }

    // Click anywhere on canvas/instruction screen to lock mouse
    const lockTarget = document.getElementById('canvas') || document.querySelector('canvas');
    if (lockTarget) {
        lockTarget.addEventListener('click', () => {
            if (roundActive && controls) controls.lock();
        });
    }
    if (instructionScreen) {
        instructionScreen.addEventListener('click', () => {
            if (instructionScreen) { instructionScreen.style.display = 'none'; isInstructionsOpen = false; }
            if (lobbyUI) { lobbyUI.style.display = 'none'; isLobbyOpen = false; }
            if (hud) hud.style.display = 'block';
            if (controls && roundActive) controls.lock();
        });
    }

    // Pointer Lock Change & Error Listeners
    document.addEventListener('pointerlockchange', () => {
        console.log("[DEBUG] Pointer lock change detected, isLocked:", !!document.pointerLockElement);
    });

    document.addEventListener('pointerlockerror', (e) => {
        console.error("[ERROR] Pointer Lock Error! (Permissions or user gesture issue)", e);
        // Even if lock fails, ensure UI is in game state if click happened
        if (instructionScreen && instructionScreen.style.display !== 'none') {
            instructionScreen.style.display = 'none';
            isInstructionsOpen = false; // CACHED UPDATE
            if (lobbyUI) {
                lobbyUI.style.display = 'none';
                isLobbyOpen = false; // CACHED UPDATE
            }
            if (hud) hud.style.display = 'block';
        }
    });

    // MOUSE LOOK FALLBACK: If pointer lock is not active, allow looking with mouse movement if instruction screen is hidden
    document.addEventListener('mousemove', (event) => {
        // Optimized: Use CACHED booleans
        const isActuallyPlaying = roundActive && !isInstructionsOpen && !isLobbyOpen;

        if (!document.pointerLockElement && isActuallyPlaying) {
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;

            if (controls && controls.getObject) {
                const player = controls.getObject();
                player.rotation.y -= movementX * 0.002;
                camera.rotation.x -= movementY * 0.002;
                camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
            }
        }
    });

    // GLOBAL INPUT VERIFICATION
    window.addEventListener('keydown', (e) => {
        console.log(`[KEY] Global KeyDown: ${e.code} (RoundActive: ${roundActive})`);
    });
}

// --- CORE UI LISTENERS (TOP LEVEL) ---
if (navPlay) {
    navPlay.onclick = () => {
        console.log("[UI] Play clicked, opening mode modal");
        if (modeModal) modeModal.classList.add('active');
    };
}

if (closeModes) {
    closeModes.onclick = () => {
        if (modeModal) modeModal.classList.remove('active');
    };
}

if (modeButtons) {
    modeButtons.forEach(btn => {
        btn.onclick = () => {
            currentMode = btn.dataset.mode;
            console.log(`[UI] Mode selected: ${currentMode}`);
            if (modeModal) modeModal.classList.remove('active');

            if (currentMode === '1vBot') {
                if (teamSelectionModal) teamSelectionModal.classList.add('active');
            } else {
                if (matchmakingModal) matchmakingModal.classList.add('active');
                if (modeDisplay) modeDisplay.textContent = currentMode.toUpperCase();
                initMultiplayer(currentMode);
            }
        };
    });
}

// Consolidate Team Selection Logic
if (teamCards) {
    teamCards.forEach(card => {
        card.onclick = () => {
            // Prevent re-selection during active round
            if (roundActive) {
                console.log("[UI] Team already selected, round is active. Ignoring click.");
                return;
            }

            selectedTeam = card.dataset.team;
            console.log(`[UI] Team selected: ${selectedTeam}`);
            if (teamSelectionModal) teamSelectionModal.classList.remove('active');
            startRound();
            if (controls) controls.lock();
        };
    });
}

// Buy Menu UI Listeners
if (buyTabs) {
    buyTabs.forEach(tab => {
        tab.onclick = () => {
            buyTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            lobbyUI.classList.add('active');
            isLobbyOpen = true; // CACHED update
            renderBuyItems(tab.dataset.category);
        };
    });
}

// Lobby Shop / Collection Listeners
const lobbyShopModal = document.getElementById('lobby-shop-modal');
const lobbyCollectionModal = document.getElementById('lobby-collection-modal');

if (navShop) {
    navShop.onclick = () => {
        lobbyShopModal.style.display = 'block';
        updateHUD();
        renderSkinsMenu(document.getElementById('shop-items-container'), false);
    };
}

if (navCollection) {
    navCollection.onclick = () => {
        lobbyCollectionModal.style.display = 'block';
        renderSkinsMenu(document.getElementById('collection-items-container'), true);
    };
}

const closeShopBtn = document.getElementById('close-shop');
if (closeShopBtn) closeShopBtn.onclick = () => lobbyShopModal.style.display = 'none';

const closeCollectionBtn = document.getElementById('close-collection');
if (closeCollectionBtn) closeCollectionBtn.onclick = () => lobbyCollectionModal.style.display = 'none';

if (closeBuyMenuBtn) {
    closeBuyMenuBtn.onclick = () => {
        closeBuyMenu();
    };
}


// HUD initialization handled by HTML

function init() {
    const deathReturnBtn = document.getElementById('death-return-btn');
    if (deathReturnBtn) {
        deathReturnBtn.addEventListener('click', () => {
            deathScreen.style.display = 'none';
            winScreen.style.display = 'none';
            gameOverScreen.style.display = 'none';

            lobbyUI.style.display = 'flex';
            isGameOver = false;
            roundActive = false;

            // Reset for lobby
            controls.unlock();
            updateHUD();
        });
    }

    loadPlayerData(); // Load skins and MATA
    // 1. Setup Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky Blue
    scene.fog = new THREE.Fog(0x87CEEB, 10, 1000);

    // 2. Setup Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.y = 10;

    // 3. Setup Lights
    const hemiLight = new THREE.HemisphereLight(0xfff3e0, 0x332211, 0.5); // Warm top, dark ground
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffe0b2, 1.2); // Intense warm sunlight
    dirLight.position.set(200, 400, 100);
    dirLight.castShadow = true;

    // Optimize shadow resolution for current-gen feel
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 2000;

    scene.add(dirLight);

    // 4. Setup Renderer (MUST be created before PointerLockControls)
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 5. Setup Controls (using renderer.domElement instead of document.body)
    controls = new PointerLockControls(camera, renderer.domElement);

    // --- Weapon System ---
    switchWeapon('ak47'); // Start with AK-47 as requested

    // --- Networking Init ---
    // initMultiplayer(); // Called when mode is selected







    scene.add(controls.getObject());
    setupControlsListeners();

    // Visual Input Debugger in HUD
    const debugDiv = document.createElement('div');
    debugDiv.id = 'input-debug';
    debugDiv.style.position = 'absolute';
    debugDiv.style.top = '140px';
    debugDiv.style.left = '20px';
    debugDiv.style.color = 'yellow';
    debugDiv.style.fontFamily = 'monospace';
    debugDiv.style.fontSize = '12px';
    debugDiv.style.zIndex = '1000';
    debugDiv.innerHTML = 'KEYS: [] | ROUND: false | POS: 0,0,0';
    document.body.appendChild(debugDiv);

    // 6. Input Listeners
    const onKeyDown = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;
            case 'Space':
                spacePressed = true;
                if (canJump === true && health > 0 && !isGameOver) velocity.y += 200;
                canJump = false;
                break;
            case 'Digit1':
                // Switch to primary (rifle/SMG/heavy) if purchased
                if (playerInventory.primary) {
                    switchWeapon('primary');
                }
                break;
            case 'Digit2':
                // Switch to secondary (pistol) if purchased
                if (playerInventory.secondary) {
                    switchWeapon('secondary');
                }
                break;
            case 'Digit3':
                // Knife is ALWAYS available
                switchWeapon('knife');
                break;
            case 'Digit4':
                // Grenade slot - switch to grenade if available
                if (playerInventory.grenades && playerInventory.grenades.length > 0) {
                    switchWeapon('grenade');
                }
                break;
            case 'KeyE':
                // Toggle scope for scoped weapons
                toggleScope();
                break;
            case 'KeyF':
                if (!isReloading && currentWeaponType !== 'knife') {
                    inspectTimer = INSPECT_DURATION;
                }
                break;
            case 'KeyR':
                reload();
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
            case 'ControlLeft':
            case 'ControlRight':
                isCrouching = true;
                break;
            case 'KeyB':
                console.log(`[DEBUG] B key pressed. isBuyPhase: ${isBuyPhase}, buyRemaining: ${buyTimeRemaining}`);
                // Allow opening if we are in buy phase (initial or via timer)
                if (isBuyPhase || buyTimeRemaining > 0) {
                    if (buyMenuModal && buyMenuModal.classList.contains('active')) {
                        closeBuyMenu();
                    } else {
                        openBuyMenu();
                    }
                }
                break;
            case 'KeyE':
                // Pickup weapon trigger
                triggerWeaponPickup();
                break;
        }
    };

    const onKeyUp = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;
            case 'Space':
                spacePressed = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
            case 'ControlLeft':
            case 'ControlRight':
                isCrouching = false;
                break;
        }
    };

    // Key Listeners for Movement & Actions
    document.addEventListener('keydown', (event) => {
        onKeyDown(event);
    });

    document.addEventListener('keyup', (event) => {
        onKeyUp(event);
    });

    // Mouse Listeners for Shooting & Scope
    document.addEventListener('mousedown', function (event) {
        // Allow shooting if a round is active and the instruction screen is hidden
        // (This replaces the strict controls.isLocked check)
        const canInteract = roundActive &&
            (!instructionScreen || instructionScreen.style.display !== 'flex') &&
            (!lobbyUI || lobbyUI.style.display !== 'flex');

        if (canInteract) {
            if (event.button === 0) { // Left Click - Shoot
                isFiring = true;
                if (currentWeaponType !== 'ak47') {
                    shoot(); // Fire once immediately for semi-auto / melee
                }
            } else if (event.button === 2) { // Right Click - Scope
                toggleScope();
            }
        }
    });

    document.addEventListener('mouseup', function (event) {
        if (event.button === 0) { // Left Click Release
            isFiring = false;
        }
    });

    // 6. World Objects (Mirage Theme)
    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);

    // Floor (Sandstone)
    let floorGeometry = new THREE.PlaneGeometry(4000, 4000, 100, 100);
    floorGeometry.rotateX(-Math.PI / 2);

    let floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xdbc295, // Sandstone light
        roughness: 0.9
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    scene.add(floor);

    // Create Mirage-like Map (A Site Blockout)
    createMirageMap();

    window.addEventListener('resize', onWindowResize);

    initAudio(); // Initialize audio after camera is ready <!-- id: 34 -->

    // Start Logic
    // startRound(); // Only called after a game mode is selected
}

// --- Top-Level UI & Logic Functions ---

function startBuyPhase(duration = 0) { endBuyPhase(); }

function endBuyPhase() {
    isBuyPhase = false;
    buyTimeRemaining = 0;
    if (buyTimerInterval) { clearInterval(buyTimerInterval); buyTimerInterval = null; }
    if (buyMenuModal && buyMenuModal.classList.contains('active')) closeBuyMenu();
    if (freezeTimeMsg) freezeTimeMsg.style.display = 'none';
    equipPurchasedWeapons();
}

function openBuyMenu() {
    if (!isBuyPhase && buyTimeRemaining <= 0) {
        console.log("[DEBUG] Cannot open buy menu: Buy phase over.");
        return;
    }

    console.log("[DEBUG] Opening Buy Menu UI");
    if (buyMenuModal) buyMenuModal.classList.add('active');
    if (controls) controls.unlock();

    renderBuyItems('pistols');
}

function closeBuyMenu() {
    console.log("[DEBUG] Closing Buy Menu UI");
    if (buyMenuModal) buyMenuModal.classList.remove('active');

    // Lock controls when UI is closed, but isBuyPhase stays true until timer ends
    if (controls && !isGameOver) {
        controls.lock();
    }

    equipPurchasedWeapons();

    if (buyTimeRemaining > 0) {
        console.log("[DEBUG] Buy UI closed early, freeze remaining: " + buyTimeRemaining + "s");
    }
}

function equipPurchasedWeapons() {
    // Map CS2 weapon IDs to game weapon types
    let weaponToEquip = null;
    let weaponData = null;

    // Prioritize primary weapon if purchased
    if (playerInventory.primary) {
        weaponData = playerInventory.primary;
        weaponToEquip = 'ak47';
    }
    // Fallback to secondary weapon (pistol)
    else if (playerInventory.secondary) {
        weaponData = playerInventory.secondary;
        weaponToEquip = 'pistol';
    }
    // Default fallback (should have USP-S from starter pistol)
    else {
        weaponToEquip = 'pistol';
        weaponData = CS2_WEAPONS['usp-s'];
    }

    // Apply dynamic stats to the weapon configuration
    if (weaponData && weaponToEquip !== 'knife') {
        weaponConfigs[weaponToEquip] = {
            id: weaponData.id,
            name: weaponData.name,
            magSize: weaponData.magSize || 30,
            reserve: weaponData.reserve || 120,
            fireRate: weaponData.fireRate ? Math.round(60000 / weaponData.fireRate) : 100, // Handle RPM if needed, or default
            damage: weaponData.damage || 30,
            headshotMultiplier: weaponData.headshotMultiplier || 4.0,
            armorPenetration: weaponData.armorPenetration || 70
        };

        // Fix: Force fireRate to 100 if it's a rifle for auto-fire logic consistency
        if (['smgs', 'rifles'].includes(weaponData.category)) {
            weaponConfigs[weaponToEquip].fireRate = 100;
        }

        // Update current ammo for this slot if it's the first time equipping or if changed
        if (!weaponAmmo[weaponToEquip] || weaponAmmo[weaponToEquip].id !== weaponData.id) {
            weaponAmmo[weaponToEquip] = {
                id: weaponData.id,
                mag: weaponConfigs[weaponToEquip].magSize,
                reserve: weaponConfigs[weaponToEquip].reserve
            };
        }
    }

    // Update the current weapon type for state logic
    currentWeaponType = weaponToEquip;

    // Actually switch to the weapon model
    if (weaponToEquip) {
        switchWeapon(weaponToEquip);
        console.log(`[WEAPON] Equipped: ${weaponData.name} (${weaponData.id}) model: ${weaponToEquip}`);
    }
}

// --- WEAPON DROPS & PICKUP --- <!-- id: 29, 30, 33 -->
function dropWeapon(weaponId, skinId, position) {
    if (!weaponId) return;
    console.log(`[DROPS] Dropping weapon: ${weaponId}`);
    const group = new THREE.Group();

    // Create the visual model
    if (weaponId.includes('ak-47') || weaponId.includes('m4') || weaponId.includes('awp') ||
        weaponId.includes('ssg') || weaponId.includes('galil') || weaponId.includes('famas') ||
        weaponId.includes('aug') || weaponId.includes('sg') || weaponId.includes('scar') || weaponId.includes('g3sg1')) {
        createAK47(group, weaponId, skinId);
    } else {
        createPistol(group, weaponId, skinId);
    }

    // Adjust scale and position for ground
    group.scale.set(0.6, 0.6, 0.6);
    group.position.copy(position);
    group.position.y = 0.5;

    // Lie flat on the ground
    group.rotation.x = Math.PI / 2;
    group.rotation.z = Math.random() * Math.PI * 2;

    scene.add(group);

    const weaponData = CS2_WEAPONS[weaponId] || CS2_WEAPONS['usp-s'];

    droppedWeapons.push({
        mesh: group,
        id: weaponId,
        skinId: skinId,
        data: { ...weaponData }
    });
}

function checkWeaponPickup() {
    const playerPos = controls.getObject().position;
    let closestDist = 8; // Max pickup distance
    let closestIdx = -1;

    for (let i = 0; i < droppedWeapons.length; i++) {
        const dist = playerPos.distanceTo(droppedWeapons[i].mesh.position);
        if (dist < closestDist) {
            closestDist = dist;
            closestIdx = i;
        }
    }

    const hintEl = document.getElementById('pickup-hint');
    if (closestIdx !== -1) {
        const dropped = droppedWeapons[closestIdx];
        if (hintEl) {
            hintEl.style.display = 'block';
            hintEl.textContent = `PRESS [E] TO PICK UP ${dropped.data.name.toUpperCase()}`;
        }
    } else {
        if (hintEl) hintEl.style.display = 'none';
    }

    return closestIdx;
}

function triggerWeaponPickup() {
    const closestIdx = checkWeaponPickup();
    if (closestIdx === -1) return;

    const playerPos = controls.getObject().position;
    const dropped = droppedWeapons[closestIdx];
    console.log(`[DROPS] Picking up: ${dropped.id}`);

    const isPrimary = ['rifles', 'smgs', 'heavy'].includes(dropped.data.category);

    // 1. Drop current weapon in that slot if exists
    if (isPrimary && playerInventory.primary) {
        dropWeapon(playerInventory.primary.id, playerInventory.skins['ak47'], playerPos.clone());
    } else if (!isPrimary && playerInventory.secondary) {
        dropWeapon(playerInventory.secondary.id, playerInventory.skins['pistol'], playerPos.clone());
    }

    // 2. Add to inventory slot
    if (weaponData.category === 'pistols') {
        playerInventory.secondary = weaponData;
        playerInventory.skins['pistol'] = dropped.skinId;
    } else {
        playerInventory.primary = weaponData;
        playerInventory.skins['ak47'] = dropped.skinId; // Legacy key for skin mapping, will fix skin system later if needed
    }

    // 3. Remove from ground
    scene.remove(dropped.mesh);
    droppedWeapons.splice(closestIdx, 1);

    // 4. Update visuals
    equipPurchasedWeapons();
    playSound('reload', 0.5, 1.2);
}

function clearDroppedWeapons() {
    if (!droppedWeapons) droppedWeapons = [];
    droppedWeapons.forEach(w => {
        if (w && w.mesh) scene.remove(w.mesh);
    });
    droppedWeapons = [];
}

function updateBuyTimer() {
    if (playerMoneyDisplay) playerMoneyDisplay.textContent = `$${playerMoney}`;
    if (freezeTimeMsg) freezeTimeMsg.style.display = 'none';
}

function renderBuyItems(category) {
    if (!buyItemsContainer) return;
    buyItemsContainer.innerHTML = '';

    if (category === 'skins') {
        renderSkinsMenu();
        return;
    }

    Object.entries(CS2_WEAPONS).forEach(([id, weapon]) => {
        if (weapon.category !== category) return;

        // Fix: If no team is selected (e.g. Lobby Shop), show items for at least one team or both
        const currentTeam = selectedTeam || 'CT';
        if (weapon.team !== 'both' && weapon.team !== currentTeam) return;

        const card = document.createElement('div');
        card.className = 'weapon-card';

        const canAfford = playerMoney >= weapon.price;
        if (!canAfford) card.classList.add('cannot-afford');

        // Check if already owned
        if (category === 'pistols' && playerInventory.secondary?.id === id) {
            card.classList.add('owned');
        } else if (['smgs', 'rifles', 'heavy'].includes(category) && playerInventory.primary?.id === id) {
            card.classList.add('owned');
        }

        card.innerHTML = `
            <div class="weapon-name">${weapon.name}</div>
            <div class="weapon-price">$${weapon.price}</div>
            <div class="weapon-stats">
                ${weapon.damage ? `DMG: ${weapon.damage} | ` : ''}
                ${weapon.magSize ? `${weapon.magSize}/${weapon.reserve}` : ''}
            </div>
        `;

        if (canAfford) {
            card.onclick = () => purchaseItem(id, weapon);
        }

        buyItemsContainer.appendChild(card);
    });
}

function purchaseItem(id, weapon) {
    if (playerMoney < weapon.price) return;

    const category = weapon.category;

    // Handle grenades (max 4, unique only)
    if (category === 'grenades') {
        if (playerInventory.grenades.length >= 4) {
            console.log('Max grenades reached');
            return;
        }
        // Check for duplicates - prevent buying if already owned
        if (playerInventory.grenades.includes(id)) {
            console.log('Grenade already owned');
            return;
        }
        playerInventory.grenades.push(id);
    }
    // Handle equipment
    else if (category === 'equipment') {
        if (id === 'kevlar-vest') {
            playerInventory.equipment.armor = 100;
        } else if (id === 'kevlar-helmet') {
            playerInventory.equipment.armor = 100;
            playerInventory.equipment.helmet = true;
        } else if (id === 'defuse-kit') {
            playerInventory.equipment.defuseKit = true;
        }
    }
    // Handle weapons
    else if (category === 'pistols') {
        playerInventory.secondary = { id, ...weapon };
    } else {
        playerInventory.primary = { id, ...weapon };
    }

    playerMoney -= weapon.price;
    updateHUD();
    updateBuyTimer();
    const activeTab = document.querySelector('.buy-tab.active');
    if (activeTab) renderBuyItems(activeTab.dataset.category);
}

function renderSkinsMenu(container, filterOwned = false) {
    const targetContainer = container || buyItemsContainer;
    if (!targetContainer) return;
    targetContainer.innerHTML = '';

    for (const weaponType in skinsDatabase) {
        const skins = skinsDatabase[weaponType];
        skins.forEach(skin => {
            if (skin.id === 'default' && !filterOwned) return;

            const isOwned = playerInventory.ownedSkins.includes(`${weaponType}_${skin.id}`);
            const isActive = playerInventory.skins[weaponType] === skin.id;

            if (filterOwned && !isOwned) return;

            const card = document.createElement('div');
            card.className = 'buy-item-card skin-card';
            if (isActive) card.classList.add('active-skin');

            // Create color preview swatch
            const colorHex = '#' + skin.color.toString(16).padStart(6, '0');
            const accentHex = skin.accents ? '#' + skin.accents.toString(16).padStart(6, '0') : colorHex;

            card.innerHTML = `
                <div style="width: 100%; height: 60px; background: linear-gradient(135deg, ${colorHex} 0%, ${colorHex} 60%, ${accentHex} 100%); border-radius: 8px 8px 0 0; margin: -15px -15px 10px -15px; border-bottom: 2px solid rgba(255, 255, 255, 0.1); box-shadow: inset 0 -20px 30px rgba(0, 0, 0, 0.3);"></div>
                <div class="item-name" style="color: #ff00ff; font-weight: bold;">${skin.name}</div>
                <div class="item-weapon" style="font-size: 10px; color: #aaa;">${weaponType.toUpperCase()}</div>
                <div class="item-price" style="font-size: 11px;">${isOwned ? 'OWNED' : `${skin.price} MATA`}</div>
                <button class="buy-btn" style="padding: 2px 5px; font-size: 10px; cursor: pointer;" ${isActive && isOwned ? 'disabled' : ''}>
                    ${isOwned ? (isActive ? 'EQUIPPED' : 'EQUIP') : 'BUY'}
                </button>
            `;

            const btn = card.querySelector('.buy-btn');
            btn.onclick = () => {
                if (isOwned) {
                    // Equip skin
                    playerInventory.skins[weaponType] = skin.id;
                    savePlayerData();
                    renderSkinsMenu(targetContainer, filterOwned);
                } else {
                    // Buy skin
                    if (playerMata >= skin.price) {
                        playerMata -= skin.price;
                        playerInventory.ownedSkins.push(`${weaponType}_${skin.id}`);
                        savePlayerData();
                        updateHUD();
                        renderSkinsMenu(targetContainer, filterOwned);
                    } else {
                        const errorMsg = document.getElementById('mata-error');
                        if (errorMsg) {
                            errorMsg.style.display = 'inline';
                            setTimeout(() => {
                                errorMsg.style.display = 'none';
                            }, 2000);
                        }
                    }
                }
            };
            targetContainer.appendChild(card);
        });
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Toggle scope for scoped weapons
function toggleScope() {
    const scopedWeapons = ['awp', 'ssg-08', 'scar-20', 'g3sg1', 'aug', 'sg-553'];
    const sniperWeapons = ['awp', 'ssg-08', 'scar-20', 'g3sg1'];
    const currentWeaponId = playerInventory.primary?.id || currentWeaponType;

    // Check if current weapon can be scoped
    if (!scopedWeapons.includes(currentWeaponId)) {
        isScoped = false;
        scopeLevel = 0;
        camera.fov = DEFAULT_FOV;
        camera.updateProjectionMatrix();
        return;
    }

    const isSniper = sniperWeapons.includes(currentWeaponId);

    // Increment scope level
    if (isSniper) {
        scopeLevel = (scopeLevel + 1) % 3; // 0, 1, 2
    } else {
        scopeLevel = (scopeLevel === 0) ? 1 : 0; // 0, 1 for AUG/SG
    }

    isScoped = (scopeLevel > 0);

    // Update camera FOV & Sensitivity <!-- id: 32 -->
    if (scopeLevel === 2) {
        camera.fov = SCOPE_LEVEL2_FOV;
        if (controls) controls.pointerSpeed = 0.2;
    } else if (scopeLevel === 1) {
        camera.fov = SCOPED_FOV;
        if (controls) controls.pointerSpeed = 0.45;
    } else {
        camera.fov = DEFAULT_FOV;
        if (controls) controls.pointerSpeed = 1.0;
    }

    camera.updateProjectionMatrix();
    console.log(`[SCOPE] Level: ${scopeLevel}, FOV: ${camera.fov}`);
}

function switchWeapon(type) {
    inspectTimer = 0; // Cancel inspect if active

    // Reset scope when switching weapons
    if (isScoped || scopeLevel > 0) {
        isScoped = false;
        scopeLevel = 0;
        camera.fov = DEFAULT_FOV;
        if (controls) controls.pointerSpeed = 1.0; // Reset sensitivity <!-- id: 32 -->
        camera.updateProjectionMatrix();
    }

    if (weapon) {
        isScoped = false;
        scopeLevel = 0;
        camera.fov = DEFAULT_FOV;
        camera.updateProjectionMatrix();
    }

    if (weapon) {
        camera.remove(weapon);
    }
    weapon = new THREE.Group();
    camera.add(weapon);
    currentWeaponType = type;

    // Reset offset
    weapon.position.set(1.2, -1.8, -2.0);

    const config = weaponConfigs[type];
    const weaponId = config ? config.id : type;

    if (type === 'pistol') {
        createPistol(weapon, weaponId);
        fireRate = config ? config.fireRate : 200;
    } else if (type === 'ak47') {
        createAK47(weapon, weaponId);
        fireRate = config ? config.fireRate : 100;
    } else if (type === 'knife') {
        createKnife(weapon);
        fireRate = 500;
    }

    // Update UI
    updateHUD();

    // EQUIP ANIMATION (Initial State)
    weapon.rotation.x = -Math.PI / 2; // Point down
    weapon.position.y = -3.0; // Start lower
}

// Helper: Create detailed procedural texture for skins
function createDetailedSkinMaterial(color, accents, roughness = 0.5, metalness = 0.5, patternType = 'default') {
    const canvas = document.createElement('canvas');
    canvas.width = 512; // High Detail
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const baseColorStr = '#' + color.toString(16).padStart(6, '0');
    const accentColorStr = accents ? '#' + accents.toString(16).padStart(6, '0') : '#000000';

    // 1. Base Fill
    ctx.fillStyle = baseColorStr;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Pattern Layer
    if (patternType === 'gradient') {
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, baseColorStr);
        grad.addColorStop(0.5, accentColorStr);
        grad.addColorStop(1, '#ff8800');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
    } else if (patternType === 'sci-fi') {
        // Geometric stripes and hex patterns
        ctx.strokeStyle = accentColorStr;
        ctx.lineWidth = 10;
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * 60);
            ctx.lineTo(512, i * 60 - 50);
            ctx.stroke();
        }
        ctx.fillStyle = accentColorStr;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 100, 20);
        }
    } else if (patternType === 'hyperbeast') {
        // Chaotic neo-noir swirls
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 40; i++) {
            ctx.beginPath();
            ctx.strokeStyle = i % 2 === 0 ? accentColorStr : '#ff00ff';
            ctx.lineWidth = Math.random() * 15;
            ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 100, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (patternType === 'dragon' || patternType === 'engraved') {
        // Flourish / Engravings
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 100; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 512, Math.random() * 512);
            ctx.bezierCurveTo(Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512);
            ctx.stroke();
        }
        // Gold accents
        ctx.fillStyle = baseColorStr;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(256, 256, 150, 0, Math.PI * 2);
        ctx.fill();
    } else if (patternType === 'printstream') {
        // High-tech monochromatic look with pearlescent white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 60px monospace';
        // Bold "XX" symbols
        ctx.fillText('XX', 100, 200);
        ctx.fillText('XX', 350, 400);

        // Technical markings
        ctx.font = '14px monospace';
        ctx.fillText('NOISE_DISABLED', 50, 50);
        ctx.fillText('STEADY_ARM_01', 350, 50);

        // Geometric icons (chevrons/hearts)
        ctx.font = '24px monospace';
        ctx.fillText('>>', 50, 450);
        ctx.fillText('♥', 300, 150);

        // Iridescent strips (rainbow lines)
        const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
        for (let i = 0; i < colors.length; i++) {
            ctx.fillStyle = colors[i];
            ctx.fillRect(400, 450 + (i * 4), 100, 3);
            ctx.fillRect(50, 100 + (i * 4), 80, 2);
        }

        // Dot grid pattern
        ctx.fillStyle = '#cccccc';
        for (let x = 0; x < 512; x += 40) {
            for (let y = 0; y < 512; y += 40) {
                if (Math.random() > 0.8) ctx.fillRect(x, y, 4, 4);
            }
        }
    } else if (accents) {
        // Default Camo
        ctx.fillStyle = accentColorStr;
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 30; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 80, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 3. Grunge / Wear Layer (Always present for realism)
    ctx.globalAlpha = 0.15;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < 2000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    return new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        roughness: roughness,
        metalness: metalness,
        emissive: accents || 0x000000,
        emissiveIntensity: accents ? 0.05 : 0
    });
}

function createPistol(group, weaponId = 'usp-s', skinIdOverride = null) {
    const skinId = skinIdOverride || playerInventory.skins['pistol'] || 'default';
    const skin = (skinsDatabase['pistol'].find(s => s.id === skinId)) || skinsDatabase['pistol'][0];

    const matteBlackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const gunMetalMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.8 });

    // Use detailed material for main body
    const mainMat = createDetailedSkinMaterial(skin.color, skin.accents, 0.2, 0.6);

    const accentMat = new THREE.MeshStandardMaterial({
        color: skin.accents || 0x111111,
        roughness: 0.3,
        metalness: 0.7,
        emissive: skin.accents || 0x000000,
        emissiveIntensity: 0.2
    });

    // 1. Silencer
    if (weaponId === 'usp-s' || weaponId === 'm4a1-s') {
        const silencerGeo = new THREE.CylinderGeometry(0.14, 0.14, 2.0, 32);
        silencerGeo.rotateX(-Math.PI / 2);
        const silencer = new THREE.Mesh(silencerGeo, (skinId !== 'default' && skin.accents) ? accentMat : matteBlackMat);
        silencer.position.set(0, 0.2, -1.9);
        group.add(silencer);
    }

    // 2. Slide (Top Body)
    const slideGeo = new THREE.BoxGeometry(0.32, 0.38, 1.6);
    if (weaponId === 'desert-eagle') slideGeo.scale(1.3, 1.4, 1.2);
    const slide = new THREE.Mesh(slideGeo, mainMat);
    slide.position.set(0, 0.22, -0.1);
    group.add(slide);

    // Ejection Port Detail
    const portGeo = new THREE.BoxGeometry(0.1, 0.15, 0.3);
    const port = new THREE.Mesh(portGeo, gunMetalMat);
    port.position.set(0.15, 0.3, 0);
    group.add(port);

    // 3. Lower Body (Frame)
    const frameGeo = new THREE.BoxGeometry(0.3, 0.3, 1.3);
    const frame = new THREE.Mesh(frameGeo, matteBlackMat);
    frame.position.set(0, -0.05, -0.1);
    group.add(frame);

    // 4. Handle (Detailed Grip)
    const handleGeo = new THREE.BoxGeometry(0.34, 1.2, 0.6);
    const handleMat = (skinId !== 'default' && skin.accents) ? accentMat : matteBlackMat;
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, -0.7, 0.4);
    handle.rotation.x = 0.25;
    group.add(handle);

    // StatTrak Module <!-- id: 40, 43 -->
    if (skinId.includes('printstream')) {
        const stattrakGroup = new THREE.Group();
        const boxGeo = new THREE.BoxGeometry(0.12, 0.15, 0.4);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        const box = new THREE.Mesh(boxGeo, boxMat);

        // Offset for Deagle slide width
        const xOffset = (weaponId === 'desert-eagle') ? 0.22 : 0.18;
        box.position.set(xOffset, 0.1, -0.4); // Left side of slide
        stattrakGroup.add(box);

        // Screen
        const screenGeo = new THREE.PlaneGeometry(0.3, 0.1);
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x221100 });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(xOffset + 0.061, 0.1, -0.4);
        screen.rotation.y = Math.PI / 2;
        stattrakGroup.add(screen);

        // Counter text (simulated with emissive dots)
        for (let i = 0; i < 6; i++) {
            const digitGeo = new THREE.BoxGeometry(0.01, 0.05, 0.03);
            const digitMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
            const digit = new THREE.Mesh(digitGeo, digitMat);
            digit.position.set(xOffset + 0.065, 0.1, -0.5 + (i * 0.04));
            digit.rotation.y = Math.PI / 2;
            stattrakGroup.add(digit);
        }
        group.add(stattrakGroup);
    }

    // Trigger Guard & Trigger
    const guardGeo = new THREE.TorusGeometry(0.15, 0.03, 8, 16, Math.PI);
    guardGeo.rotateY(Math.PI / 2);
    const guard = new THREE.Mesh(guardGeo, matteBlackMat);
    guard.position.set(0, -0.2, -0.3);
    group.add(guard);

    const triggerGeo = new THREE.BoxGeometry(0.04, 0.12, 0.04);
    const trigger = new THREE.Mesh(triggerGeo, gunMetalMat);
    trigger.position.set(0, -0.2, -0.3);
    group.add(trigger);

    // 6. Sights
    const sightGeo = new THREE.BoxGeometry(0.06, 0.1, 0.1);
    const frontSight = new THREE.Mesh(sightGeo, matteBlackMat);
    frontSight.position.set(0, 0.4, -0.85);
    group.add(frontSight);

    const rearSightGeo = new THREE.BoxGeometry(0.2, 0.08, 0.08);
    const rearSight = new THREE.Mesh(rearSightGeo, matteBlackMat);
    rearSight.position.set(0, 0.42, 0.65);
    group.add(rearSight);

    // Hammer Detail
    const hammerGeo = new THREE.BoxGeometry(0.1, 0.2, 0.08);
    const hammer = new THREE.Mesh(hammerGeo, gunMetalMat);
    hammer.position.set(0, 0.2, 0.75);
    hammer.rotation.x = 0.6;
    group.add(hammer);

    // NEW EXTREME DETAILS:
    // Slide Serrations (Grooves)
    for (let i = 0; i < 5; i++) {
        const grooveGeo = new THREE.BoxGeometry(0.34, 0.25, 0.02);
        const groove = new THREE.Mesh(grooveGeo, gunMetalMat);
        groove.position.set(0, 0.3, 0.4 - (i * 0.1));
        group.add(groove);
    }

    // Slide Release Lever
    const leverGeo = new THREE.BoxGeometry(0.1, 0.05, 0.3);
    const lever = new THREE.Mesh(leverGeo, gunMetalMat);
    lever.position.set(-0.16, 0.1, -0.1);
    group.add(lever);

    // Safety Switch
    const safetyGeo = new THREE.BoxGeometry(0.08, 0.08, 0.15);
    const safety = new THREE.Mesh(safetyGeo, gunMetalMat);
    safety.position.set(-0.16, 0.15, 0.5);
    group.add(safety);
}

function createAK47(group, weaponId = 'ak-47', skinIdOverride = null) {
    // Skin Lookup: Handle M4 vs AK categories
    const category = (weaponId === 'm4a4' || weaponId === 'm4a1-s') ? 'm4a4' : 'ak47';
    const skinId = skinIdOverride || playerInventory.skins[category] || 'default';
    const skin = (skinsDatabase[category].find(s => s.id === skinId)) || skinsDatabase[category][0];

    // Materials - Use detailed textures
    const woodMat = createDetailedSkinMaterial(skin.color, skin.accents, 0.8, 0.1); // Wood/Body
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.6 });
    const polymerMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const accentMat = new THREE.MeshStandardMaterial({ color: skin.accents || 0x111111, roughness: 0.5, metalness: 0.5 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });

    const isAWP = (weaponId === 'awp' || weaponId === 'ssg-08' || weaponId === 'scar-20' || weaponId === 'g3sg1');
    const isM4 = (weaponId === 'm4a4' || weaponId === 'm4a1-s' || weaponId === 'famas' || weaponId === 'aug');
    const hasScope = (isAWP || weaponId === 'aug' || weaponId === 'sg-553');
    const isSilenced = (weaponId === 'm4a1-s' || weaponId === 'usp-s'); // Handled broadly

    // 1. Barrel
    const barrelLength = isAWP ? 4.5 : (isM4 ? 2.8 : 2.5);
    const barrelGeo = new THREE.CylinderGeometry(0.08, 0.08, barrelLength, 16);
    barrelGeo.rotateX(-Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, metalMat);
    barrel.position.set(0, 0.2, -barrelLength / 2 - 0.5);
    group.add(barrel);

    // Cleaning Rod (Detail)
    if (!isAWP) {
        const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
        rodGeo.rotateX(-Math.PI / 2);
        const rod = new THREE.Mesh(rodGeo, darkMetalMat);
        rod.position.set(0, 0.05, -1.8);
        group.add(rod);
    }

    // 2. Gas Tube
    if (!isAWP) {
        const gasTubeGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 16);
        gasTubeGeo.rotateX(-Math.PI / 2);
        const gasTube = new THREE.Mesh(gasTubeGeo, metalMat);
        gasTube.position.set(0, 0.32, -1.5);
        group.add(gasTube);
    }

    // 3. Handguard 
    const handguardGeo = new THREE.BoxGeometry(0.3, 0.35, isAWP ? 1.8 : 1.2);
    const handguard = new THREE.Mesh(handguardGeo, isAWP ? woodMat : (isM4 ? polymerMat : woodMat));
    handguard.position.set(0, 0.15, -1.2);
    group.add(handguard);

    // 4. Receiver
    const receiverGeo = new THREE.BoxGeometry(0.32, 0.45, 1.3);
    const receiver = new THREE.Mesh(receiverGeo, darkMetalMat);
    receiver.position.set(0, 0.2, 0.1);
    group.add(receiver);

    // Bolt Detail
    const boltGeo = new THREE.BoxGeometry(0.1, 0.1, 0.2);
    const bolt = new THREE.Mesh(boltGeo, metalMat);
    bolt.position.set(0.18, 0.3, -0.2);
    group.add(bolt);

    // 5. Stock
    const stockGroup = new THREE.Group();
    const stockGeo = new THREE.BoxGeometry(0.28, 0.55, 1.1);
    const stock = new THREE.Mesh(stockGeo, isAWP ? woodMat : (isM4 ? polymerMat : woodMat));
    stock.position.set(0, 0.0, 1.25);
    stock.rotation.x = 0.08;
    stockGroup.add(stock);

    // Shoulder Pad Detail
    const padGeo = new THREE.BoxGeometry(0.3, 0.6, 0.1);
    const pad = new THREE.Mesh(padGeo, polymerMat);
    pad.position.set(0, -0.05, 1.8);
    stockGroup.add(pad);
    group.add(stockGroup);

    // 6. Pistol Grip
    const gripGeo = new THREE.BoxGeometry(0.28, 0.7, 0.45);
    const grip = new THREE.Mesh(gripGeo, isM4 ? polymerMat : (isAWP ? woodMat : woodMat));
    grip.position.set(0, -0.45, 0.25);
    grip.rotation.x = 0.25;
    group.add(grip);

    // 7. Magazine (Detailed Curve)
    const magGroup = new THREE.Group();
    const segmentCount = 4;
    for (let i = 0; i < segmentCount; i++) {
        const segGeo = new THREE.BoxGeometry(0.28, 0.35, 0.4);
        const segMat = (i % 2 === 0 && skin.accents) ? accentMat : metalMat;
        const seg = new THREE.Mesh(segGeo, segMat);
        seg.position.set(0, -0.4 - (i * 0.25), -0.2 - (i * 0.1));
        seg.rotation.x = 0.3 + (i * 0.1);
        magGroup.add(seg);
    }
    group.add(magGroup);

    // Trigger Guard & Trigger (High Detail)
    const guardGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 16, Math.PI);
    guardGeo.rotateY(Math.PI / 2);
    const guard = new THREE.Mesh(guardGeo, metalMat);
    guard.position.set(0, -0.15, -0.15);
    group.add(guard);

    const triggerGeo = new THREE.BoxGeometry(0.04, 0.15, 0.04);
    const trigger = new THREE.Mesh(triggerGeo, metalMat);
    trigger.position.set(0, -0.2, -0.15);
    group.add(trigger);

    // StatTrak Module for Printstream <!-- id: 43 -->
    if (skinId.includes('printstream') && isM4) {
        const stattrakGroup = new THREE.Group();
        const boxGeo = new THREE.BoxGeometry(0.12, 0.15, 0.4);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(0.18, 0.4, 0.15); // Side of receiver
        stattrakGroup.add(box);

        // Screen
        const screenGeo = new THREE.PlaneGeometry(0.3, 0.1);
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x221100 });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0.241, 0.4, 0.15);
        screen.rotation.y = Math.PI / 2;
        stattrakGroup.add(screen);

        // Counter text
        for (let i = 0; i < 6; i++) {
            const digitGeo = new THREE.BoxGeometry(0.01, 0.05, 0.03);
            const digitMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
            const digit = new THREE.Mesh(digitGeo, digitMat);
            digit.position.set(0.245, 0.4, 0.05 + (i * 0.04));
            digit.rotation.y = Math.PI / 2;
            stattrakGroup.add(digit);
        }
        group.add(stattrakGroup);
    }

    // 8. Sight (ONLY if weapon has scope) <!-- id: 31 -->
    if (hasScope) {
        // Scope detailed
        const scopeGroup = new THREE.Group();
        const scopeBodyGeo = new THREE.CylinderGeometry(0.14, 0.12, 1.4, 32);
        scopeBodyGeo.rotateX(-Math.PI / 2);
        const scope = new THREE.Mesh(scopeBodyGeo, darkMetalMat);
        scope.position.set(0, 0.55, -0.2);
        scopeGroup.add(scope);

        // Scope mounting bits
        const mountGeo = new THREE.BoxGeometry(0.15, 0.25, 0.1);
        const mount1 = new THREE.Mesh(mountGeo, metalMat);
        mount1.position.set(0, 0.35, 0.2);
        scopeGroup.add(mount1);
        const mount2 = new THREE.Mesh(mountGeo, metalMat);
        mount2.position.set(0, 0.35, -0.6);
        scopeGroup.add(mount2);

        const glassGeo = new THREE.CircleGeometry(0.12, 32);
        const glassMat = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 100, opacity: 0.5, transparent: true });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 0.55, -0.9);
        scopeGroup.add(glass);
        group.add(scopeGroup);

        // Adjustable Cheek Rest
        const cheekGeo = new THREE.BoxGeometry(0.25, 0.2, 0.6);
        const cheek = new THREE.Mesh(cheekGeo, polymerMat);
        cheek.position.set(0, 0.1, 1.25);
        group.add(cheek);

    } else {
        const frontSightGeo = new THREE.BoxGeometry(0.04, 0.25, 0.04);
        const frontSight = new THREE.Mesh(frontSightGeo, metalMat);
        frontSight.position.set(0, 0.35, -barrelLength - 0.5);
        group.add(frontSight);

        // Rear sight notch
        const backSightGeo = new THREE.BoxGeometry(0.1, 0.1, 0.05);
        const backSight = new THREE.Mesh(backSightGeo, metalMat);
        backSight.position.set(0, 0.4, -0.5);
        group.add(backSight);
    }

    // NEW EXTREME DETAILS:
    // Fire Selector Switch (AK style)
    const selectorGeo = new THREE.BoxGeometry(0.02, 0.15, 0.4);
    const selector = new THREE.Mesh(selectorGeo, metalMat);
    selector.position.set(0.18, 0.15, 0.2);
    selector.rotation.z = 0.2;
    group.add(selector);

    // Charging Handle
    const handleBoltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 12);
    handleBoltGeo.rotateZ(Math.PI / 2);
    const handleBolt = new THREE.Mesh(handleBoltGeo, metalMat);
    handleBolt.position.set(0.22, 0.3, -0.2);
    group.add(handleBolt);

    // Cleaning Rod detail extensions
    const rodNutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12);
    rodNutGeo.rotateX(Math.PI / 2);
    const rodNut = new THREE.Mesh(rodNutGeo, darkMetalMat);
    rodNut.position.set(0, 0.05, -2.5);
    group.add(rodNut);
}

function createKnife(group) {
    const skinId = playerInventory.skins['knife'] || 'default';
    const skin = (skinsDatabase['knife'].find(s => s.id === skinId)) || skinsDatabase['knife'][0];

    // Detailed handle material
    const handleMat = createDetailedSkinMaterial(skin.color, skin.accents, 0.5, 0.4);

    // Detailed blade material (if non-default)
    let bladeMat;
    if (skinId !== 'default') {
        bladeMat = createDetailedSkinMaterial(skin.accents || 0xe8e8e8, skin.color, 0.1, 0.9);
    } else {
        bladeMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.95, roughness: 0.05 });
    }

    const pivotMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });
    const accentMat = new THREE.MeshStandardMaterial({ color: skin.accents || 0xff6600, metalness: 0.7, roughness: 0.3 });

    // Create butterfly knife container
    const butterflyKnife = new THREE.Group();
    butterflyKnife.position.set(0.3, -0.2, -0.8);
    butterflyKnife.rotation.y = Math.PI / 8;
    butterflyKnife.rotation.x = Math.PI / 12;
    butterflyKnife.rotation.z = -Math.PI / 16;

    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.04, 0.18, 1.4);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0, -0.4);
    butterflyKnife.add(blade);

    // EXTREME DETAIL: Spine Serrations
    for (let i = 0; i < 4; i++) {
        const toothGeo = new THREE.BoxGeometry(0.05, 0.05, 0.08);
        const tooth = new THREE.Mesh(toothGeo, bladeMat);
        tooth.position.set(0, 0.08, -0.1 - (i * 0.15));
        tooth.rotation.x = 0.5;
        butterflyKnife.add(tooth);
    }

    // Tip
    const tipGeo = new THREE.ConeGeometry(0.1, 0.3, 4);
    tipGeo.rotateX(Math.PI / 2);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.set(0, 0, -1.2);
    butterflyKnife.add(tip);

    // Pivot points
    const pivotGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12);
    pivotGeo.rotateZ(Math.PI / 2);

    const pivotTop = new THREE.Mesh(pivotGeo, pivotMat);
    pivotTop.position.set(0, 0.1, 0.3);
    butterflyKnife.add(pivotTop);

    const pivotBottom = new THREE.Mesh(pivotGeo, pivotMat);
    pivotBottom.position.set(0, -0.1, 0.3);
    butterflyKnife.add(pivotBottom);

    // Handle 1 (top) - Skeleton design
    const handle1Group = new THREE.Group();
    handle1Group.position.set(0, 0.1, 0.3);
    const h1BodyGeo = new THREE.BoxGeometry(0.1, 0.18, 1.3);
    const handle1 = new THREE.Mesh(h1BodyGeo, handleMat);
    handle1.position.set(0, 0, 0.65);
    handle1Group.add(handle1);

    // EXTREME DETAIL: handle rivets
    const rivetGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
    rivetGeo.rotateZ(Math.PI / 2);
    const r1 = new THREE.Mesh(rivetGeo, pivotMat);
    r1.position.set(0, 0, 0.8);
    handle1Group.add(r1);
    const r2 = new THREE.Mesh(rivetGeo, pivotMat);
    r2.position.set(0, 0, 1.1);
    handle1Group.add(r2);

    // Skeleton Holes
    for (let i = 0; i < 3; i++) {
        const holeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.25, 8);
        holeGeo.rotateZ(Math.PI / 2);
        const hole = new THREE.Mesh(holeGeo, pivotMat);
        hole.position.set(0, 0, 0.3 + i * 0.35);
        handle1Group.add(hole);
    }

    butterflyKnife.add(handle1Group);

    // Handle 2 (bottom)
    const handle2Group = new THREE.Group();
    handle2Group.position.set(0, -0.1, 0.3);
    const h2BodyGeo = new THREE.BoxGeometry(0.1, 0.18, 1.3);
    const handle2 = new THREE.Mesh(h2BodyGeo, handleMat);
    handle2.position.set(0, 0, 0.65);
    handle2Group.add(handle2);

    // Rivets for handle 2
    const r3 = new THREE.Mesh(rivetGeo, pivotMat);
    r3.position.set(0, 0, 0.8);
    handle2Group.add(r3);
    const r4 = new THREE.Mesh(rivetGeo, pivotMat);
    r4.position.set(0, 0, 1.1);
    handle2Group.add(r4);

    // Latch Detail
    const latchGeo = new THREE.BoxGeometry(0.12, 0.06, 0.1);
    const latch = new THREE.Mesh(latchGeo, accentMat);
    latch.position.set(0, -0.12, 1.25);
    handle2Group.add(latch);

    butterflyKnife.add(handle2Group);

    group.userData.butterflyHandles = {
        handle1: handle1Group,
        handle2: handle2Group
    };
    group.add(butterflyKnife);
}



function createMirageMap() {
    // === DENSE MIRAGE A-SITE IMAGE RECONSTRUCTION ===
    // Matching uploaded image exact density and colors.
    // HU = Hammer Units (1 HU = 0.1389). All objects are "plin" (solid).

    const textureLoader = new THREE.TextureLoader();
    const sandTex = textureLoader.load('sand.png');
    sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
    sandTex.repeat.set(10, 10);

    const crateTex = textureLoader.load('crate.png');
    const plasterTex = textureLoader.load('plaster.png');
    plasterTex.wrapS = plasterTex.wrapT = THREE.RepeatWrapping;

    const sWall = new THREE.MeshStandardMaterial({ map: plasterTex, color: 0xe6c29a }); // Light Sandstone
    const sCrate = new THREE.MeshStandardMaterial({ map: crateTex }); // Wooden Crate
    const sWood = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 }); // Dark Wood
    const sFloor = new THREE.MeshStandardMaterial({ map: sandTex }); // Sandy floor
    const mRed = new THREE.MeshStandardMaterial({ color: 0x8b3a3a }); // Red A Site
    const mBlue = new THREE.MeshStandardMaterial({ color: 0x3b5998 }); // Blue Van
    const conc = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7 }); // Concrete
    const wDark = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 }); // Very dark wood
    const sky = new THREE.MeshStandardMaterial({ color: 0x87CEEB, emissive: 0x87CEEB, emissiveIntensity: 0.2 });

    function addBox(x, y, z, w, h, d, mat, rotY = 0, coll = true, name = "") {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y + h / 2, z); m.rotation.y = rotY; scene.add(m);
        if (coll) {
            m.updateMatrixWorld(); objects.push(m);
            const box = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, y + h / 2, z), new THREE.Vector3(w, h, d));
            objectBoxes.push(box);
            staticHittableObjects.push(m); // Optimization: Track static world geometry
        } return m;
    }

    // 0. BASE
    const floor = addBox(0, -2, 0, 15000 * HU, 2, 15000 * HU, sFloor, 0, false);
    floor.material.map.repeat.set(100, 100);

    // 1. TRIPLE STACK (CENTER SITE)
    const triX = 40 * HU, triZ = -100 * HU;
    addBox(triX, 0, triZ, 64 * HU, 64 * HU, 64 * HU, sCrate); // Base Left
    addBox(triX + 68 * HU, 0, triZ, 64 * HU, 64 * HU, 64 * HU, sCrate); // Base Right
    addBox(triX + 34 * HU, 64 * HU, triZ, 64 * HU, 64 * HU, 64 * HU, sCrate); // Top
    // Pallet detail
    addBox(triX + 34 * HU, 128 * HU, triZ, 60 * HU, 2 * HU, 60 * HU, sWood);

    // 2. TETRIS (NEAR RAMP)
    const tetX = -250 * HU, tetZ = 150 * HU;
    addBox(tetX, 0, tetZ, 64 * HU, 64 * HU, 64 * HU, sCrate);
    addBox(tetX + 64 * HU, 0, tetZ + 10 * HU, 64 * HU, 48 * HU, 64 * HU, sCrate);
    addBox(tetX - 10 * HU, 64 * HU, tetZ, 56 * HU, 56 * HU, 56 * HU, sCrate);
    addBox(tetX + 50 * HU, 48 * HU, tetZ + 20 * HU, 48 * HU, 48 * HU, 48 * HU, sCrate);
    addBox(tetX + 20 * HU, 110 * HU, tetZ, 32 * HU, 32 * HU, 32 * HU, sCrate);

    // 3. FIREBOX (STAIRS CORNER)
    const fbX = 220 * HU, fbZ = -180 * HU;
    addBox(fbX, 0, fbZ, 64 * HU, 64 * HU, 64 * HU, sCrate);
    addBox(fbX, 64 * HU, fbZ, 64 * HU, 64 * HU, 64 * HU, sCrate);

    // 4. PALACE ENTRANCE & BALCONY (IMAGE ACCURATE)
    const palX = 600 * HU, palZ = 150 * HU;
    addBox(palX, 0, palZ, 400 * HU, 500 * HU, 600 * HU, sWall); // Building
    // Balcony
    addBox(palX - 250 * HU, 82 * HU, palZ, 100 * HU, 10 * HU, 400 * HU, sWood);
    for (let i = -1; i <= 1; i++) addBox(palX - 250 * HU, 0, palZ + i * 180 * HU, 8 * HU, 82 * HU, 8 * HU, sWood); // Supports
    // Arched Wood Door (Granular)
    for (let i = 0; i < 5; i++) {
        const archW = 100 * HU - (Math.abs(2 - i) * 15 * HU);
        addBox(palX - 200.1 * HU, i * 30 * HU, palZ, 2 * HU, 30 * HU, archW, sWood);
    }

    // 5. SCAFFOLDING (MASTERPIECE DETAIL)
    const scfX = 400 * HU, scfZ = 500 * HU;
    for (let h = 0; h < 3; h++) {
        addBox(scfX, h * 80 * HU, scfZ, 150 * HU, 5 * HU, 150 * HU, sWood); // Platform
        // Vertical beams
        addBox(scfX - 70 * HU, 0, scfZ - 70 * HU, 5 * HU, 300 * HU, 5 * HU, sWood);
        addBox(scfX + 70 * HU, 0, scfZ - 70 * HU, 5 * HU, 300 * HU, 5 * HU, sWood);
        addBox(scfX + 70 * HU, 0, scfZ + 70 * HU, 5 * HU, 300 * HU, 5 * HU, sWood);
        addBox(scfX - 70 * HU, 0, scfZ + 70 * HU, 5 * HU, 300 * HU, 5 * HU, sWood);
    }

    // 6. SITE A LOGO (RED MARKER)
    addBox(0, 0.1, 0, 48 * HU, 0.1, 48 * HU, mRed, 0, false);
    addBox(0, 0.2, 0, 32 * HU, 0.1, 8 * HU, sFloor, Math.PI / 4, false); // Make it look like 'A' strike

    // 7. SURROUNDING WALLS (MATCHING IMAGE PERSPECTIVE)
    addBox(-800 * HU, 0, 0, 50 * HU, 600 * HU, 2000 * HU, sWall); // Connector Wall
    addBox(0, 0, -800 * HU, 2000 * HU, 600 * HU, 40 * HU, sWall); // CT-Spawn Wall (Full Width)
    addBox(0, 0, 850 * HU, 2000 * HU, 600 * HU, 40 * HU, sWall); // T-Spawn Wall (Full Width - FIX: No more direct sight)

    // 8. TICKET BOOTH (CT-CORNER)
    addBox(-150 * HU, 0, -500 * HU, 120 * HU, 84 * HU, 120 * HU, sWall);
    addBox(-150 * HU, 84 * HU, -500 * HU, 150 * HU, 8 * HU, 150 * HU, sWood); // Roof

    // 9. STAIRS (CT)
    const stX = -400 * HU, stZ = -300 * HU;
    for (let i = 0; i < 10; i++) {
        addBox(stX - i * 15 * HU, i * 8 * HU, stZ, 30 * HU, 8 * HU, 400 * HU, sFloor);
    }

    // 10. CONNECTOR / JUNGLE (IMAGE ACCURATE)
    const connX = -800 * HU, connZ = -400 * HU;
    addBox(connX, 0, connZ, 100 * HU, 400 * HU, 800 * HU, sWall); // Connector Wall
    addBox(connX + 150 * HU, 0, connZ - 200 * HU, 300 * HU, 300 * HU, 100 * HU, sWall); // Jungle entrance

    // 11. UNDERPASS (MID CONNECTION)
    const midX = -400 * HU, midZ = 800 * HU;
    addBox(midX, -100 * HU, midZ, 600 * HU, 100 * HU, 400 * HU, sFloor); // Ditch
    addBox(midX, 0, midZ + 200 * HU, 600 * HU, 300 * HU, 50 * HU, sWall); // Mid Wall

    // 12. PROPS (BARRELS & EXTRA BOXES)
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
    const createBarrel = (x, z) => {
        const bGeo = new THREE.CylinderGeometry(15 * HU, 15 * HU, 40 * HU, 16);
        const barrel = new THREE.Mesh(bGeo, barrelMat);
        barrel.position.set(x, 20 * HU, z);
        scene.add(barrel);
        objects.push(barrel);
        objectBoxes.push(new THREE.Box3().setFromCenterAndSize(barrel.position, new THREE.Vector3(30 * HU, 40 * HU, 30 * HU)));
    };
    createBarrel(tetX + 100 * HU, tetZ - 50 * HU);
    createBarrel(triX - 50 * HU, triZ + 50 * HU);

    // 13. EXTRA STACKS (MATCHING CS2 DENSITY)
    addBox(triX + 200 * HU, 0, triZ - 400 * HU, 64 * HU, 64 * HU, 64 * HU, sCrate);
    addBox(triX + 200 * HU, 64 * HU, triZ - 400 * HU, 64 * HU, 64 * HU, 64 * HU, sCrate);
}
// Consolidated Shoot Function (Moved to Top Level)
function shoot() {
    if (health <= 0 || isReloading) return;

    if (isBuyPhase) {
        console.log("[DEBUG] Shooting during Buy Phase enabled.");
    }
    const ammo = weaponAmmo[currentWeaponType];
    const config = weaponConfigs[currentWeaponType];

    if (currentWeaponType !== 'knife' && ammo.mag <= 0) {
        return;
    }

    inspectTimer = 0; // Cancel inspect
    if (currentWeaponType === 'knife') {
        meleeAttack();
        return;
    }

    if (currentWeaponType === 'grenade') {
        throwGrenade();
        return;
    }

    const time = performance.now();
    // Use dynamic fireRate from config
    const currentFireRate = config ? config.fireRate : 200;
    if (time - lastShotTime < currentFireRate) return;
    lastShotTime = time;

    // Consume Ammo
    if (currentWeaponType !== 'knife') {
        ammo.mag--;
        updateHUD();
    }

    // Create a bullet (Standardized Size)
    const bulletGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const bulletMat = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 2.0
    });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    // Apply Recoil to direction
    const recoilAmount = Math.min(recoilCounter * 0.02, 0.15);
    camDir.x += (Math.random() - 0.5) * recoilAmount;
    camDir.y += (Math.random() - 0.5) * recoilAmount;
    camDir.normalize();

    bullet.position.copy(camera.position).add(camDir.clone().multiplyScalar(5));
    bullet.userData.velocity = camDir.multiplyScalar(45.0); // Boosted Player Bullet Speed
    bullet.userData.owner = 'player';
    bullet.userData.damage = config ? config.damage : 35; // FIX: Pass damage to bullet
    bullet.userData.headshotMultiplier = config ? config.headshotMultiplier : 2.0; // FIX: Pass headshot mult
    scene.add(bullet);
    bullets.push(bullet);

    // Muzzle flash / Recoil effect
    weapon.position.z += 0.5;
    weapon.rotation.x -= 0.1;
    recoilCounter++;

    // Play Shoot Sound <!-- id: 34 -->
    playSound('shoot', 0.4, 0.9 + Math.random() * 0.2);

    // Multiplayer: notify others
    if (networkReady) {
        sendUpdate(); // Send position
        const shootData = {
            type: 'shoot',
            pos: { x: bullet.position.x, y: bullet.position.y, z: bullet.position.z },
            dir: { x: camDir.x, y: camDir.y, z: camDir.z }
        };
        if (isHost) broadcast(shootData);
        else if (allConns[0]) allConns[0].send(shootData);
    }
}

// Grenade Physics & Logic (Global)
function throwGrenade() {
    // Check if we have grenades
    if (!playerInventory.grenades || playerInventory.grenades.length === 0) return;

    const time = performance.now();
    if (time - lastShotTime < 1000) return; // 1 second cooldown
    lastShotTime = time;

    // Remove one grenade from inventory
    const grenadeType = playerInventory.grenades.pop();
    if (playerInventory.grenades.length === 0) {
        // Switch to knife if out of grenades
        setTimeout(() => switchWeapon('knife'), 500);
    }
    updateHUD();

    // Create grenade visual
    const grenadeGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const grenadeMat = new THREE.MeshStandardMaterial({ color: 0x335533, roughness: 0.8 });
    const grenade = new THREE.Mesh(grenadeGeo, grenadeMat);

    // Start position: in front of player
    grenade.position.copy(controls.getObject().position);
    grenade.position.y -= 0.5;

    const direction = new THREE.Vector3();
    controls.getDirection(direction);
    grenade.position.add(direction.clone().multiplyScalar(0.5));

    scene.add(grenade);

    // Physics properties
    const velocity = direction.clone().multiplyScalar(25); // Throw force
    velocity.y += 5; // Upward arc
    const gravity = -30;
    const startTime = performance.now();

    // Animation loop for this specific grenade
    const animateGrenade = () => {
        const now = performance.now();
        const delta = (now - lastFrameTime) / 1000;
        lastFrameTime = now;

        // Apply gravity
        velocity.y += gravity * 0.016; // Approx delta

        // Move
        grenade.position.add(velocity.clone().multiplyScalar(0.016));

        // Floor bounce
        if (grenade.position.y < 0.15) {
            grenade.position.y = 0.15;
            velocity.y *= -0.6; // Dampening
            velocity.x *= 0.8;
            velocity.z *= 0.8;
        }

        // Rotation
        grenade.rotation.x += 0.1;
        grenade.rotation.z += 0.1;

        // Check explosion timer (3 seconds)
        if (now - startTime > 3000) {
            explodeGrenade(grenade);
        } else {
            requestAnimationFrame(animateGrenade);
        }
    };

    let lastFrameTime = performance.now();
    requestAnimationFrame(animateGrenade);
}

function explodeGrenade(grenade) {
    // Visual effect
    const explosionGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const explosionMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
    const explosion = new THREE.Mesh(explosionGeo, explosionMat);
    explosion.position.copy(grenade.position);
    scene.add(explosion);

    // Expand and fade
    let scale = 1;
    const expandExplosion = () => {
        scale += 0.5;
        explosion.scale.set(scale, scale, scale);
        explosion.material.opacity -= 0.05;
        if (explosion.material.opacity > 0) {
            requestAnimationFrame(expandExplosion);
        } else {
            scene.remove(explosion);
        }
    };
    expandExplosion();

    // Remove grenade body
    scene.remove(grenade);

    // Damage logic (Area of Effect)
    const damageRadius = 15; // Increased radius
    const maxDamage = 90;    // Max grenade damage

    // 1. Damage Bots
    enemies.slice().forEach(bot => {
        const dist = bot.position.distanceTo(grenade.position);
        if (dist < damageRadius) {
            const damage = Math.floor(maxDamage * (1 - dist / damageRadius));

            // Apply damage via networking if needed, or direct
            bot.userData.health -= damage;
            console.log(`[GRENADE] Hit bot for ${damage} dmg`);

            if (bot.userData.health <= 0) {
                // Kill bot
                playerMoney += 300;
                playerMata += 10;

                // DROP WEAPON on grenade death <!-- id: 29 -->
                if (bot.userData.currentWeapon) {
                    dropWeapon(bot.userData.currentWeapon, 'default', bot.position.clone());
                }

                scene.remove(bot);
                const idx = enemies.indexOf(bot);
                if (idx > -1) enemies.splice(idx, 1);
                updateHUD();
                if (enemies.length === 0 && roundActive) endRound(true);
            }
            // Push back effect (simple)
            const pushDir = bot.position.clone().sub(grenade.position).normalize();
            bot.position.add(pushDir.multiplyScalar(2));
        }
    });

    // 2. Damage Player (Self damage)
    const distToPlayer = controls.getObject().position.distanceTo(grenade.position);
    if (distToPlayer < damageRadius) {
        const damage = Math.floor(maxDamage * (1 - distToPlayer / damageRadius));
        takeDamage(damage);
        console.log(`[GRENADE] Self hit for ${damage} dmg`);
    }
}

function meleeAttack() {
    const time = performance.now();
    if (time - lastShotTime < fireRate) return;
    lastShotTime = time;

    if (weapon) {
        // Butterfly knife flip animation
        if (currentWeaponType === 'knife' && weapon.userData.butterflyHandles) {
            const handles = weapon.userData.butterflyHandles;
            const duration = 400;
            const startTime = performance.now();

            const animateFlip = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                if (progress < 0.5) {
                    // Open handles
                    const angle = (progress * 2) * Math.PI;
                    handles.handle1.rotation.x = angle;
                    handles.handle2.rotation.x = -angle;
                } else {
                    // Close handles
                    const angle = (2 - progress * 2) * Math.PI;
                    handles.handle1.rotation.x = angle;
                    handles.handle2.rotation.x = -angle;
                }

                if (progress < 1) {
                    requestAnimationFrame(animateFlip);
                } else {
                    handles.handle1.rotation.x = 0;
                    handles.handle2.rotation.x = 0;
                }
            };

            animateFlip();
        }

        // Slash animation
        weapon.rotation.z = -1.0;
        weapon.rotation.x = -0.5;
        setTimeout(() => {
            if (weapon) {
                weapon.rotation.z = 0;
                weapon.rotation.x = 0;
            }
        }, 200);
    }

    // Grenade Physics & Logic
    function throwGrenade() {
        // Check if we have grenades
        if (!playerInventory.grenades || playerInventory.grenades.length === 0) return;

        const time = performance.now();
        if (time - lastShotTime < 1000) return; // 1 second cooldown
        lastShotTime = time;

        // Remove one grenade from inventory
        const grenadeType = playerInventory.grenades.pop();
        if (playerInventory.grenades.length === 0) {
            // Switch to knife if out of grenades
            setTimeout(() => switchWeapon('knife'), 500);
        }
        updateHUD();

        // Create grenade visual
        const grenadeGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const grenadeMat = new THREE.MeshStandardMaterial({ color: 0x335533, roughness: 0.8 });
        const grenade = new THREE.Mesh(grenadeGeo, grenadeMat);

        // Start position: in front of player
        grenade.position.copy(controls.getObject().position);
        grenade.position.y -= 0.5;

        const direction = new THREE.Vector3();
        controls.getDirection(direction);
        grenade.position.add(direction.clone().multiplyScalar(0.5));

        scene.add(grenade);

        // Physics properties
        const velocity = direction.clone().multiplyScalar(25); // Throw force
        velocity.y += 5; // Upward arc
        const gravity = -30;
        const startTime = performance.now();

        // Animation loop for this specific grenade
        const animateGrenade = () => {
            const now = performance.now();
            const delta = (now - lastFrameTime) / 1000;
            lastFrameTime = now;

            // Apply gravity
            velocity.y += gravity * 0.016; // Approx delta

            // Move
            grenade.position.add(velocity.clone().multiplyScalar(0.016));

            // Floor bounce
            if (grenade.position.y < 0.15) {
                grenade.position.y = 0.15;
                velocity.y *= -0.6; // Dampening
                velocity.x *= 0.8;
                velocity.z *= 0.8;
            }

            // Rotation
            grenade.rotation.x += 0.1;
            grenade.rotation.z += 0.1;

            // Check explosion timer (3 seconds)
            if (now - startTime > 3000) {
                explodeGrenade(grenade);
            } else {
                requestAnimationFrame(animateGrenade);
            }
        };

        let lastFrameTime = performance.now();
        requestAnimationFrame(animateGrenade);
    }

    function explodeGrenade(grenade) {
        // Visual effect
        const explosionGeo = new THREE.SphereGeometry(0.5, 32, 32);
        const explosionMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
        const explosion = new THREE.Mesh(explosionGeo, explosionMat);
        explosion.position.copy(grenade.position);
        scene.add(explosion);

        // Expand and fade
        let scale = 1;
        const expandExplosion = () => {
            scale += 0.5;
            explosion.scale.set(scale, scale, scale);
            explosion.material.opacity -= 0.05;
            if (explosion.material.opacity > 0) {
                requestAnimationFrame(expandExplosion);
            } else {
                scene.remove(explosion);
            }
        };
        expandExplosion();

        // Remove grenade body
        scene.remove(grenade);

        // Damage logic (Area of Effect)
        const damageRadius = 15; // Increased radius
        const maxDamage = 90;    // Max grenade damage

        // 1. Damage Bots
        enemies.slice().forEach(bot => {
            const dist = bot.position.distanceTo(grenade.position);
            if (dist < damageRadius) {
                const damage = Math.floor(maxDamage * (1 - dist / damageRadius));

                // Apply damage via networking if needed, or direct
                bot.userData.health -= damage;
                console.log(`[GRENADE] Hit bot for ${damage} dmg`);

                if (bot.userData.health <= 0) {
                    // Kill bot
                    playerMoney += 300;
                    playerMata += 10;
                    scene.remove(bot);
                    const idx = enemies.indexOf(bot);
                    if (idx > -1) enemies.splice(idx, 1);
                    updateHUD();
                    if (enemies.length === 0 && roundActive) endRound(true);
                }

                // Push back effect (simple)
                const pushDir = bot.position.clone().sub(grenade.position).normalize();
                bot.position.add(pushDir.multiplyScalar(2));
            }
        });

        // 2. Damage Player (Self damage)
        const distToPlayer = controls.getObject().position.distanceTo(grenade.position);
        if (distToPlayer < damageRadius) {
            const damage = Math.floor(maxDamage * (1 - distToPlayer / damageRadius));
            takeDamage(damage);
            console.log(`[GRENADE] Self hit for ${damage} dmg`);
        }
    }

    const raycasterMelee = new THREE.Raycaster();
    raycasterMelee.set(controls.getObject().position, new THREE.Vector3().copy(controls.getDirection(new THREE.Vector3())));
    raycasterMelee.far = 10.0; // Slightly longer range for ease

    const targets = [...enemies];
    for (const id in remotePlayers) {
        if (playerTeams[id] !== myTeamId) {
            targets.push(remotePlayers[id]);
        }
    }

    const intersects = raycasterMelee.intersectObjects(targets, true); // Recursive
    if (intersects.length > 0) {
        let hitObj = intersects[0].object;
        // Drill up to find parent group
        while (hitObj.parent && !enemies.includes(hitObj) && !Object.values(remotePlayers).includes(hitObj)) {
            hitObj = hitObj.parent;
        }

        let hitPeerId = null;
        for (const id in remotePlayers) {
            if (remotePlayers[id] === hitObj) {
                hitPeerId = id;
                break;
            }
        }

        if (hitPeerId) {
            const data = { type: "hit", targetId: hitPeerId, damage: 50 };
            if (isHost) broadcast(data);
            else if (allConns[0]) allConns[0].send(data);
        } else if (enemies.includes(hitObj)) {
            hitObj.userData.health -= 50;
            console.log(`[DEBUG] Knife hit bot! Health: ${hitObj.userData.health} `);
            if (hitObj.userData.health <= 0) {
                // Enemy died
                playerMoney += 300;
                playerMata += 10; // Award MATA on knife kill
                scene.remove(hitObj);
                const idx = enemies.indexOf(hitObj);
                if (idx > -1) {
                    enemies.splice(idx, 1);
                }
                updateHUD();
                if (enemies.length === 0 && roundActive) {
                    endRound(true); // Player wins round
                }
            }
        }
    }
}

const textureLoader = new THREE.TextureLoader();
const targetTexture = textureLoader.load('character.png');

function startRound() {
    if (playerWins >= MAX_WINS || enemyWins >= MAX_WINS) {
        endGame(playerWins >= MAX_WINS);
        return;
    }

    roundActive = true;
    isBuyPhase = false;
    if (lobbyUI) { lobbyUI.style.display = 'none'; isLobbyOpen = false; }
    if (instructionScreen) { instructionScreen.style.display = 'none'; isInstructionsOpen = false; }
    if (hud) hud.style.display = 'block';
    health = 100;
    healthDisplay.textContent = "Health: " + Math.floor(health);
    recoilCounter = 0;
    isReloading = false; // FIX: Reset state
    isFiring = false;    // FIX: Reset state

    // Reset inventory to default starter pistol if nothing was purchased
    if (!playerInventory.secondary && !playerInventory.primary) {
        const uspStats = CS2_WEAPONS['usp-s'];
        playerInventory.secondary = { ...uspStats, id: 'usp-s' };
    }

    // Reset Ammo for all weapons
    for (const type in weaponAmmo) {
        if (weaponConfigs[type]) {
            weaponAmmo[type].mag = weaponConfigs[type].magSize;
            weaponAmmo[type].reserve = weaponConfigs[type].reserve;
        }
    }
    updateHUD();

    // Hide round overlays
    if (winScreen) winScreen.style.display = 'none';
    if (deathScreen) deathScreen.style.display = 'none';

    // Clear old stuff
    for (const e of enemies) scene.remove(e);
    enemies.length = 0;
    for (const b of bullets) scene.remove(b);
    bullets.length = 0;
    for (const b of enemyBullets) scene.remove(b);
    enemyBullets.length = 0;
    for (const i of impacts) scene.remove(i);
    impacts.length = 0;

    // FIX: Clear existing buy timer so openBuyMenu starts a fresh one
    if (buyTimerInterval) {
        clearInterval(buyTimerInterval);
        buyTimerInterval = null;
    }


    // Reset inventory based on last round outcome
    if (!lastRoundWon) {
        playerInventory.primary = null;
        const uspStats = CS2_WEAPONS['usp-s'];
        playerInventory.secondary = { ...uspStats, id: 'usp-s' };
        currentWeaponType = 'secondary';

        // Reset Armor on Death
        playerInventory.equipment.armor = 0;
        playerInventory.equipment.helmet = false;
        playerInventory.equipment.defuseKit = false;
    }

    // Always ensure weapons are correctly equipped based on current inventory BEFORE refilling ammo
    equipPurchasedWeapons();

    // Reset Ammo for all weapons (Now that configs are updated)
    for (const type in weaponAmmo) {
        if (weaponConfigs[type]) {
            weaponAmmo[type].mag = weaponConfigs[type].magSize;
            weaponAmmo[type].reserve = weaponConfigs[type].reserve;
        }
    }
    updateHUD();

    // Skip buy phase - start immediately
    endBuyPhase();
    clearDroppedWeapons(); // Clear any weapons from previous round <!-- id: 29 -->

    // Reset Player
    const CT_SPAWNS = [
        { x: -150 * HU, z: -1000 * HU, rot: 0 },
        { x: 150 * HU, z: -1000 * HU, rot: 0 },
        { x: 0, z: -1100 * HU, rot: 0 },
        { x: -300 * HU, z: -950 * HU, rot: 0.1 },
        { x: 300 * HU, z: -950 * HU, rot: -0.1 },
        { x: 0, z: -850 * HU, rot: 0 }
    ];
    const T_SPAWNS = [
        { x: 150 * HU, z: 1000 * HU, rot: Math.PI },
        { x: -150 * HU, z: 1000 * HU, rot: Math.PI },
        { x: 0, z: 1100 * HU, rot: Math.PI },
        { x: 300 * HU, z: 950 * HU, rot: Math.PI - 0.1 },
        { x: -300 * HU, z: 950 * HU, rot: Math.PI + 0.1 },
        { x: 0, z: 850 * HU, rot: Math.PI }
    ];

    if (networkReady) {
        const spawns = isHost ? CT_SPAWNS : T_SPAWNS;
        const s = spawns[Math.floor(Math.random() * spawns.length)];
        console.warn(`[SPAWN] Multiplayer Spawn Selected:`, s);
        controls.getObject().position.set(s.x, 15, s.z); // Spawn slightly higher (15) to avoid floor issues
        controls.getObject().rotation.set(0, s.rot, 0);
    } else {
        // Log team selection for debugging
        console.warn(`[SPAWN] Singleplayer Start. Team: ${selectedTeam}`);
        const spawns = (selectedTeam === 'T') ? T_SPAWNS : CT_SPAWNS;
        const s = spawns[Math.floor(Math.random() * spawns.length)];
        console.warn(`[SPAWN] Selected Spawn:`, s);
        controls.getObject().position.set(s.x, 15, s.z);
        controls.getObject().rotation.set(0, s.rot, 0);
    }
    // For 1vBot, spawn enemies immediately (buy menu already handled)
    if (!networkReady && currentMode === '1vBot') {
        spawnEnemies(enemiesPerRound);
    }


    const scoreTile = document.getElementById('top-score-tile');
    if (scoreTile) scoreTile.textContent = networkReady ? `${playerWins} - ${opponentWins} ` : `${playerWins} - ${enemyWins} `;

    // Show instruction screen for user to click and start the game
    // Instead of auto-locking, let user click to begin
    if (instructionScreen) {
        instructionScreen.style.display = 'flex';
        isInstructionsOpen = true; // CACHED update
        instructionScreen.innerHTML = '<div id="instructions-content"><h1>CLICK TO START</h1><p>Move: W, A, S, D<br>Jump: SPACE<br>Shoot: LEFT CLICK<br>Scope: E<br>Reload: R<br>Buy Menu: B</p></div>';
    }
    if (hud) hud.style.display = 'none';

    // Controls will lock when user clicks on instruction screen (handled by setupControlsListeners)
}

// --- REFINED SPAWNING LOGIC ---
function spawnEnemies(count) {
    console.log(`[DEBUG] Spawning ${count} enemies...`);
    const landmarks = [
        { x: -320 * HU, z: -200 * HU }, // A-Site (Back)
        { x: 350 * HU, z: -200 * HU },  // B-Site (Back)
        { x: 0, z: 50 * HU },          // Mid
        { x: 350 * HU, z: 400 * HU },   // Apartments (Deeper)
        { x: -480 * HU, z: -50 * HU },  // Palace (Back)
        { x: 200 * HU, z: 950 * HU },   // T-Spawn Secluded Landmark
        { x: -500 * HU, z: -50 * HU },  // Far Palace
        { x: 450 * HU, z: -350 * HU },  // Market (Back)
        { x: -200 * HU, z: -950 * HU }, // CT-Spawn Secluded Landmark
        { x: 100 * HU, z: -900 * HU }, // CT-Spawn Alt
        { x: -100 * HU, z: 900 * HU }  // T-Spawn Alt
    ];

    for (let i = 0; i < count; i++) {
        const enemy = create3DCharacterModel(0xff3333); // Red bots for enemies

        // Pick a random landmark or random side spread
        let pos;
        if (i < landmarks.length) {
            pos = landmarks[i];
            // If player is T, skip T-spawn landmark for bots, or if player is CT skip CT-spawn
            if (selectedTeam === 'T' && i === 5) pos = landmarks[8]; // Swap T-spawn for Market
            if (selectedTeam === 'CT' && i === 8) pos = landmarks[5]; // Swap CT-spawn for T-spawn
        } else {
            // Random spread based on side
            if (selectedTeam === 'T') {
                // Bots should be mostly CT side, tucked away
                pos = {
                    x: (Math.random() - 0.5) * 600 * HU - 200 * HU,
                    z: (Math.random() * -300 - 800) * HU
                };
            } else {
                // Bots should be mostly T side, tucked away
                pos = {
                    x: (Math.random() - 0.5) * 600 * HU + 200 * HU,
                    z: (Math.random() * 300 + 800) * HU
                };
            }
        }

        enemy.position.x = pos.x + (Math.random() - 0.5) * 20 * HU;
        enemy.position.z = pos.z + (Math.random() - 0.5) * 20 * HU;
        enemy.position.y = 5.5;

        // Bot Economy Logic
        let budget = botMoney;
        let buyArmor = false;
        let buyHelmet = false;
        let primaryWeapon = null;
        let secondaryWeapon = 'usp-s'; // Default pistol

        // 1. Buy Armor if possible
        if (budget >= 1000) {
            buyArmor = true;
            buyHelmet = true;
            budget -= 1000;
        } else if (budget >= 650) {
            buyArmor = true;
            budget -= 650;
        }

        // 2. Buy Weapon
        const rifleCost = 2700; // Approx for AK/M4
        const smgCost = 1200; // MP9/Mac10 avg

        if (budget >= rifleCost) {
            // Buy Rifle
            const rifles = ['ak47', 'm4a4', 'aug', 'sg-553', 'galil', 'famas'];
            // 10% chance for AWP if rich
            if (budget >= 4750 && Math.random() < 0.1) {
                primaryWeapon = 'awp';
                budget -= 4750;
            } else {
                primaryWeapon = rifles[Math.floor(Math.random() * rifles.length)];
                budget -= 2700; // Avg cost
            }
        } else if (budget >= smgCost) {
            // Force buy / Eco SMG (Simulated)
            primaryWeapon = 'mp9'; // Placeholder, or we can use generic 'smg' if we have it, but we only have 'ak47' style meshes. 
            // Actually we only have rifles implemented in createThirdPersonWeapon fully (ak47, m4...).
            // Let's stick to the rifles we have meshes for.
            // If they can't afford a heavy rifle, maybe Galil/Famas?
            // For now, if they are broke, they stick to pistol.

            // Wait, I should double check what weapons I have meshes for.
            // 'ak47', 'm4a4', 'awp', 'galil', 'famas', 'aug', 'sg-553' are in the list I made.
            // Galil is $1800. Famas is $2050.
            const cheapRifles = ['galil', 'famas'];
            if (budget >= 2000) {
                primaryWeapon = cheapRifles[Math.floor(Math.random() * cheapRifles.length)];
                budget -= 2000;
            }
        }

        enemy.userData = {
            health: 100,
            armor: buyArmor ? 100 : 0,
            hasHelmet: buyHelmet,
            lastShot: 0,
            mag: 30,
            isReloading: false,
            reloadTimer: 0,
            currentWeapon: primaryWeapon || secondaryWeapon
        };
        enemies.push(enemy);
        scene.add(enemy);

        // Equip Weapon
        if (primaryWeapon) {
            setThirdPersonWeapon(enemy, primaryWeapon);
        } else {
            // Pistol
            setThirdPersonWeapon(enemy, 'pistol'); // Or specific pistol ID
        }
    }
}

let aiRaycaster; // Reuse for AI
function updateEnemies(delta) {
    if (!roundActive) return;
    const playerPos = controls.getObject().position;
    const time = performance.now();

    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        const data = e.userData;

        // Fix: Ensure bot only rotates on Y axis to face player (no tilting up/down which causes flipping)
        const targetPos = new THREE.Vector3(playerPos.x, e.position.y, playerPos.z);
        e.lookAt(targetPos);

        // CRITICAL FIX: Force upright rotation to prevent "upside down" issues
        e.rotation.x = 0;
        e.rotation.z = 0;

        // BHOP LOGIC: If player holds knife, bots start hopping (Reliable)
        if (currentWeaponType === 'knife') {
            const hopHeight = 5.0; // More aggressive hop
            const jumpSpeed = 0.012;
            e.position.y = 7.5 + Math.abs(Math.sin(time * jumpSpeed)) * (7.5 + hopHeight);
            // Limit Z tilt to avoid flipping
            e.rotation.z = Math.sin(time * jumpSpeed) * 0.1;
        }

        // AI Reload Logic
        if (data.isReloading) {
            data.reloadTimer -= delta;
            if (data.reloadTimer <= 0) {
                data.isReloading = false;
                data.mag = 30; // Refill
            }
            // Move while reloading but don't shoot
        }

        const toPlayer = new THREE.Vector3().subVectors(playerPos, e.position);
        const dist = toPlayer.length();
        const dir = toPlayer.normalize();

        // LOS check (Eye Height) - Optimized Raycaster reuse
        const eyePos = e.position.clone().add(new THREE.Vector3(0, 5, 0));
        if (!aiRaycaster) aiRaycaster = new THREE.Raycaster();
        aiRaycaster.set(eyePos, dir);
        aiRaycaster.far = dist;
        const intersects = aiRaycaster.intersectObjects(objects, true);
        const canSee = intersects.length === 0;

        if (canSee && dist < aiVisionRange && !data.isReloading) {
            if (time - data.lastShot > enemyFireRate) {
                enemyShoot(e);
                data.lastShot = time + Math.random() * 500;

                // Consume bot ammo
                data.mag--;
                if (data.mag <= 0) {
                    data.isReloading = true;
                    data.reloadTimer = 2.0; // 2s reload for bots
                }
            }
        }

        // Bot Walking Animation (Swaying while moving)
        if (!canSee || dist > 60) {
            // Collision check for enemy movement
            const nextPos = e.position.clone().add(dir.clone().multiplyScalar(enemySpeed * delta));

            // Bot sway animation
            e.rotation.z = Math.sin(time * 0.01) * 0.1;
            e.position.y = 7.5 + Math.abs(Math.sin(time * 0.01)) * 0.5;

            // Improved collision: larger radius and check slightly ahead
            const collisionRadius = 6.0; // Increased radius
            const enemyBox = new THREE.Box3().setFromCenterAndSize(nextPos, new THREE.Vector3(collisionRadius, 15, collisionRadius));
            let collision = false;
            for (let j = 0; j < objectBoxes.length; j++) {
                if (objectBoxes[j].intersectsBox(enemyBox)) {
                    collision = true;
                    // If stuck, try to move slightly away from the center of the box? 
                    // For now, just block movement.
                    break;
                }
            }
            if (!collision) {
                e.position.x = nextPos.x;
                e.position.z = nextPos.z;
            }
        } else {
            // Reset bot pose if standing still
            e.rotation.z = THREE.MathUtils.lerp(e.rotation.z, 0, 5 * delta);
            e.position.y = THREE.MathUtils.lerp(e.position.y, 7.5, 5 * delta);
        }
    }
}

function enemyShoot(enemy) {
    const bulletGeo = new THREE.SphereGeometry(1.5, 8, 8);
    const bulletMat = new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff3300,
        emissiveIntensity: 2.0
    });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);
    bullet.position.copy(enemy.position).y += 5;

    const playerPos = controls.getObject().position.clone();
    // Reduced spread for better accuracy
    playerPos.x += (Math.random() - 0.5) * 3;
    playerPos.y += (Math.random() - 0.5) * 3;
    playerPos.z += (Math.random() - 0.5) * 3;

    const dir = new THREE.Vector3().subVectors(playerPos, bullet.position).normalize();
    bullet.userData.velocity = dir.multiplyScalar(30.0); // Boosted Enemy Bullet Speed
    scene.add(bullet);
    enemyBullets.push(bullet);
}


let bulletRaycaster; // Reuse this
let hittableObjects = []; // Reuse array

let staticHittableObjects = []; // Map geometry
// Optimization: Rebuild hittable list less frequently if possible, 
// for now, we just ensure it's not thrashing.
function updateHittableObjects() {
    hittableObjects.length = 0;
    // Fast path: Reuse static geometry
    for (let i = 0; i < staticHittableObjects.length; i++) hittableObjects.push(staticHittableObjects[i]);

    // Add dynamic entities
    for (let i = 0; i < enemies.length; i++) hittableObjects.push(enemies[i]);
    const remote = Object.values(remotePlayers);
    for (let i = 0; i < remote.length; i++) hittableObjects.push(remote[i]);
}

function updateBullets() {
    // Only rebuild if needed or once per frame
    updateHittableObjects();

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const velocityVec = b.userData.velocity;

        // --- OPTIMIZATION: Reuse Raycaster & Pre-calc List ---
        // We use a specific raycaster for bullets to avoid creating new ones
        if (!bulletRaycaster) bulletRaycaster = new THREE.Raycaster();

        // Raycast
        const velocityNorm = velocityVec.clone().normalize();
        bulletRaycaster.set(b.position, velocityNorm);

        // FIX: Match raycast distance to ACTUAL movement distance (delta-scaled)
        const moveDist = velocityVec.length() * delta * 60;
        bulletRaycaster.far = moveDist + 0.5;

        // Pre-calculate collision list ONCE per frame (or lazily) if possible, 
        // but here we just construct it cleanly.
        // For maximum performance, we should ideally maintain a separate list of "hittables"
        // but spreading into a new array every bullet is costly.
        // Let's optimize by traversing less or using a static array if possible.
        // For now, let's just NOT create a new array every single bullet if we can avoid it.
        // Better yet: Just pass the arrays directly if checks allow, but raycaster takes a single array.

        // Optimization: Use a shared array for checking to avoid GC thrashing
        // We'll rebuild this list only if the scene graph structure changes significantly,
        // but for now, let's just concat efficiently or cache it at the start of updateBullets?
        // Actually, let's do it inside updateBullets but OUTSIDE the loop.

        const intersects = bulletRaycaster.intersectObjects(hittableObjects, true);

        let closestHit = null;
        let isEnemy = false;

        if (intersects.length > 0) {
            closestHit = intersects[0];
            // Identify if hit an enemy or remote player
            let hitObj = closestHit.object;
            while (hitObj.parent) {
                if (enemies.includes(hitObj) || Object.values(remotePlayers).includes(hitObj)) {
                    isEnemy = true;
                    // For remote players, identify WHICH one
                    if (Object.values(remotePlayers).includes(hitObj)) {
                        for (const [id, mesh] of Object.entries(remotePlayers)) {
                            if (mesh === hitObj) {
                                closestHit.targetPeerId = id;
                                break;
                            }
                        }
                    }
                    break;
                }
                hitObj = hitObj.parent;
            }
        }

        if (closestHit) {
            if (!isEnemy) {
                // WALL IMPACT
                // reuse geometry/material if possible? 
                // For now, keep it simple but maybe limit rate?
                const impactGeo = new THREE.CircleGeometry(0.15, 8);
                const impactMat = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
                const impact = new THREE.Mesh(impactGeo, impactMat);
                impact.position.copy(closestHit.point).add(closestHit.face.normal.multiplyScalar(0.02));
                impact.lookAt(closestHit.point.clone().add(closestHit.face.normal));
                scene.add(impact);
                impacts.push(impact);
                if (impacts.length > 50) scene.remove(impacts.shift()); // Reduced limit to 50
            } else {
                // ENEMY HIT (REGISTER ON PARENT GROUP)
                let enemy = closestHit.object;
                while (enemy.parent && !enemies.includes(enemy) && !Object.values(remotePlayers).includes(enemy)) {
                    enemy = enemy.parent;
                }
                const relativeY = closestHit.point.y - enemy.position.y;

                // Use dynamic damage from bullet
                const baseDamage = b.userData.damage;
                const headshotMult = b.userData.headshotMultiplier;

                let dmg = baseDamage;

                if (relativeY > 3.5) { // Headshot
                    dmg = baseDamage * headshotMult;
                    playSound('headshot', 0.6); // Headshot Sound <!-- id: 34 -->
                    console.log(`HEADSHOT! Applied ${dmg} damage`);
                } else {
                    console.log(`Body hit! Applied ${dmg} damage`);
                }

                enemy.userData.health -= dmg;
                playSound('hit', 0.5, 0.8 + Math.random() * 0.4); // Hit Sound <!-- id: 34 -->
                if (enemy.userData.health <= 0) {
                    enemy.userData.isDead = true;

                    // If it was a bot, remove from enemies array
                    const botIdx = enemies.indexOf(enemy);
                    if (botIdx > -1) {
                        enemies.splice(botIdx, 1);
                        scene.remove(enemy);
                        playSound('kill', 0.5); // Kill Sound <!-- id: 34 -->
                        playerKills++;
                        playerMoney += 300; // Reward per kill
                        playerMata += 10;   // Award MATA
                        updateHUD();

                        // DROP WEAPON on death <!-- id: 29 -->
                        if (enemy.userData.currentWeapon) {
                            dropWeapon(enemy.userData.currentWeapon, 'default', enemy.position.clone());
                        }

                        // Check if all bots/enemies are dead (for single player or mixed)
                        if (checkTeamWipe(1)) { // Team 1 is enemies
                            endRound(true);
                        }
                    }

                    // If it was a remote player, broadcast their death
                    if (closestHit.targetPeerId && networkReady) {
                        const deathMsg = { type: 'player-dead', deadId: closestHit.targetPeerId };
                        if (isHost) broadcast(deathMsg);
                        else if (allConns[0]) allConns[0].send(deathMsg);

                        // Check if all enemies are dead
                        if (checkTeamWipe(playerTeams[closestHit.targetPeerId])) {
                            const myTeam = myTeamId;
                            const enemyTeam = playerTeams[closestHit.targetPeerId];
                            if (myTeam !== enemyTeam) {
                                endRound(true);
                            }
                        }

                        setTimeout(() => scene.remove(enemy), 3000);
                    }
                }

                if (closestHit.targetPeerId && networkReady) {
                    const data = { type: "hit", targetId: closestHit.targetPeerId, damage: dmg };
                    if (isHost) {
                        broadcast(data);
                    } else if (allConns[0]) {
                        allConns[0].send(data);
                    }
                    console.log(`Bullet hit player ${closestHit.targetPeerId} for ${dmg}`);
                }
            }
            scene.remove(b);
            bullets.splice(i, 1);
            continue;
        }

        // Frame-rate independent movement (normalized to 60FPS)
        const moveStep = velocityVec.clone().multiplyScalar(delta * 60);
        b.position.add(moveStep);
        if (b.position.distanceTo(controls.getObject().position) > 1000) {
            scene.remove(b);
            bullets.splice(i, 1);
        }
    }
}

function updateEnemyBullets() {
    const playerPos = controls.getObject().position;
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        const vel = b.userData.velocity;
        // FIX: Match raycast distance to ACTUAL movement distance (delta-scaled)
        const dist = vel.length() * delta * 60 + 0.5;
        const dir = vel.clone().normalize();

        // Raycast against Walls
        const ray = new THREE.Raycaster(b.position, dir, 0, dist);
        const wallHits = ray.intersectObjects(objects, true);

        if (wallHits.length > 0) {
            scene.remove(b);
            enemyBullets.splice(i, 1);
            continue;
        }

        // Frame-rate independent movement (normalized to 60FPS)
        const moveStep = vel.clone().multiplyScalar(delta * 60);
        b.position.add(moveStep);

        if (b.position.distanceTo(playerPos) < 4) {
            // Bots use a default penetration of 60% for now
            takeDamage(20, 60);
            scene.remove(b);
            enemyBullets.splice(i, 1);
            continue;
        }

        if (b.position.distanceTo(playerPos) > 1000) {
            scene.remove(b);
            enemyBullets.splice(i, 1);
        }
    }
}

function takeDamage(amount, penetration = 100) {
    if (!roundActive) return;
    playSound('hurt', 0.4, 0.9 + Math.random() * 0.2); // Hurt Sound <!-- id: 34 -->

    let finalDamage = amount;
    if (playerInventory.equipment.armor > 0) {
        // Armor Logic (Simplified CS:GO style)
        // Penetration is % of damage that goes through armor
        const healthDamage = amount * (penetration / 100);
        const armorDamage = (amount - healthDamage) * 0.5;

        finalDamage = healthDamage;
        playerInventory.equipment.armor = Math.max(0, playerInventory.equipment.armor - armorDamage);
    }

    health -= finalDamage;
    updateHUD();
    document.body.style.backgroundColor = '#550000';
    setTimeout(() => { document.body.style.backgroundColor = 'transparent'; }, 50);

    if (health <= 0) {
        // Drop current weapon on death <!-- id: 29 -->
        if (playerInventory.primary) {
            dropWeapon(playerInventory.primary.id, playerInventory.skins['ak47'], controls.getObject().position.clone());
        } else if (playerInventory.secondary) {
            dropWeapon(playerInventory.secondary.id, playerInventory.skins['pistol'], controls.getObject().position.clone());
        }
        endRound(false);
    }
}

function endRound(playerWon) {
    if (!roundActive) return;
    roundActive = false;

    // Broadcast end to all if host
    if (isHost && networkReady) {
        broadcast({ type: 'round-ended', winnerTeam: playerWon ? myTeamId : (myTeamId === 0 ? 1 : 0) });
    }

    if (playerWon) {
        playerWins++;
        playerMoney += 3250; // Win reward
        lastRoundWon = true;
    } else {
        if (networkReady) opponentWins++;
        else enemyWins++;
        playerMoney += 1400; // Loss reward
        lastRoundWon = false;
    }

    const currentScore = networkReady ? `${playerWins} - ${opponentWins} ` : `${playerWins} - ${enemyWins} `;
    const topScoreTile = document.getElementById('top-score-tile');
    if (topScoreTile) topScoreTile.textContent = currentScore;

    // Show round overlays
    if (playerWon) {
        if (winScreen) winScreen.style.display = 'block';
        playSound('win', 0.6); // Play Win Sound <!-- id: 35 -->
    } else {
        if (deathScreen) deathScreen.style.display = 'block';
        playSound('loss', 0.6); // Play Loss Sound <!-- id: 35 -->
    }

    if (playerWins >= MAX_WINS || enemyWins >= MAX_WINS || (networkReady && opponentWins >= MAX_WINS)) {
        setTimeout(() => endGame(playerWins >= MAX_WINS), 2000);
    } else {
        setTimeout(startRound, 3000); // Wait 3s as requested
    }

    // Multiplayer Sync: If we lost, tell others who won
    if (!playerWon && networkReady) {
        const winnerTeam = (myTeamId === 0) ? 1 : 0;
        const msg = { type: 'round-ended', winnerTeam: winnerTeam };
        if (isHost) broadcast(msg);
        else if (allConns[0] && allConns[0].open) allConns[0].send(msg);
    }
}

function endGame(playerWonGame) {
    isGameOver = true;
    controls.unlock();
    hud.style.display = 'none';
    gameOverScreen.style.display = 'flex';
    finalScoreDisplay.textContent = playerWonGame ? "VICTORY! Match Won." : "DEFEAT! Match Lost.";

    // Reset match stats (money, kills, score)
    playerMoney = 800; // Reset to starting money
    playerKills = 0;   // Reset kills
    playerWins = 0;    // Reset player score
    enemyWins = 0;     // Reset enemy score
    opponentWins = 0;  // Reset opponent score (for multiplayer)

    // Explicitly reset inventory and round history for the next potential match
    lastRoundWon = false; // Start fresh next time
    playerInventory.primary = null;
    playerInventory.secondary = {
        id: 'usp-s',
        name: 'USP-S',
        category: 'pistols',
        team: 'CT',
        price: 200,
        damage: 35,
        headshotMultiplier: 2.0,
        armorPenetration: 50.5,
        fireRate: 352,
        magSize: 12,
        reserve: 24
    };
    currentWeaponType = 'pistol';

    // Update HUD to reflect reset stats
    updateHUD();
}

function updateHUD() {
    // Health
    const healthEl = document.getElementById('health');
    if (healthEl) healthEl.textContent = `HP: ${Math.max(0, Math.floor(health))} `;

    // Money
    const moneyEl = document.getElementById('money-display');
    if (moneyEl) moneyEl.textContent = `$${playerMoney} `;

    // MATA
    const mataEl = document.getElementById('mata-display');
    if (mataEl) mataEl.textContent = `MATA: ${playerMata} `;

    // Lobby MATA
    const lobbyMataEl = document.getElementById('lobby-mata-display');
    if (lobbyMataEl) lobbyMataEl.textContent = `MATA: ${playerMata} `;

    // Armor
    const armorEl = document.getElementById('armor');
    if (armorEl) armorEl.textContent = `AP: ${playerInventory.equipment.armor} `;
    const helmetIcon = document.getElementById('helmet-icon');
    if (helmetIcon) helmetIcon.style.display = playerInventory.equipment.helmet ? 'inline' : 'none';

    // Kills
    const killsEl = document.getElementById('kills-display');
    if (killsEl) killsEl.textContent = `KILLS: ${playerKills} `;

    // Ammo
    const ammoEl = document.getElementById('ammo-display');
    const ammoMsg = (currentWeaponType !== 'knife' && weaponAmmo[currentWeaponType]) ?
        `${weaponAmmo[currentWeaponType].mag} / ${weaponAmmo[currentWeaponType].reserve}` : (currentWeaponType === 'knife' ? "KNIFE" : "--");
    if (ammoEl) ammoEl.textContent = ammoMsg;

    // savePlayerData(); // REMOVED: Saving and storage access should be event-driven, not per-frame/pulse
}

function reload() {
    if (isReloading || currentWeaponType === 'knife') return;
    const ammo = weaponAmmo[currentWeaponType];
    const config = weaponConfigs[currentWeaponType];

    if (ammo.mag === config.magSize || ammo.reserve <= 0) return;

    isReloading = true;
    playSound('reload', 0.6); // Play Reload Sound <!-- id: 34 -->
    ammoDisplay.textContent = "RELOADING...";

    // Weapon Animation (Simple visual feedback)
    if (weapon) {
        weapon.rotation.x = -0.5;
        weapon.position.y = -2.5;
    }

    setTimeout(() => {
        const needed = config.magSize - ammo.mag;
        const toLoad = Math.min(needed, ammo.reserve);
        ammo.mag += toLoad;
        ammo.reserve -= toLoad;
        isReloading = false;
        updateHUD();
    }, 2000); // 2 second reload
}

function animate() {
    requestAnimationFrame(animate);

    if (isGameOver) return;

    const time = performance.now();
    let delta = (time - prevTime) / 1000;
    prevTime = time; // Update immediately for accuracy

    // --- FIX: Cap Delta to prevent physics explosions ---
    // If lag occurs (delta > 0.1s), we clap it to 0.1s (10FPS min)
    // This prevents the player from falling through floors or flying away due to huge gravity steps.
    if (delta > 0.1) {
        delta = 0.1;
    }

    // Networking: Send state to peer
    if (networkReady && time - syncTimer > SYNC_RATE) {
        sendUpdate();
        syncTimer = time;
    }

    // --- In-Game Logic Check ---
    // --- In-Game Logic Check ---
    // Optimized: Use CACHED booleans instead of DOM style checks to avoid per-frame lag
    const isPlaying = roundActive && !isGameOver && health > 0;

    if (isPlaying) {

        // --- Movement Logic ---
        // Disable movement and rotation for dead players or game over
        // Disable movement and rotation for dead players, game over, or during Buy Phase
        if (health <= 0 || isGameOver) {
            velocity.x = 0;
            velocity.z = 0;
            velocity.y = 0; // Fix: Stop floating to sky on death
            direction.set(0, 0, 0);
        } else {
            // Only update movement if alive
            const isKnife = currentWeaponType === 'knife';
            const isAdmin = localStorage.getItem('currentUser') === 'Admin';

            const friction = (canJump || !isKnife || !isAdmin) ? 10.0 : 0.2; // Bhop friction ONLY for Admin
            velocity.x -= velocity.x * friction * delta;
            velocity.z -= velocity.z * friction * delta;
            velocity.y -= 9.8 * 30.0 * delta; // REDUCED gravity for stability

            direction.z = (Number(moveForward) - Number(moveBackward));
            direction.x = (Number(moveRight) - Number(moveLeft));
            direction.normalize();

            if (moveForward || moveBackward) {
                const accel = isCrouching ? 150.0 : 400.0;
                const airMultiplier = canJump ? 1.0 : (isKnife && isAdmin ? 0.5 : 0.1); // Better air control ONLY for Admin
                velocity.z -= direction.z * accel * airMultiplier * delta;
            }
            if (moveLeft || moveRight) {
                const accel = isCrouching ? 150.0 : 400.0;
                const airMultiplier = canJump ? 1.0 : (isKnife && isAdmin ? 0.7 : 0.1); // Better air control ONLY for Admin
                velocity.x -= direction.x * accel * airMultiplier * delta;
            }

            // Auto-Jump (BHOP Logic)
            if (spacePressed && canJump) {
                velocity.y += 110; // Adjusted for lower gravity
                canJump = false;

                // Speed boost logic
                const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
                if (speed > 10) {
                    // Optimized: Only check name once every 1 second
                    if (!this._pNameCache || time - this._lastCacheTime > 1000) {
                        this._pNameCache = document.getElementById('player-name').textContent;
                        this._lastCacheTime = time;
                    }
                    const isSuperAdmin = (this._pNameCache === 'admin');

                    // Admin gets 10% boost, others get 2% boost
                    const multiplier = isSuperAdmin ? 1.10 : 1.02;

                    velocity.x *= multiplier;
                    velocity.z *= multiplier;
                }
            }
        }

        const currentTargetHeight = isCrouching ? PLAYER_CROUCH_HEIGHT : PLAYER_STAND_HEIGHT;

        const lerpSpeed = 10 * delta;
        const playerObj = controls.getObject();
        const STEP_HEIGHT = 2.5;

        // 1. Sliding Collision Logic (Separate X and Z)
        const oldPosX = playerObj.position.x;
        const oldPosZ = playerObj.position.z;
        const feetY = playerObj.position.y - currentTargetHeight;

        // Try movement in X
        playerObj.position.x += -velocity.x * delta;
        let xBlocked = false;
        let playerBoxX = new THREE.Box3().setFromCenterAndSize(
            playerObj.position.clone().setY(playerObj.position.y - (currentTargetHeight / 2) + 0.1),
            new THREE.Vector3(PLAYER_RADIUS * 2, currentTargetHeight - 0.2, PLAYER_RADIUS * 2)
        );

        for (let i = 0; i < objectBoxes.length; i++) {
            const box = objectBoxes[i];

            // --- OPTIMIZATION: Distance-based Pruning ---
            // Direct coordinate check for performance (skip boxes > 60 units away)
            const dx = box.min.x + (box.max.x - box.min.x) / 2 - playerObj.position.x;
            const dz = box.min.z + (box.max.z - box.min.z) / 2 - playerObj.position.z;
            if (Math.abs(dx) > 60 || Math.abs(dz) > 60) continue;

            if (playerBoxX.intersectsBox(box)) {
                if (box.max.y <= feetY + STEP_HEIGHT) continue;
                xBlocked = true;
                break;
            }
        }
        if (xBlocked) {
            playerObj.position.x = oldPosX;
            velocity.x = 0;
        }

        // Try movement in Z
        playerObj.position.z += -velocity.z * delta;
        let zBlocked = false;
        let playerBoxZ = new THREE.Box3().setFromCenterAndSize(
            playerObj.position.clone().setY(playerObj.position.y - (currentTargetHeight / 2) + 0.1),
            new THREE.Vector3(PLAYER_RADIUS * 2, currentTargetHeight - 0.2, PLAYER_RADIUS * 2)
        );

        for (let i = 0; i < objectBoxes.length; i++) {
            const box = objectBoxes[i];

            // --- OPTIMIZATION: Distance-based Pruning ---
            const dx = box.min.x + (box.max.x - box.min.x) / 2 - playerObj.position.x;
            const dz = box.min.z + (box.max.z - box.min.z) / 2 - playerObj.position.z;
            if (Math.abs(dx) > 60 || Math.abs(dz) > 60) continue;

            if (playerBoxZ.intersectsBox(box)) {
                if (box.max.y <= feetY + STEP_HEIGHT) continue;
                zBlocked = true;
                break;
            }
        }
        if (zBlocked) {
            playerObj.position.z = oldPosZ;
            velocity.z = 0;
        }

        // 2. Vertical Movement & Collision
        const yBefore = playerObj.position.y;
        playerObj.position.y += (velocity.y * delta);
        const yAfter = playerObj.position.y;

        // Crouch height lerp (smooth transition)
        // If standing on ground, we can lerp. If in air, we lerp too.
        // We use a separate target to avoid jitter during collision math.

        // Robust vertical check: check the volume covered by the move
        const yMin = Math.min(yBefore, yAfter) - currentTargetHeight;
        const yMax = Math.max(yBefore, yAfter);
        const verticalSpanBox = new THREE.Box3(
            new THREE.Vector3(playerObj.position.x - PLAYER_RADIUS, yMin, playerObj.position.z - PLAYER_RADIUS),
            new THREE.Vector3(playerObj.position.x + PLAYER_RADIUS, yMax, playerObj.position.z + PLAYER_RADIUS)
        );

        let landed = false;
        for (let i = 0; i < objectBoxes.length; i++) {
            const box = objectBoxes[i];

            // --- OPTIMIZATION: Distance-based Pruning ---
            const dx = box.min.x + (box.max.x - box.min.x) / 2 - playerObj.position.x;
            const dz = box.min.z + (box.max.z - box.min.z) / 2 - playerObj.position.z;
            if (Math.abs(dx) > 60 || Math.abs(dz) > 60) continue;

            if (verticalSpanBox.intersectsBox(box)) {
                if (velocity.y <= 0) {
                    const currentFeetY = yBefore - currentTargetHeight;
                    if (currentFeetY >= box.max.y - STEP_HEIGHT) {
                        velocity.y = 0;
                        playerObj.position.y = box.max.y + currentTargetHeight;
                        canJump = true;
                        landed = true;
                        break;
                    }
                } else if (velocity.y > 0) {
                    // Jumping: Check if we hit the bottom
                    if (yBefore <= box.min.y + 1.0) {
                        velocity.y = 0;
                        playerObj.position.y = box.min.y - 0.1;
                        break;
                    }
                }
            }
        }

        // Floor collision fallback
        if (!landed && playerObj.position.y < currentTargetHeight) {
            velocity.y = 0;
            playerObj.position.y = THREE.MathUtils.lerp(playerObj.position.y, currentTargetHeight, lerpSpeed);
            if (playerObj.position.y < currentTargetHeight + 0.1) {
                playerObj.position.y = currentTargetHeight;
            }
            canJump = true;

            // Footstep Sound Logic <!-- id: 34 -->
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
            if (speed > 10 && !isCrouching) {
                if (time > footstepTimer) {
                    playSound('footstep', 0.15, 0.8 + Math.random() * 0.4);
                    footstepTimer = time + FOOTSTEP_INTERVAL;
                }
            }
        } else if (!landed && !isCrouching && playerObj.position.y < PLAYER_STAND_HEIGHT) {
            // Smoothing when standing up from crouch
            playerObj.position.y = THREE.MathUtils.lerp(playerObj.position.y, PLAYER_STAND_HEIGHT, lerpSpeed);
        }

        updateEnemies(delta);

        // Update HUD & Pickup Hint <!-- id: 33 -->
        if (time - lastHUDUpdate > 100) {
            updateHUD();
            checkWeaponPickup(); // Just trigger hint update
            lastHUDUpdate = time;

            // Update Visual Input Debugger
            const debugDiv = document.getElementById('input-debug');
            if (debugDiv) {
                const keys = [];
                if (moveForward) keys.push('W');
                if (moveBackward) keys.push('S');
                if (moveLeft) keys.push('A');
                if (moveRight) keys.push('D');
                if (spacePressed) keys.push('SPACE');
                const p = playerObj.position;
                debugDiv.innerHTML = `KEYS: [${keys.join(',')}] | ROUND: ${roundActive} | POS: ${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
            }
        }

    }

    // Weapon Recoil & Animation Logic
    if (weapon) {
        // VIEW BOBBING & SWAY
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        const isMoving = speed > 0.1 && canJump;

        if (isMoving) {
            const bob = Math.sin(time * 0.01) * 0.15;
            const sway = Math.cos(time * 0.005) * 0.1;
            weapon.position.y += bob * 0.3;
            weapon.position.x += sway * 0.5;
            // camera.position.y += bob * 0.1; // REMOVED: Moving camera base position caused jump glitch

            // Side tilt while moving
            weapon.rotation.z = THREE.MathUtils.lerp(weapon.rotation.z, (Number(moveLeft) - Number(moveRight)) * 0.1, 5 * delta);
        } else {
            weapon.rotation.z = THREE.MathUtils.lerp(weapon.rotation.z, 0, 5 * delta);
        }

        // Recoil Reset Logic: reset spray if 1.5 seconds idle
        if (time - lastShotTime > 1500) {
            recoilCounter = 0;
        }

        if (isReloading) {
            // RELOAD ANIMATION (Enhanced)
            weapon.position.y = THREE.MathUtils.lerp(weapon.position.y, -3.5, 5 * delta);
            weapon.rotation.x = THREE.MathUtils.lerp(weapon.rotation.x, -0.8, 5 * delta);
            weapon.rotation.z = THREE.MathUtils.lerp(weapon.rotation.z, 0.5, 5 * delta);
        }
        else if (inspectTimer > 0) {
            // INSPECT ANIMATION
            inspectTimer -= delta;
            if (inspectTimer < 0) inspectTimer = 0;

            // Normalized Progress: 0 (start) -> 1 (mid) -> 0 (end)? 
            // Better: 0 to 1 based on remaining time.
            const t = 1.0 - (inspectTimer / INSPECT_DURATION);

            // Animation Curve: 
            // 0.0 - 0.2: Rotate to side
            // 0.2 - 0.8: Hold
            // 0.8 - 1.0: Return

            let targetRotY = 0;
            let targetRotZ = 0;
            let targetRotX = 0;
            let targetPosX = 1.2;

            if (t < 0.2) {
                // Entry
                const p = t / 0.2; // 0 to 1
                targetRotY = THREE.MathUtils.lerp(0, 0.5, p); // Turn side 45 deg
                targetRotZ = THREE.MathUtils.lerp(0, 0.5, p); // Tilt 45 deg
                targetRotX = THREE.MathUtils.lerp(0, 0.2, p); // Slight lift
                targetPosX = THREE.MathUtils.lerp(1.2, 0.8, p); // Move center
            } else if (t < 0.8) {
                // Hold
                targetRotY = 0.5 + Math.sin((t - 0.2) * 5) * 0.1; // Wiggle
                targetRotZ = 0.5 + Math.cos((t - 0.2) * 5) * 0.05;
                targetRotX = 0.2;
                targetPosX = 0.8;
            } else {
                // Exit
                const p = (t - 0.8) / 0.2; // 0 to 1
                targetRotY = THREE.MathUtils.lerp(0.5 + Math.sin((0.6) * 5) * 0.1, 0, p);
                targetRotZ = THREE.MathUtils.lerp(0.5 + Math.cos((0.6) * 5) * 0.05, 0, p);
                targetRotX = THREE.MathUtils.lerp(0.2, 0, p);
                targetPosX = THREE.MathUtils.lerp(0.8, 1.2, p);
            }

            // Apply directly or lerp? Direct is fine for calculated curve
            // But we need to account for existing rotation/pos if switching from recoil
            // Let's force set for now, as inspect overrides idle

            // However, we must respect the base Y/Z pos from recoil recovery logic if we want smooth transitions?
            // Actually, let's override recoil recovery.

            weapon.rotation.set(targetRotX, targetRotY, targetRotZ);
            // Keep Y and Z steady, modify X
            weapon.position.set(targetPosX, -1.8, -2.5);

        } else {
            // IDLE / RECOIL RECOVERY (Default Layout)
            // Lerp back to original position (-2.5) and rotation (0)
            weapon.position.z = THREE.MathUtils.lerp(weapon.position.z, -2.5, 10 * delta); // Recoil Z
            weapon.position.y = THREE.MathUtils.lerp(weapon.position.y, -1.8, 5 * delta); // Equip Y (-1.8 default)
            weapon.rotation.x = THREE.MathUtils.lerp(weapon.rotation.x, 0, 10 * delta); // Recoil/Equip Rotation X
            weapon.rotation.y = THREE.MathUtils.lerp(weapon.rotation.y, 0, 10 * delta);
            weapon.rotation.z = THREE.MathUtils.lerp(weapon.rotation.z, 0, 10 * delta);
            weapon.position.x = THREE.MathUtils.lerp(weapon.position.x, 1.2, 10 * delta);

            // Butterfly knife idle animation
            if (currentWeaponType === 'knife' && weapon.userData.butterflyHandles) {
                const handles = weapon.userData.butterflyHandles;
                const idleSpeed = 0.002;
                const idleAngle = Math.sin(time * idleSpeed) * 0.3; // Gentle opening/closing
                handles.handle1.rotation.x = idleAngle;
                handles.handle2.rotation.x = -idleAngle;
            }
        }
    }

    // prevTime = time; // MOVED TO START

    // Weapon Auto-Fire Logic
    if (isFiring && currentWeaponType === 'primary') {
        shoot();
    }

    // Death Animations & Interpolation
    for (const id in remotePlayers) {
        const rp = remotePlayers[id];

        // --- ADDED: Interpolation (Lerp) for smooth movement ---
        if (rp.userData.targetPos) {
            rp.position.lerp(rp.userData.targetPos, 0.2);
        }
        if (rp.userData.targetRotY !== undefined) {
            // Smoothly rotate toward target
            let diff = rp.userData.targetRotY - rp.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            rp.rotation.y += diff * 0.2;
        }

        if (rp.userData.isDead && rp.userData.deathRotate < Math.PI / 2) {
            const step = 5 * delta;
            rp.rotation.x += step;
            rp.userData.deathRotate += step;
            rp.position.y = Math.max(1, rp.position.y - 5 * delta);
        }
    }
    enemies.forEach(e => {
        if (e.userData.isDead && e.userData.deathRotate < Math.PI / 2) {
            const step = 5 * delta;
            e.rotation.x += step;
            e.userData.deathRotate += step;
            e.position.y = Math.max(1, e.position.y - 5 * delta);
        }
    });

    // RESTORED: Update bullets every frame <!-- id: 13 -->
    updateBullets();
    updateEnemyBullets();

    // DEBUG: Visual indicator for pointer lock status (Optimized)
    if (crosshair) {
        if (document.pointerLockElement === renderer.domElement) {
            crosshair.style.color = '#00ff00'; // Green if pointer lock is active
        } else {
            crosshair.style.color = '#ff0000'; // Red if pointer lock is NOT active
        }
    }

    renderer.render(scene, camera);
}
init();
animate();

// --- Multiplayer Implementation ---

function startMatchmaking(mode) {
    currentMode = mode;
    modeDisplay.textContent = mode;
    modeModal.classList.remove('active');

    if (mode === '1vBot') {
        lobbyUI.style.display = 'none';
        networkReady = false;
        controls.lock();
        startRound();
        return;
    }

    const modeMap = {
        '1v1': 2,
        '2v2': 4,
        '3v3': 6
    };

    requiredPlayers = modeMap[mode] || 2;
    requiredCountDisplay.textContent = requiredPlayers;
    foundCountDisplay.textContent = '1';
    matchmakingStatus.textContent = 'Initializing...';
    matchmakingModal.classList.add('active');

    initMultiplayer(mode);
}

function initMultiplayer(mode) {
    const roomName = `FPS_MATCH_ROOM_${mode.toUpperCase()}`;

    // Clear existing connections if any
    allConns.forEach(c => c.close());
    allConns = [];
    if (peer) peer.destroy();

    // Google STUN servers for NAT traversal
    const config = {
        'iceServers': [
            { 'urls': 'stun:stun.l.google.com:19302' },
            { 'urls': 'stun:stun1.l.google.com:19302' },
            { 'urls': 'stun:stun2.l.google.com:19302' },
        ],
        'debug': 1
    };

    matchmakingStatus.textContent = 'Searching for room...';

    // Attempt to be the host of the room
    peer = new Peer(roomName, config);

    peer.on('open', (id) => {
        myId = id;
        myTeamId = 0; // Host is Team 1
        console.log('Acting as Host in room: ' + id);
        matchmakingStatus.textContent = "Waiting for players...";
        isHost = true;
        updateMatchmakingUI();
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'unavailable-id') {
            console.log('Room occupied, joining as client...');
            if (peer) peer.destroy();

            peer = new Peer(config);
            peer.on('open', (id) => {
                myId = id;
                const connection = peer.connect(roomName, { reliable: true });
                allConns.push(connection);
                setupConnection(connection);
                isHost = false;
                matchmakingStatus.textContent = "Joining match...";
            });
        } else {
            matchmakingStatus.textContent = "Error: " + err.type;
        }
    });

    peer.on('connection', (connection) => {
        if (allConns.length + 1 >= requiredPlayers) {
            console.log('Match full, ignoring connection.');
            connection.close();
            return;
        }
        allConns.push(connection);
        setupConnection(connection);
        updateMatchmakingUI();
        console.log('A player joined the match!');
    });

    peer.on('disconnected', () => {
        console.log('Peer disconnected from server.');
        peer.reconnect();
    });
}

function updateMatchmakingUI() {
    currentPlayers = allConns.length + 1;
    foundCountDisplay.textContent = currentPlayers;

    if (currentPlayers >= requiredPlayers) {
        matchmakingStatus.textContent = "MATCH FOUND!";

        // Hide matchmaking modal and show team selection
        setTimeout(() => {
            matchmakingModal.classList.remove('active');

            // Show team selection for players to choose their team
            teamSelectionModal.classList.add('active');
        }, 1500);
    }
}


function updatePlayerCountUI() {
    const pCountDisplay = document.getElementById('player-count');
    if (pCountDisplay) {
        pCountDisplay.textContent = (allConns.length + 1) + "/4";
    }
}

function setupConnection(connection) {
    const lobbyStatus = document.getElementById('lobby-status');
    const lobby = document.getElementById('lobby');
    const bulb = document.getElementById('connection-bulb');


    // Initialize player with default starter pistol (USP-S)
    playerInventory.secondary = {
        id: 'usp-s',
        name: 'USP-S',
        category: 'pistols',
        team: 'CT',
        price: 200,
        damage: 35,
        headshotMultiplier: 2.0,
        armorPenetration: 50.5,
        fireRate: 352,
        magSize: 12,
        reserve: 24
    };

    connection.on('open', () => {
        networkReady = true;
        matchmakingStatus.textContent = "CONNECTED!";

        // Team assignment logic (Host assigns teams)
        if (isHost) {
            const idx = allConns.indexOf(connection);
            const team = (idx % 2 === 0) ? 1 : 0;
            playerTeams[connection.peer] = team;

            broadcast({
                type: 'init-team',
                assignments: playerTeams,
                hostTeam: myTeamId
            });
        }

        // Remove bots for multiplayer mode
        for (const e of enemies) scene.remove(e);
        enemies.length = 0;

        updateMatchmakingUI();
    });

    connection.on('data', (data) => {
        if (data.type === 'heartbeat') return;

        // Handle local update
        handleServerData(data, connection.peer);

        // Host relays data to other clients
        if (isHost) {
            allConns.forEach(c => {
                if (c.peer !== connection.peer && c.open) {
                    c.send(data);
                }
            });
        }
    });

    connection.on('close', () => {
        const idx = allConns.indexOf(connection);
        if (idx > -1) allConns.splice(idx, 1);

        const peerId = connection.peer;
        console.log(`Player ${peerId} left.`);

        if (remotePlayers[peerId]) {
            scene.remove(remotePlayers[peerId]);
            delete remotePlayers[peerId];
        }
        delete playerTeams[peerId];

        updatePlayerCountUI();
        networkReady = allConns.length > 0;

        // Host: Notify others
        if (isHost) {
            broadcast({ type: 'player-left', leftId: peerId });
        }
    });
}

function broadcast(data) {
    allConns.forEach(c => {
        if (c.open) c.send(data);
    });
}

function handleServerData(data, senderPeerId) {
    if (data.type === 'init-team') {
        playerTeams = data.assignments;
        myTeamId = isHost ? 0 : (playerTeams[myId] !== undefined ? playerTeams[myId] : 1);
    } else if (data.type === 'move') {
        const rp = remotePlayers[senderPeerId];
        if (!rp) {
            createRemotePlayer(senderPeerId);
            return; // Skip this move update while creating
        }
        if (rp) {
            // Optimistic Client-Side Update: Store target position for interpolation
            rp.userData.targetPos = new THREE.Vector3(data.pos.x, data.pos.y, data.pos.z);
            rp.userData.targetRotY = data.rotY;

            // Update Visible Weapon
            if (data.weapon) {
                setThirdPersonWeapon(rp, data.weapon);
            }
        }
    } else if (data.type === 'shoot') {
        createOpponentBullet(data.pos, data.dir, senderPeerId);
    } else if (data.type === 'hit') {
        if (data.targetId === myId) {
            takeDamage(data.damage);
        }
    } else if (data.type === 'round-ended') {
        // If our team won according to the message, and we haven't ended yet
        if (data.winnerTeam === myTeamId && roundActive) {
            endRound(true);
        } else if (data.winnerTeam !== myTeamId && roundActive) {
            endRound(false);
        }
    } else if (data.type === 'player-dead') {
        const rp = remotePlayers[data.deadId];
        if (rp) {
            rp.userData.isDead = true;
            setTimeout(() => scene.remove(rp), 3000);

            // Re-check wipe on death message
            if (checkTeamWipe(playerTeams[data.deadId])) {
                if (playerTeams[data.deadId] !== myTeamId) {
                    endRound(true);
                } else {
                    // Our team might be wiped, check if we (local) are dead
                    if (health <= 0) endRound(false);
                }
            }
        }
    }
}

function checkTeamWipe(teamId) {
    // Check local player first
    if (myTeamId === teamId && health > 0) return false;

    // Check remote players
    for (const id in remotePlayers) {
        if (playerTeams[id] === teamId && !remotePlayers[id].userData.isDead) {
            return false;
        }
    }

    // Check bots
    for (const enemy of enemies) {
        // Bots are always team 1 (enemies) for now
        if (teamId === 1 && !enemy.userData.isDead) return false;
    }

    return true;
}

// --- Third Person Weapon Logic ---
function createThirdPersonWeapon(type) {
    const group = new THREE.Group();

    // Materials
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 }); // Wood
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.5 }); // Dark Metal
    const gunMetalMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.7 }); // Lighter Metal
    const polymerMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }); // Black Polymer
    const scopeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 }); // Scope Body
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.0, metalness: 1.0 }); // Lens

    if (type === 'ak47' || type === 'galil') {
        // AK-47 Style (Wood & Metal)
        const bodyGeo = new THREE.BoxGeometry(0.12, 0.18, 0.9);
        const body = new THREE.Mesh(bodyGeo, metalMat);
        group.add(body);

        // Wooden Handguard
        const handguardGeo = new THREE.BoxGeometry(0.13, 0.16, 0.6);
        const handguard = new THREE.Mesh(handguardGeo, woodMat);
        handguard.position.set(0, 0, -0.7);
        group.add(handguard);

        // Wooden Stock
        const stockGeo = new THREE.BoxGeometry(0.12, 0.22, 0.5);
        const stock = new THREE.Mesh(stockGeo, woodMat);
        stock.position.set(0, -0.05, 0.6);
        stock.rotation.x = 0.1;
        group.add(stock);

        // Curved Magazine (Simulated with rotation)
        const magGeo = new THREE.BoxGeometry(0.08, 0.4, 0.2);
        const mag = new THREE.Mesh(magGeo, (type === 'ak47' && Math.random() > 0.5) ? polymerMat : metalMat); // Randomize mag type? Or just metal.
        mag.position.set(0, -0.25, 0.1);
        mag.rotation.x = 0.3;
        group.add(mag);

        // Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, metalMat);
        barrel.position.set(0, 0.1, -1.0);
        group.add(barrel);

        // EXTRA DETAIL: Charging Handle
        const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
        handleGeo.rotateZ(Math.PI / 2);
        const handle = new THREE.Mesh(handleGeo, metalMat);
        handle.position.set(0.08, 0.1, -0.2);
        group.add(handle);

        // Fire Selector
        const selectorGeo = new THREE.BoxGeometry(0.01, 0.05, 0.15);
        const selector = new THREE.Mesh(selectorGeo, metalMat);
        selector.position.set(0.06, 0.05, 0.1);
        group.add(selector);

        // Front Sight
        const sightGeo = new THREE.BoxGeometry(0.02, 0.1, 0.05);
        const sight = new THREE.Mesh(sightGeo, metalMat);
        sight.position.set(0, 0.15, -1.3);
        group.add(sight);

        group.position.set(0, -0.3, 0.2);

    } else if (type === 'm4a4' || type === 'm4a1-s' || type === 'famas' || type === 'aug' || type === 'sg-553') {
        // M4 Style (Black Polymer)
        const isSilenced = (type === 'm4a1-s');

        const bodyGeo = new THREE.BoxGeometry(0.12, 0.18, 0.8);
        const body = new THREE.Mesh(bodyGeo, polymerMat);
        group.add(body);

        // EXTRA DETAIL: Ejection Port
        const portGeo = new THREE.BoxGeometry(0.01, 0.08, 0.2);
        const port = new THREE.Mesh(portGeo, gunMetalMat);
        port.position.set(0.06, 0.05, -0.1);
        group.add(port);

        // Handguard (Rail system look)
        const handguardGeo = new THREE.BoxGeometry(0.13, 0.16, 0.7);
        const handguard = new THREE.Mesh(handguardGeo, polymerMat);
        handguard.position.set(0, 0, -0.7);
        group.add(handguard);

        // Stock (Tactical)
        const stockGeo = new THREE.BoxGeometry(0.14, 0.2, 0.6); // Slightly wider stock
        const stock = new THREE.Mesh(stockGeo, polymerMat);
        stock.position.set(0, -0.05, 0.6);
        group.add(stock);

        // Magazine (Straight)
        const magGeo = new THREE.BoxGeometry(0.08, 0.35, 0.15);
        const mag = new THREE.Mesh(magGeo, gunMetalMat);
        mag.position.set(0, -0.25, 0.0);
        group.add(mag);

        // Barrel
        const barrelLen = isSilenced ? 1.0 : 0.6;
        const barrelGeo = new THREE.CylinderGeometry(0.035, 0.035, barrelLen, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, metalMat);
        barrel.position.set(0, 0.1, -0.9 - (barrelLen / 2));
        group.add(barrel);

        // Silencer?
        if (isSilenced) {
            const silGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8);
            silGeo.rotateX(Math.PI / 2);
            const silencer = new THREE.Mesh(silGeo, metalMat);
            silencer.position.set(0, 0.1, -1.6);
            group.add(silencer);
        }

        // Scope/Carry Handle
        if (type === 'aug' || type === 'sg-553') {
            // Scope
            const scopeGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.4, 8);
            scopeGeo.rotateX(Math.PI / 2);
            const scope = new THREE.Mesh(scopeGeo, scopeMat);
            scope.position.set(0, 0.22, -0.1);
            group.add(scope);
        } else {
            // Carry Handle / Iron Sight
            const sightGeo = new THREE.BoxGeometry(0.04, 0.08, 0.04);
            const sight = new THREE.Mesh(sightGeo, metalMat);
            sight.position.set(0, 0.2, -1.0);
            group.add(sight);
        }

        group.position.set(0, -0.3, 0.2);

    } else if (type === 'awp' || type === 'ssg-08' || type === 'g3sg1' || type === 'scar-20') {
        // Sniper Rifle (Long, Scope)
        const isGreen = (type === 'awp');
        const skinMat = isGreen ? new THREE.MeshStandardMaterial({ color: 0x224422, roughness: 0.8 }) : woodMat; // Green for AWP

        const bodyGeo = new THREE.BoxGeometry(0.14, 0.2, 1.0);
        const body = new THREE.Mesh(bodyGeo, skinMat);
        group.add(body);

        // EXTRA DETAIL (Sync): Bolt Handle
        const isBolt = (type === 'awp' || type === 'ssg-08');
        if (isBolt) {
            const boltHandleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8);
            boltHandleGeo.rotateZ(Math.PI / 2);
            const bolt = new THREE.Mesh(boltHandleGeo, metalMat);
            bolt.position.set(0.1, 0.1, 0.1);
            group.add(bolt);

            const knobGeo = new THREE.SphereGeometry(0.025, 8, 8);
            const knob = new THREE.Mesh(knobGeo, metalMat);
            knob.position.set(0.18, 0.1, 0.1);
            group.add(knob);
        }

        // Long Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, metalMat);
        barrel.position.set(0, 0.1, -1.3);
        group.add(barrel);

        // Muzzle Brake
        const brakeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.15);
        const brake = new THREE.Mesh(brakeGeo, metalMat);
        brake.position.set(0, 0.1, -2.2);
        group.add(brake);

        // Stock with Thumbhole
        const stockGeo = new THREE.BoxGeometry(0.14, 0.25, 0.7);
        const stock = new THREE.Mesh(stockGeo, skinMat);
        stock.position.set(0, -0.05, 0.7);
        group.add(stock);

        // Large Scope
        const scopeGroup = new THREE.Group();
        const scopeBodyGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.6, 12);
        scopeBodyGeo.rotateX(Math.PI / 2);
        const scopeBody = new THREE.Mesh(scopeBodyGeo, scopeMat);
        scopeGroup.add(scopeBody);

        const lens1 = new THREE.Mesh(new THREE.CircleGeometry(0.065, 12), lensMat);
        lens1.position.set(0, 0, 0.31);
        scopeGroup.add(lens1);

        const lens2 = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12), lensMat);
        lens2.position.set(0, 0, -0.31);
        lens2.rotation.y = Math.PI;
        scopeGroup.add(lens2);

        scopeGroup.position.set(0, 0.3, 0.1);
        group.add(scopeGroup);

        group.position.set(0, -0.3, 0.2);

    } else if (type === 'knife') {
        const bladeGeo = new THREE.BoxGeometry(0.04, 0.12, 0.7);
        const blade = new THREE.Mesh(bladeGeo, new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 })); // Shiny Blade
        blade.position.set(0, 0, -0.4);
        blade.rotation.x = Math.PI / 2;
        group.add(blade);

        const handleGeo = new THREE.BoxGeometry(0.06, 0.08, 0.3);
        const handle = new THREE.Mesh(handleGeo, polymerMat);
        handle.position.set(0, 0, 0.15);
        group.add(handle);

        // EXTRA DETAIL (Sync): Rivets
        const rivetGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.07, 8);
        rivetGeo.rotateZ(Math.PI / 2);
        const rivet = new THREE.Mesh(rivetGeo, metalMat);
        rivet.position.set(0, 0, 0.1);
        group.add(rivet);

        group.rotation.x = -Math.PI / 3; // Point forward/down ready to stab
        group.rotation.y = -Math.PI / 2; // Flat edge out
        group.position.set(0.2, -0.2, 0.4);

    } else if (type === 'grenade') {
        const nadeGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const nade = new THREE.Mesh(nadeGeo, new THREE.MeshStandardMaterial({ color: 0x335533, roughness: 0.5 }));
        group.add(nade);

        const pinGeo = new THREE.BoxGeometry(0.05, 0.1, 0.02);
        const pin = new THREE.Mesh(pinGeo, metalMat);
        pin.position.set(0, 0.15, 0);
        group.add(pin);

        group.position.set(0, -0.2, 0.3);

    } else {
        // Pistol (Default fallback)
        const slideGeo = new THREE.BoxGeometry(0.08, 0.12, 0.5);
        const slide = new THREE.Mesh(slideGeo, new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.4 }));
        group.add(slide);

        // EXTRA DETAIL (Sync): Slide Release
        const releaseGeo = new THREE.BoxGeometry(0.01, 0.025, 0.1);
        const release = new THREE.Mesh(releaseGeo, metalMat);
        release.position.set(0.05, 0.04, 0);
        group.add(release);

        const gripGeo = new THREE.BoxGeometry(0.09, 0.3, 0.15);
        const grip = new THREE.Mesh(gripGeo, polymerMat);
        grip.position.set(0, -0.15, 0.2);
        grip.rotation.x = 0.2;
        group.add(grip);

        group.position.set(0, -0.2, 0.3);
    }

    // Add shadow casting to all parts
    group.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return group;
}

function setThirdPersonWeapon(playerGroup, weaponType) {
    if (!playerGroup || !playerGroup.userData.weaponHolder) return;
    const holder = playerGroup.userData.weaponHolder;

    // Avoid recreating if type hasn't changed
    if (holder.userData.currentType === weaponType) return;

    holder.clear();
    holder.userData.currentType = weaponType;

    if (weaponType && weaponType !== 'none') {
        const weaponMesh = createThirdPersonWeapon(weaponType);
        holder.add(weaponMesh);
    }
}

function create3DCharacterModel(color = 0x3366ff) {
    const group = new THREE.Group();
    const isCT = (color === 0x3366ff); // Simple heuristic for now

    // Standard Scale (Smaller than before - roughly 12 units total)
    const s = 0.8;

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({ color: isCT ? 0x2e3a4e : 0x5c5c5c }); // Navy for CT, Grey for T
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const clothingMat = new THREE.MeshStandardMaterial({ color: isCT ? 0x1c2533 : 0x3d3d3d });
    const gearMat = new THREE.MeshStandardMaterial({ color: 0x111111 }); // Dark gear

    // Torso (Vaguely rounded body)
    const torsoGeo = new THREE.CylinderGeometry(1.8 * s, 1.5 * s, 6 * s, 8);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.position.y = 1.0 * s;
    group.add(torso);

    // Tactical Vest (Rounded gear)
    const vestGeo = new THREE.CylinderGeometry(2.0 * s, 1.8 * s, 4.5 * s, 8);
    const vest = new THREE.Mesh(vestGeo, gearMat);
    vest.position.y = 1.0 * s;
    group.add(vest);

    // Head (Slightly rounded)
    const headGeo = new THREE.CylinderGeometry(1.2 * s, 1.2 * s, 2.2 * s, 8);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 5.2 * s;
    group.add(head);

    // Helmet / Mask
    const helmetGeo = new THREE.CylinderGeometry(1.4 * s, 1.2 * s, 1.4 * s, 8);
    const helmet = new THREE.Mesh(helmetGeo, gearMat);
    helmet.position.y = 5.8 * s;
    group.add(helmet);

    if (isCT) {
        // SAS Visor
        const visorGeo = new THREE.CylinderGeometry(0.9 * s, 0.9 * s, 0.5 * s, 8);
        visorGeo.rotateX(Math.PI / 2);
        const visor = new THREE.Mesh(visorGeo, new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.5 }));
        visor.position.set(0, 5.2 * s, -1.0 * s);
        group.add(visor);
    } else {
        head.material = new THREE.MeshStandardMaterial({ color: 0x222222 });
    }

    // Arms (Cylindrical)
    const armGeo = new THREE.CylinderGeometry(0.5 * s, 0.5 * s, 6.0 * s, 8);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-2.2 * s, 1.2 * s, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(2.2 * s, 1.2 * s, 0);
    group.add(rightArm);

    // Weapon Holder (Attached to Right Arm)
    const weaponHolder = new THREE.Group();
    weaponHolder.position.set(0, -2.5 * s, 0.5 * s); // Near hand
    weaponHolder.rotation.x = -Math.PI / 2; // Point forward
    rightArm.add(weaponHolder);
    group.userData.weaponHolder = weaponHolder;

    // Legs (Cylindrical)
    const legGeo = new THREE.CylinderGeometry(0.7 * s, 0.6 * s, 5.5 * s, 8);
    const leftLeg = new THREE.Mesh(legGeo, clothingMat);
    leftLeg.position.set(-1.0 * s, -4.0 * s, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, clothingMat);
    rightLeg.position.set(1.0 * s, -4.0 * s, 0);
    group.add(rightLeg);

    // Boots (Slightly rounded)
    const bootGeo = new THREE.CylinderGeometry(0.9 * s, 0.9 * s, 0.8 * s, 8);
    const leftBoot = new THREE.Mesh(bootGeo, gearMat);
    leftBoot.position.set(-1.0 * s, -6.5 * s, 0.2 * s);
    group.add(leftBoot);

    const rightBoot = new THREE.Mesh(bootGeo, gearMat);
    rightBoot.position.set(1.0 * s, -6.5 * s, 0.2 * s);
    group.add(rightBoot);

    group.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    group.userData.isDead = false;
    group.userData.deathRotate = 0;

    return group;
}

function createRemotePlayer(id) {
    if (remotePlayers[id]) return;

    // Team-based colors
    const team = playerTeams[id];
    const color = (team === myTeamId) ? 0x3366ff : 0xff3333; // Blue for teammates, Red for enemies

    const mesh = create3DCharacterModel(color);
    mesh.position.set(0, 7.5, -50);
    mesh.userData.health = 100; // Initialize health for local hit tracking
    scene.add(mesh);
    remotePlayers[id] = mesh;

    // Add "coleguț" tag if on same team
    setTimeout(() => {
        const team = playerTeams[id];
        if (team === myTeamId) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#00ff00';
            ctx.font = 'Bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('coleguț', 128, 45);

            const txtTexture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: txtTexture });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.scale.set(10, 2.5, 1);
            sprite.position.y = 10;
            mesh.add(sprite);
        }
    }, 1000);
}

function sendUpdate() {
    if (!networkReady || allConns.length === 0) return;

    const data = {
        type: 'move',
        pos: {
            x: Math.round(controls.getObject().position.x * 100) / 100,
            y: Math.round(controls.getObject().position.y * 100) / 100,
            z: Math.round(controls.getObject().position.z * 100) / 100
        },
        rotY: Math.round(controls.getObject().rotation.y * 100) / 100,
        weapon: currentWeaponType // Sync current weapon
    };

    if (isHost) {
        broadcast(data);
    } else if (allConns[0] && allConns[0].open) {
        allConns[0].send(data);
    }
}


function createOpponentBullet(pos, dir, senderPeerId) {
    const bulletGeo = new THREE.SphereGeometry(0.15, 8, 8); // Standardized Size
    const bulletMat = new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff3300,
        emissiveIntensity: 2.0
    });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);
    bullet.position.copy(pos);

    // Standardized Bullet Speed (45.0 to match player)
    const velocity = new THREE.Vector3(dir.x, dir.y, dir.z).multiplyScalar(45.0);
    bullet.userData.velocity = velocity;
    scene.add(bullet);
    enemyBullets.push(bullet);
}
