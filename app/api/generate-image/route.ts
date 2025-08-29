import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { location, direction, streetViewUrl } = await request.json();
    
    // Use Gemini to analyze the street view and generate description
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const cardinalDirection = getCardinalDirection(direction);
    
    const prompt = `You are looking at ${location} facing ${cardinalDirection}.
    
    Generate a detailed, photorealistic description of what someone would see from this exact viewpoint at street level. Include:
    - Specific architectural details and building styles
    - Natural features (trees, sky, terrain)
    - Street elements (roads, sidewalks, signs)
    - Atmospheric conditions and lighting
    - Any notable landmarks or features visible
    
    Make it vivid and specific to create a photorealistic street view image.`;
    
    const result = await model.generateContent(prompt);
    const description = result.response.text();
    
    // For now, return the description and prompt
    // In production, you'd use an image generation API here
    return NextResponse.json({
      success: true,
      description,
      imagePrompt: `Photorealistic street view photograph: ${description}. Style: Google Street View, clear day, natural lighting, wide angle lens.`,
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