'use client';

import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, LoadScript, Polyline, Marker } from '@react-google-maps/api';
import html2canvas from 'html2canvas';

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
  onArrowDrawn: (arrow: ArrowData, location: string, mapImageBase64: string | null) => void;
}

export default function MapComponent({ onArrowDrawn }: MapComponentProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [arrowPath, setArrowPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [currentArrow, setCurrentArrow] = useState<ArrowData | null>(null);
  const [drawMode, setDrawMode] = useState<'pan' | 'arrow' | 'crop'>('pan');
  const [cropBounds, setCropBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [cropRectangle, setCropRectangle] = useState<google.maps.Rectangle | null>(null);
  
  // Use refs to track drawing state without React re-render delays
  const drawingRef = useRef(false);
  const startPointRef = useRef<google.maps.LatLngLiteral | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const cropStartRef = useRef<google.maps.LatLngLiteral | null>(null);
  
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMap(map);
    
    // Add direct event listeners to the map for better drag handling
    map.addListener('mousedown', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      
      const point = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };
      
      // Check current mode
      const currentMode = drawMode;
      
      if (currentMode === 'arrow') {
        drawingRef.current = true;
        startPointRef.current = point;
        setIsDrawing(true);
        setArrowPath([point]);
        
        // Disable map dragging
        map.setOptions({ draggable: false });
      } else if (currentMode === 'crop') {
        cropStartRef.current = point;
        // Start crop selection
        if (cropRectangle) {
          cropRectangle.setMap(null);
        }
        map.setOptions({ draggable: false });
      }
    });
    
    map.addListener('mousemove', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      
      const endPoint = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };
      
      if (drawingRef.current && startPointRef.current) {
        // Arrow drawing mode
        setArrowPath([startPointRef.current, endPoint]);
      } else if (cropStartRef.current) {
        // Crop selection mode
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(cropStartRef.current);
        bounds.extend(endPoint);
        
        if (cropRectangle) {
          cropRectangle.setBounds(bounds);
        } else {
          const rectangle = new google.maps.Rectangle({
            bounds: bounds,
            fillOpacity: 0.2,
            fillColor: '#FF0000',
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            map: map,
          });
          setCropRectangle(rectangle);
        }
      }
    });
    
    map.addListener('mouseup', (e: google.maps.MapMouseEvent) => {
      if (drawingRef.current && startPointRef.current) {
        // Handle arrow drawing completion
        const endPoint = e.latLng ? {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        } : startPointRef.current;
        
        // Check if the arrow has meaningful length
        const distance = Math.sqrt(
          Math.pow(endPoint.lat - startPointRef.current.lat, 2) + 
          Math.pow(endPoint.lng - startPointRef.current.lng, 2)
        );
        
        if (distance > 0.0001) { // Minimum arrow length
          const arrow: ArrowData = {
            start: startPointRef.current,
            end: endPoint,
          };
          
          setArrowPath([startPointRef.current, endPoint]);
          setCurrentArrow(arrow);
          
          const locationStr = `${arrow.end.lat.toFixed(6)}, ${arrow.end.lng.toFixed(6)}`;
          
          // Capture the map as image
          captureMapImage().then(imageBase64 => {
            onArrowDrawn(arrow, locationStr, imageBase64);
          });
        } else {
          setArrowPath([]);
        }
        
        drawingRef.current = false;
        startPointRef.current = null;
        setIsDrawing(false);
      } else if (cropStartRef.current && e.latLng) {
        // Handle crop selection completion
        const endPoint = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };
        
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(cropStartRef.current);
        bounds.extend(endPoint);
        
        setCropBounds(bounds);
        cropStartRef.current = null;
      }
      
      // Re-enable map dragging
      map.setOptions({ draggable: true });
    });
  }, [onArrowDrawn]);

  const clearArrow = () => {
    setArrowPath([]);
    setCurrentArrow(null);
    setIsDrawing(false);
    drawingRef.current = false;
    startPointRef.current = null;
  };

  const captureMapImage = async (): Promise<string | null> => {
    if (!map) return null;
    
    try {
      const mapDiv = map.getDiv();
      
      // If there's a crop area, we'll need to crop the screenshot
      if (cropBounds) {
        // Convert lat/lng bounds to pixel coordinates
        const projection = map.getProjection();
        if (!projection) return null;
        
        const ne = cropBounds.getNorthEast();
        const sw = cropBounds.getSouthWest();
        
        // For now, capture the full map and let the API handle the crop info
        const canvas = await html2canvas(mapDiv, {
          useCORS: true,
          allowTaint: true,
          scale: 1,
        });
        
        return canvas.toDataURL('image/png');
      } else {
        // Capture the full map
        const canvas = await html2canvas(mapDiv, {
          useCORS: true,
          allowTaint: true,
          scale: 1,
        });
        
        return canvas.toDataURL('image/png');
      }
    } catch (error) {
      console.error('Error capturing map image:', error);
      return null;
    }
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
          onLoad={handleMapReady}
          onUnmount={onUnmount}
          options={options}
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
        <h2 className="text-lg font-semibold mb-3">Tools</h2>
        
        {/* Tool buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setDrawMode('pan')}
            className={`p-3 rounded-lg transition ${
              drawMode === 'pan' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Pan mode"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13,1L11,1C10.45,1 10,1.45 10,2L10,7.29C9.53,7.11 9.03,7 8.5,7C6.57,7 5,8.57 5,10.5C5,12.43 6.57,14 8.5,14C9.03,14 9.53,13.89 10,13.71L10,22C10,22.55 10.45,23 11,23L13,23C13.55,23 14,22.55 14,22L14,13.71C14.47,13.89 14.97,14 15.5,14C17.43,14 19,12.43 19,10.5C19,8.57 17.43,7 15.5,7C14.97,7 14.47,7.11 14,7.29L14,2C14,1.45 13.55,1 13,1Z"/>
            </svg>
          </button>
          
          <button
            onClick={() => setDrawMode('arrow')}
            className={`p-3 rounded-lg transition ${
              drawMode === 'arrow' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Arrow drawing mode"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2,12A10,10 0 0,1 12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M7,12L12,7L17,12L14.5,12L14.5,16L9.5,16L9.5,12L7,12Z"/>
            </svg>
          </button>
          
          <button
            onClick={() => setDrawMode('crop')}
            className={`p-3 rounded-lg transition ${
              drawMode === 'crop' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Crop selection mode"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7,17V1H5V5H1V7H5V17A2,2 0 0,0 7,19H17V23H19V19H23V17H19V7A2,2 0 0,0 17,5H7V1M7,7H17V17H7V7Z"/>
            </svg>
          </button>
        </div>
        
        <div className="text-sm text-gray-600 mb-3">
          {drawMode === 'pan' && "Click and drag to move the map"}
          {drawMode === 'arrow' && (isDrawing ? "Drag to set the arrow's direction" : "Click and drag to draw an arrow")}
          {drawMode === 'crop' && "Click and drag to select crop area"}
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2">
          {currentArrow && (
            <button
              onClick={clearArrow}
              className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
            >
              Clear Arrow
            </button>
          )}
          
          {cropBounds && (
            <button
              onClick={() => {
                setCropBounds(null);
                if (cropRectangle) {
                  cropRectangle.setMap(null);
                  setCropRectangle(null);
                }
              }}
              className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition text-sm"
            >
              Clear Crop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}