import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { generateCropSuggestion } from '@/lib/cropHeuristic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided.' },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted formats: JPEG, PNG, WebP.' },
        { status: 400 },
      );
    }

    // Validate file size (10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10 MB.' },
        { status: 400 },
      );
    }

    // Read image dimensions
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { error: 'Could not read image dimensions.' },
        { status: 400 },
      );
    }

    // Simulate AI processing latency
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Generate deterministic crop suggestion
    const suggestion = generateCropSuggestion(metadata.width, metadata.height);

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error('Error in /api/crop-suggest:', error);
    return NextResponse.json(
      { error: 'Failed to process image.' },
      { status: 500 },
    );
  }
}
