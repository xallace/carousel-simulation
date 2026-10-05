/**
 * Carousel Physics Simulator - Main Application Controller
 * Manages UI Synchronization, 2D Vector Canvas, Audio, Presets & Multilingual Engine.
 */

// Global Instances
const physics = new CarouselPhysics();
let view3D = null;

// App State
const appState = {
    isPaused: false,
    timeScale: 1.0,
    lang: 'de',
    soundEnabled: true,
    theme: 'dark',
    fbdVisible: true,
    fbdMode: 'parallelogram' // 'parallelogram' | 'triangle'
};

// Procedural Audio Engine
class CarouselAudio {
    constructor() {
        this.ctx = null;
        this.motorOsc = null;
        this.motorGain = null;
        this.windGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();

            // 1. Motor Drone (Low Sawtooth + Lowpass)
            this.motorOsc = this.ctx.createOscillator();
            this.motorOsc.type = 'sawtooth';
            this.motorOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

            const motorFilter = this.ctx.createBiquadFilter();
            motorFilter.type = 'lowpass';
            motorFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

            this.motorGain = this.ctx.createGain();
            this.motorGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

            this.motorOsc.connect(motorFilter);
            motorFilter.connect(this.motorGain);
            this.motorGain.connect(this.ctx.destination);
            this.motorOsc.start();

            // 2. Wind Rush (White Noise Buffer)
            const bufferSize = this.ctx.sampleRate * 2;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const whiteNoise = this.ctx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;
            whiteNoise.loop = true;

            const windFilter = this.ctx.createBiquadFilter();
            windFilter.type = 'bandpass';
            windFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
            windFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

            this.windGain = this.ctx.createGain();
            this.windGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

            whiteNoise.connect(windFilter);
            windFilter.connect(this.windGain);
            this.windGain.connect(this.ctx.destination);
            whiteNoise.start();

            this.initialized = true;
        } catch (e) {
            console.warn('Audio Init Error:', e);
        }
    }

    update(speed, omega, isPaused) {
        if (!this.initialized || !appState.soundEnabled || isPaused) {
            if (this.motorGain && this.ctx) this.motorGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.1);
            if (this.windGain && this.ctx) this.windGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.1);
            return;
        }

        const now = this.ctx.currentTime;
        // Motor Pitch proportional to angular speed omega
        const motorFreq = 30 + Math.min(180, omega * 35);
        this.motorOsc.frequency.setTargetAtTime(motorFreq, now, 0.1);
        this.motorGain.gain.setTargetAtTime(0.04, now, 0.1);

        // Wind volume proportional to linear speed
        const windVol = Math.min(0.15, speed * 0.012);
        this.windGain.gain.setTargetAtTime(windVol, now, 0.1);
    }
}

const audio = new CarouselAudio();

// Translations Dictionary (DE / EN)
const TRANSLATIONS = {
    de: {
        app_title: "KETTENKARUSSELL & ZENTRIPETALKRAFT",
        app_subtitle: "Modellierung von Kreisbewegung, Seilspannung & rotierenden Bezugssystemen",
        frame_inertial: "Labor-System (Inertial)",
        frame_rotating: "Rotierendes System (Zentrifugal)",
        btn_theory: "Theorie",
        cam_label: "KAMERA:",
        cam_3d: "3D Orbit",
        cam_side: "Seitenansicht (2D)",
        cam_top: "Draufsicht",
        cam_rider: "Fahrgast-POV",
        btn_pause: "Pause",
        btn_play: "Start",
        btn_reset: "Reset",
        fbd_title: "📐 KRÄFTEDIAGRAMM (FREIKÖRPERBILD)",
        leg_fg: "Gewichtskraft F_g (nach unten ↓)",
        leg_fs: "Seilspannung F_S (zur Aufhängung ↖)",
        leg_fcp: "Zentripetalkraft F_Z (nach innen ←)",
        leg_fcf: "Zentrifugalkraft F_Zf (nach außen →)",
        sec_presets: "🎠 SZENARIEN & PRESETS",
        pre_classic: "Klassisch (Prater)",
        pre_wave: "Wellenflug (High-G)",
        pre_mini: "Kinderkarussell",
        pre_moon: "Mond-Schwerkraft",
        pre_jupiter: "Jupiter (Extrem-G)",
        sec_parameters: "⚙️ PARAMETER EINSTELLEN",
        param_period: "Umlaufdauer T",
        param_r0: "Aufhängungsradius r₀",
        param_length: "Seillänge L",
        param_mass: "Masse des Sitzes m",
        param_gravity: "Fallbeschleunigung g",
        sec_telemetry: "📊 ECHTZEIT-PHYSIKDATEN",
        btn_export: "📥 CSV",
        t_angle: "Auslenkwinkel α",
        t_radius: "Bahnradius r",
        t_speed: "Bahngeschwindigkeit v",
        t_omega: "Winkelgeschw. ω",
        t_acp: "Zentripetalbeschl. a_Z",
        t_fcp: "Zentripetalkraft F_Z",
        t_fcf: "Zentrifugalkraft F_Zf",
        t_fs: "Seilzugkraft F_S",
        t_fg: "Gewichtskraft F_g",
        theory_badge: "WISSENSCHAFTLICHE HERLEITUNG",
        theory_title: "Physikalische Grundlagen des Kettenkarussells",
        btn_close_theory: "Verstanden & Schließen"
    },
    en: {
        app_title: "CAROUSEL & CENTRIPETAL FORCE",
        app_subtitle: "Modeling circular motion, string tension & rotating frames of reference",
        frame_inertial: "Inertial Frame (Lab)",
        frame_rotating: "Rotating Frame (Centrifugal)",
        btn_theory: "Theory",
        cam_label: "CAMERA:",
        cam_3d: "3D Orbit",
        cam_side: "Side View (2D)",
        cam_top: "Top View",
        cam_rider: "Rider POV",
        btn_pause: "Pause",
        btn_play: "Play",
        btn_reset: "Reset",
        fbd_title: "📐 FREE-BODY FORCE DIAGRAM",
        leg_fg: "Weight Force F_g (downward ↓)",
        leg_fs: "String Tension F_S (to pivot ↖)",
        leg_fcp: "Centripetal Force F_c (inward ←)",
        leg_fcf: "Centrifugal Force F_cf (outward →)",
        sec_presets: "🎠 SCENARIOS & PRESETS",
        pre_classic: "Classic Chairoplane",
        pre_wave: "Wave Swinger (High-G)",
        pre_mini: "Kids Carousel",
        pre_moon: "Lunar Gravity",
        pre_jupiter: "Jupiter (Extreme-G)",
        sec_parameters: "⚙️ ADJUST PARAMETERS",
        param_period: "Period T",
        param_r0: "Suspension Radius r₀",
        param_length: "Chain Length L",
        param_mass: "Seat Mass m",
        param_gravity: "Gravitational Accel. g",
        sec_telemetry: "📊 REAL-TIME PHYSICS TELEMETRY",
        btn_export: "📥 CSV",
        t_angle: "Deflection Angle α",
        t_radius: "Orbital Radius r",
        t_speed: "Orbital Velocity v",
        t_omega: "Angular Velocity ω",
        t_acp: "Centripetal Accel. a_c",
        t_fcp: "Centripetal Force F_c",
        t_fcf: "Centrifugal Force F_cf",
        t_fs: "String Tension F_S",
        t_fg: "Weight Force F_g",
        theory_badge: "MATHEMATICAL FORMULATION",
        theory_title: "Physics of the Carousel (Chairoplane)",
        btn_close_theory: "Understood & Close"
    }
};

// Initialization on DOM Load
window.addEventListener('DOMContentLoaded', () => {
    view3D = new Carousel3DView('three-canvas-wrap', physics);

    // Audio unlock on user interaction
    const unlockAudio = () => {
        audio.init();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    updateUI();
    requestAnimationFrame(mainAnimationLoop);
});

// Main Animation & Physics Loop
let lastTime = performance.now();
function mainAnimationLoop(currentTime) {
    const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
    lastTime = currentTime;

    // Step physics
    physics.step(dt, appState.isPaused, appState.timeScale);

    // Render 3D Scene
    if (view3D) {
        view3D.render();
    }

    // Render 2D Free-Body Diagram
    renderFreeBodyDiagram();

    // Update Telemetry Displays
    updateTelemetryUI();

    // Update Audio
    const telem = physics.getTelemetry();
    audio.update(telem.speed, telem.omega, appState.isPaused);

    requestAnimationFrame(mainAnimationLoop);
}

/**
 * 2D Free-Body Vector Diagram Canvas
 * Provides an unambiguous, mathematically rigorous representation of all forces,
 * rotation axis context, and geometric parallelogram / force triangle constructions.
 */
function renderFreeBodyDiagram() {
    const canvas = document.getElementById('fbd-canvas');
    if (!canvas || !appState.fbdVisible) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const telem = physics.getTelemetry();
    const alpha = telem.alpha;
    const isRotating = physics.referenceFrame === 'rotating';

    // 1. Rotation Axis (Central Column on Left)
    const axisX = 35;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(axisX, 15);
    ctx.lineTo(axisX, h - 15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Axis Label
    ctx.fillStyle = '#00f2fe';
    ctx.font = '9px JetBrains Mono';
    ctx.fillText('Achse', axisX - 12, 12);

    // 2. Suspension Roof Arm at Top
    const roofY = 25;
    const pivotX = axisX + 45; // suspension pivot r0

    // Radial arm from axis to pivot
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(axisX, roofY);
    ctx.lineTo(pivotX, roofY);
    ctx.stroke();

    // Pivot Point dot
    ctx.beginPath();
    ctx.arc(pivotX, roofY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#00f2fe';
    ctx.fill();

    // r0 label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px JetBrains Mono';
    ctx.fillText('r₀', axisX + 18, roofY - 5);

    // 3. Chain & Seat Position (Mass Point)
    const chainVisualLen = 80;
    const seatX = pivotX + chainVisualLen * Math.sin(alpha);
    const seatY = roofY + chainVisualLen * Math.cos(alpha);

    // Draw Chain Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pivotX, roofY);
    ctx.lineTo(seatX, seatY);
    ctx.stroke();

    // Vertical dashed reference line from pivot downwards to show angle alpha
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pivotX, roofY);
    ctx.lineTo(pivotX, roofY + 50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Angle Arc at Pivot
    ctx.beginPath();
    ctx.arc(pivotX, roofY, 20, Math.PI / 2, Math.PI / 2 - alpha, true);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText(`α=${telem.alphaDeg.toFixed(1)}°`, pivotX + 6, roofY + 32);

    // Mass Point (Seat)
    ctx.beginPath();
    ctx.arc(seatX, seatY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4. Force Vectors Scale & Values
    const scale = Math.min(55 / Math.max(telem.Fg, telem.Fcp, 100), 0.09);
    const lenFg = telem.Fg * scale;
    const lenFnet = telem.Fcp * scale;
    const lenFS = telem.FS * scale;

    // 4A. Weight Force F_g (Green - always straight down)
    drawVector(ctx, seatX, seatY, seatX, seatY + lenFg, '#10b981', 'F_g');

    // 4B. String Tension Force F_S (Blue - always along chain towards pivot top-left)
    const fsX = seatX - lenFS * Math.sin(alpha);
    const fsY = seatY - lenFS * Math.cos(alpha);
    drawVector(ctx, seatX, seatY, fsX, fsY, '#3b82f6', 'F_S');

    // 4C. Horizontal Force: Centripetal vs Centrifugal
    if (!isRotating) {
        // INERTIAL FRAME (Labor-System):
        // Net force F_Z points INWARD towards rotation axis (LEFT ←)
        const fzX = seatX - lenFnet;
        const fzY = seatY;
        drawVector(ctx, seatX, seatY, fzX, fzY, '#ef4444', 'F_Z (Zentripetal)');

        // Parallelogram of addition: F_g + F_S = F_Z
        // Vector addition: (seatX, seatY + lenFg) -> (fzX, seatY)
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(seatX, seatY + lenFg);
        ctx.lineTo(fzX, seatY + lenFg);
        ctx.lineTo(fzX, seatY);
        ctx.stroke();

        ctx.moveTo(fsX, fsY);
        ctx.lineTo(fzX, seatY);
        ctx.stroke();
        ctx.setLineDash([]);

    } else {
        // ROTATING FRAME (Fahrgast-System):
        // Centrifugal force F_Zf points OUTWARD away from rotation axis (RIGHT →)
        const fzfX = seatX + lenFnet;
        const fzfY = seatY;
        drawVector(ctx, seatX, seatY, fzfX, fzfY, '#f59e0b', 'F_Zf (Zentrifugal)');

        // Equilibrium Parallelogram: F_g (down) + F_Zf (right) = -F_S (down-right resultant)
        // Which exactly balances F_S (up-left)!
        const resX = seatX + lenFnet;
        const resY = seatY + lenFg;

        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Box connecting F_g tip to F_Zf tip
        ctx.moveTo(seatX, seatY + lenFg);
        ctx.lineTo(resX, resY);
        ctx.lineTo(fzfX, fzfY);
        ctx.stroke();

        // Opposite balancing resultant line (dashed down-right)
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.moveTo(seatX, seatY);
        ctx.lineTo(resX, resY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawVector(ctx, x1, y1, x2, y2, color, label) {
    const headLen = 8;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.2;

    // Vector line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText(label, x2 + Math.cos(angle) * 8 - 4, y2 + Math.sin(angle) * 8 + 4);
}

// UI Synchronization
function onParamChange() {
    const T = parseFloat(document.getElementById('slider-period').value);
    const r0 = parseFloat(document.getElementById('slider-r0').value);
    const L = parseFloat(document.getElementById('slider-length').value);
    const m = parseFloat(document.getElementById('slider-mass').value);

    physics.setParams({ T, r0, L, m });
    updateUIValues();
}

function onGravitySelect() {
    const sel = document.getElementById('select-gravity').value;
    if (sel === 'custom') {
        const val = prompt('Geben Sie die Fallbeschleunigung g in m/s² ein:', '9.81');
        const g = parseFloat(val);
        if (!isNaN(g) && g > 0) {
            physics.setParams({ g });
        }
    } else {
        physics.setParams({ g: parseFloat(sel) });
    }
    updateUIValues();
}

function updateUIValues() {
    document.getElementById('val-period').innerText = `${physics.T.toFixed(2)} s`;
    document.getElementById('val-r0').innerText = `${physics.r0.toFixed(2)} m`;
    document.getElementById('val-length').innerText = `${physics.L.toFixed(2)} m`;
    document.getElementById('val-mass').innerText = `${physics.m.toFixed(1)} kg`;
    document.getElementById('val-gravity').innerText = `${physics.g.toFixed(2)} m/s²`;
}

function updateTelemetryUI() {
    const t = physics.getTelemetry();

    document.getElementById('res-alpha').innerText = `${t.alphaDeg.toFixed(2)}°`;
    document.getElementById('res-alpha-rad').innerText = `${t.alpha.toFixed(3)} rad`;
    document.getElementById('res-radius').innerText = `${t.radius.toFixed(2)} m`;
    document.getElementById('res-speed').innerText = `${t.speed.toFixed(2)} m/s`;
    document.getElementById('res-speed-kmh').innerText = `${t.speedKmh.toFixed(1)} km/h`;
    document.getElementById('res-omega').innerText = `${t.omega.toFixed(2)} rad/s`;
    document.getElementById('res-rpm').innerText = `${t.rpm.toFixed(1)} RPM`;
    document.getElementById('res-acp').innerText = `${t.acp.toFixed(2)} m/s²`;
    document.getElementById('res-gforce').innerText = `${t.gForce.toFixed(2)} g`;
    document.getElementById('res-fcp').innerText = `${Math.round(t.Fcp)} N`;
    document.getElementById('res-fs').innerText = `${Math.round(t.FS)} N`;
    document.getElementById('res-fg').innerText = `${Math.round(t.Fg)} N`;
}

function updateUI() {
    updateUIValues();
    updateTelemetryUI();
}

// Reference Frame Controller
function setReferenceFrame(frame) {
    physics.referenceFrame = frame;
    document.getElementById('btn-frame-inertial').classList.toggle('active', frame === 'inertial');
    document.getElementById('btn-frame-rotating').classList.toggle('active', frame === 'rotating');

    const isRot = frame === 'rotating';
    const netBox = document.getElementById('leg-f-net-box');
    const netLabel = document.getElementById('leg-f-net-label');

    if (isRot) {
        netBox.className = 'color-box orange';
        netLabel.innerText = TRANSLATIONS[appState.lang].leg_fcf;
    } else {
        netBox.className = 'color-box red';
        netLabel.innerText = TRANSLATIONS[appState.lang].leg_fcp;
    }
}

// Preset Scenarios
const PRESETS = {
    classic: { T: 4.0, r0: 3.0, L: 5.0, m: 80, g: 9.81 },
    wave_swinger: { T: 2.8, r0: 4.5, L: 6.0, m: 75, g: 9.81 },
    mini: { T: 6.0, r0: 1.5, L: 2.5, m: 35, g: 9.81 },
    moon: { T: 5.0, r0: 3.0, L: 5.0, m: 80, g: 1.62 },
    jupiter: { T: 3.0, r0: 3.5, L: 5.0, m: 80, g: 24.79 }
};

function loadPreset(key) {
    const p = PRESETS[key];
    if (!p) return;

    document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
    const btn = document.querySelector(`[onclick="loadPreset('${key}')"]`);
    if (btn) btn.classList.add('active');

    document.getElementById('slider-period').value = p.T;
    document.getElementById('slider-r0').value = p.r0;
    document.getElementById('slider-length').value = p.L;
    document.getElementById('slider-mass').value = p.m;
    document.getElementById('select-gravity').value = p.g.toString();

    physics.setParams(p);
    updateUIValues();
}

// Vector Visibility Toggles
function updateVectorVisibility() {
    if (!view3D) return;
    view3D.showFg = document.getElementById('chk-vec-fg').checked;
    view3D.showFS = document.getElementById('chk-vec-fs').checked;
    view3D.showFnet = document.getElementById('chk-vec-fnet').checked;
    view3D.showVel = document.getElementById('chk-vec-v').checked;
}

// Playback Controls
function togglePlay() {
    appState.isPaused = !appState.isPaused;
    const playIcon = document.getElementById('play-icon');
    const playText = document.getElementById('play-text');

    if (appState.isPaused) {
        playIcon.innerText = '▶️';
        playText.innerText = TRANSLATIONS[appState.lang].btn_play;
    } else {
        playIcon.innerText = '⏸️';
        playText.innerText = TRANSLATIONS[appState.lang].btn_pause;
    }
}

function toggleSlowMo() {
    if (appState.timeScale === 1.0) {
        appState.timeScale = 0.2;
        document.getElementById('slow-text').innerText = '0.2x';
    } else if (appState.timeScale === 0.2) {
        appState.timeScale = 0.05;
        document.getElementById('slow-text').innerText = '0.05x';
    } else {
        appState.timeScale = 1.0;
        document.getElementById('slow-text').innerText = '1.0x';
    }
}

function resetSimulation() {
    physics.rotationAngle = 0;
    physics.currentAngle = physics.targetAngle;
    physics.angularVel = 0;
}

function setCameraView(mode) {
    if (view3D) view3D.setCameraView(mode);
}

function toggleVectorDiagram() {
    const overlay = document.getElementById('vector-diagram-overlay');
    overlay.classList.toggle('hidden');
    appState.fbdVisible = !overlay.classList.contains('hidden');
}

// Modals & Tools
function toggleTheoryModal() {
    const modal = document.getElementById('theory-modal');
    modal.classList.toggle('hidden');
}

function toggleTheme() {
    const nextTheme = appState.theme === 'dark' ? 'light' : 'dark';
    appState.theme = nextTheme;
    document.documentElement.setAttribute('data-theme', nextTheme);
    if (view3D) {
        view3D.scene.background = new THREE.Color(nextTheme === 'dark' ? 0x080c16 : 0xdfe7f2);
        view3D.scene.fog.color = new THREE.Color(nextTheme === 'dark' ? 0x080c16 : 0xdfe7f2);
    }
}

function toggleSound() {
    appState.soundEnabled = !appState.soundEnabled;
    document.getElementById('btn-sound').innerText = appState.soundEnabled ? '🔊' : '🔇';
}

function toggleLanguage() {
    appState.lang = appState.lang === 'de' ? 'en' : 'de';
    document.getElementById('lang-label').innerText = appState.lang.toUpperCase();

    const dict = TRANSLATIONS[appState.lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.innerText = dict[key];
        }
    });

    setReferenceFrame(physics.referenceFrame);
}

// CSV Data Export
function exportDataCSV() {
    const t = physics.getTelemetry();
    const headers = [
        "Umlaufdauer_T_s", "Aufhaengeradius_r0_m", "Seillaenge_L_m", "Masse_m_kg", "Gravitation_g_ms2",
        "Winkel_alpha_deg", "Bahnradius_r_m", "Geschwindigkeit_v_ms", "Winkelgeschw_omega_rads",
        "Zentripetalbeschl_aZ_ms2", "Gewichtskraft_Fg_N", "Seilzugkraft_FS_N", "Zentripetalkraft_FZ_N"
    ];
    const row = [
        t.T.toFixed(2), t.r0.toFixed(2), t.L.toFixed(2), t.m.toFixed(1), t.g.toFixed(2),
        t.alphaDeg.toFixed(2), t.radius.toFixed(2), t.speed.toFixed(2), t.omega.toFixed(2),
        t.acp.toFixed(2), t.Fg.toFixed(1), t.FS.toFixed(1), t.Fcp.toFixed(1)
    ];

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + "\n" + row.join(";");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Kettenkarussell_Physik_T${t.T}s_r${t.radius.toFixed(1)}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
