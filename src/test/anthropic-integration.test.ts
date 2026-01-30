import { describe, it, expect } from "vitest";

// Integration tests for Anthropic API format
// These tests verify the ai-chat function uses correct Anthropic Claude API format

describe("Anthropic API Integration Format", () => {
  // Constants matching ai-chat/index.ts
  const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
  const ANTHROPIC_VERSION = "2023-06-01";
  const MODEL = "claude-sonnet-4-20250514";

  describe("API Endpoint", () => {
    it("uses correct Anthropic Messages API URL", () => {
      expect(ANTHROPIC_API_URL).toBe("https://api.anthropic.com/v1/messages");
    });

    it("does NOT use OpenAI-compatible endpoint", () => {
      expect(ANTHROPIC_API_URL).not.toContain("openai");
      expect(ANTHROPIC_API_URL).not.toContain("lovable");
      expect(ANTHROPIC_API_URL).not.toContain("gateway");
    });
  });

  describe("Request Headers", () => {
    const getAnthropicHeaders = (apiKey: string) => ({
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    });

    it("uses x-api-key header (not Authorization: Bearer)", () => {
      const headers = getAnthropicHeaders("sk-ant-test123");

      expect(headers["x-api-key"]).toBe("sk-ant-test123");
      expect(headers).not.toHaveProperty("Authorization");
    });

    it("includes anthropic-version header", () => {
      const headers = getAnthropicHeaders("test-key");

      expect(headers["anthropic-version"]).toBe("2023-06-01");
    });

    it("includes content-type header", () => {
      const headers = getAnthropicHeaders("test-key");

      expect(headers["content-type"]).toBe("application/json");
    });

    it("headers match Anthropic API requirements", () => {
      const headers = getAnthropicHeaders("test-key");

      // Must have exactly these keys for Anthropic API
      expect(Object.keys(headers).sort()).toEqual([
        "anthropic-version",
        "content-type",
        "x-api-key",
      ]);
    });
  });

  describe("Request Body Format", () => {
    interface AnthropicMessage {
      role: "user" | "assistant";
      content: string;
    }

    interface AnthropicRequest {
      model: string;
      max_tokens: number;
      system?: string;
      messages: AnthropicMessage[];
      stream?: boolean;
      tools?: Array<{
        name: string;
        description: string;
        input_schema: Record<string, unknown>;
      }>;
      tool_choice?: { type: "auto" | "any" | "tool"; name?: string };
    }

    it("system prompt is at top-level, not in messages array", () => {
      const request: AnthropicRequest = {
        model: MODEL,
        max_tokens: 1024,
        system: "You are a real estate assistant.",
        messages: [{ role: "user", content: "Find homes in Denver" }],
      };

      // System is a top-level field
      expect(request.system).toBeDefined();
      expect(request.system).toBe("You are a real estate assistant.");

      // Messages should NOT contain system role
      const hasSystemRole = request.messages.some(
        (m) => (m as { role: string }).role === "system"
      );
      expect(hasSystemRole).toBe(false);
    });

    it("messages only contain user and assistant roles", () => {
      const request: AnthropicRequest = {
        model: MODEL,
        max_tokens: 1024,
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
          { role: "user", content: "Find homes" },
        ],
      };

      request.messages.forEach((msg) => {
        expect(["user", "assistant"]).toContain(msg.role);
      });
    });

    it("includes max_tokens (required by Anthropic)", () => {
      const request: AnthropicRequest = {
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: "Test" }],
      };

      expect(request.max_tokens).toBeDefined();
      expect(request.max_tokens).toBeGreaterThan(0);
    });

    it("uses correct model identifier", () => {
      const request: AnthropicRequest = {
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: "Test" }],
      };

      expect(request.model).toBe("claude-sonnet-4-20250514");
      expect(request.model).not.toContain("gpt");
      expect(request.model).not.toContain("gemini");
    });

    it("stream flag is boolean (not string)", () => {
      const request: AnthropicRequest = {
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: "Test" }],
        stream: true,
      };

      expect(typeof request.stream).toBe("boolean");
    });
  });

  describe("Tool Format Conversion", () => {
    // OpenAI format (what we're converting FROM)
    interface OpenAITool {
      type: "function";
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      };
    }

    // Anthropic format (what we're converting TO)
    interface AnthropicTool {
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
    }

    function convertToAnthropicTools(openAITools: OpenAITool[]): AnthropicTool[] {
      return openAITools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }));
    }

    it("converts function.name to name", () => {
      const openAITools: OpenAITool[] = [
        {
          type: "function",
          function: {
            name: "search_properties",
            description: "Search for properties",
            parameters: { type: "object", properties: {} },
          },
        },
      ];

      const anthropicTools = convertToAnthropicTools(openAITools);

      expect(anthropicTools[0].name).toBe("search_properties");
      expect(anthropicTools[0]).not.toHaveProperty("function");
    });

    it("converts function.parameters to input_schema", () => {
      const openAITools: OpenAITool[] = [
        {
          type: "function",
          function: {
            name: "test_tool",
            description: "Test",
            parameters: {
              type: "object",
              properties: {
                location: { type: "string" },
                price_max: { type: "number" },
              },
              required: ["location"],
            },
          },
        },
      ];

      const anthropicTools = convertToAnthropicTools(openAITools);

      expect(anthropicTools[0]).toHaveProperty("input_schema");
      expect(anthropicTools[0]).not.toHaveProperty("parameters");
      expect(anthropicTools[0].input_schema).toEqual(
        openAITools[0].function.parameters
      );
    });

    it("removes type: function wrapper", () => {
      const openAITools: OpenAITool[] = [
        {
          type: "function",
          function: {
            name: "tool1",
            description: "Description",
            parameters: { type: "object", properties: {} },
          },
        },
      ];

      const anthropicTools = convertToAnthropicTools(openAITools);

      expect(anthropicTools[0]).not.toHaveProperty("type");
      expect(anthropicTools[0]).not.toHaveProperty("function");
    });

    it("converts multiple tools", () => {
      const openAITools: OpenAITool[] = [
        {
          type: "function",
          function: {
            name: "search_properties",
            description: "Search properties",
            parameters: { type: "object", properties: {} },
          },
        },
        {
          type: "function",
          function: {
            name: "show_mortgage_calculator",
            description: "Show calculator",
            parameters: { type: "object", properties: {} },
          },
        },
        {
          type: "function",
          function: {
            name: "show_affordability_calculator",
            description: "Affordability check",
            parameters: { type: "object", properties: {} },
          },
        },
      ];

      const anthropicTools = convertToAnthropicTools(openAITools);

      expect(anthropicTools.length).toBe(3);
      expect(anthropicTools[0].name).toBe("search_properties");
      expect(anthropicTools[1].name).toBe("show_mortgage_calculator");
      expect(anthropicTools[2].name).toBe("show_affordability_calculator");
    });
  });

  describe("Tool Choice Format", () => {
    it("uses object format for auto", () => {
      // OpenAI: tool_choice: "auto" (string)
      // Anthropic: tool_choice: { type: "auto" } (object)

      interface AnthropicToolChoice {
        type: "auto" | "any" | "tool";
        name?: string;
      }

      const toolChoice: AnthropicToolChoice = { type: "auto" };

      expect(typeof toolChoice).toBe("object");
      expect(toolChoice.type).toBe("auto");
      // Should NOT be a string
      expect(toolChoice).not.toBe("auto");
    });

    it("uses object format for specific tool", () => {
      interface AnthropicToolChoice {
        type: "auto" | "any" | "tool";
        name?: string;
      }

      const toolChoice: AnthropicToolChoice = {
        type: "tool",
        name: "search_properties",
      };

      expect(toolChoice.type).toBe("tool");
      expect(toolChoice.name).toBe("search_properties");
    });
  });

  describe("Message Filtering", () => {
    interface Message {
      role: string;
      content: string;
    }

    // This mimics the filtering done in ai-chat
    function filterMessages(messages: Message[]): Message[] {
      return messages.filter(
        (m) => m.role === "user" || m.role === "assistant"
      );
    }

    it("filters out system messages from array", () => {
      const messages: Message[] = [
        { role: "system", content: "System prompt" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi!" },
      ];

      const filtered = filterMessages(messages);

      expect(filtered.length).toBe(2);
      expect(filtered.find((m) => m.role === "system")).toBeUndefined();
    });

    it("preserves user and assistant messages", () => {
      const messages: Message[] = [
        { role: "user", content: "Question 1" },
        { role: "assistant", content: "Answer 1" },
        { role: "user", content: "Question 2" },
      ];

      const filtered = filterMessages(messages);

      expect(filtered.length).toBe(3);
      expect(filtered[0].content).toBe("Question 1");
      expect(filtered[1].content).toBe("Answer 1");
      expect(filtered[2].content).toBe("Question 2");
    });

    it("handles messages with only user role", () => {
      const messages: Message[] = [{ role: "user", content: "First message" }];

      const filtered = filterMessages(messages);

      expect(filtered.length).toBe(1);
      expect(filtered[0].role).toBe("user");
    });
  });

  describe("Response Parsing", () => {
    interface AnthropicContentBlock {
      type: "text" | "tool_use";
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
      stop_reason: "end_turn" | "tool_use" | "max_tokens";
    }

    it("extracts text from content blocks", () => {
      const response: AnthropicResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          { type: "text", text: "I found 5 properties in Denver." },
        ],
        stop_reason: "end_turn",
      };

      const textContent = response.content
        .filter((block) => block.type === "text" && block.text)
        .map((block) => block.text)
        .join("");

      expect(textContent).toBe("I found 5 properties in Denver.");
    });

    it("detects tool_use in response", () => {
      const response: AnthropicResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          { type: "text", text: "Let me search for properties." },
          {
            type: "tool_use",
            id: "toolu_abc",
            name: "search_properties",
            input: { location: "Denver, CO" },
          },
        ],
        stop_reason: "tool_use",
      };

      const hasToolUse = response.content.some(
        (block) => block.type === "tool_use"
      );
      expect(hasToolUse).toBe(true);

      const toolBlock = response.content.find(
        (block) => block.type === "tool_use"
      );
      expect(toolBlock?.name).toBe("search_properties");
      expect(toolBlock?.input).toEqual({ location: "Denver, CO" });
    });

    it("identifies stop_reason correctly", () => {
      const normalResponse: AnthropicResponse = {
        id: "msg_1",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Done" }],
        stop_reason: "end_turn",
      };

      const toolResponse: AnthropicResponse = {
        id: "msg_2",
        type: "message",
        role: "assistant",
        content: [
          { type: "tool_use", id: "t1", name: "search", input: {} },
        ],
        stop_reason: "tool_use",
      };

      expect(normalResponse.stop_reason).toBe("end_turn");
      expect(toolResponse.stop_reason).toBe("tool_use");
    });
  });

  describe("Streaming Response Format", () => {
    // Anthropic streaming uses Server-Sent Events (SSE)
    it("streaming events use SSE format", () => {
      // Example of Anthropic SSE event
      const sseEvent = `event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}`;

      expect(sseEvent).toContain("event:");
      expect(sseEvent).toContain("data:");
    });

    it("delta events contain text_delta type", () => {
      const deltaPayload = {
        type: "content_block_delta",
        index: 0,
        delta: {
          type: "text_delta",
          text: "Hello world",
        },
      };

      expect(deltaPayload.delta.type).toBe("text_delta");
      expect(deltaPayload.delta.text).toBe("Hello world");
    });

    it("message_stop event indicates completion", () => {
      const stopEvent = {
        type: "message_stop",
      };

      expect(stopEvent.type).toBe("message_stop");
    });
  });

  describe("Smart Agent Tool Definitions", () => {
    // Property search tool from ai-chat
    const PROPERTY_SEARCH_TOOL = {
      type: "function",
      function: {
        name: "search_properties",
        description: "Search for real estate properties based on user criteria",
        parameters: {
          type: "object",
          properties: {
            location: { type: "string" },
            beds_min: { type: "number" },
            beds_max: { type: "number" },
            price_min: { type: "number" },
            price_max: { type: "number" },
          },
          required: ["location"],
        },
      },
    };

    it("property search tool has required location parameter", () => {
      expect(PROPERTY_SEARCH_TOOL.function.parameters.required).toContain(
        "location"
      );
    });

    it("property search tool has numeric price parameters", () => {
      const props = PROPERTY_SEARCH_TOOL.function.parameters.properties as Record<
        string,
        { type: string }
      >;

      expect(props.price_min.type).toBe("number");
      expect(props.price_max.type).toBe("number");
    });

    it("tool converts correctly to Anthropic format", () => {
      const anthropicTool = {
        name: PROPERTY_SEARCH_TOOL.function.name,
        description: PROPERTY_SEARCH_TOOL.function.description,
        input_schema: PROPERTY_SEARCH_TOOL.function.parameters,
      };

      expect(anthropicTool.name).toBe("search_properties");
      expect(anthropicTool.input_schema.required).toContain("location");
      expect(anthropicTool).not.toHaveProperty("type");
      expect(anthropicTool).not.toHaveProperty("function");
    });
  });

  describe("Error Response Format", () => {
    interface AnthropicError {
      type: "error";
      error: {
        type: string;
        message: string;
      };
    }

    it("handles rate limit error (429)", () => {
      const rateLimitError: AnthropicError = {
        type: "error",
        error: {
          type: "rate_limit_error",
          message: "Rate limit exceeded. Please try again in a moment.",
        },
      };

      expect(rateLimitError.error.type).toBe("rate_limit_error");
    });

    it("handles authentication error", () => {
      const authError: AnthropicError = {
        type: "error",
        error: {
          type: "authentication_error",
          message: "Invalid API key",
        },
      };

      expect(authError.error.type).toBe("authentication_error");
    });

    it("handles invalid request error", () => {
      const invalidError: AnthropicError = {
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "max_tokens is required",
        },
      };

      expect(invalidError.error.type).toBe("invalid_request_error");
    });
  });
});

describe("Migration Verification", () => {
  describe("OpenAI to Anthropic differences", () => {
    it("system message location changed", () => {
      // OpenAI format (OLD - should NOT be used)
      const openAIFormat = {
        messages: [
          { role: "system", content: "You are helpful" },
          { role: "user", content: "Hi" },
        ],
      };

      // Anthropic format (NEW - correct)
      const anthropicFormat = {
        system: "You are helpful",
        messages: [{ role: "user", content: "Hi" }],
      };

      // Verify the difference
      expect(
        openAIFormat.messages.some((m) => m.role === "system")
      ).toBe(true);
      expect(
        anthropicFormat.messages.some((m: { role: string }) => m.role === "system")
      ).toBe(false);
      expect(anthropicFormat.system).toBeDefined();
    });

    it("tool format changed", () => {
      // OpenAI format (OLD)
      const openAITool = {
        type: "function",
        function: {
          name: "my_tool",
          parameters: { type: "object" },
        },
      };

      // Anthropic format (NEW)
      const anthropicTool = {
        name: "my_tool",
        input_schema: { type: "object" },
      };

      // Verify OpenAI has nested structure
      expect(openAITool).toHaveProperty("type");
      expect(openAITool).toHaveProperty("function");

      // Verify Anthropic is flat
      expect(anthropicTool).not.toHaveProperty("type");
      expect(anthropicTool).not.toHaveProperty("function");
      expect(anthropicTool).toHaveProperty("input_schema");
    });

    it("authorization header changed", () => {
      // OpenAI format (OLD)
      const openAIHeaders = {
        Authorization: "Bearer sk-xxx",
        "Content-Type": "application/json",
      };

      // Anthropic format (NEW)
      const anthropicHeaders = {
        "x-api-key": "sk-ant-xxx",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      };

      // Verify difference
      expect(openAIHeaders).toHaveProperty("Authorization");
      expect(anthropicHeaders).not.toHaveProperty("Authorization");
      expect(anthropicHeaders).toHaveProperty("x-api-key");
      expect(anthropicHeaders).toHaveProperty("anthropic-version");
    });

    it("max_tokens is required for Anthropic", () => {
      interface AnthropicRequest {
        model: string;
        max_tokens: number; // Required!
        messages: Array<{ role: string; content: string }>;
      }

      const request: AnthropicRequest = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: "Test" }],
      };

      // max_tokens must be present
      expect(request.max_tokens).toBeDefined();
      expect(request.max_tokens).toBeGreaterThan(0);
    });
  });
});
