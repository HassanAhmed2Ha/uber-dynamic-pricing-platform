const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectToDb = require("./db/db");
const mapsRoutes = require("./routes/maps.routes");
const rideRoutes = require("./routes/ride.routes");

const app = express();

// In serverless environments, we must await the DB connection per request
// before passing it to the routers, otherwise Mongoose operations will time out.
app.use(async (req, res, next) => {
    try {
        await connectToDb();
        next();
    } catch (err) {
        console.error("Database connection failed:", err.message);
        res.status(503).json({ message: "Service Unavailable", detail: "Database connection failed" });
    }
});

// Strip Vercel serverless prefix to allow standard Express routing to work seamlessly
app.use((req, res, next) => {
    if (req.url.startsWith('/api/backend')) {
        req.url = req.url.replace('/api/backend', '');
    }
    next();
});

// Open CORS policy — required for cross-origin requests between the Vercel
// frontend and backend deployments (separate subdomains).
app.use(cors({ origin: "*" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (_req, res) => {
    res.json({ service: "Ryde Backend API", status: "running", version: "2.0.0" });
});

app.use("/maps", mapsRoutes);
app.use("/rides", rideRoutes);

module.exports = app;