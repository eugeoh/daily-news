import type { NewsSource } from "../core/NewsSource.js";
import { AnthropicSource } from "./anthropic.js";
import { BunSource } from "./bun.js";
import { CursorSource } from "./cursor.js";
import { DecartSource } from "./decart.js";
import { GitHubBlogSource } from "./github-blog.js";
import { GoogleDeepMindSource } from "./google-deepmind.js";
import { HuggingFaceSource } from "./huggingface.js";
import { IntelSource } from "./intel.js";
import { LangChainSource } from "./langchain.js";
import { MetaAiSource } from "./meta-ai.js";
import { MistralSource } from "./mistral.js";
import { NvidiaSource } from "./nvidia.js";
import { OpenAISource } from "./openai.js";
import { RunwaySource } from "./runway.js";
import { ThinkingMachinesSource } from "./thinking-machines.js";
import { VercelSource } from "./vercel.js";
import { WorldLabsSource } from "./world-labs.js";
import { XaiSource } from "./xai.js";

/**
 * All registered sources. To add a new lab: write a `NewsSource` subclass
 * in this directory and add one line here — nothing else needs to change.
 */
export const sources: NewsSource[] = [
  // Frontier labs
  new AnthropicSource(),
  new OpenAISource(),
  new ThinkingMachinesSource(),
  new GoogleDeepMindSource(),
  new XaiSource(), // stub — see xai.ts
  new MetaAiSource(), // stub — see meta-ai.ts
  new MistralSource(),
  new HuggingFaceSource(),
  // World models
  new WorldLabsSource(),
  new RunwaySource(),
  new DecartSource(),
  // Developer / infra blogs
  new GitHubBlogSource(),
  new BunSource(),
  new VercelSource(),
  new CursorSource(),
  new LangChainSource(),
  // Hardware
  new NvidiaSource(),
  new IntelSource(),
];
