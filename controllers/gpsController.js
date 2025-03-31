import GpsData from "../models/GpsData.js";
import { parseRuptelaData } from "../utils/parser.js";

export const handleGpsData = async (data, socket, io) => {
  try {
    const parsedData = parseRuptelaData(data, socket);
    await new GpsData(parsedData).save();
    io.emit("gps-data", parsedData);
    socket.write(Buffer.from([0x01]));
  } catch (err) {
    console.error(" Error:", err);
  }
};
