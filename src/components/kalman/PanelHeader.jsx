import styles from "./kalman.module.css";

export function PanelHeader({ title }) {
  return (
    <div className={styles.moduleHeader}>
      <h3>{title}</h3>
    </div>
  );
}
