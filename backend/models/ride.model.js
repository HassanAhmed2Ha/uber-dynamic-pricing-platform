const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  pickup: { type: String, required: true },
  destination: { type: String, required: true },
  fare: { type: Number, required: true },
  ml_predicted_fare_usd: { type: Number, required: true },
  distance_km: { type: Number, required: true },
  trip_timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ride', rideSchema);