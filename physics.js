/**
 * Physics Engine for the Kettenkarussell (Carousel) Simulation
 * Implements high-precision numerical solver for the transcendental equilibrium equation
 * and dynamic transient swing physics.
 */

class CarouselPhysics {
    constructor() {
        // Physical parameters
        this.T = 4.0;      // Period (s)
        this.r0 = 3.0;     // Suspension radius (m)
        this.L = 5.0;      // Chain length (m)
        this.m = 80.0;     // Mass (kg)
        this.g = 9.81;     // Gravity (m/s^2)

        // Dynamic State
        this.currentAngle = 0.0;   // rad (transient animated angle)
        this.targetAngle = 0.0;    // rad (equilibrium angle from solver)
        this.angularVel = 0.0;     // rad/s (swinging angular speed)
        this.rotationAngle = 0.0;  // rad (carousel azimuthal angle around Z/Y axis)
        this.referenceFrame = 'inertial'; // 'inertial' | 'rotating'

        // Computed State
        this.omega = (2 * Math.PI) / this.T;
        this.radius = this.r0;
        this.speed = 0.0;
        this.acp = 0.0;
        this.Fg = this.m * this.g;
        this.FS = this.Fg;
        this.Fcp = 0.0;
        this.Fcf = 0.0;

        this.updateEquilibrium();
    }

    // Set parameters
    setParams(params) {
        if (params.T !== undefined) this.T = Math.max(0.5, params.T);
        if (params.r0 !== undefined) this.r0 = Math.max(0.1, params.r0);
        if (params.L !== undefined) this.L = Math.max(0.2, params.L);
        if (params.m !== undefined) this.m = Math.max(1.0, params.m);
        if (params.g !== undefined) this.g = Math.max(0.01, params.g);

        this.updateEquilibrium();
    }

    /**
     * Solves the equilibrium transcendental equation:
     * f(alpha) = g * sin(alpha) - omega^2 * (r0 + L * sin(alpha)) * cos(alpha) = 0
     * using Newton-Raphson with bisection fallback.
     */
    solveEquilibriumAngle() {
        const omega = (2 * Math.PI) / this.T;
        const g = this.g;
        const r0 = this.r0;
        const L = this.L;

        if (omega <= 1e-4) return 0.0;

        // Function and derivative
        const f = (a) => g * Math.sin(a) - Math.pow(omega, 2) * (r0 + L * Math.sin(a)) * Math.cos(a);
        const df = (a) => g * Math.cos(a) - Math.pow(omega, 2) * L * Math.pow(Math.cos(a), 2) + Math.pow(omega, 2) * (r0 + L * Math.sin(a)) * Math.sin(a);

        // Search root in [0, pi/2 - 0.001]
        let low = 0.0;
        let high = Math.PI / 2 - 0.0001;
        let alpha = 0.5; // initial guess

        // Newton-Raphson
        for (let i = 0; i < 35; i++) {
            const val = f(alpha);
            if (Math.abs(val) < 1e-8) break;

            const deriv = df(alpha);
            if (Math.abs(deriv) < 1e-8) {
                alpha = (low + high) * 0.5;
            } else {
                let nextAlpha = alpha - val / deriv;
                if (nextAlpha <= low || nextAlpha >= high) {
                    // Bisection step if Newton shoots out of bounds
                    if (val < 0) low = alpha;
                    else high = alpha;
                    nextAlpha = (low + high) * 0.5;
                }
                alpha = nextAlpha;
            }
        }

        return Math.max(0, Math.min(Math.PI / 2 - 0.0001, alpha));
    }

    updateEquilibrium() {
        this.omega = (2 * Math.PI) / this.T;
        this.targetAngle = this.solveEquilibriumAngle();

        // Calculate steady-state telemetry
        const alpha = this.targetAngle;
        this.radius = this.r0 + this.L * Math.sin(alpha);
        this.speed = this.omega * this.radius;
        this.acp = Math.pow(this.omega, 2) * this.radius;

        this.Fg = this.m * this.g;
        this.FS = this.Fg / Math.cos(alpha);
        this.Fcp = this.m * this.acp;
        this.Fcf = this.Fcp;
    }

    /**
     * Integrates transient dynamics (smooth transition when user drags sliders live)
     */
    step(dt = 0.016, isPaused = false, timeScale = 1.0) {
        if (isPaused) return;

        const effectiveDt = dt * timeScale;

        // Rotate carousel
        this.rotationAngle += this.omega * effectiveDt;
        if (this.rotationAngle > Math.PI * 2) {
            this.rotationAngle -= Math.PI * 2;
        }

        // Damped harmonic transition to target equilibrium angle
        const delta = this.targetAngle - this.currentAngle;
        const springK = 25.0; // responsive stiffness
        const damping = 8.0;  // critical damping
        const accel = springK * delta - damping * this.angularVel;

        this.angularVel += accel * effectiveDt;
        this.currentAngle += this.angularVel * effectiveDt;
    }

    getTelemetry() {
        const alphaDeg = (this.currentAngle * 180) / Math.PI;
        const alphaTargetDeg = (this.targetAngle * 180) / Math.PI;
        const rCurrent = this.r0 + this.L * Math.sin(this.currentAngle);
        const vCurrent = this.omega * rCurrent;
        const acpCurrent = Math.pow(this.omega, 2) * rCurrent;
        const Fg = this.m * this.g;
        const cosA = Math.cos(this.currentAngle);
        const FS = cosA > 1e-4 ? Fg / cosA : Fg * 100;
        const Fcp = this.m * acpCurrent;
        const rpm = (this.omega * 60) / (2 * Math.PI);
        const gForce = acpCurrent / 9.81;

        return {
            alpha: this.currentAngle,
            alphaDeg,
            alphaTargetDeg,
            radius: rCurrent,
            speed: vCurrent,
            speedKmh: vCurrent * 3.6,
            omega: this.omega,
            rpm,
            acp: acpCurrent,
            gForce,
            Fg,
            FS,
            Fcp,
            Fcf: Fcp,
            T: this.T,
            r0: this.r0,
            L: this.L,
            m: this.m,
            g: this.g
        };
    }
}
