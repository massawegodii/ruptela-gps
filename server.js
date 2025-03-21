require("dotenv").config();
const net = require("net");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const handleGpsData = require("./controllers/gpsController");

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(" MongoDB Connected"))
  .catch((err) => console.error(" MongoDB Connection Error:", err));

// WebSocket Server Setup
const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
httpServer.listen(7000, () =>
  console.log(" WebSocket.IO listening on ws://64.23.202.81:7000")
);

// WebSocket Events
io.on("connection", (socket) => {
  console.log(" WebSocket client connected:", socket.id);
});

// TCP Server to receive GPS data
const server = net.createServer((socket) => {
  socket.on("data", async (data) => {
    await handleGpsData(data, socket, io);
  });

  socket.on("end", () => console.log(" Device disconnected"));
  socket.on("error", (err) => console.error("⚠ Socket Error:", err));
});

server.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`TCP Server listening on port ${process.env.PORT}`);
});
