import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DoctorRelaxGame from "./DoctorRelaxGame";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DoctorRelaxGame />
  </StrictMode>,
);
