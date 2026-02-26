import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { client, RoomProvider, useRoom } from "./colyseus";

function AppLoader() {
  const { room, isConnecting: connecting, error } = useRoom();

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
        Error: {String(error)}
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RoomProvider connect={() => client.joinOrCreate("game_room")}>
      <AppLoader />
    </RoomProvider>
  </React.StrictMode>
);
