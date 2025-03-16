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
  console.log(`📡 GPS Device Connected: ${socket.remoteAddress}:${socket.remotePort}`);

  socket.on("data", async (data) => {
    console.log(" Raw Data Received (Hex):", data.toString("hex"));

    try {
      const parsedData = parseRuptelaData(data);
      console.log(" Parsed Data:", parsedData);

      if (parsedData) {
        const gpsEntry = new GPSData(parsedData);
        await gpsEntry.save();
        console.log(" GPS Data Saved to MongoDB");
      }

      socket.write("ACK"); // Send ACK back to device
    } catch (err) {
      console.error(" Error Processing Data:", err);
    }
  });

  socket.on("close", () => {
    console.log(" GPS Device Disconnected");
  });

  socket.on("error", (err) => {
    console.error(" Socket Error:", err);
  });
});

// Start TCP Server
tcpServer.listen(TCP_PORT, "0.0.0.0", () => {
  console.log(` TCP Server Listening on Port ${TCP_PORT}`);
});

//  Add a default route for the root endpoint
app.get("/", (req, res) => {
  res.send(" Welcome to the Ruptela GPS API!");
});

// HTTP Endpoint to list stored GPS data
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
    const hexString = data.toString("hex");
    console.log(" Raw Data (Hex):", hexString);

    const imei = hexString.substring(0, 15);
    const latitude = parseInt(hexString.substring(16, 24), 16) / 10000000;
    const longitude = parseInt(hexString.substring(24, 32), 16) / 10000000;
    let speed = parseInt(hexString.substring(32, 34), 16);

    // If speed is invalid or suspiciously high, assume stationary
    if (speed > 100) speed = 0;

    return {
      imei,
      latitude,
      longitude,
      speed,
      timestamp: new Date(),
    };
  } catch (err) {
    console.error(" Error Parsing Data:", err);
    return null;
  }
}

