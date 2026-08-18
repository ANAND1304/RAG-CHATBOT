import React, { useEffect } from "react";
import ChatPage from "./pages/ChatPage";

export default function App() {
  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return <ChatPage />;
}
