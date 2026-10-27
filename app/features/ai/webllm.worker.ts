import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Runs inference off the main thread so the editor stays responsive.
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (event: MessageEvent) => handler.onmessage(event);
