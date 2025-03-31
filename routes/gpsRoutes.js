import express from "express";
import { getAllGpsData } from "../controllers/gpsController.js";

const router = express.Router();

// GET all GPS data
router.get("/get-all", getAllGpsData);

export default router;
