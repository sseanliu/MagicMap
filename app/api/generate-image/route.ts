import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { location, direction, streetViewUrl, mapImage } = await request.json();
    
    // Use the new image generation model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
    
    const cardinalDirection = getCardinalDirection(direction);
    
    // Create the content with both text and image
    let content: any[] = [
      { text: "Draw what I would see in the real world if I was standing at the red circle and looking in the direction of the arrow? First guess where this is and then draw it." }
    ];
    
    // Add the map image if provided
    if (mapImage) {
      // Remove the data:image/png;base64, prefix
      const base64Data = mapImage.replace(/^data:image\/[a-z]+;base64,/, '');
      content.push({
        inlineData: {
          mimeType: "image/png",
          data: base64Data,
        },
      });
    } else {
      // Fallback to text-only with coordinates
      content[0].text += ` Location coordinates: ${location}, facing ${cardinalDirection}.`;
    }
    
    console.log('Generating image with visual input:', !!mapImage);
    
    // Generate the image
    const result = await model.generateContent(content);
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
      imagePrompt: content[0].text,
      generatedImage: generatedImageBase64 ? `data:image/png;base64,${generatedImageBase64}` : null,
      textContent,
      streetViewUrl,
      usedVisualInput: !!mapImage
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