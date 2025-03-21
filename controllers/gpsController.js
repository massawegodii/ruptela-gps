import GpsData from "../models/GpsData.js";
import { parseRuptelaData } from "../utils/parser.js";

export const handleGpsData = async (data, socket, io) => {
  console.log(" Received Data:", data.toString("hex"));

  try {
    const parsedData = parseRuptelaData(data, socket);
    console.log("Parsed GPS Data:", parsedData);

    const gpsEntry = new GpsData(parsedData);
    await gpsEntry.save();
    console.log("Data saved to MongoDB");

    io.emit("gps-data", parsedData);
    socket.write(Buffer.from([0x01]));
  } catch (error) {
    console.error("Error handling GPS data:", error);
  }
};
