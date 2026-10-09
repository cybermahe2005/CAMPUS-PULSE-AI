# 🎯 Campus Pulse AI
## Decision Intelligence Platform for Higher Education

> **Predict. Explain. Simulate. Intervene. Measure.**

Campus Pulse AI is not just an early-warning dashboard. It is a complete **intervention intelligence system** that predicts academic and placement risk, explains the drivers, simulates alternative outcomes, recommends targeted actions, and measures whether those actions worked.

---

## 🚀 Quick Start

```bash
# Navigate to the project
cd campus-pulse-ai

# Start local server (Python required)
python -m http.server 3000

# Open in browser
http://localhost:3000
```

---

## 📐 Architecture

```
campus-pulse-ai/
├── index.html          ← App shell (HTML entry point)
└── src/
    ├── data.js         ← Synthetic data engine (120 students, seeded RNG)
    ├── main.js         ← Full SPA — all 9 pages + routing + ML simulation
    └── styles.css      ← Premium dark design system
```

**No build tool required** — pure ES6 modules served over HTTP.

---

## 🎭 System Layers (per Spec)

| Layer | Question Answered | Implementation |
|---|---|---|
| **Student 360** | What is happening now? | Unified profile with 15+ metrics |
| **Prediction** | What is likely to happen? | Academic Risk + Placement Readiness scores |
| **Explainability** | Why is it happening? | SHAP-like top-5 feature drivers |
| **Trajectory** | Is it improving or deteriorating? | 6-period trend + momentum + risk velocity |
| **Simulation** | What could happen under different actions? | What-If Lab with 5 controllable inputs |
| **Intervention** | What should the institution do? | Evidence-based ranked recommendations |
| **Outcome** | Did the intervention work? | Before/after logging with approval workflow |
| **Copilot** | Ask anything in natural language | Campus Copilot with structured safe tools |

---

## 📱 Pages

| Page | Key Features |
|---|---|
| 🔐 Login | Role-based sign-in (Administrator, HOD, Faculty, Placement Officer) |
| 🎯 Mission Control | KPI cards, risk ring, department bars, segment distribution, priority queue |
| 🔍 Student Explorer | Search + filter by risk/dept, full sortable student table |
| 👤 Student 360° | Score, trajectory, SHAP drivers, recovery potential, interventions |
| 🧪 What-If Lab | 5-slider scenario engine with live delta comparison |
| ⚡ Intervention Center | Ranked intervention queue with approve workflow |
| 🏆 Placement Intelligence | JD analyzer, skill gap, academic-placement mismatch view |
| 🤖 Campus Copilot | NL query → structured data answer (never invents numbers) |
| 📊 Data Health | Completeness, freshness, anomaly, validation results |

---

## 🤖 ML Design (per Spec)

- **Student Success Index**: Transparent weighted combination of Academic Readiness (35%), Placement Readiness (30%), Engagement Health (20%), Momentum (±10 pts)
- **SHAP Drivers**: Top-5 feature attributions per student — direction + contribution
- **Trajectory**: 6-period longitudinal trend with configurable momentum thresholds
- **Recovery Potential**: Heuristic (Low/Medium/High) with upgrade path to uplift model
- **What-If Simulation**: Re-runs composite score formula with modified controllable inputs — clearly labeled as model scenario, not causal guarantee

---

## 🎯 Student Profiles (6 Types)

| Profile | Behavior |
|---|---|
| Future Leader | High stable scores, high engagement |
| Academic Star / Career Gap | High CGPA, weak coding/interview |
| Hidden Talent | Moderate CGPA, strong coding growth |
| Silent Decliner | Acceptable now, worsening trends |
| Critical Support | Low academic, low engagement, multi-deficit |
| Recoverable Risk | High risk but strong response to support |

---

## 🔒 Safety Contracts

- **Copilot**: Never calculates risk values — retrieves only from structured data store
- **Simulation**: Outputs labeled as model scenario estimates, not causal guarantees
- **SHAP**: Computed from feature values, never from LLM
- **RBAC**: Role-based login enforced throughout

---

## 📊 Judging Rubric Alignment

| Criterion | Weight | Implementation |
|---|---|---|
| Data Integration | 30% | 8 data domains, unified student profile, quality layer |
| Success/Risk Identification | 25% | Multi-component SSI, SHAP drivers, 4-tier risk |
| Dashboard & Visualization | 25% | 9 pages, real-time charts, mission-control UI |
| Problem Understanding | 10% | Intervention loop, outcome tracking, Copilot |
| Presentation | 10% | Hero demo flow, canonical demo student |

---

*Seed: 42 — all data is synthetic, reproducible, and contains no real personal information.*
