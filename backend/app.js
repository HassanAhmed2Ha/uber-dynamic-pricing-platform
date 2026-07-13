const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

const connectToDb = require("./db/db");
const mapsRoutes    = require("./routes/maps.routes");
const rideRoutes    = require("./routes/ride.routes");

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

connectToDb();

// ---------------------------------------------------------------------------
// CORS — explicit origins for the three microservices
// ---------------------------------------------------------------------------

app.use(cors({ origin: '*' }));

// ---------------------------------------------------------------------------
// Body Parsing
// ---------------------------------------------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/", (_req, res) => {
    res.json({
        service: "Ryde Backend API",
        status:  "running",
        version: "2.0.0",
    });
});

app.use("/maps",     mapsRoutes);
app.use("/rides",    rideRoutes);

module.exports = app;