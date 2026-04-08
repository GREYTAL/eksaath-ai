import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // In-memory state for groups and messages
  // In a real app, this would be a database
  const groups: Record<string, {
    id: string;
    name: string;
    messages: any[];
    users: Set<string>;
  }> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-group", ({ groupId, userName }) => {
      socket.join(groupId);
      
      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          name: `Group ${groupId}`,
          messages: [],
          users: new Set(),
        };
      }
      
      groups[groupId].users.add(userName);
      
      // Send current state to the joining user
      socket.emit("group-data", {
        messages: groups[groupId].messages,
        users: Array.from(groups[groupId].users),
      });

      // Notify others
      socket.to(groupId).emit("user-joined", userName);
      console.log(`${userName} joined group ${groupId}`);
    });

    socket.on("send-message", ({ groupId, message }) => {
      if (groups[groupId]) {
        groups[groupId].messages.push(message);
        io.to(groupId).emit("new-message", message);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
