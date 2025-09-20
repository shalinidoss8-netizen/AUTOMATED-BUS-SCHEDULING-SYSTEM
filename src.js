
import React, { useState, useEffect } from 'react';
import { MapPin, Bus, Search, Navigation, Clock, Users } from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

function App() {
  const [buses, setBuses] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBus, setSelectedBus] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch buses from backend
  const fetchBuses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/buses`);
      setBuses(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching buses:', error);
      setError('Failed to fetch bus data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('busLocationUpdate', (updatedBus) => {
      setBuses(prevBuses => 
        prevBuses.map(bus => 
          bus._id === updatedBus._id ? updatedBus : bus
        )
      );
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Initial data fetch
    fetchBuses();

    return () => {
      newSocket.close();
    };
  }, []);

  // Get unique routes for filter dropdown
  const routes = [...new Set(buses.map(bus => bus.routeNumber))];

  const filteredBuses = buses.filter(bus => 
    (selectedRoute === '' || bus.routeNumber === selectedRoute) &&
    (searchQuery === '' || 
     bus.routeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
     bus.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
     bus.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (bus.currentStop && bus.currentStop.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Bus className="w-16 h-16 text-red-600 animate-bounce mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Loading DTC Bus Tracker...</h2>
          <p className="text-gray-600">Connecting to live bus data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchBuses}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-red-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bus className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">DTC Live Tracker</h1>
                <p className="text-red-100 text-sm">Delhi Transport Corporation</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-red-100">Live Updates</div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-sm">{isConnected ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Search and Filters */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Search & Filter</h2>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search route, stop, or destination..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select 
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
              >
                <option value="">All Routes</option>
                {routes.map(route => (
                  <option key={route} value={route}>Route {route}</option>
                ))}
              </select>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Live Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Buses</span>
                  <span className="font-semibold text-green-600">{buses.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">On Time</span>
                  <span className="font-semibold text-green-600">
                    {buses.filter(b => b.status === 'On Time').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Delayed</span>
                  <span className="font-semibold text-red-600">
                    {buses.filter(b => b.status === 'Delayed').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Map and Bus List */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Mock Map */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gray-800 text-white p-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Live Bus Locations - Delhi
                </h3>
              </div>
              <div className="relative h-80 bg-gradient-to-br from-green-100 to-blue-100 p-4">
                {/* Mock Delhi Map Background */}
                <div className="absolute inset-4 bg-gray-200 rounded-lg opacity-30"></div>
                <div className="absolute top-6 left-6 text-xs text-gray-600 font-semibold">DELHI MAP</div>
                
                {/* Bus Markers */}
                {filteredBuses.map((bus, index) => (
                  <div
                    key={bus._id}
                    className={`absolute transform -translate-x-2 -translate-y-2 cursor-pointer transition-all duration-300 hover:scale-110 ${
                      selectedBus?._id === bus._id ? 'z-20' : 'z-10'
                    }`}
                    style={{
                      left: `${20 + (index * 15) % 60}%`,
                      top: `${25 + (index * 20) % 40}%`
                    }}
                    onClick={() => setSelectedBus(bus)}
                  >
                    <div className={`w-4 h-4 rounded-full ${
                      bus.status === 'On Time' ? 'bg-green-500' : 'bg-red-500'
                    } border-2 border-white shadow-lg animate-pulse`}></div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                      Route {bus.routeNumber}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-gray-50 text-sm text-gray-600">
                💡 Real backend connected! Bus data updates every 5 seconds via WebSocket.
              </div>
            </div>

            {/* Bus List */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800">Live Bus Updates ({filteredBuses.length})</h3>
              {filteredBuses.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-8 text-center">
                  <Bus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No buses found matching your search criteria.</p>
                </div>
              ) : (
                filteredBuses.map(bus => (
                  <div
                    key={bus._id}
                    className={`bg-white rounded-xl shadow-md p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedBus?._id === bus._id ? 'ring-2 ring-red-500 transform scale-[1.02]' : ''
                    }`}
                    onClick={() => setSelectedBus(bus)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="bg-red-100 p-2 rounded-lg">
                          <Bus className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg text-gray-800">Route {bus.routeNumber}</h4>
                          <p className="text-gray-600 text-sm">{bus.registrationNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          bus.status === 'On Time' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {bus.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">From</p>
                        <p className="font-medium text-gray-800">{bus.from}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">To</p>
                        <p className="font-medium text-gray-800">{bus.to}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">At: {bus.currentStop || 'Updating...'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">ETA: {bus.eta || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">{bus.currentPassengers}/{bus.capacity}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2 ml-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(bus.currentPassengers / bus.capacity) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {selectedBus?._id === bus._id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-semibold text-gray-800 mb-2">Next Stops</h5>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>• {bus.nextStop} (3 min)</div>
                          <div>• Connaught Place (8 min)</div>
                          <div>• Rajiv Chowk Metro (12 min)</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;