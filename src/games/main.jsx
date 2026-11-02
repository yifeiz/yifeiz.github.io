import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Arcade from "./Arcade";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Arcade />
  </StrictMode>
);
