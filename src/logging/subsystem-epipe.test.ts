import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSubsystemLogger, resetLogger, setLoggerOverride } from "../logging.js";
import { loggingState } from "./state.js";

function tempLogPath() {
  return path.join(os.tmpdir(), `openclaw-log-${crypto.randomUUID()}.log`);
}

function epipeError() {
  const err = new Error("EPIPE") as NodeJS.ErrnoException;
  err.code = "EPIPE";
  return err;
}

describe("subsystem console output", () => {
  beforeEach(() => {
    loggingState.rawConsole = null;
    loggingState.forceConsoleToStderr = false;
    resetLogger();
  });

  afterEach(() => {
    loggingState.rawConsole = null;
    loggingState.forceConsoleToStderr = false;
    resetLogger();
    setLoggerOverride(null);
  });

  it("swallows EPIPE from raw console sinks", () => {
    setLoggerOverride({ level: "info", file: tempLogPath() });
    loggingState.rawConsole = {
      log: () => {
        throw epipeError();
      },
      info: () => {
        throw epipeError();
      },
      warn: () => {
        throw epipeError();
      },
      error: () => {
        throw epipeError();
      },
    };

    const logger = createSubsystemLogger("test/subsystem");
    expect(() => logger.warn("hello")).not.toThrow();
  });

  it("rethrows non-pipe errors from raw console sinks", () => {
    setLoggerOverride({ level: "info", file: tempLogPath() });
    loggingState.rawConsole = {
      log: () => undefined,
      info: () => undefined,
      warn: () => {
        throw new Error("boom");
      },
      error: () => undefined,
    };

    const logger = createSubsystemLogger("test/subsystem");
    expect(() => logger.warn("hello")).toThrow("boom");
  });
});
