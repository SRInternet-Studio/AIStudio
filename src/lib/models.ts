import type { ModelInfo } from "@/types";

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: "gemini-3.6-flash",
    displayName: "Gemini 3.6 Flash",
    description: "Our latest model that balances speed with intelligence to deliver strong performance in agentic and multimodal tasks.",
    isNew: true,
    category: "Featured",
  },
  {
    id: "gemini-3.5-flash-lite",
    displayName: "Gemini 3.5 Flash Lite",
    description: "Our fastest, most cost-effective 3.5 model for high-throughput execution.",
    isNew: true,
    category: "Featured",
  },
  {
    id: "gemini-3.5-flash",
    displayName: "Gemini 3.5 Flash",
    description: "Our most intelligent model for sustained frontier performance in agentic and coding tasks.",
    category: "Featured",
  },
  {
    id: "gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro Preview",
    description: "Our latest SOTA reasoning model with unprecedented depth and nuance, and powerful multimodal understanding and coding capabilities.",
    category: "Featured",
  },
  {
    id: "gemini-3.5-live-translate-preview",
    displayName: "Gemini 3.5 Live Translate Preview",
    description: "A real-time speech-to-speech translation model delivering low latency translation for 70+ languages.",
    isNew: true,
    category: "Featured",
  },
  {
    id: "gemini-3.1-flash-lite",
    displayName: "Gemini 3.1 Flash Lite",
    description: "Our most cost-efficient model, optimized for high-volume agentic tasks, translation, and simple data processing.",
    category: "Featured",
  },
  {
    id: "gemini-3-flash-preview",
    displayName: "Gemini 3 Flash Preview",
    description: "Our most intelligent model built for speed, combining frontier intelligence with superior search and grounding.",
    category: "Featured",
  },
  {
    id: "gemini-3.1-flash-lite-image",
    displayName: "Nano Banana 2 Lite",
    description: "Our smallest and most cost effective image generation and editing model, built for at scale usage.",
    isNew: true,
    category: "Images",
  },
  {
    id: "gemini-3.1-flash-image",
    displayName: "Nano Banana 2",
    description: "Pro-level visual intelligence with Flash-speed efficiency and reality-grounded generation capabilities.",
    isPaid: true,
    category: "Images",
  },
  {
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    description: "Fast and versatile model with thinking capabilities for a wide range of tasks.",
    category: "Gemini",
  },
  {
    id: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    description: "Our most capable thinking model with advanced reasoning and multimodal understanding.",
    isPaid: true,
    category: "Gemini",
  },
  {
    id: "gemma-4-26b-a4b-it",
    displayName: "Gemma 4 26B",
    description: "Open model with strong efficiency for on-device and edge deployment.",
    isNew: true,
    category: "Gemma",
  },
  {
    id: "gemma-4-31b-it",
    displayName: "Gemma 4 31B",
    description: "Largest Gemma model with enhanced reasoning and multimodal capabilities.",
    isNew: true,
    category: "Gemma",
  },
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    description: "OpenAI's most advanced multimodal model.",
    category: "All",
  },
  {
    id: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    description: "A smaller, faster, and more cost-effective version of GPT-4o.",
    category: "All",
  },
  {
    id: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    description: "High-intelligence model with improved performance.",
    category: "All",
  },
  {
    id: "gpt-3.5-turbo",
    displayName: "GPT-3.5 Turbo",
    description: "Fast and cost-effective model for simple tasks.",
    category: "All",
  },
  {
    id: "claude-3.5-sonnet",
    displayName: "Claude 3.5 Sonnet",
    description: "Anthropic's most intelligent model for complex tasks.",
    category: "All",
  },
  {
    id: "claude-3-opus",
    displayName: "Claude 3 Opus",
    description: "Anthropic's most powerful model for demanding tasks.",
    category: "All",
  },
];

export const MODEL_CATEGORIES = ["Starred", "All", "Featured", "Gemini", "Live", "Images", "Video", "Audio", "Music", "Agents", "Gemma"];
