import type { NewsSource } from "../core/NewsSource.js";
import { AnthropicSource } from "./anthropic.js";
import { CursorSource } from "./cursor.js";
import { GitBookSource } from "./gitbook.js";
import { GitHubBlogSource } from "./github-blog.js";
import { HuggingFaceSource } from "./huggingface.js";
import { LangChainSource } from "./langchain.js";
import { MintlifySource } from "./mintlify.js";
import { OpenAISource } from "./openai.js";
import { ReadMeSource } from "./readme.js";
import { ReplitSource } from "./replit.js";
import { VercelSource } from "./vercel.js";

/**
 * All registered sources. To add a new one: write a `NewsSource` subclass
 * in this directory and add one line here — nothing else needs to change.
 */
export const sources: NewsSource[] = [
  // Documentation & knowledge platforms (Mintlify's competitive landscape)
  new MintlifySource(),
  new ReadMeSource(),
  new GitBookSource(),
  // AI agents & infrastructure (the macro trend driving Mintlify's strategy)
  new AnthropicSource(),
  new OpenAISource(),
  new LangChainSource(),
  new HuggingFaceSource(),
  // Developer tools & infrastructure (broader ecosystem)
  new CursorSource(),
  new VercelSource(),
  new GitHubBlogSource(),
  new ReplitSource(),
];
