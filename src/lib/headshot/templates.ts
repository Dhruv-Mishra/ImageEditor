/** A headshot style preset for AI generation. */
export interface HeadshotStyle {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
}

/**
 * Style presets for AI headshot generation via DreamO.
 * Each contains a prompt that describes the desired professional look.
 * The model preserves the user's face identity while generating the described scene.
 */
export const HEADSHOT_STYLES: HeadshotStyle[] = [
  {
    id: 'corporate-navy',
    label: 'Corporate Navy',
    emoji: '👔',
    prompt:
      'professional corporate headshot portrait photo, wearing a tailored navy blue business suit with white dress shirt, neutral grey studio background, soft professional studio lighting, shallow depth of field, confident expression, photorealistic, 4K',
  },
  {
    id: 'charcoal-formal',
    label: 'Charcoal Formal',
    emoji: '🖤',
    prompt:
      'professional headshot portrait photo, wearing a charcoal grey formal suit with light blue shirt, clean white studio background, professional lighting setup, sharp focus on face, photorealistic, high quality',
  },
  {
    id: 'business-casual',
    label: 'Business Casual',
    emoji: '👕',
    prompt:
      'professional headshot portrait photo, wearing smart business casual attire with collared shirt, modern office background with bokeh, warm natural lighting, friendly approachable expression, photorealistic',
  },
  {
    id: 'executive',
    label: 'Executive',
    emoji: '💼',
    prompt:
      'executive professional headshot portrait photo, wearing premium dark suit with silk tie, dark gradient studio background, dramatic rim lighting, commanding confident expression, photorealistic, luxury feel',
  },
  {
    id: 'creative-pro',
    label: 'Creative Professional',
    emoji: '🎨',
    prompt:
      'professional headshot portrait photo, wearing modern minimalist black turtleneck, clean neutral background, soft diffused lighting, approachable creative professional look, photorealistic, editorial quality',
  },
  {
    id: 'medical-white',
    label: 'Medical / Lab Coat',
    emoji: '🩺',
    prompt:
      'professional medical headshot portrait photo, wearing clean white lab coat over business attire, clinical neutral background, bright even lighting, trustworthy confident expression, photorealistic',
  },
];
