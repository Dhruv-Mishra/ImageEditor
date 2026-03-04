import { NextRequest, NextResponse } from 'next/server';

const NVIDIA_EMBED_URL = 'https://integrate.api.nvidia.com/v1/embeddings';

export async function POST(request: NextRequest) {
  const apiKey = process.env.NVIDIA_EMBED_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'NVIDIA Embed API key not configured' },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { text, inputType = 'passage' } = body as {
      text: string;
      inputType?: 'passage' | 'query';
    };

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "text" field' },
        { status: 400 },
      );
    }

    // Truncate to ~8000 tokens (~32000 chars) to stay within model limits
    const truncated = text.slice(0, 32000);

    const payload = {
      model: 'nvidia/nv-embedqa-e5-v5',
      input: [truncated],
      input_type: inputType,
      encoding_format: 'float',
    };

    const response = await fetch(NVIDIA_EMBED_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA Embed API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to generate embedding' },
        { status: response.status },
      );
    }

    const data = await response.json();
    const embedding: number[] = data.data?.[0]?.embedding ?? [];

    return NextResponse.json({ embedding });
  } catch (err) {
    console.error('Embedding error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
