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
          role: 'system',
          content: 'You describe photos in plain text only. Never use markdown formatting (no headers, bold, italic, bullet points, or code blocks). Never use emojis. Write exactly 2-3 concise sentences as a single paragraph.',
        },
        {
          role: 'user',
          content: `Describe this portrait photo. Focus on the person's appearance, clothing, pose, expression, and background. Write 2-3 plain sentences, no markdown, no emojis. <img src="data:${mimeType};base64,${base64}" />`,
        },
      ],
      max_tokens: 384,
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
    let description =
      data.choices?.[0]?.message?.content?.trim() ?? 'No description generated.';

    // Strip any markdown formatting the model might have added
    description = description
      .replace(/#{1,6}\s*/g, '')           // headers
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1') // bold/italic
      .replace(/__([^_]+)__/g, '$1')       // alt bold
      .replace(/_([^_]+)_/g, '$1')         // alt italic
      .replace(/`([^`]+)`/g, '$1')         // inline code
      .replace(/```[\s\S]*?```/g, '')      // code blocks
      .replace(/^[\s]*[-*+]\s/gm, '')      // bullet points
      .replace(/^\d+\.\s/gm, '')           // numbered lists
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // emojis
      .replace(/\n{2,}/g, ' ')             // collapse multiple newlines
      .replace(/\n/g, ' ')                 // single newlines to spaces
      .replace(/\s{2,}/g, ' ')             // collapse multiple spaces
      .trim();

    return NextResponse.json({ description });
  } catch (err) {
    console.error('Image description error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
