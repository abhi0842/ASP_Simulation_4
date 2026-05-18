import { useEffect } from "react";
import styles from "./kalman.module.css";

export function TheoryModal({ isOpen, onClose, content }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !content) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h4>{content.title}</h4>
        <pre className={styles.theoryBody}>{content.body}</pre>
        <button type="button" className={styles.modalClose} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
