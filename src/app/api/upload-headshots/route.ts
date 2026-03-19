import { NextRequest, NextResponse } from 'next/server';

/** Maximum number of headshot images per request */
const MAX_IMAGES = 5;

/** Maximum size of a single base64 image (~5 MB decoded) */
const MAX_IMAGE_SIZE = 7_000_000; // ~5 MB file ≈ 6.67 MB base64

interface HeadshotPayload {
  images: Array<{
    data: string; // data URL (image/webp)
    pose: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: HeadshotPayload = await request.json();

    if (!body.images || !Array.isArray(body.images)) {
      return NextResponse.json(
        { error: 'Missing images array' },
        { status: 400 },
      );
    }

    if (body.images.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Too many images (max ${MAX_IMAGES})` },
        { status: 400 },
      );
    }

    // Validate each image
    for (let i = 0; i < body.images.length; i++) {
      const img = body.images[i];

      if (!img.data || typeof img.data !== 'string') {
        return NextResponse.json(
          { error: `Image ${i + 1}: missing data` },
          { status: 400 },
        );
      }

      if (!img.data.startsWith('data:image/')) {
        return NextResponse.json(
          { error: `Image ${i + 1}: invalid image format` },
          { status: 400 },
        );
      }

      if (img.data.length > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `Image ${i + 1}: exceeds size limit` },
          { status: 400 },
        );
      }

      if (!img.pose || typeof img.pose !== 'string') {
        return NextResponse.json(
          { error: `Image ${i + 1}: missing pose label` },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      count: body.images.length,
      poses: body.images.map((img) => img.pose),
    });
  } catch (err) {
    console.error('[upload-headshots] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
