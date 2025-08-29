'use client';

import { useState } from 'react';
import MapComponent from '@/components/MapComponent';
import Image from 'next/image';

interface ArrowData {
  start: google.maps.LatLngLiteral;
  end: google.maps.LatLngLiteral;
}

interface GeneratedView {
  description: string;
  imagePrompt: string;
  streetViewUrl: string;
}

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedView, setGeneratedView] = useState<GeneratedView | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [showResult, setShowResult] = useState(false);

  const handleArrowDrawn = async (arrow: ArrowData, location: string) => {
    setIsGenerating(true);
    setCurrentLocation(location);
    setShowResult(true);
    
    try {
      // Calculate direction from arrow
      const direction = calculateBearing(arrow.start, arrow.end);
      
      // Generate Street View URL
      const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${arrow.end.lat},${arrow.end.lng}&heading=${direction}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
      
      // Call API to generate description
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          direction,
          streetViewUrl
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGeneratedView(data);
      }
    } catch (error) {
      console.error('Error generating view:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const calculateBearing = (start: google.maps.LatLngLiteral, end: google.maps.LatLngLiteral): number => {
    const lat1 = start.lat * Math.PI / 180;
    const lat2 = end.lat * Math.PI / 180;
    const deltaLng = (end.lng - start.lng) * Math.PI / 180;
    
    const x = Math.sin(deltaLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
    
    const bearing = Math.atan2(x, y);
    return ((bearing * 180 / Math.PI) + 360) % 360;
  };

  return (
    <main className="relative w-full h-screen">
      <MapComponent onArrowDrawn={handleArrowDrawn} />
      
      {showResult && (
        <div className="absolute top-0 right-0 w-full md:w-1/2 h-full bg-white shadow-2xl overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">What the Arrow Sees</h2>
              <button
                onClick={() => setShowResult(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Location</h3>
                <p className="text-gray-800">{currentLocation}</p>
              </div>
              
              {isGenerating ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              ) : generatedView && (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Street View</h3>
                    <img 
                      src={generatedView.streetViewUrl} 
                      alt="Street View"
                      className="w-full rounded-lg shadow-md"
                    />
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">AI Generated Description</h3>
                    <p className="text-gray-700 leading-relaxed">{generatedView.description}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Image Generation Prompt</h3>
                    <p className="text-xs text-gray-600 font-mono">{generatedView.imagePrompt}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}