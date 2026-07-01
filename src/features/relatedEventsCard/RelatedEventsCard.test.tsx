// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { RelatedEvent } from "../../api/relatedEvents";
import RelatedEventsCard from "./RelatedEventsCard";

const EVENTS: RelatedEvent[] = [
  { wikidataId: "Q1", title: "Morte nera", description: "Pandemia medievale.", year: 1347 },
  { wikidataId: "Q2", title: "Prima crociata", description: "Spedizione verso Gerusalemme.", year: 1096 },
];

afterEach(cleanup);

describe("RelatedEventsCard", () => {
  it("mostra titolo, descrizione, anno e pulsante Genera Ricerca per ogni evento", () => {
    render(<RelatedEventsCard events={EVENTS} />);

    screen.getByText("Morte nera");
    screen.getByText("Pandemia medievale.");
    screen.getByText("1347");

    const btns = screen.getAllByRole("button", { name: "Genera Ricerca" });
    expect(btns).toHaveLength(EVENTS.length);
  });

  it("senza eventi mostra il placeholder", () => {
    render(<RelatedEventsCard events={[]} />);
    screen.getByText("Nessun evento correlato.");
  });

  it("evento con year null non mostra l'anno", () => {
    const ev: RelatedEvent[] = [
      { wikidataId: "Q3", title: "Evento senza data", description: "desc.", year: null },
    ];
    render(<RelatedEventsCard events={ev} />);
    screen.getByText("Evento senza data");
    expect(screen.queryByText("null")).toBeNull();
  });

  it("close button chiude il pannello e mostra il tab di riapertura", () => {
    render(<RelatedEventsCard events={EVENTS} />);

    screen.getByText("Morte nera");

    fireEvent.click(screen.getByRole("button", { name: "Chiudi eventi correlati" }));

    expect(screen.queryByText("Morte nera")).toBeNull();
    screen.getByRole("button", { name: /correlati/i });
  });

  it("il tab di riapertura riapre il pannello", () => {
    render(<RelatedEventsCard events={EVENTS} />);

fireEvent.click(screen.getByRole("button", { name: "Chiudi eventi correlati" }));
    fireEvent.click(screen.getByRole("button", { name: /correlati/i }));

    screen.getByText("Morte nera");
  });

  it("Genera Ricerca chiama onGenerateSearch con l'evento corretto", () => {
    const onSearch = vi.fn();
    render(<RelatedEventsCard events={EVENTS} onGenerateSearch={onSearch} />);

    const btns = screen.getAllByRole("button", { name: "Genera Ricerca" });
    fireEvent.click(btns[0]);

    expect(onSearch).toHaveBeenCalledWith(EVENTS[0]);
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("Genera Ricerca senza onGenerateSearch non lancia eccezioni", () => {
    render(<RelatedEventsCard events={EVENTS} />);
    const btn = screen.getAllByRole("button", { name: "Genera Ricerca" })[0];
    expect(() => fireEvent.click(btn)).not.toThrow();
  });
});
