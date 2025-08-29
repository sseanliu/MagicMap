import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { location, direction, streetViewUrl } = await request.json();
    
    // Use the new image generation model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
    
    const cardinalDirection = getCardinalDirection(direction);
    
    // Create a descriptive prompt for image generation following best practices
    const imagePrompt = `A photorealistic street-level view from ${location}, facing ${cardinalDirection}. The scene shows a typical street view with buildings lining both sides of the road, captured during daytime with clear natural lighting. The perspective is from the middle of the street at eye level, showing architectural details, sidewalks, street elements, and any visible landmarks. The image should look like a Google Street View photograph with a wide-angle lens capturing the full environment in crisp detail.`;
    
    console.log('Generating image with prompt:', imagePrompt);
    
    // Generate the image
    const result = await model.generateContent(imagePrompt);
    const response = result.response;
    
    // Extract the generated image from the response
    let generatedImageBase64 = null;
    let textContent = '';
    
    if (response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            textContent += part.text;
          } else if (part.inlineData) {
            // This is the generated image in base64
            generatedImageBase64 = part.inlineData.data;
          }
        }
      }
    }
    
    // Return the generated content
    return NextResponse.json({
      success: true,
      imagePrompt,
      generatedImage: generatedImageBase64 ? `data:image/png;base64,${generatedImageBase64}` : null,
      textContent,
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