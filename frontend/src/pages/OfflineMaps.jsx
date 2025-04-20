import React, { useState, useEffect } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

const trekkingRoutes = {
  annapurna: [
    { name: "Besisahar", position: [28.23776, 84.37021], distance: 0, time: "Start" },
    { name: "Chame", position: [28.2630, 84.2360], distance: 15, time: "6 hrs" },
    { name: "Manang", position: [28.6497, 84.0233], distance: 20, time: "7 hrs" },
    { name: "Tilicho Base Camp", position: [28.6835, 83.8804], distance: 10, time: "4 hrs" },
    { name: "Thorong La Pass", position: [28.7906, 83.9511], distance: 12, time: "6 hrs" },
    { name: "Muktinath", position: [28.8194, 83.8701], distance: 15, time: "5 hrs" },
    { name: "Jomsom", position: [28.7841, 83.7309], distance: 18, time: "6 hrs" }
  ],
  everest: [
    { name: "Lukla", position: [27.6867, 86.7314], distance: 0, time: "Start" },
    { name: "Namche Bazaar", position: [27.8167, 86.7169], distance: 13, time: "6 hrs" },
    { name: "Tengboche", position: [27.8361, 86.7636], distance: 9, time: "5 hrs" },
    { name: "Dingboche", position: [27.8941, 86.8310], distance: 11, time: "6 hrs" },
    { name: "Lobuche", position: [27.9404, 86.8106], distance: 7, time: "4 hrs" },
    { name: "Gorak Shep", position: [27.9775, 86.8284], distance: 4, time: "3 hrs" },
    { name: "Everest Base Camp", position: [28.0026, 86.8528], distance: 3, time: "2 hrs" }
  ],
  gosaikunda: [
    { name: "Dhunche", position: [28.2440, 85.2473], distance: 0, time: "Start" },
    { name: "Sing Gompa", position: [28.2430, 85.2965], distance: 10, time: "4 hrs" },
    { name: "Gosaikunda", position: [28.2431, 85.3360], distance: 8, time: "3 hrs" }
  ],
  langtang: [
    { name: "Syabrubesi", position: [28.1457, 85.3245], distance: 0, time: "Start" },
    { name: "Langtang Village", position: [28.2796, 85.5333], distance: 15, time: "7 hrs" },
    { name: "Kyanjin Gompa", position: [28.2964, 85.7011], distance: 7, time: "4 hrs" }
  ],
  Mardi: [
    { name: "Kande", position: [28.2450, 83.9776], distance: 0, time: "Start" },
    { name: "Deurali", position: [28.3172, 84.0897], distance: 10, time: "4 hrs" },
    { name: "Mardi Himal Base Camp", position: [28.3550, 84.1074], distance: 7, time: "3 hrs" },
    { name: "Forest Camp", position: [28.3315, 84.0740], distance: 8, time: "4 hrs" }
  ],
  kumai_dada: [
    { name: "Sundarijal", position: [27.9111, 85.3725], distance: 0, time: "Start" },
    { name: "Chisapani", position: [27.9784, 85.4816], distance: 10, time: "5 hrs" },
    { name: "Kumai Dada", position: [28.0102, 85.5104], distance: 6, time: "3 hrs" }
  ]
};

const OfflineMaps = () => {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [routeData, setRouteData] = useState(trekkingRoutes.annapurna); // Default route to show initially

  // Update the selected route when search query changes
  useEffect(() => {
    if (searchQuery) {
      const route = Object.keys(trekkingRoutes).find(route =>
        route.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSelectedRoute(route);
      setRouteData(trekkingRoutes[route] || null); // Set the corresponding route data
    } else {
      setRouteData(trekkingRoutes.annapurna); // Show Annapurna initially
    }
  }, [searchQuery]);

  // Format the download link for the route map
  const getDownloadLink = (route) => {
    return `${import.meta.env.VITE_API_URL}/api/admin/maps/download/${route}.pdf`; // Assuming map is a PDF for example
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Nepal Trekking Routes</h1>
      <p className="text-gray-600 mb-4">Explore the accurate trekking routes</p>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search trekking routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Downloadable Map Link */}
      {selectedRoute && routeData && (
        <div className="mb-4">
          <a
            href={getDownloadLink(selectedRoute)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="h-5 w-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download Route Map
          </a>
        </div>
      )}

      {/* Map Display */}
      {routeData && (
        <div className="mb-8 h-[500px] rounded-lg overflow-hidden shadow-lg">
          <MapContainer center={routeData[0].position} zoom={10} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Connecting Markers with Trekking Route */}
            <Polyline positions={routeData.map(point => point.position)} color="blue" weight={4} />

            {/* Key Rest Points Markers */}
            {routeData.map((point, index) => (
              <Marker key={index} position={point.position}>
                <Popup>
                  <strong>{point.name}</strong>
                  <br />
                  Distance from last: {point.distance} km
                  <br />
                  Estimated time: {point.time}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {!routeData && searchQuery && <p className="text-red-600">No matching route found.</p>}
    </div>
  );
};

export default OfflineMaps;
