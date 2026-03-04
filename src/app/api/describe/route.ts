import { NextRequest, NextResponse } from 'next/server';

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export async function POST(request: NextRequest) {
  const apiKey = process.env.NVIDIA_VISION_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'NVIDIA Vision API key not configured' },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Read the image and convert to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    const payload = {
      model: 'mistralai/ministral-14b-instruct-2512',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this image concisely in 2-3 plain text sentences. Do not use markdown, bullet points, or emojis.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 512,
      temperature: 0.15,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stream: false,
    };

    const response = await fetch(NVIDIA_API_URL, {
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
      console.error('NVIDIA Vision API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to generate image description' },
        { status: response.status },
      );
    }

    const data = await response.json();
    const description =
      data.choices?.[0]?.message?.content?.trim() ?? 'No description generated.';

    return NextResponse.json({ description });
  } catch (err) {
    console.error('Image description error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
