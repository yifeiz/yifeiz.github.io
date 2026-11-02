import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Quadris from "./Quadris";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Quadris />
  </StrictMode>
);
