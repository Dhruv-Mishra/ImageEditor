import { NextRequest, NextResponse } from 'next/server';
import { HEADSHOT_STYLES } from '@/lib/headshot/templates';
import {
  generateWithFallback,
  classifyError,
  extractErrorMessage,
} from '@/lib/headshot/providers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.sourceImage || typeof body.sourceImage !== 'string') {
      return NextResponse.json({ error: 'Missing source image' }, { status: 400 });
    }
    if (!body.styleId || typeof body.styleId !== 'string') {
      return NextResponse.json({ error: 'Missing style ID' }, { status: 400 });
    }
    if (!body.sourceImage.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const style = HEADSHOT_STYLES.find((s) => s.id === body.styleId);
    if (!style) {
      return NextResponse.json({ error: 'Unknown style' }, { status: 400 });
    }

    // Convert source data URL to Blob
    const base64Data = body.sourceImage.replace(/^data:image\/\w+;base64,/, '');
    const sourceBuffer = Buffer.from(base64Data, 'base64');
    const sourceBlob = new Blob([new Uint8Array(sourceBuffer)], { type: 'image/webp' });

    // Cascade through providers (DreamO → PuLID → optional Replicate)
    const result = await generateWithFallback(sourceBlob, style.prompt);

    return new NextResponse(result.imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'X-Style-Id': style.id,
        'X-Provider': result.provider,
      },
    });
  } catch (err: unknown) {
    console.error('[generate-headshot] Error:', err);

    const failClass = classifyError(err);
    const message = extractErrorMessage(err);

    if (failClass === 'quota' || (err && typeof err === 'object' && 'isQuota' in err)) {
      return NextResponse.json({ error: message }, { status: 429 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
