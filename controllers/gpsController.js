const GpsData = require("../models/GpsData");
const { parseRuptelaData } = require("../utils/parser");

const handleGpsData = async (data, socket, io) => {
  console.log(" Received Data:", data.toString("hex"));
  try {
    const parsedData = parseRuptelaData(data, socket);
    console.log(" Parsed GPS Data:", parsedData);

    const gpsEntry = new GpsData(parsedData);
    await gpsEntry.save();
    console.log(" Data saved to MongoDB");

    // Broadcast to WebSocket clients
    io.emit("gps-data", parsedData);

    // Acknowledge back to device
    socket.write(Buffer.from([0x01]));
  } catch (error) {
    console.error(" Error handling GPS data:", error);
  }
};

module.exports = handleGpsData;
