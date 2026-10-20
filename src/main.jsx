import axios from "axios";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./AuthContext";
import "./index.css";

// Bloqueia scroll do mouse em inputs numéricos (evita alterar valores acidentalmente)
document.addEventListener("wheel", (e) => {
  if (document.activeElement?.type === "number") {
    document.activeElement.blur();
  }
}, { passive: true });

// Interceptor global: envia o token JWT em toda requisição
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
