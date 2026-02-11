import { describe, expect, it } from "vitest";
import { CONNECTION_ERROR_USER_MESSAGE } from "../../agents/pi-embedded-helpers.js";
import { buildReplyPayloads } from "./agent-runner-payloads.js";

describe("buildReplyPayloads", () => {
  it("drops single heartbeat connection-error payloads marked as errors", () => {
    const result = buildReplyPayloads({
      payloads: [{ text: CONNECTION_ERROR_USER_MESSAGE, isError: true }],
      isHeartbeat: true,
      didLogHeartbeatStrip: false,
      blockStreamingEnabled: false,
      blockReplyPipeline: null,
      replyToMode: "off",
    });

    expect(result.replyPayloads).toHaveLength(0);
    expect(result.didLogHeartbeatStrip).toBe(false);
  });

  it("keeps connection-error text on non-heartbeat runs", () => {
    const result = buildReplyPayloads({
      payloads: [{ text: CONNECTION_ERROR_USER_MESSAGE, isError: true }],
      isHeartbeat: false,
      didLogHeartbeatStrip: false,
      blockStreamingEnabled: false,
      blockReplyPipeline: null,
      replyToMode: "off",
    });

    expect(result.replyPayloads).toHaveLength(1);
    expect(result.replyPayloads[0]?.text).toBe(CONNECTION_ERROR_USER_MESSAGE);
    expect(result.replyPayloads[0]?.isError).toBe(true);
  });

  it("keeps heartbeat payloads when not marked as errors", () => {
    const result = buildReplyPayloads({
      payloads: [{ text: CONNECTION_ERROR_USER_MESSAGE, isError: false }],
      isHeartbeat: true,
      didLogHeartbeatStrip: false,
      blockStreamingEnabled: false,
      blockReplyPipeline: null,
      replyToMode: "off",
    });

    expect(result.replyPayloads).toHaveLength(1);
    expect(result.replyPayloads[0]?.text).toBe(CONNECTION_ERROR_USER_MESSAGE);
    expect(result.replyPayloads[0]?.isError).toBe(false);
  });
});
