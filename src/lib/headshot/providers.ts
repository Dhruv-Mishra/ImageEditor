/**
 * Headshot generation provider abstraction with cascading fallback.
 *
 * Provider chain: DreamO (primary) → PuLID-FLUX (fallback)
 * Optional: Replicate paid fallback when REPLICATE_API_TOKEN is set.
 *
 * All providers receive (sourceBlob, prompt) and return a Blob of the
 * generated image. The cascade orchestrator classifies errors to decide
 * whether to retry with the next provider or stop.
 */

import { Client, handle_file } from '@gradio/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FailureClass = 'quota' | 'transient' | 'permanent';

export interface GenerationResult {
  imageBuffer: ArrayBuffer;
  contentType: string;
  provider: string;
}

interface HfProviderConfig {
  name: string;
  space: string;
  timeout: number;
  buildArgs: (
    sourceBlob: Blob,
    prompt: string,
    handleFileFn: typeof handle_file,
  ) => unknown[];
  parseResult: (data: unknown[]) => { url?: string } | null;
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

export function classifyError(err: unknown): FailureClass {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('quota')) return 'quota';
    if (msg.includes('timed out') || msg.includes('timeout')) return 'transient';
    if (msg.includes('missing') || msg.includes('invalid')) return 'permanent';
    return 'transient';
  }
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const title = String(obj.title ?? '').toLowerCase();
    const message = String(obj.message ?? '').toLowerCase();
    if (title.includes('quota') || message.includes('quota')) return 'quota';
    if (obj.stage === 'error') return 'transient';
  }
  return 'transient';
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message);
  }
  return 'Generation failed';
}

// ---------------------------------------------------------------------------
// URL origin validation (SSRF prevention)
// ---------------------------------------------------------------------------

const ALLOWED_HF_ORIGINS = [
  'https://huggingface.co',
  'https://cdn-lfs.hf.co',
  'https://cdn-lfs-us-1.hf.co',
];

function isAllowedHfUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      ALLOWED_HF_ORIGINS.some((o) => url.startsWith(o)) ||
      parsed.hostname.endsWith('.hf.space') ||
      parsed.hostname.endsWith('.huggingface.co')
    );
  } catch {
    return false;
  }
}

function isAllowedReplicateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith('.replicate.delivery') ||
      parsed.hostname === 'replicate.delivery'
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// HuggingFace Space provider helpers
// ---------------------------------------------------------------------------

const HF_TOKEN = process.env.HF_TOKEN || undefined;

async function discoverEndpoint(
  client: InstanceType<typeof Client>,
  hints: string[],
): Promise<string> {
  try {
    const api = await client.view_api();
    const endpoints = Object.keys(api.named_endpoints || {});
    for (const hint of hints) {
      const match = endpoints.find((ep) =>
        ep.toLowerCase().includes(hint.toLowerCase()),
      );
      if (match) return match;
    }
    if (endpoints.length > 0) return endpoints[0];
  } catch {
    // view_api failed — use fallback
  }
  return '/predict';
}

async function runHfProvider(
  config: HfProviderConfig,
  sourceBlob: Blob,
  prompt: string,
): Promise<GenerationResult> {
  const client = await Client.connect(config.space, {
    token: HF_TOKEN as `hf_${string}` | undefined,
  });

  const endpoint = await discoverEndpoint(client, ['generate', 'predict', 'run']);
  console.log(`[${config.name}] Using endpoint: ${endpoint}`);

  const args = config.buildArgs(sourceBlob, prompt, handle_file);
  const resultPromise = client.predict(endpoint, args);

  // Per-provider timeout
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${config.name} timed out after ${config.timeout / 1000}s`)),
      config.timeout,
    );
  });

  let result;
  try {
    result = await Promise.race([resultPromise, timeoutPromise]);
    clearTimeout(timeoutId!);
  } catch (raceErr) {
    clearTimeout(timeoutId!);
    resultPromise.catch(() => {}); // silence orphaned promise
    throw raceErr;
  }

  const data = result.data as unknown[];
  const output = config.parseResult(data);
  if (!output?.url) {
    throw new Error(`${config.name}: No image in response`);
  }

  if (!isAllowedHfUrl(output.url)) {
    throw new Error(`${config.name}: Unexpected image URL origin`);
  }

  const imageRes = await fetch(output.url);
  if (!imageRes.ok) {
    throw new Error(`${config.name}: Failed to fetch generated image (${imageRes.status})`);
  }

  return {
    imageBuffer: await imageRes.arrayBuffer(),
    contentType: imageRes.headers.get('content-type') || 'image/png',
    provider: config.name,
  };
}

// ---------------------------------------------------------------------------
// Provider configurations
// ---------------------------------------------------------------------------

const DREAMO_CONFIG: HfProviderConfig = {
  name: 'DreamO',
  space: 'ByteDance/DreamO',
  timeout: 180_000, // 3 min (ZeroGPU cold-start + generation)
  buildArgs: (sourceBlob, prompt, hf) => [
    hf(sourceBlob),   // ref_image1
    null,              // ref_image2
    'id',              // ref_task1
    'ip',              // ref_task2
    prompt,            // prompt
    '-1',              // seed
    768,               // width
    768,               // height
    512,               // ref_res
    12,                // num_steps
    4.5,               // guidance
    1,                 // true_cfg
    0,                 // cfg_start_step
    0,                 // cfg_end_step
    '',                // neg_prompt
    3.5,               // neg_guidance
    0,                 // first_step_guidance
  ],
  parseResult: (data) => (data?.[0] as { url?: string }) ?? null,
};

const PULID_CONFIG: HfProviderConfig = {
  name: 'PuLID-FLUX',
  space: 'yanze/PuLID-FLUX',
  timeout: 180_000,
  buildArgs: (sourceBlob, prompt, hf) => [
    prompt,            // prompt
    '',                // neg_prompt
    hf(sourceBlob),    // id_image
    1.0,               // id_weight (strong face preservation)
    4.0,               // guidance_scale
    20,                // num_inference_steps
    -1,                // seed
    1024,              // width
    1024,              // height
  ],
  parseResult: (data) => (data?.[0] as { url?: string }) ?? null,
};

// ---------------------------------------------------------------------------
// Replicate provider (optional, paid)
// ---------------------------------------------------------------------------

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || undefined;
const REPLICATE_POLL_INTERVAL = 2000;
const REPLICATE_TIMEOUT = 120_000; // 2 min

async function runReplicateProvider(
  sourceBlob: Blob,
  prompt: string,
): Promise<GenerationResult> {
  if (!REPLICATE_API_TOKEN) {
    throw new Error('Replicate API token not configured');
  }

  // Convert blob to base64 data URL for Replicate API
  const buffer = Buffer.from(await sourceBlob.arrayBuffer());
  const b64 = buffer.toString('base64');
  const dataUrl = `data:${sourceBlob.type || 'image/webp'};base64,${b64}`;

  // Create prediction — using PuLID model on Replicate
  const createRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'ac247e2c25b79e84e4a76da638a4809d5e09b00eb0553c7e27c3267b809e8e0b',
      input: {
        main_face_image: dataUrl,
        prompt,
        num_steps: 20,
        guidance_scale: 4.0,
        id_weight: 1.0,
        width: 768,
        height: 768,
        seed: -1,
      },
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.json().catch(() => ({}));
    throw new Error(`Replicate: ${(body as { detail?: string }).detail || createRes.statusText}`);
  }

  const prediction = (await createRes.json()) as {
    id: string;
    status: string;
    output?: string | string[];
    error?: string;
    urls: { get: string };
  };

  // Poll for completion
  const deadline = Date.now() + REPLICATE_TIMEOUT;
  let current = prediction;

  while (!['succeeded', 'failed', 'canceled'].includes(current.status)) {
    if (Date.now() > deadline) {
      throw new Error('Replicate: Generation timed out');
    }
    await new Promise((r) => setTimeout(r, REPLICATE_POLL_INTERVAL));

    const pollRes = await fetch(current.urls.get, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    if (!pollRes.ok) throw new Error(`Replicate: Poll failed (${pollRes.status})`);
    current = (await pollRes.json()) as typeof prediction;
  }

  if (current.status === 'failed' || current.status === 'canceled') {
    throw new Error(`Replicate: ${current.error || 'Generation failed'}`);
  }

  const outputUrl = Array.isArray(current.output) ? current.output[0] : current.output;
  if (!outputUrl) throw new Error('Replicate: No output image');

  if (!isAllowedReplicateUrl(outputUrl)) {
    throw new Error('Replicate: Unexpected output URL origin');
  }

  const imageRes = await fetch(outputUrl);
  if (!imageRes.ok) throw new Error('Replicate: Failed to fetch generated image');

  return {
    imageBuffer: await imageRes.arrayBuffer(),
    contentType: imageRes.headers.get('content-type') || 'image/png',
    provider: 'Replicate',
  };
}

// ---------------------------------------------------------------------------
// Cascade Orchestrator
// ---------------------------------------------------------------------------

export async function generateWithFallback(
  sourceBlob: Blob,
  prompt: string,
): Promise<GenerationResult> {
  const hfProviders: HfProviderConfig[] = [DREAMO_CONFIG, PULID_CONFIG];
  const errors: Array<{ provider: string; error: string; class: FailureClass }> = [];
  let hitQuota = false;

  // Try HuggingFace providers in order
  for (const config of hfProviders) {
    if (hitQuota) break; // Skip remaining HF providers on quota error (shared pool)

    try {
      console.log(`[generate-headshot] Trying ${config.name}…`);
      const result = await runHfProvider(config, sourceBlob, prompt);
      console.log(`[generate-headshot] ✓ ${config.name} succeeded`);
      return result;
    } catch (err) {
      const failClass = classifyError(err);
      const msg = extractErrorMessage(err);
      console.warn(`[generate-headshot] ✗ ${config.name} failed (${failClass}): ${msg}`);
      errors.push({ provider: config.name, error: msg, class: failClass });

      if (failClass === 'permanent') throw err; // Bad input — don't retry
      if (failClass === 'quota') hitQuota = true; // Skip remaining HF Spaces
    }
  }

  // Try Replicate paid fallback if configured
  if (REPLICATE_API_TOKEN) {
    try {
      console.log('[generate-headshot] Trying Replicate (paid fallback)…');
      const result = await runReplicateProvider(sourceBlob, prompt);
      console.log('[generate-headshot] ✓ Replicate succeeded');
      return result;
    } catch (err) {
      const msg = extractErrorMessage(err);
      console.warn(`[generate-headshot] ✗ Replicate failed: ${msg}`);
      errors.push({ provider: 'Replicate', error: msg, class: 'transient' });
    }
  }

  // All providers exhausted — throw the most relevant error
  if (hitQuota) {
    const quotaErr = errors.find((e) => e.class === 'quota');
    const error = new Error(quotaErr?.error || 'GPU quota exceeded — please try again later');
    (error as Error & { isQuota: boolean }).isQuota = true;
    throw error;
  }

  throw new Error(
    errors.length > 0
      ? `All providers failed. Last: ${errors[errors.length - 1].error}`
      : 'No headshot generation providers available',
  );
}
