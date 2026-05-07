"use client";

import { Waves, MapPin, Search, ArrowRight, LogIn, LogOut } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import LoginModal from "./login-modal";
import LogoutConfirmModal from "./logout-confirm-modal";

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface LandingProps {
  onRequestPrediction: (lat: number, lng: number) => void;
}

export default function Landing({ onRequestPrediction }: LandingProps) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("admin_authenticated") === "true";
  });
  const searchInputRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    window.dispatchEvent(new Event("auth-change"));
    setIsLoggedIn(false);
    setShowLogoutModal(false);
  };

  useEffect(() => {
    if (searchInputRef.current && showResults) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [showResults, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      onRequestPrediction(lat, lng);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat.toFixed(4));
        setLongitude(lng.toFixed(4));
        setIsLocating(false);
        onRequestPrediction(lat, lng);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to get your location. Please check your browser permissions.");
        setIsLocating(false);
      },
    );
  };

  const handleSearch = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    try {
      // Tarlac Province bounding box: SW(15.40,120.30) → NE(15.90,120.80)
      const TARLAC_VIEWBOX = "120.30,15.90,120.80,15.40";
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Tarlac, Philippines")}&limit=8&countrycodes=ph&viewbox=${TARLAC_VIEWBOX}&bounded=1`,
      );
      const data = (await response.json()) as SearchResult[];
      const filtered = data.filter((r) => {
        const lat = parseFloat(r.lat);
        const lon = parseFloat(r.lon);
        return lat >= 15.40 && lat <= 15.90 && lon >= 120.30 && lon <= 120.80;
      });
      setSearchResults(filtered);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching location:", error);
      setSearchResults([]);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
  };

  const handleSelectResult = (result: SearchResult) => {
    setShowResults(false);
    setSearchResults([]);
    setSearchQuery("");
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setLatitude(lat.toFixed(4));
    setLongitude(lng.toFixed(4));
    onRequestPrediction(lat, lng);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-emerald-50 flex flex-col items-center justify-center px-4 relative">
      {/* Login / Logout button — top right */}
      <div className="absolute top-4 right-4">
        {isLoggedIn ? (
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-600 text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <LogOut size={15} className="text-red-500" />
            Logout
          </button>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <LogIn size={15} className="text-emerald-600" />
            Login
          </button>
        )}
      </div>

      {/* Logo + Title */}
      <div className="flex flex-col items-center mb-10">
        <div className="bg-emerald-600 p-4 rounded-xl mb-5 shadow-lg shadow-emerald-200">
          <Waves className="text-white" size={36} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight text-center">
          LIQUEFACT
        </h1>
        <p className="text-slate-500 text-sm md:text-base mt-3 text-center max-w-sm">
          Geotechnical risk analysis for any location. Select a point to begin your soil assessment.
        </p>
      </div>

      {/* Input Card */}
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xl shadow-slate-200/60">
        {/* Search by name */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            Search Location
          </label>
          <div className="relative" ref={searchInputRef}>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={15}
            />
            <input
              type="text"
              placeholder="Search for a city or address..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-colors"
            />
          </div>
          {typeof window !== "undefined" &&
            showResults &&
            searchResults.length > 0 &&
            createPortal(
              <div
                style={{
                  position: "fixed",
                  top: `${dropdownPosition.top + 4}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${dropdownPosition.width}px`,
                  zIndex: 99999,
                }}
                className="bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto"
              >
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    <div className="text-xs text-slate-700 break-words">{result.display_name}</div>
                  </button>
                ))}
              </div>,
              document.body,
            )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Coordinates */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            Enter Coordinates
          </label>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-colors"
            />
            <input
              type="text"
              placeholder="Longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-colors"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"
            >
              Go
              <ArrowRight size={14} />
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Use My Location */}
        <button
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MapPin size={15} className="text-emerald-600" />
          {isLocating ? "Locating..." : "Use My Location"}
        </button>
      </div>

      <p className="text-slate-400 text-xs mt-6">
        Or click anywhere on the map after entering
      </p>

      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setIsLoggedIn(true)}
      />
      <LogoutConfirmModal
        open={showLogoutModal}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}
