/**
 * Stream Format Converter
 * Converts Anthropic Messages API streaming format to OpenAI-compatible format
 *
 * Why: Frontend hooks (useAIChat, useAIStreaming) expect OpenAI SSE format.
 * Anthropic's streaming format uses different event types and structure.
 *
 * Anthropic format:
 *   event: content_block_delta
 *   data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"content"}}
 *
 * OpenAI format (target):
 *   data: {"choices":[{"delta":{"content":"content"}}]}
 *   data: [DONE]
 */

/**
 * Convert Anthropic SSE stream to OpenAI-compatible format
 * @param anthropicReader ReadableStreamDefaultReader from Anthropic API response
 * @param writer WritableStreamDefaultWriter to send converted events to client
 */
export async function convertAnthropicStreamToOpenAI(
  anthropicReader: ReadableStreamDefaultReader<Uint8Array>,
  writer: WritableStreamDefaultWriter<Uint8Array>
): Promise<void> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  while (true) {
    const { done, value } = await anthropicReader.read();
    if (done) {
      // Send final [DONE] marker
      await writer.write(encoder.encode("data: [DONE]\n\n"));
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    // Process complete lines (SSE format is line-based)
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      // Remove carriage return if present
      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }

      // Skip empty lines and comments
      if (line.trim() === "" || line.startsWith(":")) {
        continue;
      }

      // Anthropic uses "event:" and "data:" lines
      // We only care about data lines
      if (line.startsWith("event:")) {
        continue;
      }

      if (!line.startsWith("data: ")) {
        continue;
      }

      const jsonStr = line.slice(6).trim();

      try {
        const anthropicEvent = JSON.parse(jsonStr);

        // Convert content_block_delta to OpenAI format
        if (
          anthropicEvent.type === "content_block_delta" &&
          anthropicEvent.delta?.type === "text_delta" &&
          anthropicEvent.delta?.text
        ) {
          const openAIFormat = {
            choices: [
              {
                delta: {
                  content: anthropicEvent.delta.text,
                },
              },
            ],
          };

          const sseMessage = `data: ${JSON.stringify(openAIFormat)}\n\n`;
          await writer.write(encoder.encode(sseMessage));
        }

        // Handle ping events (Anthropic sends these to keep connection alive)
        if (anthropicEvent.type === "ping") {
          // Send a keep-alive comment
          await writer.write(encoder.encode(": ping\n\n"));
        }

        // Handle errors
        if (anthropicEvent.type === "error") {
          console.error("[stream-converter] Anthropic API error:", anthropicEvent.error);
          const errorFormat = {
            error: {
              message: anthropicEvent.error?.message || "Unknown error from AI service",
              type: anthropicEvent.error?.type || "api_error",
            },
          };
          const sseMessage = `data: ${JSON.stringify(errorFormat)}\n\n`;
          await writer.write(encoder.encode(sseMessage));
          break;
        }

        // Ignore other event types (message_start, content_block_start, content_block_stop, message_stop)
        // These are informational and not needed for OpenAI format compatibility
      } catch (e) {
        // Partial JSON - put line back in buffer and wait for more data
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
}

/**
 * Check if a response body is an Anthropic streaming response
 */
export function isAnthropicStream(response: Response): boolean {
  const contentType = response.headers.get("content-type");
  return contentType?.includes("text/event-stream") || false;
}

/**
 * Simple helper to write a status event in OpenAI format
 * This is used by ai-chat for progress updates (searching, generating, etc.)
 */
export function writeOpenAIStatusEvent(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  status: { step: string; message: string; details?: Record<string, unknown> }
): Promise<void> {
  const sseMessage = `data: ${JSON.stringify({ status })}\n\n`;
  return writer.write(encoder.encode(sseMessage));
}

/**
 * Helper to write embedded components event in OpenAI format
 * Used for property cards, calculators, etc.
 */
export function writeOpenAIEmbeddedComponentsEvent(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  components: Record<string, unknown>
): Promise<void> {
  const sseMessage = `data: ${JSON.stringify({ embedded_components: components })}\n\n`;
  return writer.write(encoder.encode(sseMessage));
}
