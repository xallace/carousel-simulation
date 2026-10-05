/**
 * High-Performance 3D WebGL Visualization for the Kettenkarussell Simulator
 * Powered by Three.js
 */

class Carousel3DView {
    constructor(containerId, physics) {
        this.container = document.getElementById(containerId);
        this.physics = physics;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.camMode = 'orbit'; // 'orbit' | 'side' | 'top' | 'rider'

        // 3D Objects
        this.rootGroup = null;
        this.carouselGroup = null;
        this.roofMesh = null;
        this.armsGroup = null;
        this.swings = [];
        this.mainSwing = null;
        this.radiusGuide = null;
        this.r0Guide = null;

        // Force Vector Arrows
        this.vecFg = null;
        this.vecFS = null;
        this.vecFnet = null;
        this.vecVel = null;

        // Vector Visibility Settings
        this.showFg = true;
        this.showFS = true;
        this.showFnet = true;
        this.showVel = true;

        this.init();
    }

    init() {
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x080c16);
        this.scene.fog = new THREE.FogExp2(0x080c16, 0.025);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
        this.camera.position.set(14, 8, 16);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // don't go below ground
        this.controls.minDistance = 3;
        this.controls.maxDistance = 50;
        this.controls.target.set(0, 4, 0);

        // Lighting
        this.setupLights();

        // Build 3D Models
        this.buildEnvironment();
        this.buildCarousel();
        this.setupForceVectors();

        // Window resize listener
        window.addEventListener('resize', () => this.onResize());
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfff5ea, 1.2);
        dirLight.position.set(15, 25, 15);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0001;
        this.scene.add(dirLight);

        const fillLight = new THREE.PointLight(0x00f2fe, 0.8, 25);
        fillLight.position.set(-10, 8, -10);
        this.scene.add(fillLight);
    }

    buildEnvironment() {
        // Grid Floor
        const gridHelper = new THREE.GridHelper(40, 40, 0x00f2fe, 0x1e293b);
        gridHelper.position.y = 0;
        this.scene.add(gridHelper);

        // Floor Mesh for shadows
        const floorGeo = new THREE.PlaneGeometry(60, 60);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0a0f1d,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    buildCarousel() {
        this.rootGroup = new THREE.Group();
        this.scene.add(this.rootGroup);

        // Fixed Central Base
        const baseGeo = new THREE.CylinderGeometry(1.2, 1.8, 0.6, 24);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.3;
        base.receiveShadow = true;
        this.rootGroup.add(base);

        // Central Mast / Pillar
        const mastGeo = new THREE.CylinderGeometry(0.35, 0.45, 9.0, 24);
        const mastMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.y = 4.5;
        mast.castShadow = true;
        this.rootGroup.add(mast);

        // Rotating Carousel Top Assembly
        this.carouselGroup = new THREE.Group();
        this.carouselGroup.position.y = 8.5; // roof height
        this.rootGroup.add(this.carouselGroup);

        // Roof Canopy
        const roofGeo = new THREE.ConeGeometry(3.6, 1.6, 16);
        const roofMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            metalness: 0.4,
            roughness: 0.4
        });
        this.roofMesh = new THREE.Mesh(roofGeo, roofMat);
        this.roofMesh.position.y = 0.8;
        this.roofMesh.castShadow = true;
        this.carouselGroup.add(this.roofMesh);

        // Build Radial Suspension Arms & Swings (8 arms around circle)
        this.armsGroup = new THREE.Group();
        this.carouselGroup.add(this.armsGroup);

        const numSwings = 8;
        this.swings = [];

        for (let i = 0; i < numSwings; i++) {
            const phi = (i / numSwings) * Math.PI * 2;
            const swingData = this.createSwing(phi, i === 0);
            this.swings.push(swingData);
            this.armsGroup.add(swingData.armGroup);
        }

        this.mainSwing = this.swings[0]; // Highlighted Instrumented Swing

        // Path guide circles
        this.buildPathGuides();
    }

    createSwing(phi, isMain = false) {
        const armGroup = new THREE.Group();
        armGroup.rotation.y = phi;

        // Radial horizontal arm
        const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 8);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.rotation.z = Math.PI / 2;
        armGroup.add(arm);

        // Suspension Pivot Point (at r0)
        const pivot = new THREE.Group();
        armGroup.add(pivot);

        // Chain Line
        const chainMat = new THREE.LineBasicMaterial({
            color: isMain ? 0x00f2fe : 0x64748b,
            linewidth: isMain ? 2 : 1
        });
        const chainGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, -5, 0)
        ]);
        const chain = new THREE.Line(chainGeo, chainMat);
        pivot.add(chain);

        // Swing Seat & Passenger Mass
        const seatGroup = new THREE.Group();
        pivot.add(seatGroup);

        const seatGeo = new THREE.BoxGeometry(0.5, 0.1, 0.45);
        const seatMat = new THREE.MeshStandardMaterial({
            color: isMain ? 0xef4444 : 0x3b82f6,
            metalness: 0.5,
            roughness: 0.3
        });
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.castShadow = true;
        seatGroup.add(seat);

        // Passenger Figure
        const riderGeo = new THREE.SphereGeometry(0.24, 16, 16);
        const riderMat = new THREE.MeshStandardMaterial({ color: isMain ? 0xf59e0b : 0xe2e8f0 });
        const rider = new THREE.Mesh(riderGeo, riderMat);
        rider.position.y = 0.3;
        rider.castShadow = true;
        seatGroup.add(rider);

        return {
            armGroup,
            armMesh: arm,
            pivot,
            chain,
            seatGroup,
            phi,
            isMain
        };
    }

    buildPathGuides() {
        // Dynamic Ground Ring showing current radius r
        const rMat = new THREE.LineDashedMaterial({
            color: 0xef4444,
            dashSize: 0.3,
            gapSize: 0.15,
            linewidth: 2
        });
        const rGeo = new THREE.BufferGeometry();
        this.radiusGuide = new THREE.LineLoop(rGeo, rMat);
        this.radiusGuide.position.y = 0.05;
        this.scene.add(this.radiusGuide);

        // Roof suspension r0 ring
        const r0Mat = new THREE.LineBasicMaterial({ color: 0x00f2fe, opacity: 0.4, transparent: true });
        const r0Geo = new THREE.BufferGeometry();
        this.r0Guide = new THREE.LineLoop(r0Geo, r0Mat);
        this.r0Guide.position.y = 8.5;
        this.scene.add(this.r0Guide);

        this.updateGuideGeometry();
    }

    updateGuideGeometry() {
        const pointsR = [];
        const pointsR0 = [];
        const segments = 64;
        const r = this.physics.radius;
        const r0 = this.physics.r0;

        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            pointsR.push(new THREE.Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r));
            pointsR0.push(new THREE.Vector3(Math.cos(theta) * r0, 0, Math.sin(theta) * r0));
        }

        this.radiusGuide.geometry.dispose();
        this.radiusGuide.geometry = new THREE.BufferGeometry().setFromPoints(pointsR);
        this.radiusGuide.computeLineDistances();

        this.r0Guide.geometry.dispose();
        this.r0Guide.geometry = new THREE.BufferGeometry().setFromPoints(pointsR0);
    }

    setupForceVectors() {
        const origin = new THREE.Vector3(0, 0, 0);

        // F_g (Weight - Green)
        this.vecFg = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), origin, 2.0, 0x10b981, 0.4, 0.25);
        this.scene.add(this.vecFg);

        // F_S (String tension - Blue)
        this.vecFS = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), origin, 2.5, 0x3b82f6, 0.4, 0.25);
        this.scene.add(this.vecFS);

        // F_cp / F_cf (Centripetal / Centrifugal - Red/Orange)
        this.vecFnet = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), origin, 2.0, 0xef4444, 0.4, 0.25);
        this.scene.add(this.vecFnet);

        // v (Velocity - Yellow)
        this.vecVel = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), origin, 2.0, 0xfbbf24, 0.4, 0.25);
        this.scene.add(this.vecVel);
    }

    setCameraView(mode) {
        this.camMode = mode;
        document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`[onclick="setCameraView('${mode}')"]`);
        if (activeBtn) activeBtn.classList.add('active');

        if (mode === 'orbit') {
            this.controls.enabled = true;
            this.camera.position.set(14, 8, 16);
            this.controls.target.set(0, 4, 0);
        } else if (mode === 'side') {
            this.controls.enabled = false;
            this.camera.position.set(0, 4.5, 20);
            this.camera.lookAt(0, 4.5, 0);
        } else if (mode === 'top') {
            this.controls.enabled = false;
            this.camera.position.set(0, 26, 0);
            this.camera.lookAt(0, 0, 0);
        } else if (mode === 'rider') {
            this.controls.enabled = false;
        }
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    render() {
        const p = this.physics;
        const rot = p.rotationAngle;
        const alpha = p.currentAngle;
        const r0 = p.r0;
        const L = p.L;

        // Rotate carousel top
        this.carouselGroup.rotation.y = rot;

        // Scale roof geometry to match r0
        this.roofMesh.scale.set(r0 / 3.0, 1, r0 / 3.0);

        // Update all 8 swings
        for (const swing of this.swings) {
            // Position suspension pivot at distance r0
            swing.pivot.position.set(r0, 0, 0);

            // Arm cylinder scale
            swing.armMesh.position.set(r0 * 0.5, 0, 0);
            swing.armMesh.scale.set(1, r0, 1);

            // Chain deflection by angle alpha outward (positive Z rotation swings mass away from center)
            swing.pivot.rotation.z = alpha;

            // Seat positioned at distance L along deflected chain
            swing.seatGroup.position.set(0, -L, 0);
            // Counter-rotate seat so passenger remains upright
            swing.seatGroup.rotation.z = -alpha * 0.4;

            // Chain line geometry update
            const positions = swing.chain.geometry.attributes.position.array;
            positions[3] = 0;
            positions[4] = -L;
            positions[5] = 0;
            swing.chain.geometry.attributes.position.needsUpdate = true;
        }

        // Update Path guide rings
        this.updateGuideGeometry();

        // World coordinates of Instrumented Main Swing seat
        const seatWorldPos = new THREE.Vector3();
        this.mainSwing.seatGroup.getWorldPosition(seatWorldPos);

        const pivotWorldPos = new THREE.Vector3();
        this.mainSwing.pivot.getWorldPosition(pivotWorldPos);

        // Vector Scale Factor (Newton to 3D units)
        const scaleF = 0.0035;

        // 1. F_g (Weight - Green, pointing straight down)
        if (this.showFg) {
            this.vecFg.visible = true;
            this.vecFg.position.copy(seatWorldPos);
            this.vecFg.setDirection(new THREE.Vector3(0, -1, 0));
            this.vecFg.setLength(Math.max(0.5, p.Fg * scaleF), 0.35, 0.2);
        } else {
            this.vecFg.visible = false;
        }

        // 2. F_S (String Tension - Blue, pointing along chain to pivot)
        if (this.showFS) {
            this.vecFS.visible = true;
            this.vecFS.position.copy(seatWorldPos);
            const dirFS = new THREE.Vector3().subVectors(pivotWorldPos, seatWorldPos).normalize();
            this.vecFS.setDirection(dirFS);
            this.vecFS.setLength(Math.max(0.5, p.FS * scaleF), 0.35, 0.2);
        } else {
            this.vecFS.visible = false;
        }

        // 3. F_net (F_cp in Inertial / F_cf in Rotating)
        if (this.showFnet) {
            this.vecFnet.visible = true;
            this.vecFnet.position.copy(seatWorldPos);

            // Vector in horizontal plane pointing towards rotation center (0, y, 0)
            const centerHoriz = new THREE.Vector3(0, seatWorldPos.y, 0);
            let dirFnet = new THREE.Vector3().subVectors(centerHoriz, seatWorldPos).normalize();

            if (p.referenceFrame === 'rotating') {
                // Centrifugal force points outward!
                dirFnet.negate();
                this.vecFnet.setColor(0xf59e0b); // Orange
            } else {
                // Centripetal force points inward!
                this.vecFnet.setColor(0xef4444); // Red
            }

            this.vecFnet.setDirection(dirFnet);
            this.vecFnet.setLength(Math.max(0.4, p.Fcp * scaleF), 0.35, 0.2);
        } else {
            this.vecFnet.visible = false;
        }

        // 4. Tangential Velocity vector v
        if (this.showVel) {
            this.vecVel.visible = true;
            this.vecVel.position.copy(seatWorldPos);
            // Tangent direction = cross(axisY, radial)
            const radDir = new THREE.Vector3(seatWorldPos.x, 0, seatWorldPos.z).normalize();
            const tanDir = new THREE.Vector3(-radDir.z, 0, radDir.x);
            this.vecVel.setDirection(tanDir);
            this.vecVel.setLength(Math.max(0.4, p.speed * 0.25), 0.35, 0.2);
        } else {
            this.vecVel.visible = false;
        }

        // Rider POV Camera tracking
        if (this.camMode === 'rider') {
            this.camera.position.copy(seatWorldPos).add(new THREE.Vector3(0, 0.5, 0));
            // Look tangent forward
            const radDir = new THREE.Vector3(seatWorldPos.x, 0, seatWorldPos.z).normalize();
            const tanDir = new THREE.Vector3(-radDir.z, 0, radDir.x);
            const lookTarget = new THREE.Vector3().addVectors(this.camera.position, tanDir.multiplyScalar(10));
            this.camera.lookAt(lookTarget);
        } else if (this.controls.enabled) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}
