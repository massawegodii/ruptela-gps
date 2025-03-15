require("dotenv").config();
const net = require("net");
const mongoose = require("mongoose");

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Define GPS Data Schema
const gpsSchema = new mongoose.Schema({
  imei: String,
  latitude: Number,
  longitude: Number,
  speed: Number,
  timestamp: Date,
});

const GPSData = mongoose.model("GPSData", gpsSchema);

// Create TCP Server
const server = net.createServer((socket) => {
  console.log(`GPS Device Connected: ${socket.remoteAddress}:${socket.remotePort}`);

  socket.on("data", async (data) => {
    console.log("Raw Data Received (Hex):", data.toString("hex"));

    try {
      const parsedData = parseRuptelaData(data);
      console.log("Parsed Data:", parsedData);

      if (parsedData) {
        const gpsEntry = new GPSData(parsedData);
        await gpsEntry.save();
        console.log("GPS Data Saved to MongoDB");
      }

      // Acknowledge receipt of data
      socket.write("ACK");

    } catch (err) {
      console.error("Error Processing Data:", err);
    }
  });

  socket.on("close", () => {
    console.log("GPS Device Disconnected");
  });

  socket.on("error", (err) => {
    console.error("Socket Error:", err);
  });
});

const PORT = process.env.PORT || 7000;
server.listen(PORT, () => {
  console.log(`TCP Server Listening on Port ${PORT}`);
});

// Function to Parse Ruptela GPS Data (Modify according to your device's protocol)
function parseRuptelaData(data) {
  try {
    const hexString = data.toString("hex");

    return {
      imei: hexString.substring(0, 15), // Extract IMEI (example)
      latitude: parseInt(hexString.substring(16, 24), 16) / 10000000, // Convert hex to decimal
      longitude: parseInt(hexString.substring(24, 32), 16) / 10000000,
      speed: parseInt(hexString.substring(32, 34), 16),
      timestamp: new Date(),
    };
  } catch (err) {
    console.error("Error Parsing Data:", err);
    return null;
  }
}
