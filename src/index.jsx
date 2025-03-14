import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

const root = createRoot(document.getElementById("root")); // Make sure an element with id 'root' exists in your HTML

root.render(<App />);
