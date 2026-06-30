/**
 * Standard categories for the Benchmark Hub.
 * All models get normalized to one of these.
 */
export const KNOWN_CATEGORIES = [
  'Object Detection',
  'Image Classification',
  'Semantic Segmentation',
  'Instance Segmentation',
  'Face Recognition',
  'Image Generation',
  'Depth Estimation',
  'OCR',
  'Text Classification',
  'Named Entity Recognition',
  'Question Answering',
  'Text Generation',
  'Translation',
  'Summarization',
  'Sentiment Analysis',
  'Visual QA',
  'Image Captioning',
  'Speech Recognition',
  'Speaker Identification',
  'Audio Classification',
  'LoRA / QLoRA',
  'Full Fine-tune',
  'Adapter Tuning',
  'RLHF',
  'DPO',
  'Instruction Tuning',
  'Domain Adaptation',
]

/**
 * Normalize a category string to a clean standard category.
 * Maps any messy freeform text to one of the known clean categories.
 */
export function normalizeCategory(raw) {
  if (!raw || raw === 'Uncategorized') return 'Uncategorized'
  
  const lower = raw.toLowerCase().trim()
  
  // Direct match first
  const directMatch = KNOWN_CATEGORIES.find(k => k.toLowerCase() === lower)
  if (directMatch) return directMatch

  // Keyword-based mapping — order matters (first match wins)
  const keywordMap = [
    // OCR-related (catch all OCR variants first)
    { keywords: ['ocr', 'document parsing', 'text extraction', 'key information', 'structured vision', 'multimodal extraction', 'document understanding', 'receipt', 'invoice'], category: 'OCR' },
    // Object Detection
    { keywords: ['object detection', 'detection', 'yolo', 'detr', 'detector'], category: 'Object Detection' },
    // Segmentation
    { keywords: ['segmentation', 'semantic seg', 'instance seg', 'panoptic'], category: 'Semantic Segmentation' },
    // Classification
    { keywords: ['classification', 'image class', 'classifier'], category: 'Image Classification' },
    // Face
    { keywords: ['face', 'facial'], category: 'Face Recognition' },
    // Generation
    { keywords: ['generation', 'diffusion', 'gan', 'generative'], category: 'Image Generation' },
    // Depth
    { keywords: ['depth', 'monocular'], category: 'Depth Estimation' },
    // Text/NLP
    { keywords: ['text classification', 'sentiment'], category: 'Text Classification' },
    { keywords: ['ner', 'named entity', 'entity recognition'], category: 'Named Entity Recognition' },
    { keywords: ['question answering', 'qa', 'visual qa', 'vqa'], category: 'Visual QA' },
    { keywords: ['text generation', 'language model', 'llm'], category: 'Text Generation' },
    { keywords: ['translation', 'translate'], category: 'Translation' },
    { keywords: ['summarization', 'summary'], category: 'Summarization' },
    { keywords: ['captioning', 'caption'], category: 'Image Captioning' },
    // Audio
    { keywords: ['speech', 'asr', 'transcription'], category: 'Speech Recognition' },
    { keywords: ['speaker', 'voice id'], category: 'Speaker Identification' },
    { keywords: ['audio class'], category: 'Audio Classification' },
    // Fine-tuning
    { keywords: ['lora', 'qlora'], category: 'LoRA / QLoRA' },
    { keywords: ['fine-tune', 'finetune', 'full fine'], category: 'Full Fine-tune' },
    { keywords: ['rlhf'], category: 'RLHF' },
    { keywords: ['dpo'], category: 'DPO' },
    { keywords: ['instruction tuning'], category: 'Instruction Tuning' },
    { keywords: ['adapter'], category: 'Adapter Tuning' },
    { keywords: ['domain adaptation'], category: 'Domain Adaptation' },
    // Multimodal fallback
    { keywords: ['multimodal', 'vision language', 'vlm'], category: 'Visual QA' },
  ]

  for (const { keywords, category } of keywordMap) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category
    }
  }

  // Fallback to Uncategorized
  return 'Uncategorized'
}
