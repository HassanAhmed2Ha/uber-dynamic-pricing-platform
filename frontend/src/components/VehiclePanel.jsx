import React from 'react';

/**
 * VehiclePanel
 * ============
 * Displays available vehicle types with their ML-predicted USD fares.
 *
 * Fare object shape (from AI Engine via backend):
 *   {
 *     car:  number,   // USD — ML base × 1.00
 *     auto: number,   // USD — ML base × 0.85
 *     moto: number,   // USD — ML base × 0.70
 *     ml_predicted_fare_usd:  number,  // raw ML output
 *     calculated_distance_km: number,  // trip distance
 *   }
 */
const VehiclePanel = (props) => {

    const { fare, fareLoading } = props;

    /** Format a USD fare value for display, e.g. "$12.34" */
    const usd = (amount) =>
        amount != null
            ? `$${Number(amount).toFixed(2)}`
            : '...';

    const distanceLabel = fare.calculated_distance_km
        ? `${fare.calculated_distance_km} km`
        : null;

    return (
        <div>
            {/* Close handle */}
            <h5
                className="p-1 text-center w-full absolute top-0 cursor-pointer"
                onClick={() => props.setVehiclePanel(false)}
            >
                <i className="text-3xl text-gray-200 ri-arrow-down-wide-fill"></i>
            </h5>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-2xl font-semibold">Choose a Vehicle</h3>
                {distanceLabel && (
                    <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-1 rounded-full">
                        📍 {distanceLabel}
                    </span>
                )}
            </div>

            {/* ML Badge */}
            {fare.ml_predicted_fare_usd && (
                <div className="mb-4 flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl px-3 py-2">
                    <span className="text-lg">🤖</span>
                    <div>
                        <p className="text-xs font-semibold text-indigo-700">AI-Predicted Base Fare</p>
                        <p className="text-sm font-bold text-indigo-900">
                            {usd(fare.ml_predicted_fare_usd)}
                            <span className="font-normal text-indigo-500 ml-1 text-xs">USD (dynamic pricing)</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Loading skeleton */}
            {fareLoading && (
                <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-gray-100 rounded-xl w-full" />
                    ))}
                </div>
            )}

            {/* Vehicle options */}
            {!fareLoading && (
                <>
                    {/* Car — UberGo */}
                    <div
                        id="vehicle-car"
                        onClick={() => {
                            props.setConfirmRidePanel(true);
                            props.setVehicleType('car');
                        }}
                        className="flex mb-2 border-2 active:border-black rounded-xl w-full items-center p-3 justify-between cursor-pointer hover:border-gray-400 transition-colors"
                    >
                        <img
                            className="h-14"
                            src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_638,w_956/v1555367349/assets/d7/3d4b80-1a5f-4a8b-ac2b-bf6c0810f050/original/Final_XL.png"
                            alt="UberGo Car"
                        />
                        <div className="w-1/2">
                            <h4 className="font-medium text-base">
                                UberGo <span><i className="ri-user-fill"></i>3</span>
                            </h4>
                            <h5 className="font-medium text-sm">2 mins away</h5>
                            <p className="font-normal text-xs text-gray-600">Affordable, compact rides</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-gray-900">{usd(fare.car)}</h2>
                            <p className="text-xs text-gray-400">USD</p>
                        </div>
                    </div>

                    {/* Moto */}
                    <div
                        id="vehicle-moto"
                        onClick={() => {
                            props.setConfirmRidePanel(true);
                            props.setVehicleType('moto');
                        }}
                        className="flex mb-2 border-2 active:border-black rounded-xl w-full items-center p-3 justify-between cursor-pointer hover:border-gray-400 transition-colors"
                    >
                        <img
                            className="h-14"
                            src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_368,w_552/v1649231091/assets/2c/7fa194-c954-49b2-9c6d-a3b8601370f5/original/Uber_Moto_Orange_312x208_pixels_Mobile.png"
                            alt="Uber Moto"
                        />
                        <div className="w-[60%]">
                            <h4 className="font-medium text-base">
                                Moto <span><i className="ri-user-fill"></i>1</span>
                            </h4>
                            <h5 className="font-medium text-sm">3 mins away</h5>
                            <p className="font-normal text-xs text-gray-600">Affordable motorcycle rides</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-gray-900">{usd(fare.moto)}</h2>
                            <p className="text-xs text-gray-400">USD</p>
                        </div>
                    </div>

                    {/* Auto */}
                    <div
                        id="vehicle-auto"
                        onClick={() => {
                            props.setConfirmRidePanel(true);
                            props.setVehicleType('auto');
                        }}
                        className="flex mb-2 border-2 active:border-black rounded-xl w-full items-center p-3 justify-between cursor-pointer hover:border-gray-400 transition-colors"
                    >
                        <img
                            className="h-14"
                            src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_368,w_552/v1648431773/assets/1d/db8c56-0204-4ce4-81ce-56a11a07fe98/original/Uber_Auto_558x372_pixels_Desktop.png"
                            alt="Uber Auto"
                        />
                        <div className="w-1/2">
                            <h4 className="font-medium text-base">
                                UberAuto <span><i className="ri-user-fill"></i>2</span>
                            </h4>
                            <h5 className="font-medium text-sm">1 min away</h5>
                            <p className="font-normal text-xs text-gray-600">Affordable auto rides</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-gray-900">{usd(fare.auto)}</h2>
                            <p className="text-xs text-gray-400">USD</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default VehiclePanel;