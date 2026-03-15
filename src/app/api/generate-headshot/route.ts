import { NextRequest, NextResponse } from 'next/server';
import { Client, handle_file } from '@gradio/client';
import { HEADSHOT_STYLES } from '@/lib/headshot/templates';

const HF_SPACE = 'ByteDance/DreamO';
const TIMEOUT_MS = 180_000; // 3 minutes (ZeroGPU cold-start + generation)

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

    // Look up the style prompt
    const style = HEADSHOT_STYLES.find((s) => s.id === body.styleId);
    if (!style) {
      return NextResponse.json({ error: 'Unknown style' }, { status: 400 });
    }

    // Convert source data URL to Blob
    const base64Data = body.sourceImage.replace(/^data:image\/\w+;base64,/, '');
    const sourceBuffer = Buffer.from(base64Data, 'base64');
    const sourceBlob = new Blob([new Uint8Array(sourceBuffer)], { type: 'image/webp' });

    // Connect to DreamO on HF ZeroGPU
    const client = await Client.connect(HF_SPACE);

    // Generate with ID preservation: face photo as ref_image1 with task "id"
    // ref_image2 is required by the API but can be null for single-reference generation
    const resultPromise = client.predict('/Generate', [
      handle_file(sourceBlob),  // ref_image1
      'id',                     // task_for_ref1
      null,                     // ref_image2 (unused)
      'ip',                     // task_for_ref2 (default, unused)
      style.prompt,             // prompt
      1024,                     // Width
      1024,                     // Height
      16,                       // num_steps
      4.5,                      // guidance
      -1,                       // seed
      512,                      // resolution for ref image
    ]);

    // Enforce timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Generation timed out. The AI service may be starting up — please try again.')),
        TIMEOUT_MS,
      ),
    );

    const result = await Promise.race([resultPromise, timeoutPromise]);

    // DreamO returns [generated_image, preprocess_output, seed]
    const data = result.data as Array<{ url?: string } | string | number | null>;
    const output = data?.[0] as { url?: string } | null;
    if (!output?.url) {
      return NextResponse.json({ error: 'No image generated' }, { status: 502 });
    }

    // Fetch the generated image from HF's temporary URL
    const imageRes = await fetch(output.url);
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Failed to retrieve generated image' }, { status: 502 });
    }

    const imageArrayBuffer = await imageRes.arrayBuffer();
    const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64');
    const contentType = imageRes.headers.get('content-type') || 'image/png';

    return NextResponse.json({
      image: `data:${contentType};base64,${imageBase64}`,
      styleId: body.styleId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
