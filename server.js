import dotenv from "dotenv";
dotenv.config();

import net from "net";
import http from "http";
import express from "express";
import gpsRoutes from "./routes/gpsRoutes.js";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { handleGpsData } from "./controllers/gpsController.js";

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// WebSocket server
const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST", "DELETE", "PATCH"] },
});
httpServer.listen(6000, () =>
  console.log(" WebSocket running at ws://64.23.202.81:6000")
);


const app = express();
app.use(express.json());

app.use("/api/gps", gpsRoutes);

app.listen(5000, () => {
  console.log("HTTP API server running at http://localhost:5000");
});

// TCP server
const tcpServer = net.createServer((socket) => {
  console.log("Device connected:", socket.remoteAddress);
  socket.on("data", async (data) => {
    await handleGpsData(data, socket, io);
  });
  socket.on("end", () => console.log("Device disconnected"));
  socket.on("error", (err) => console.error(" TCP Error:", err));
});

tcpServer.listen(process.env.PORT, "0.0.0.0", () =>
  console.log(`TCP server listening on port ${process.env.PORT}`)
);
