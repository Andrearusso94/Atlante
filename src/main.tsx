import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "./styles/global.css";
import { store } from "./store";
import App from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root non trovato");

createRoot(rootEl).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
