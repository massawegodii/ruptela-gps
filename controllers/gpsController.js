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


// GET all GPS data
export const getAllGpsData = async (req, res) => {
  try {
    const data = await GpsData.find().sort({ timestamp: -1 });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch GPS data" });
  }
};


