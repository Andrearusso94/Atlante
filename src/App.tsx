import { useAppSelector } from "./store/hooks";

// Placeholder di scaffold: il guscio toolbox "Aula", il coordinatore del click
// globo e il mount di GlobeEngine arrivano nella fase successiva (motore).
export default function App() {
  const theme = useAppSelector((state) => state.mode.theme);

  return (
    <div>
      <h1>Atlante Sincronico</h1>
      <p>Scaffold pronto — tema corrente: {theme}</p>
    </div>
  );
}
