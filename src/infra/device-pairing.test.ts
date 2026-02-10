import { mkdtemp } from "node:fs/promises";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import {
  approveDevicePairing,
  getPairedDevice,
  requestDevicePairing,
  rotateDeviceToken,
} from "./device-pairing.js";

describe("device pairing tokens", () => {
  test("preserves existing token scopes when rotating without scopes", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "openclaw-device-pairing-"));
    const request = await requestDevicePairing(
      {
        deviceId: "device-1",
        publicKey: "public-key-1",
        role: "operator",
        scopes: ["operator.admin"],
      },
      baseDir,
    );
    await approveDevicePairing(request.request.requestId, baseDir);

    await rotateDeviceToken({
      deviceId: "device-1",
      role: "operator",
      scopes: ["operator.read"],
      baseDir,
    });
    let paired = await getPairedDevice("device-1", baseDir);
    expect(paired?.tokens?.operator?.scopes).toEqual(["operator.read"]);
    expect(paired?.scopes).toEqual(["operator.read"]);

    await rotateDeviceToken({
      deviceId: "device-1",
      role: "operator",
      baseDir,
    });
    paired = await getPairedDevice("device-1", baseDir);
    expect(paired?.tokens?.operator?.scopes).toEqual(["operator.read"]);
  });

  test("recovers from transient EPERM during atomic rename on Windows", async () => {
    if (process.platform !== "win32") {
      return;
    }

    const baseDir = await mkdtemp(join(tmpdir(), "openclaw-device-pairing-"));
    const originalRename = fs.rename.bind(fs);
    let injected = false;
    const renameSpy = vi
      .spyOn(fs, "rename")
      .mockImplementation(async (...args: Parameters<typeof fs.rename>) => {
        if (!injected) {
          injected = true;
          const err = new Error("operation not permitted") as Error & { code?: string };
          err.code = "EPERM";
          throw err;
        }
        return originalRename(...args);
      });

    try {
      const request = await requestDevicePairing(
        {
          deviceId: "device-eprem-1",
          publicKey: "public-key-eprem-1",
          role: "operator",
          scopes: ["operator.read"],
        },
        baseDir,
      );
      await approveDevicePairing(request.request.requestId, baseDir);
      const paired = await getPairedDevice("device-eprem-1", baseDir);
      expect(paired?.deviceId).toBe("device-eprem-1");
    } finally {
      renameSpy.mockRestore();
    }
  });
});
