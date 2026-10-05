<div align="center">

# 🎠 3D Carousel & Centripetal Kinematics Laboratory
### Modern Interactive Wave Swinger Simulator & Rotating Reference Frame Dynamics

[![GitHub Pages](https://img.shields.io/badge/Live_Demo-GitHub_Pages-00f2fe?style=for-the-badge&logo=github)](https://xallace.github.io/carousel-simulation/)
[![License: MIT](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)](LICENSE)
[![Three.js](https://img.shields.io/badge/Graphics-Three.js_WebGL-000000?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Platform: Web](https://img.shields.io/badge/Platform-Web_3D_Browser-3b82f6?style=for-the-badge)](https://developer.mozilla.org)
[![Bilingual](https://img.shields.io/badge/Language-DE_%7C_EN-8b5cf6?style=for-the-badge)](#features)

*A high-fidelity 3D WebGL modernization and pedagogical tribute to Walter Fendt’s classic physics applet (1999–2014).*

[**🚀 Launch Live 3D Simulation**](https://xallace.github.io/carousel-simulation/) • [**📐 Kinematic Foundations**](#kinematic--dynamic-foundations) • [**✨ Modern Enhancements**](#features--enhancements) • [**🛠️ Local Setup**](#local-setup)

</div>

---

## 🌟 Overview

The **Chair Swing / Wave Swinger (Kettenkarussell)** is one of the classic pedagogical examples in Newtonian mechanics for circular motion, dynamic equilibrium, cable tension, and the crucial distinction between **inertial laboratory frames** and **rotating non-inertial reference frames**.

While Walter Fendt's original Java/HTML5 applet was limited to a static 2D planar projection and fixed parameters, this repository delivers a **full real-time 3D physics simulator** built with **Three.js** and **WebGL**, featuring dynamic vector overlays, planetary gravity presets, procedural audio, and smooth interactive camera orbits.

---

## ✨ Features & Enhancements

| Feature | Original Applet (Walter Fendt, 1999/2014) | Modernized 3D Lab (2026) |
| :--- | :--- | :--- |
| **Graphics & Dimension** | 2D orthogonal canvas | **Full 3D WebGL environment** with Three.js, shadows, lighting & OrbitControls |
| **Reference Frames** | Static lab description | **1-Click Reference Frame Toggle**: Inertial (Centripetal) vs. Rotating (Centrifugal) |
| **Force Vectors in 3D** | 2D static lines | **Dynamic 3D force vectors**: Gravity $\vec{F}_g$, Cable Tension $\vec{F}_S$, Centripetal $\vec{F}_{\text{zp}}$, and Centrifugal $\vec{F}_{\text{zf}}$ |
| **Planetary Gravitation** | Fixed Earth ($g = 9.81\,\text{m/s}^2$) | Presets for **Earth**, **Moon** ($1.62$), **Mars** ($3.71$), and **Jupiter** ($24.79\,\text{m/s}^2$) |
| **Parametric Control** | Few slider steps | Smooth real-time tuning for base radius $r_0$, cable length $L$, mass $m$, and period $T$ |
| **Mathematical Telemetry** | Simple text readout | Live telemetry dashboard: $\omega, v, a_{\text{zp}}, \theta, F_S$ with LaTeX formulas |
| **Camera & Viewpoints** | Fixed side view | Free Orbit, Top-Down Tracking, and Rider-POV Camera Modes |
| **Audio Synthesis** | Silent | Procedural aerodynamic wind rush & mechanical rotation hum (Web Audio API) |
| **Internationalization** | Monolingual | Instant German / English toggle (`DE` / `EN`) |

---

## 📐 Kinematic & Dynamic Foundations

### 1. Geometric Equilibrium & Radial Radius
A gondola of mass $m$ suspended by a cable of length $L$ from a carousel rim of radius $r_0$ rotates at angular velocity $\omega = \frac{2\pi}{T}$. The effective circular trajectory radius $r$ depends on the cable deflection angle $\theta$:

$$r = r_0 + L \sin \theta$$

### 2. Angular Velocity & Tilt Angle
In equilibrium, the vertical component of the cable tension balances the gravitational force, while the horizontal component provides the required centripetal force:

$$\sum F_y = F_S \cos \theta - m g = 0 \implies F_S \cos \theta = m g$$

$$\sum F_x = F_S \sin \theta = m \omega^2 r = F_{\text{zp}}$$

Dividing the two equations yields the fundamental relation:

$$\tan \theta = \frac{F_{\text{zp}}}{F_g} = \frac{m \omega^2 r}{m g} = \frac{\omega^2 (r_0 + L \sin \theta)}{g}$$

This is a transcendental equation in $\theta$ that is numerically solved at 60 FPS using Newton-Raphson / bisection iteration.

### 3. Total Cable Tension Force
The total tensile load $F_S$ acting through the suspension cable is:

$$F_S = \frac{m \cdot g}{\cos \theta} = \sqrt{(m g)^2 + (m \omega^2 r)^2}$$

---

## 🛠️ Local Setup & Quickstart

Zero build steps required! Run it directly in any modern browser:

```bash
# Clone the repository
git clone https://github.com/xallace/carousel-simulation.git
cd carousel-simulation

# Open directly in your browser
open index.html   # macOS
start index.html  # Windows
```

---

## 📜 Credits & License

* Modern 3D implementation, kinematics engine, and WebGL architecture by **Walter (@xallace)** (2026).
* Pedagogical tribute to **Walter Fendt** (Studiendirektor a.D., [www.walter-fendt.de](https://www.walter-fendt.de)).
* Released under the **MIT License**.
