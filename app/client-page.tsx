"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Header from "./components/header";
import Landing from "./components/landing";
import LiquefactionSidebar from "./components/sidebar";
import Comparison from "./components/comparison";
import PredictingModal from "./components/modal";
import InputModal from "./components/input-modal";
import { predictByLocation } from "@/lib/actions/liquefaction";

interface PredictionData {
  location: {
    latitude: number;
    longitude: number;
    nearest_borehole_distance_km?: number;
  };
  risk_assessment: {
    risk_level: "VERY LOW" | "LOW" | "HIGH" | "VERY HIGH";
    probability: number;
    severity: string;
    factor_of_safety?: number;
    confidence?: string;
    data_source?: string;
  };
  soil_parameters: {
    spt_n60: number;
    unit_weight: number;
    csr: number;
    crr: number;
    gwl: number;
    fines_percent: number;
    source?: string;
  };
  settlement: {
    settlement_cm: number;
    severity: string;
    lpi?: number;
    lpi_severity?: string;
  };
  bearing_capacity: {
    allowable_bearing_capacity_kpa: number;
    capacity_reduction_percent: number;
  };
  foundation_recommendation?: {
    base_m: number;
    depth_m: number;
    lb_ratio?: number;
  };
  recommendations: string[];
}

// Optimize Map import
const Map = dynamic(() => import("./components/map"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
        <span className="text-sm font-medium text-slate-600">
          Loading map...
        </span>
      </div>
    </div>
  ),
});

export default function ClientPage() {
  const [location, setLocation] = useState("Tarlac City");
  const [isPredicting, setIsPredicting] = useState(false);
  const [externalLocation, setExternalLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [predictionData, setPredictionData] = useState<PredictionData | null>(
    null,
  );
  const [showLanding, setShowLanding] = useState(true);
  const [showInputModal, setShowInputModal] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Reverse geocode and update location name
  const handleLocationChange = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      );
      const data = await response.json();
      const address = data.address || {};
      const locationName =
        address.city ||
        address.municipality ||
        address.town ||
        address.village ||
        address.county ||
        address.state ||
        "Unknown Location";
      setLocation(locationName);
    } catch {
      setLocation(`Coordinates: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
    }
  }, []);

  // Called when a location is selected (map click or header input)
  // Nothing is fetched yet — just store the location and open the modal
  const handleRequestPrediction = useCallback(
    (lat: number, lng: number) => {
      setShowLanding(false);
      setPendingLocation({ lat, lng });
      setExternalLocation({ lat, lng });
      setShowInputModal(true);
    },
    [],
  );

  // Called when user submits the input modal
  const handleInputModalSubmit = useCallback(
    async (qActual: number, magnitude: number, depth: number, tYears: number) => {
      if (!pendingLocation) return;
      setShowInputModal(false);
      setIsPredicting(true);
      try {
        const result = await predictByLocation(
          pendingLocation.lat,
          pendingLocation.lng,
          qActual,
          magnitude,
          depth,
          tYears,
        );
        if (result.success && result.data) {
          setPredictionData(result.data as unknown as PredictionData);
          // Reverse geocode only after the user confirms
          handleLocationChange(pendingLocation.lat, pendingLocation.lng);
        }
      } catch (error) {
        console.error("Prediction error:", error);
      } finally {
        setIsPredicting(false);
      }
    },
    [pendingLocation, handleLocationChange],
  );

  // Memoize comparison toggle
  const toggleComparison = useCallback(() => {
    setShowComparison((prev) => !prev);
  }, []);

  if (showLanding) {
    return (
      <>
        <Landing onRequestPrediction={handleRequestPrediction} />
        <InputModal
          open={showInputModal}
          onSubmit={handleInputModalSubmit}
          onClose={() => setShowInputModal(false)}
        />
        <PredictingModal
          open={isPredicting}
          message="Running soil liquefaction analysis…"
        />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <Header onRequestPrediction={handleRequestPrediction} />
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {showComparison ? (
          <Comparison
            onBack={() => setShowComparison(false)}
            predictionData={predictionData}
          />
        ) : (
          <LiquefactionSidebar
            location={location}
            predictionData={predictionData}
            onToggleComparison={toggleComparison}
            onReinput={() => setShowInputModal(true)}
          />
        )}
        <div className="flex-1 h-1/2 md:h-full">
          <Map
            externalLocation={externalLocation}
            onRequestPrediction={handleRequestPrediction}
          />
        </div>
      </div>
      <InputModal
        open={showInputModal}
        onSubmit={handleInputModalSubmit}
        onClose={() => setShowInputModal(false)}
      />
      <PredictingModal
        open={isPredicting}
        message="Running soil liquefaction analysis…"
      />
    </div>
  );
}
