import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("CF_DEPLOY_TEST_01");

createRoot(document.getElementById("root")!).render(<App />);
