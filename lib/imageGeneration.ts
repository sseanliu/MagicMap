import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export interface ViewpointData {
  location: string;
  direction: number;
  streetViewAvailable: boolean;
  landmarks?: string[];
}

export async function generateImageFromViewpoint(viewpoint: ViewpointData) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // First generate a detailed description of what the view might look like
    const descriptionPrompt = `Given a viewpoint at ${viewpoint.location} facing ${getCardinalDirection(viewpoint.direction)} degrees, describe in vivid detail what someone would see from street level. Include architectural details, natural features, atmosphere, and any notable landmarks. Make it photorealistic and specific to the location.`;
    
    const descriptionResult = await model.generateContent(descriptionPrompt);
    const description = descriptionResult.response.text();
    
    // Then use the image generation model
    const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const imagePrompt = `Create a photorealistic street-level view: ${description}. Style: Google Street View photography, clear day, high resolution, natural lighting.`;
    
    const imageResult = await imageModel.generateContent(imagePrompt);
    
    return {
      description,
      imageUrl: null, // Note: Gemini API returns base64 or needs separate endpoint for image generation
      prompt: imagePrompt
    };
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

function getCardinalDirection(degrees: number): string {
  const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  const index = Math.round(((degrees % 360) / 45)) % 8;
  return directions[index];
}

export function calculateViewDirection(start: google.maps.LatLngLiteral, end: google.maps.LatLngLiteral): number {
  const lat1 = start.lat * Math.PI / 180;
  const lat2 = end.lat * Math.PI / 180;
  const deltaLng = (end.lng - start.lng) * Math.PI / 180;
  
  const x = Math.sin(deltaLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  
  const bearing = Math.atan2(x, y);
  return ((bearing * 180 / Math.PI) + 360) % 360;
}