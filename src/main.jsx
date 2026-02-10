import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ColyseusProvider, useColyseus } from "./hooks/useColyseus";

function AppLoader() {
  const { room, connecting, error } = useColyseus();

  if (connecting) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white text-2xl">
        Connecting...
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white text-2xl text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!room) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white text-2xl">
        Joining room...
      </div>
    );
  }

  // Room is guaranteed to be available here
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ColyseusProvider>
      <AppLoader />
    </ColyseusProvider>
  </React.StrictMode>
);
