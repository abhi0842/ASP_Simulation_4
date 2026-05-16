import { createElement } from "react";
import styles from "./kalman.module.css";

const THEORY = {
  initialConditions: {
    title: "P₀ → K₁ relationship",
    body: `With H = [1, 0] and scalar R, the first Kalman gain is:

K₁ = P₀[0,0] / (P₀[0,0] + R)

A small P₀ (high confidence in x̂₀) yields small K₁ — the filter ignores early measurements.
A large P₀ forces K₁ → 1 — the first estimate is essentially the measurement z₁.`,
  },
  gainInspector: {
    title: "Kalman gain",
    body: `K_k = P_pred Hᵀ (H P_pred Hᵀ + R)⁻¹

For H = [1, 0] this reduces to:
K_k[0] = P_pred[0,0] / (P_pred[0,0] + R)`,
  },
  convergenceRace: {
    title: "Discrete Algebraic Riccati Equation (DARE)",
    body: `At steady state, P_∞ solves:

P_∞ = F P_∞ Fᵀ − F P_∞ Hᵀ (H P_∞ Hᵀ + R)⁻¹ H P_∞ F + Q

Different P₀ values change only the transient path to the same P_∞.`,
  },
  arrhythmia: {
    title: "Q tuning for non-stationary signals",
    body: `Process noise Q controls how quickly the filter expects the state to change.

Large Q → larger K → faster tracking of HR changes (tachycardia).
Small Q → rigid model → slow recovery after sudden rate changes.`,
  },
  stateSpace: {
    title: "State-space predict step",
    body: `x̂_pred = F x̂_k,  F = [[1, dt], [0, 1]]

The filter treats amplitude and slope as the state; F extrapolates one sample ahead.`,
  },
};

export function TheoryModal({ theoryKey, onClose }) {
  const content = THEORY[theoryKey];
  if (!content) return null;

  return createElement(
    "div",
    { className: styles.modalOverlay, onClick: onClose },
    createElement(
      "div",
      {
        className: styles.modalContent,
        onClick: (e) => e.stopPropagation(),
        role: "dialog",
        "aria-modal": "true",
      },
      createElement("h4", null, content.title),
      createElement("pre", { className: styles.theoryBody }, content.body),
      createElement(
        "button",
        { type: "button", className: styles.modalClose, onClick: onClose },
        "Close"
      )
    )
  );
}
