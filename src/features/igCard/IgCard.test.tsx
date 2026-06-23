// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { byName } from "../../data/peste";
import IgCard, { type IgCardOpen } from "./IgCard";
import styles from "./IgCard.module.css";

function renderIgCard() {
  const { rerender, container } = render(<IgCard open={null} />);
  function setOpen(open: IgCardOpen | null) {
    rerender(<IgCard open={open} />);
  }
  return { container, setOpen };
}

afterEach(() => {
  cleanup();
  document.body.classList.remove("modal-open");
});

describe("IgCard", () => {
  it("a riposo (open=null) non renderizza nulla", () => {
    const { container } = renderIgCard();
    expect(container.firstChild).toBeNull();
  });

  it("apertura: risolve la regione da byName e mostra avatar/nome/sottotitolo/prima slide", () => {
    const { setOpen } = renderIgCard();
    const france = byName("France")!;

    setOpen({ name: "France", seq: 1 });

    screen.getByRole("dialog", { name: "Scheda peste nera" });
    screen.getByText(france.label);
    screen.getByText("Peste Nera · Europa · 1347–1351");
    screen.getByText(france.slides[0].tag);
    screen.getByText(`1 / ${france.slides.length}`);
  });

  it("navigazione: i pulsanti prev/next avanzano e tornano indietro; le frecce si nascondono agli estremi", () => {
    const { setOpen } = renderIgCard();
    const france = byName("France")!;
    setOpen({ name: "France", seq: 1 });

    const prevBtn = screen.getByLabelText("Precedente");
    const nextBtn = screen.getByLabelText("Successiva");
    expect(prevBtn.className).toContain(styles.hide); // alla prima slide, prev è nascosta

    fireEvent.click(nextBtn);
    screen.getByText(france.slides[1].tag);
    screen.getByText(`2 / ${france.slides.length}`);
    expect(prevBtn.className).not.toContain(styles.hide);

    fireEvent.click(prevBtn);
    screen.getByText(france.slides[0].tag);
    screen.getByText(`1 / ${france.slides.length}`);
  });

  it("clamp agli estremi: precedente sulla prima slide e successiva sull'ultima non cambiano nulla", () => {
    const { setOpen } = renderIgCard();
    const france = byName("France")!;
    const n = france.slides.length;
    setOpen({ name: "France", seq: 1 });

    fireEvent.click(screen.getByLabelText("Precedente")); // già alla prima
    screen.getByText(`1 / ${n}`);

    for (let i = 0; i < n - 1; i++) fireEvent.click(screen.getByLabelText("Successiva"));
    screen.getByText(`${n} / ${n}`);
    expect(screen.getByLabelText("Successiva").className).toContain(styles.hide);

    fireEvent.click(screen.getByLabelText("Successiva")); // già all'ultima
    screen.getByText(`${n} / ${n}`);
  });

  it("tastiera: ArrowRight/ArrowLeft navigano, Escape chiude", () => {
    const { setOpen } = renderIgCard();
    const france = byName("France")!;
    setOpen({ name: "France", seq: 1 });

    fireEvent.keyDown(window, { key: "ArrowRight" });
    screen.getByText(`2 / ${france.slides.length}`);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    screen.getByText(`1 / ${france.slides.length}`);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("swipe sul rullino: oltre la soglia di 40px naviga, sotto soglia no", () => {
    const { setOpen, container } = renderIgCard();
    const france = byName("France")!;
    setOpen({ name: "France", seq: 1 });

    const stage = container.querySelector(`.${styles.stage}`)!;

    fireEvent.pointerDown(stage, { clientX: 200 });
    fireEvent.pointerUp(stage, { clientX: 150 }); // dx=-50 → successiva
    screen.getByText(`2 / ${france.slides.length}`);

    fireEvent.pointerDown(stage, { clientX: 100 });
    fireEvent.pointerUp(stage, { clientX: 150 }); // dx=+50 → precedente
    screen.getByText(`1 / ${france.slides.length}`);

    fireEvent.pointerDown(stage, { clientX: 100 });
    fireEvent.pointerUp(stage, { clientX: 110 }); // dx=10, sotto soglia → nessun movimento
    screen.getByText(`1 / ${france.slides.length}`);
  });

  it("chiusura: il pulsante ✕ chiude la card e rimuove body.modal-open", () => {
    const { setOpen } = renderIgCard();
    setOpen({ name: "France", seq: 1 });
    expect(document.body.classList.contains("modal-open")).toBe(true);

    fireEvent.click(screen.getByLabelText("Chiudi"));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.classList.contains("modal-open")).toBe(false);
  });

  it("chiusura: click sull'overlay fuori dalla card chiude, click dentro la card no", () => {
    const { setOpen, container } = renderIgCard();
    const france = byName("France")!;
    setOpen({ name: "France", seq: 1 });

    fireEvent.click(screen.getByText(france.label)); // dentro la card
    screen.getByRole("dialog");

    fireEvent.click(container.firstChild as HTMLElement); // l'overlay stesso
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("una nuova apertura (nuova regione) azzera l'indice della slide", () => {
    const { setOpen } = renderIgCard();
    const france = byName("France")!;
    const hre = byName("Holy Roman Empire")!;
    setOpen({ name: "France", seq: 1 });
    fireEvent.click(screen.getByLabelText("Successiva"));
    screen.getByText(`2 / ${france.slides.length}`);

    setOpen({ name: "Holy Roman Empire", seq: 2 });

    screen.getByText(hre.label);
    screen.getByText(`1 / ${hre.slides.length}`);
  });

  it("ignora una seq duplicata (stessa apertura instradata due volte)", () => {
    const { setOpen } = renderIgCard();
    const france = byName("France")!;
    setOpen({ name: "France", seq: 1 });
    fireEvent.click(screen.getByLabelText("Successiva"));
    screen.getByText(`2 / ${france.slides.length}`);

    setOpen({ name: "France", seq: 1 }); // stessa seq, nuovo oggetto: ignorata

    screen.getByText(`2 / ${france.slides.length}`); // indice non azzerato
  });
});
