import styles from "./dashboard.module.css";
import { sectionPaths, sectionTitles, type DashboardSection } from "./constants";

type TopbarProps = {
  activeSection: DashboardSection;
  onVerifyOrganisers: () => void;
  onOpenSidebar: () => void;
};

export function Topbar({ activeSection, onVerifyOrganisers, onOpenSidebar }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <button className={styles.mobileToggle} onClick={onOpenSidebar} type="button" aria-label="Open sidebar">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4h14M2 9h14M2 14h14" />
        </svg>
      </button>
      <span className={styles.topbarTitle}>{sectionTitles[activeSection]}</span>
      <span className={styles.topbarPath}>
        <span className={styles.topbarSep}>/ </span>
        {sectionPaths[activeSection]}
      </span>
      <div className={styles.topbarActions}>
        <button className={styles.topbarBtn} type="button">
          Export
        </button>
        <button className={`${styles.topbarBtn} ${styles.topbarBtnPrimary}`} type="button" onClick={onVerifyOrganisers}>
          Verify Organisers
        </button>
      </div>
    </header>
  );
}
