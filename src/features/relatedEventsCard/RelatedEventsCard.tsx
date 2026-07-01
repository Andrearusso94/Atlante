import { useState } from "react";
import type { RelatedEvent } from "../../api/relatedEvents";
import styles from "./RelatedEventsCard.module.css";

interface Props {
  events: RelatedEvent[];
  onGenerateSearch?: (event: RelatedEvent) => void;
}

export default function RelatedEventsCard({ events, onGenerateSearch }: Props) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button type="button" className={styles.tab} onClick={() => setOpen(true)}>
        ‹ Correlati
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.sectionLabel}>Eventi correlati</span>
        <button
          type="button"
          className={styles.close}
          aria-label="Chiudi eventi correlati"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
      </div>
      {events.length === 0 ? (
        <p className={styles.placeholder}>Nessun evento correlato.</p>
      ) : (
        events.map((ev) => (
          <div key={ev.wikidataId} className={styles.card}>
            {ev.year != null && <p className={styles.year}>{ev.year}</p>}
            <p className={styles.title}>{ev.title}</p>
            {ev.description && <p className={styles.description}>{ev.description}</p>}
            <button
              type="button"
              className={styles.searchBtn}
              onClick={() => onGenerateSearch?.(ev)}
            >
              Genera Ricerca
            </button>
          </div>
        ))
      )}
    </div>
  );
}
