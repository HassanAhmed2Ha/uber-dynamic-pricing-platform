import React, { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "remixicon/fonts/remixicon.css";
import LocationSearchPanel from "../components/LocationSearchPanel";
import VehiclePanel from "../components/VehiclePanel";
import ConfirmRide from "../components/ConfirmRide";

// In the Vercel monorepo, all services share the same origin.
// Empty string in production means all Axios calls use relative paths,
// which are routed by the root vercel.json to the correct serverless function.
const BASE_URL = import.meta.env.DEV
    ? "http://localhost:4000"
    : "/api/backend";

const pickupIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const dropoffIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const MapContent = ({ pickupCoords, destinationCoords }) => {
    const map = useMap();
    const [routePath, setRoutePath] = React.useState(null);

    React.useEffect(() => {
        if (!pickupCoords && !destinationCoords) {
            setRoutePath(null);
            return;
        }

        if (pickupCoords && !destinationCoords) {
            map.setView(pickupCoords, 14);
            setRoutePath(null);
            return;
        }

        if (!pickupCoords && destinationCoords) {
            map.setView(destinationCoords, 14);
            setRoutePath(null);
            return;
        }

        if (pickupCoords && destinationCoords) {
            const fetchRoute = async () => {
                try {
                    // OSRM expects coordinates in lon,lat order
                    const start = `${pickupCoords[1]},${pickupCoords[0]}`;
                    const end = `${destinationCoords[1]},${destinationCoords[0]}`;
                    const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?geometries=geojson`;

                    const response = await axios.get(url);
                    const data = response.data;

                    if (data.routes && data.routes.length > 0) {
                        const coordinates = data.routes[0].geometry.coordinates;
                        // OSRM returns [lon, lat], Leaflet expects [lat, lon]
                        const leafletPath = coordinates.map(coord => [coord[1], coord[0]]);
                        setRoutePath(leafletPath);

                        // Fit bounds to the actual polyline
                        const bounds = L.latLngBounds(leafletPath);
                        map.fitBounds(bounds, { padding: [50, 50] });
                    } else {
                        // Fallback to straight line
                        setRoutePath([pickupCoords, destinationCoords]);
                        const bounds = L.latLngBounds([pickupCoords, destinationCoords]);
                        map.fitBounds(bounds, { padding: [50, 50] });
                    }
                } catch (error) {
                    // Fail silently and render straight line
                    setRoutePath([pickupCoords, destinationCoords]);
                    const bounds = L.latLngBounds([pickupCoords, destinationCoords]);
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            };

            fetchRoute();
        }
    }, [pickupCoords, destinationCoords, map]);

    return (
        <>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {pickupCoords ? <Marker position={pickupCoords} icon={pickupIcon} /> : null}
            {destinationCoords ? <Marker position={destinationCoords} icon={dropoffIcon} /> : null}
            {routePath ? <Polyline positions={routePath} color="#2563eb" weight={5} opacity={0.7} /> : null}
        </>
    );
};

const Home = () => {
    const [pickup, setPickup] = useState("");
    const [destination, setDestination] = useState("");
    const [pickupCoords, setPickupCoords] = useState(null);
    const [destinationCoords, setDestinationCoords] = useState(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const [vehiclePanel, setVehiclePanel] = useState(false);
    const [confirmRidePanel, setConfirmRidePanel] = useState(false);

    // Fare data from AI Engine (via backend)
    const [fare, setFare] = useState({});
    const [fareLoading, setFareLoading] = useState(false);

    // Selected vehicle type
    const [vehicleType, setVehicleType] = useState(null);

    // Autocomplete suggestions
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [destinationSuggestions, setDestinationSuggestions] = useState([]);
    const [activeField, setActiveField] = useState(null);

    // Success state — shown after "Confirm Ride" is clicked
    const [rideConfirmed, setRideConfirmed] = useState(false);
    const [confirmedRideData, setConfirmedRideData] = useState(null);

    // Refs for GSAP panel animations
    const panelRef = useRef(null);
    const panelCloseRef = useRef(null);
    const vehiclePanelRef = useRef(null);
    const confirmRidePanelRef = useRef(null);

    // ------------------------------------------------------------------
    // Autocomplete (requires Google Maps API key in backend .env)
    // ------------------------------------------------------------------

    const fetchSuggestions = async (input, type) => {
        try {
            const response = await axios.get(`${BASE_URL}/maps/get-suggestions`, {
                params: { input },
            });
            const suggestions = response.data.suggestions || [];
            if (type === "pickup") setPickupSuggestions(suggestions);
            else setDestinationSuggestions(suggestions);
        } catch {
            // Autocomplete fails silently if Google Maps key is not yet set
        }
    };

    const handleInputChange = (e, type) => {
        const value = e.target.value;
        if (type === "pickup") {
            setPickup(value);
            setActiveField("pickup");
        } else {
            setDestination(value);
            setActiveField("destination");
        }
        if (value.trim()) fetchSuggestions(value, type);
        else {
            if (type === "pickup") setPickupSuggestions([]);
            else setDestinationSuggestions([]);
        }
    };

    // ------------------------------------------------------------------
    // GSAP Animations
    // ------------------------------------------------------------------

    useGSAP(() => {
        gsap.to(panelRef.current, { height: panelOpen ? "70%" : "0%", padding: panelOpen ? 24 : 0 });
        gsap.to(panelCloseRef.current, { opacity: panelOpen ? 1 : 0 });
    }, [panelOpen]);

    useGSAP(() => {
        gsap.to(vehiclePanelRef.current, {
            transform: vehiclePanel ? "translateY(0)" : "translateY(100%)",
        });
    }, [vehiclePanel]);

    useGSAP(() => {
        gsap.to(confirmRidePanelRef.current, {
            transform: confirmRidePanel ? "translateY(0)" : "translateY(100%)",
        });
    }, [confirmRidePanel]);

    // ------------------------------------------------------------------
    // Booking Flow
    // ------------------------------------------------------------------

    /**
     * Step 1 — Get ML fare from backend (which calls the AI Engine).
     * No auth header needed — routes are public.
     */
    async function findTrip() {
        if (!pickup || !destination) return;
        try {
            setFareLoading(true);
            setVehiclePanel(true);
            setPanelOpen(false);

            const response = await axios.get(`${BASE_URL}/rides/get-fare`, {
                params: { pickup, destination },
                // No Authorization header — public endpoint
            });

            setFare(response.data.fare);
        } catch (error) {
            console.error("Error fetching ML fare:", error);
            alert(error.response?.data?.detail || error.response?.data?.message || error.message);
            setVehiclePanel(false);
        } finally {
            setFareLoading(false);
        }
    }

    /**
     * Step 2 — Confirm ride.
     * Calls the backend, which stores the ride in MongoDB Atlas with ML fare.
     * On success, shows the confirmation success screen immediately —
     * no waiting for a driver, no socket events.
     */
    async function confirmRide() {
        try {
            const response = await axios.post(`${BASE_URL}/rides/create`, {
                pickup,
                destination,
                vehicleType,
            });

            // Immediately show success state — no driver wait
            setConfirmedRideData(response.data);
            setRideConfirmed(true);

            // Close all bottom panels
            setConfirmRidePanel(false);
            setVehiclePanel(false);
        } catch (error) {
            console.error("Error confirming ride:", error);
            alert("Failed to confirm ride. Please try again.");
        }
    }

    /**
     * Reset everything for a new search.
     */
    function bookAnother() {
        setRideConfirmed(false);
        setConfirmedRideData(null);
        setPickup("");
        setDestination("");
        setPickupCoords(null);
        setDestinationCoords(null);
        setFare({});
        setVehicleType(null);
    }

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------

    return (
        <div className="h-screen relative overflow-hidden">



            {/* AI Badge */}
            <div className="absolute top-5 right-5 z-10 flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                <span>🤖</span>
                <span>ML Dynamic Pricing</span>
            </div>

            {/* Map Background */}
            <div className="h-screen w-screen z-0 absolute top-0 left-0">
                <MapContainer 
                    center={[40.7128, -74.0060]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    dragging={true}
                    zoomControl={true}
                    doubleClickZoom={true}
                >
                    <MapContent pickupCoords={pickupCoords} destinationCoords={destinationCoords} />
                </MapContainer>
            </div>

            {/* ---- RIDE CONFIRMED SUCCESS OVERLAY ---- */}
            {rideConfirmed && confirmedRideData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">

                        {/* Success icon */}
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <i className="ri-checkbox-circle-fill text-5xl text-green-500"></i>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Ride Confirmed!</h2>
                        <p className="text-sm text-indigo-600 font-semibold mb-6">🤖 ML Fare Applied</p>

                        {/* Trip summary */}
                        <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-3 mb-6">
                            <div className="flex gap-3 items-start border-b pb-3">
                                <i className="ri-map-pin-user-fill text-xl text-gray-500 mt-0.5"></i>
                                <div>
                                    <p className="text-xs text-gray-400 font-medium">PICKUP</p>
                                    <p className="text-sm font-semibold text-gray-800">{pickup}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start border-b pb-3">
                                <i className="ri-map-pin-fill text-xl text-gray-500 mt-0.5"></i>
                                <div>
                                    <p className="text-xs text-gray-400 font-medium">DESTINATION</p>
                                    <p className="text-sm font-semibold text-gray-800">{destination}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <div>
                                    <p className="text-xs text-gray-400 font-medium">VEHICLE</p>
                                    <p className="text-sm font-semibold capitalize text-gray-800">{vehicleType}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 font-medium">FARE (USD)</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        ${confirmedRideData?.ride?.fare_usd?.toFixed(2) ?? "—"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ML breakdown */}
                        <div className="bg-indigo-50 rounded-xl px-4 py-3 text-left mb-6">
                            <p className="text-xs font-semibold text-indigo-700 mb-1">ML Engine Breakdown</p>
                            <div className="flex justify-between text-xs text-indigo-600">
                                <span>Base fare (model output)</span>
                                <span className="font-bold">
                                    ${confirmedRideData?.ride?.ml_predicted_fare_usd?.toFixed(2) ?? "—"}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs text-indigo-600 mt-0.5">
                                <span>Distance (Haversine)</span>
                                <span className="font-bold">
                                    {confirmedRideData?.ride?.distance_km ?? "—"} km
                                </span>
                            </div>
                        </div>

                        <button
                            id="book-another-btn"
                            onClick={bookAnother}
                            className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors"
                        >
                            Book Another Ride
                        </button>
                    </div>
                </div>
            )}

            {/* ---- MAIN BOOKING INTERFACE ---- */}
            <div className="flex flex-col justify-end h-screen absolute top-0 w-full pointer-events-none z-20">

                {/* Search bar */}
                <div className="h-[35%] p-6 bg-white relative pointer-events-auto">
                    <h5
                        ref={panelCloseRef}
                        onClick={() => setPanelOpen(false)}
                        className="absolute opacity-0 right-6 top-6 text-2xl cursor-pointer"
                    >
                        <i className="ri-arrow-down-wide-line"></i>
                    </h5>
                    <h4 className="text-3xl font-bold mb-3">Find a Trip</h4>
                    <div className="relative">
                        {/* Route line decoration */}
                        <div className="line absolute h-14 w-1 top-[30%] -translate-y-1/2 left-[11px] bg-gray-700 rounded-full"></div>
                        <input
                            id="pickup-input"
                            onClick={() => setPanelOpen(true)}
                            value={pickup}
                            onChange={(e) => handleInputChange(e, "pickup")}
                            className="bg-[#eee] px-12 py-2.5 text-base rounded-xl w-full mt-2"
                            type="text"
                            placeholder="Add a pick-up location"
                        />
                        <input
                            id="destination-input"
                            onClick={() => setPanelOpen(true)}
                            value={destination}
                            onChange={(e) => handleInputChange(e, "destination")}
                            className="bg-[#eee] px-12 py-2.5 text-base rounded-xl w-full mt-3"
                            type="text"
                            placeholder="Enter your destination"
                        />
                    </div>
                    <button
                        id="find-trip-btn"
                        onClick={findTrip}
                        disabled={fareLoading || !pickup.trim() || !destination.trim()}
                        className="bg-black text-white px-4 py-3 rounded-xl mt-4 w-full font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                        {fareLoading ? "🤖 Getting ML Fare..." : "Find Trip"}
                    </button>
                </div>

                {/* Location suggestions */}
                <div ref={panelRef} className="bg-white h-0 overflow-hidden pointer-events-auto">
                    <LocationSearchPanel
                        suggestions={activeField === "pickup" ? pickupSuggestions : destinationSuggestions}
                        setPanelOpen={setPanelOpen}
                        setVehiclePanel={setVehiclePanel}
                        setPickup={setPickup}
                        setDestination={setDestination}
                        setPickupCoords={setPickupCoords}
                        setDestinationCoords={setDestinationCoords}
                        activeField={activeField}
                    />
                </div>
            </div>

            {/* Vehicle selection panel */}
            <div
                ref={vehiclePanelRef}
                className="fixed z-50 bottom-0 bg-white w-full px-3 py-6 pt-12 translate-y-full rounded-t-3xl shadow-2xl"
            >
                <VehiclePanel
                    setVehicleType={setVehicleType}
                    fare={fare}
                    fareLoading={fareLoading}
                    setConfirmRidePanel={setConfirmRidePanel}
                    setVehiclePanel={setVehiclePanel}
                />
            </div>

            {/* Confirm ride panel */}
            <div
                ref={confirmRidePanelRef}
                className="fixed z-50 bottom-0 bg-white w-full px-3 py-6 pt-12 translate-y-full rounded-t-3xl shadow-2xl"
            >
                <ConfirmRide
                    confirmRide={confirmRide}
                    pickup={pickup}
                    destination={destination}
                    fare={fare}
                    vehicleType={vehicleType}
                    setConfirmRidePanel={setConfirmRidePanel}
                    setVehiclePanel={setVehiclePanel}
                />
            </div>
        </div>
    );
};

export default Home;
