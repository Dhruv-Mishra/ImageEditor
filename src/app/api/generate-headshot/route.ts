import { NextRequest, NextResponse } from 'next/server';
import { Client, handle_file } from '@gradio/client';
import { HEADSHOT_STYLES } from '@/lib/headshot/templates';

const HF_SPACE = 'ByteDance/DreamO';
const TIMEOUT_MS = 180_000; // 3 minutes (ZeroGPU cold-start + generation)

/** Discover the correct API endpoint name from the Space. */
async function discoverEndpoint(client: InstanceType<typeof Client>): Promise<string> {
  try {
    const api = await client.view_api();
    const endpoints = Object.keys(api.named_endpoints || {});
    console.log('[generate-headshot] Available endpoints:', endpoints);
    const match = endpoints.find(
      (ep) => ep.toLowerCase().includes('generate') || ep.toLowerCase().includes('predict'),
    );
    if (match) return match;
    if (endpoints.length > 0) return endpoints[0];
  } catch (err) {
    console.warn('[generate-headshot] view_api failed, using fallback:', err);
  }
  return '/predict';
}

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

    const client = await Client.connect(HF_SPACE);
    const endpoint = await discoverEndpoint(client);
    console.log('[generate-headshot] Using endpoint:', endpoint);

    // DreamO v1.1 generate_image parameter order (17 params)
    const resultPromise = client.predict(endpoint, [
      handle_file(sourceBlob),  // ref_image1
      null,                     // ref_image2  (unused)
      'id',                     // ref_task1   (face ID preservation)
      'ip',                     // ref_task2   (default, unused)
      style.prompt,             // prompt
      '-1',                     // seed        (random)
      768,                      // width       (reduced for faster generation)
      768,                      // height      (reduced for faster generation)
      512,                      // ref_res
      12,                       // num_steps   (v1.1 turbo default)
      4.5,                      // guidance    (v1.1 default)
      1,                        // true_cfg
      0,                        // cfg_start_step
      0,                        // cfg_end_step
      '',                       // neg_prompt
      3.5,                      // neg_guidance
      0,                        // first_step_guidance
    ]);

    // Enforce timeout — clear on resolution to avoid leaking the timer
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Generation timed out. The AI service may be starting up — please try again.')),
        TIMEOUT_MS,
      );
    });

    let result;
    try {
      result = await Promise.race([resultPromise, timeoutPromise]);
      clearTimeout(timeoutId!);
    } catch (raceErr) {
      clearTimeout(timeoutId!);
      resultPromise.catch(() => {});
      throw raceErr;
    }

    // DreamO returns [generated_image, debug_images, seed]
    const data = result.data as Array<{ url?: string } | string | number | null>;
    const output = data?.[0] as { url?: string } | null;
    if (!output?.url) {
      return NextResponse.json({ error: 'No image generated' }, { status: 502 });
    }

    const imageRes = await fetch(output.url);
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Failed to retrieve generated image' }, { status: 502 });
    }

    // Stream the image directly as binary — avoids base64 encoding overhead
    const imageBuffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get('content-type') || 'image/png';

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'X-Style-Id': body.styleId,
      },
    });
  } catch (err) {
    console.error('[generate-headshot] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
