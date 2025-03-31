import { useState, useEffect } from "react";
import { WebSocketMessage } from "@shared/schema";

export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const newSocket = new WebSocket(wsUrl);
    
    newSocket.addEventListener("open", () => {
      console.log("WebSocket connection established");
    });
    
    newSocket.addEventListener("close", () => {
      console.log("WebSocket connection closed");
    });
    
    newSocket.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, []);
  
  return socket;
};
