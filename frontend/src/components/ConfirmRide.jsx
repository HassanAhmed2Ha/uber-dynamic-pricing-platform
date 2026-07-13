import React, { useState } from "react";

/**
 * ConfirmRide
 * ===========
 * Final booking confirmation panel.
 * Calls confirmRide() on click — the parent (Home) immediately shows
 * a success overlay, no driver-wait state needed.
 */
const ConfirmRide = ({ confirmRide, pickup, destination, fare, vehicleType, setConfirmRidePanel, setVehiclePanel }) => {

    const [confirming, setConfirming] = useState(false);

    const usd = (amount) =>
        amount != null ? `$${Number(amount).toFixed(2)}` : "...";

    const vehicleFare  = fare[vehicleType];
    const mlBaseFare   = fare.ml_predicted_fare_usd;
    const distanceKm   = fare.calculated_distance_km;

    const multiplierLabel = {
        car:  "1.00×",
        auto: "0.85×",
        moto: "0.70×",
    }[vehicleType] ?? "";

    async function handleConfirm() {
        setConfirming(true);
        try {
            await confirmRide();          // triggers success overlay in Home.jsx
        } finally {
            setConfirming(false);
        }
    }

    return (
        <div>
            {/* Close handle */}
            <h5
                className="p-1 text-center w-full absolute top-0 cursor-pointer"
                onClick={() => {
                    setConfirmRidePanel(false);
                    setVehiclePanel(true);   // go back to vehicle selection
                }}
            >
                <i className="text-3xl text-gray-200 ri-arrow-down-wide-fill"></i>
            </h5>

            <h3 className="text-2xl font-semibold mb-5">Confirm your Ride</h3>

            <div className="flex flex-col items-center gap-2">

                {/* Vehicle image */}
                <img
                    className="h-20"
                    src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_638,w_956/v1555367349/assets/d7/3d4b80-1a5f-4a8b-ac2b-bf6c0810f050/original/Final_XL.png"
                    alt="Selected vehicle"
                />

                <div className="w-full mt-4">

                    {/* Pickup */}
                    <div className="flex items-center gap-4 p-3 border-b-2">
                        <i className="text-2xl ri-map-pin-user-fill text-gray-500"></i>
                        <div>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Pickup</p>
                            <p className="text-sm font-semibold text-gray-800">{pickup}</p>
                        </div>
                    </div>

                    {/* Destination */}
                    <div className="flex items-center gap-4 p-3 border-b-2">
                        <i className="text-2xl ri-map-pin-fill text-gray-500"></i>
                        <div>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Destination</p>
                            <p className="text-sm font-semibold text-gray-800">{destination}</p>
                        </div>
                    </div>

                    {/* Fare row */}
                    <div className="flex items-center justify-between gap-4 p-3 border-b-2">
                        <div className="flex items-center gap-4">
                            <i className="text-2xl ri-money-dollar-circle-line text-gray-500"></i>
                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Fare · {vehicleType}</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {usd(vehicleFare)}
                                    <span className="text-sm font-normal text-gray-400 ml-1">USD</span>
                                </p>
                            </div>
                        </div>
                        {distanceKm && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                {distanceKm} km
                            </span>
                        )}
                    </div>

                    {/* ML transparency */}
                    <div className="flex items-start gap-3 p-3">
                        <span className="text-lg mt-0.5">🤖</span>
                        <div>
                            <p className="text-xs font-semibold text-indigo-700">Powered by Dynamic ML Pricing</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                AI base fare: <span className="font-semibold text-gray-600">{usd(mlBaseFare)}</span>
                                {multiplierLabel && <span> · {multiplierLabel} vehicle multiplier</span>}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Confirm button */}
                <button
                    id="confirm-ride-btn"
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors"
                >
                    {confirming
                        ? "Confirming..."
                        : `Confirm Ride — ${usd(vehicleFare)}`}
                </button>
            </div>
        </div>
    );
};

export default ConfirmRide;