import { useState, useEffect } from "react";
import { WebSocketMessage } from "@shared/schema";

export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  useEffect(() => {
    // For development environment
    if (process.env.NODE_ENV === "development") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      connectWebSocket(wsUrl);
    } else {
      // For production environment - connect to Cloud Run instance
      const wsUrl = `wss://your-cloud-run-instance.run.app/ws`;
      connectWebSocket(wsUrl);
    }
    
    function connectWebSocket(wsUrl: string) {
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
    }
    
    return () => {
      if (socket) socket.close();
    };
  }, []);
  
  return socket;
};
