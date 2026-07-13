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

const ALLOWED_ORIGINS = [
    "http://localhost:5173",   // Vite dev server (frontend)
    "http://localhost:5174",   // Vite alternative port
    "http://localhost:3000",   // Create-React-App fallback
    "http://localhost:5000",   // AI Engine (for internal health checks)
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (e.g. curl, Postman, server-to-server)
            if (!origin || ALLOWED_ORIGINS.includes(origin)) {
                return callback(null, true);
            }
            callback(new Error(`CORS: Origin '${origin}' is not allowed.`));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

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