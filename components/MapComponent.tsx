'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, LoadScript, Polyline, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100vh',
};

const center = {
  lat: 37.7749,
  lng: -122.4194,
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: true,
};

interface ArrowData {
  start: google.maps.LatLngLiteral;
  end: google.maps.LatLngLiteral;
}

interface MapComponentProps {
  onArrowDrawn: (arrow: ArrowData, location: string) => void;
}

export default function MapComponent({ onArrowDrawn }: MapComponentProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [arrowPath, setArrowPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [currentArrow, setCurrentArrow] = useState<ArrowData | null>(null);
  const [dragStart, setDragStart] = useState<google.maps.LatLngLiteral | null>(null);
  
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMouseDown = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    
    const point = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };
    
    setDragStart(point);
    setArrowPath([point]);
    setIsDrawing(true);
  }, []);

  const handleMouseMove = useCallback((e: google.maps.MapMouseEvent) => {
    if (!isDrawing || !dragStart || !e.latLng) return;
    
    const endPoint = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };
    
    setArrowPath([dragStart, endPoint]);
  }, [isDrawing, dragStart]);

  const handleMouseUp = useCallback((e: google.maps.MapMouseEvent) => {
    if (!isDrawing || !dragStart || !e.latLng) return;
    
    const endPoint = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };
    
    const arrow: ArrowData = {
      start: dragStart,
      end: endPoint,
    };
    
    setArrowPath([dragStart, endPoint]);
    setCurrentArrow(arrow);
    setIsDrawing(false);
    setDragStart(null);
    
    const locationStr = `${arrow.end.lat.toFixed(6)}, ${arrow.end.lng.toFixed(6)}`;
    onArrowDrawn(arrow, locationStr);
  }, [isDrawing, dragStart, onArrowDrawn]);

  const clearArrow = () => {
    setArrowPath([]);
    setCurrentArrow(null);
    setIsDrawing(false);
    setDragStart(null);
  };

  const arrowHeadPath = useCallback(() => {
    if (!currentArrow) return [];
    
    const { start, end } = currentArrow;
    const angle = Math.atan2(end.lat - start.lat, end.lng - start.lng);
    const arrowLength = 0.0005;
    const arrowAngle = Math.PI / 6;
    
    const arrowHead1 = {
      lat: end.lat - arrowLength * Math.sin(angle - arrowAngle),
      lng: end.lng - arrowLength * Math.cos(angle - arrowAngle),
    };
    
    const arrowHead2 = {
      lat: end.lat - arrowLength * Math.sin(angle + arrowAngle),
      lng: end.lng - arrowLength * Math.cos(angle + arrowAngle),
    };
    
    return [arrowHead1, end, arrowHead2];
  }, [currentArrow]);

  return (
    <div className="relative w-full h-screen">
      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyD0juXx41DhaUrWrIk6i1fPYn9AO_aOrz8'}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={13}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          options={{
            ...options,
            draggable: !isDrawing, // Disable map dragging while drawing arrow
          }}
        >
          {arrowPath.length === 2 && (
            <>
              <Polyline
                path={arrowPath}
                options={{
                  strokeColor: '#FF0000',
                  strokeOpacity: 1,
                  strokeWeight: 3,
                }}
              />
              <Polyline
                path={arrowHeadPath()}
                options={{
                  strokeColor: '#FF0000',
                  strokeOpacity: 1,
                  strokeWeight: 3,
                }}
              />
              <Marker position={arrowPath[0]} />
            </>
          )}
        </GoogleMap>
      </LoadScript>
      
      <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold mb-2">Draw an Arrow</h2>
        <p className="text-sm text-gray-600 mb-3">
          {isDrawing 
            ? "Drag to set the arrow's direction" 
            : "Click and drag on the map to draw an arrow"}
        </p>
        {currentArrow && (
          <button
            onClick={clearArrow}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Clear Arrow
          </button>
        )}
      </div>
    </div>
  );
}