import GpsData from "../models/GpsData.js";
import { parseRuptelaData } from "../utils/parser.js";

export const handleGpsData = async (data, socket, io) => {
  console.log("Received Data:", data.toString("hex"));
  try {
    const parsedData = parseRuptelaData(data, socket);
    console.log(" Parsed:", parsedData);
    await new GpsData(parsedData).save();
    console.log("Saved to MongoDB");

    io.emit("gps-data", parsedData);
    socket.write(Buffer.from([0x01]));
  } catch (err) {
    console.error(" Error:", err);
  }
};
