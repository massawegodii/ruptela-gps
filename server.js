const express = require("express");
const net = require("net");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(" MongoDB Connected"))
  .catch((err) => console.error(" MongoDB Connection Error:", err));

// Define GPS Data Schema
const gpsSchema = new mongoose.Schema({
  imei: String,
  latitude: Number,
  longitude: Number,
  speed: Number,
  timestamp: Date,
});

const GPSData = mongoose.model("GPSData", gpsSchema);

const TCP_PORT = process.env.TCP_PORT || 7000;
const HTTP_PORT = process.env.HTTP_PORT || 3000; 

// Create TCP Server
const tcpServer = net.createServer((socket) => {
  console.log(` GPS Device Connected: ${socket.remoteAddress}:${socket.remotePort}`);

  socket.on("data", async (data) => {
    console.log(" Raw Data Buffer:", data);
    console.log(" Raw Data as Hex:", data.toString("hex"));

    try {
      const parsedData = parseRuptelaData(data);
      console.log(" Parsed Data:", parsedData);

      if (parsedData) {
        const gpsEntry = new GPSData(parsedData);
        await gpsEntry.save();
        console.log(" GPS Data Saved to MongoDB");
      }

      socket.write(Buffer.from("01", "hex")); // Send ACK back to device
    } catch (err) {
      console.error(" Error Processing Data:", err);
    }
  });

  socket.on("close", () => {
    console.log("⚠️ GPS Device Disconnected");
  });

  socket.on("error", (err) => {
    console.error(" Socket Error:", err);
  });
});

// Start TCP Server
tcpServer.listen(TCP_PORT, "0.0.0.0", () => {
  console.log(` TCP Server Listening on Port ${TCP_PORT}`);
});

// Default API Route
app.get("/", (req, res) => {
  res.send(" Welcome to the Ruptela GPS API!");
});

// API Endpoint to List GPS Data
app.get("/gps-data", async (req, res) => {
  try {
    const data = await GPSData.find().sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    console.error(" Error Fetching GPS Data:", err);
    res.status(500).json({ error: "Failed to fetch GPS data" });
  }
});

// Start HTTP Server
app.listen(HTTP_PORT, "0.0.0.0", () => {
  console.log(` HTTP Server Listening on Port ${HTTP_PORT}`);
});

// Function to Parse Ruptela GPS Data
function parseRuptelaData(data) {
  try {
    console.log(" Raw Data (Hex):", data.toString("hex"));

    // Parse IMEI (Usually 8 bytes starting at byte 1)
    const imei = data.slice(1, 9).toString("hex");

    // Parse Latitude (4 bytes, Big Endian)
    const latitude = data.readInt32BE(9) / 10000000;

    // Parse Longitude (4 bytes, Big Endian)
    const longitude = data.readInt32BE(13) / 10000000;

    // Parse Speed (1 byte)
    let speed = data.readUInt8(17);

    // If speed is too high, assume GPS is stationary
    if (speed > 200) speed = 0;

    return {
      imei,
      latitude,
      longitude,
      speed,
      timestamp: new Date(),
    };
  } catch (err) {
    console.error("❌ Error Parsing Data:", err);
    return null;
  }
}
