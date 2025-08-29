import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Image generation model specifically for images
const imageModel = 'gemini-2.0-flash-exp';

export async function POST(request: NextRequest) {
  try {
    const { location, direction, streetViewUrl } = await request.json();
    
    // Use Gemini to generate description based on the location
    const model = genAI.getGenerativeModel({ model: imageModel });
    
    const cardinalDirection = getCardinalDirection(direction);
    
    // Create a prompt to generate a vivid description
    const descriptionPrompt = `Photorealistic street view photograph: Okay, let's paint a picture of this ${cardinalDirection.toLowerCase()}-facing street view. **Image:** ${location}, facing ${cardinalDirection}, street level. **Description:** Generate a detailed, vivid description of what someone would see from this exact street-level viewpoint. Include specific architectural details, natural features, lighting, atmosphere, and any notable landmarks. Make it photorealistic and location-specific.`;
    
    const result = await model.generateContent(descriptionPrompt);
    const response = result.response;
    const description = response.text();
    
    // Create the image generation prompt
    const imageGenerationPrompt = `Image Generation Prompt: 
Photorealistic street view photograph from ${location}, facing ${cardinalDirection}. ${description}
Style: Google Street View photography, clear day, natural lighting, wide-angle lens.`;
    
    // Return the generated content
    return NextResponse.json({
      success: true,
      description,
      imagePrompt: imageGenerationPrompt,
      streetViewUrl
    });
    
  } catch (error) {
    console.error('Error in generate-image API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}

function getCardinalDirection(degrees: number): string {
  const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  const index = Math.round(((degrees % 360) / 45)) % 8;
  return directions[index];
}