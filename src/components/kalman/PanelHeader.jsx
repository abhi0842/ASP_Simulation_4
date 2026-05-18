import styles from "./kalman.module.css";

export function PanelHeader({ title, onTheoryClick }) {
  return (
    <div className={styles.moduleHeader}>
      <h3>{title}</h3>
      <button type="button" className={styles.theoryBtn} onClick={onTheoryClick}>
        Theory Link
      </button>
    </div>
  );
}
