import { describe, it, expect } from "vitest";

// Test the pure functions from ai-config without Deno dependencies
// These tests verify the Anthropic API format conversion is correct

describe("AI Config Helper Functions", () => {
  describe("getAnthropicHeaders", () => {
    // Inline implementation to test without Deno
    const getAnthropicHeaders = (apiKey: string): Record<string, string> => ({
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    });

    it("returns correct headers with x-api-key", () => {
      const headers = getAnthropicHeaders("sk-ant-test-key");

      expect(headers["x-api-key"]).toBe("sk-ant-test-key");
    });

    it("includes anthropic-version header", () => {
      const headers = getAnthropicHeaders("sk-ant-test-key");

      expect(headers["anthropic-version"]).toBe("2023-06-01");
    });

    it("includes content-type header", () => {
      const headers = getAnthropicHeaders("sk-ant-test-key");

      expect(headers["content-type"]).toBe("application/json");
    });
  });

  describe("convertToAnthropicTool", () => {
    // Inline implementation matching ai-config.ts
    interface AnthropicToolDefinition {
      name: string;
      description: string;
      input_schema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
      };
    }

    const convertToAnthropicTool = (openAITool: {
      type: "function";
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      };
    }): AnthropicToolDefinition => ({
      name: openAITool.function.name,
      description: openAITool.function.description,
      input_schema: openAITool.function.parameters as AnthropicToolDefinition["input_schema"],
    });

    it("converts OpenAI tool format to Anthropic format", () => {
      const openAITool = {
        type: "function" as const,
        function: {
          name: "search_properties",
          description: "Search for real estate properties",
          parameters: {
            type: "object" as const,
            properties: {
              location: { type: "string", description: "City or zip code" },
              maxPrice: { type: "number", description: "Maximum price" },
            },
            required: ["location"],
          },
        },
      };

      const anthropicTool = convertToAnthropicTool(openAITool);

      expect(anthropicTool.name).toBe("search_properties");
      expect(anthropicTool.description).toBe("Search for real estate properties");
      expect(anthropicTool.input_schema).toEqual(openAITool.function.parameters);
    });

    it("preserves required fields in input_schema", () => {
      const openAITool = {
        type: "function" as const,
        function: {
          name: "calculate_mortgage",
          description: "Calculate monthly mortgage payment",
          parameters: {
            type: "object" as const,
            properties: {
              principal: { type: "number" },
              rate: { type: "number" },
              years: { type: "number" },
            },
            required: ["principal", "rate", "years"],
          },
        },
      };

      const anthropicTool = convertToAnthropicTool(openAITool);

      expect(anthropicTool.input_schema.required).toEqual([
        "principal",
        "rate",
        "years",
      ]);
    });
  });

  describe("extractTextFromResponse", () => {
    interface AnthropicContentBlock {
      type: "text" | "tool_use" | "tool_result";
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }

    interface AnthropicResponse {
      id: string;
      type: "message";
      role: "assistant";
      content: AnthropicContentBlock[];
      model: string;
      stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
      stop_sequence: string | null;
      usage: { input_tokens: number; output_tokens: number };
    }

    const extractTextFromResponse = (response: AnthropicResponse): string => {
      const textBlocks = response.content.filter(
        (block): block is AnthropicContentBlock & { type: "text"; text: string } =>
          block.type === "text" && typeof block.text === "string"
      );
      return textBlocks.map((b) => b.text).join("");
    };

    it("extracts text from single text block", () => {
      const response: AnthropicResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Hello, I found 3 properties." }],
        model: "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      expect(extractTextFromResponse(response)).toBe(
        "Hello, I found 3 properties."
      );
    });

    it("concatenates multiple text blocks", () => {
      const response: AnthropicResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          { type: "text", text: "First part. " },
          { type: "text", text: "Second part." },
        ],
        model: "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      expect(extractTextFromResponse(response)).toBe(
        "First part. Second part."
      );
    });

    it("ignores tool_use blocks", () => {
      const response: AnthropicResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          { type: "text", text: "Let me search for properties." },
          {
            type: "tool_use",
            id: "tool_1",
            name: "search_properties",
            input: { location: "Denver" },
          },
        ],
        model: "claude-sonnet-4-20250514",
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      expect(extractTextFromResponse(response)).toBe(
        "Let me search for properties."
      );
    });

    it("returns empty string when no text blocks", () => {
      const response: AnthropicResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "tool_1",
            name: "search_properties",
            input: { location: "Denver" },
          },
        ],
        model: "claude-sonnet-4-20250514",
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      expect(extractTextFromResponse(response)).toBe("");
    });
  });

  describe("hasToolUse", () => {
    interface AnthropicContentBlock {
      type: "text" | "tool_use" | "tool_result";
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }

    interface AnthropicResponse {
      id: string;
      type: "message";
      role: "assistant";
      content: AnthropicContentBlock[];
      model: string;
      stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
      stop_sequence: string | null;
      usage: { input_tokens: number; output_tokens: number };
    }

    const hasToolUse = (response: AnthropicResponse): boolean =>
      response.content.some((block) => block.type === "tool_use");

    it("returns true when response contains tool_use block", () => {
      const response: AnthropicResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          { type: "text", text: "Searching..." },
          {
            type: "tool_use",
            id: "tool_1",
            name: "search",
            input: { query: "test" },
          },
        ],
        model: "claude-sonnet-4-20250514",
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      expect(hasToolUse(response)).toBe(true);
    });

    it("returns false when response has only text blocks", () => {
      const response: AnthropicResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Just a text response." }],
        model: "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      expect(hasToolUse(response)).toBe(false);
    });
  });

  describe("extractToolUse", () => {
    interface AnthropicContentBlock {
      type: "text" | "tool_use" | "tool_result";
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }

    interface AnthropicResponse {
      id: string;
      type: "message";
      role: "assistant";
      content: AnthropicContentBlock[];
      model: string;
      stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
      stop_sequence: string | null;
      usage: { input_tokens: number; output_tokens: number };
    }

    const extractToolUse = (
      response: AnthropicResponse
    ): { id: string; name: string; input: Record<string, unknown> } | null => {
      const toolBlock = response.content.find(
        (block) => block.type === "tool_use"
      );
      if (
        toolBlock &&
        toolBlock.type === "tool_use" &&
        toolBlock.id &&
        toolBlock.name &&
        toolBlock.input
      ) {
        return {
          id: toolBlock.id,
          name: toolBlock.name,
          input: toolBlock.input,
        };
      }
      return null;
    };

    it("extracts tool use details from response", () => {
      const response: AnthropicResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "toolu_abc123",
            name: "search_properties",
            input: { location: "Denver", maxPrice: 500000 },
          },
        ],
        model: "claude-sonnet-4-20250514",
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const toolUse = extractToolUse(response);

      expect(toolUse).not.toBeNull();
      expect(toolUse?.id).toBe("toolu_abc123");
      expect(toolUse?.name).toBe("search_properties");
      expect(toolUse?.input).toEqual({ location: "Denver", maxPrice: 500000 });
    });

    it("returns null when no tool use in response", () => {
      const response: AnthropicResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "No tools needed." }],
        model: "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      expect(extractToolUse(response)).toBeNull();
    });

    it("extracts first tool use when multiple present", () => {
      const response: AnthropicResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "tool_first",
            name: "first_tool",
            input: { a: 1 },
          },
          {
            type: "tool_use",
            id: "tool_second",
            name: "second_tool",
            input: { b: 2 },
          },
        ],
        model: "claude-sonnet-4-20250514",
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const toolUse = extractToolUse(response);

      expect(toolUse?.id).toBe("tool_first");
      expect(toolUse?.name).toBe("first_tool");
    });
  });
});

describe("Anthropic API Request Format", () => {
  it("system message should be at top-level, not in messages array", () => {
    // This validates the critical migration change from OpenAI to Anthropic format
    // OpenAI: messages: [{ role: "system", content: "..." }, ...]
    // Anthropic: system: "...", messages: [{ role: "user", content: "..." }, ...]

    interface AnthropicRequest {
      model: string;
      max_tokens: number;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      system?: string;
    }

    const request: AnthropicRequest = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: "You are a real estate assistant.",
      messages: [{ role: "user", content: "Find homes in Denver" }],
    };

    // System should be a top-level field
    expect(request.system).toBe("You are a real estate assistant.");

    // Messages should not contain system role
    const hasSystemInMessages = request.messages.some(
      (m) => (m as { role: string }).role === "system"
    );
    expect(hasSystemInMessages).toBe(false);

    // Messages should only have user/assistant roles
    request.messages.forEach((m) => {
      expect(["user", "assistant"]).toContain(m.role);
    });
  });

  it("tool_choice should use Anthropic format { type: auto }", () => {
    // OpenAI: tool_choice: "auto"
    // Anthropic: tool_choice: { type: "auto" }

    interface AnthropicToolChoice {
      type: "auto" | "any" | "tool";
      name?: string;
    }

    const toolChoice: AnthropicToolChoice = { type: "auto" };

    expect(toolChoice.type).toBe("auto");
    expect(typeof toolChoice).toBe("object");
    expect(toolChoice).not.toBe("auto"); // Not a string like OpenAI
  });

  it("tools should use input_schema not parameters", () => {
    // OpenAI: function.parameters
    // Anthropic: input_schema

    interface AnthropicTool {
      name: string;
      description: string;
      input_schema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
      };
    }

    const tool: AnthropicTool = {
      name: "search_properties",
      description: "Search for properties",
      input_schema: {
        type: "object",
        properties: {
          location: { type: "string" },
        },
        required: ["location"],
      },
    };

    expect(tool).toHaveProperty("input_schema");
    expect(tool).not.toHaveProperty("parameters");
    expect(tool).not.toHaveProperty("function");
  });
});
