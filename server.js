import dotenv from "dotenv";
dotenv.config();

import net from "net";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { handleGpsData } from "./controllers/gpsController.js";

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(" MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// WebSocket Server
const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
httpServer.listen(7000, () => {
  console.log(" WebSocket.IO running at ws://64.23.202.81:7000");
});

io.on("connection", (socket) => {
  console.log(" WebSocket client connected:", socket.id);
});

// TCP Server
const server = net.createServer((socket) => {
  console.log("GPS device connected:", socket.remoteAddress);

  socket.on("data", async (data) => {
    await handleGpsData(data, socket, io);
  });

  socket.on("end", () => console.log("🔌 Device disconnected"));
  socket.on("error", (err) => console.error("⚠ Socket Error:", err));
});

server.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`🔌 TCP Server listening on port ${process.env.PORT}`);
});
