import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Snake from "./Snake";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Snake />
  </StrictMode>
);
