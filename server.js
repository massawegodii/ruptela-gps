import dotenv from "dotenv";
dotenv.config();

import net from "net";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { handleGpsData } from "./controllers/gpsController.js";

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB error:", err));

// WebSocket server
const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
httpServer.listen(7000, () =>
  console.log(" WebSocket running at ws://64.23.202.81:7000")
);

// TCP server
const tcpServer = net.createServer((socket) => {
  console.log("Device connected:", socket.remoteAddress);
  socket.on("data", async (data) => {
    await handleGpsData(data, socket, io);
  });
  socket.on("end", () => console.log("🔌 Device disconnected"));
  socket.on("error", (err) => console.error("⚠ TCP Error:", err));
});

tcpServer.listen(process.env.PORT, "0.0.0.0", () =>
  console.log(`🛰️ TCP server listening on port ${process.env.PORT}`)
);
