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
  const groups: Record<string, {
    id: string;
    name: string;
    messages: any[];
    resources: any[];
    notes: string;
    users: Set<string>;
  }> = {};

  // Track socket to user/group mapping for cleanup
  const socketMap: Record<string, { groupId: string; userName: string }> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-group", ({ groupId, userName }) => {
      socket.join(groupId);
      socketMap[socket.id] = { groupId, userName };
      
      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          name: `Group ${groupId}`,
          messages: [],
          resources: [],
          notes: "",
          users: new Set(),
        };
      }
      
      groups[groupId].users.add(userName);
      
      // Send current state to the joining user
      socket.emit("group-data", {
        messages: groups[groupId].messages,
        resources: groups[groupId].resources,
        notes: groups[groupId].notes,
        users: Array.from(groups[groupId].users),
      });

      // Notify others
      io.to(groupId).emit("user-list-update", Array.from(groups[groupId].users));
      socket.to(groupId).emit("user-joined", userName);
    });

    socket.on("update-notes", ({ groupId, notes }) => {
      if (groups[groupId]) {
        groups[groupId].notes = notes;
        socket.to(groupId).emit("notes-updated", notes);
      }
    });

    socket.on("send-message", ({ groupId, message }) => {
      if (groups[groupId]) {
        groups[groupId].messages.push(message);
        io.to(groupId).emit("new-message", message);
      }
    });

    socket.on("add-resource", ({ groupId, resource }) => {
      if (groups[groupId]) {
        groups[groupId].resources.push(resource);
        io.to(groupId).emit("new-resource", resource);
      }
    });

    socket.on("typing", ({ groupId, userName, isTyping }) => {
      socket.to(groupId).emit("user-typing", { userName, isTyping });
    });

    socket.on("disconnect", () => {
      const mapping = socketMap[socket.id];
      if (mapping) {
        const { groupId, userName } = mapping;
        if (groups[groupId]) {
          groups[groupId].users.delete(userName);
          io.to(groupId).emit("user-list-update", Array.from(groups[groupId].users));
          socket.to(groupId).emit("user-left", userName);
        }
        delete socketMap[socket.id];
      }
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
