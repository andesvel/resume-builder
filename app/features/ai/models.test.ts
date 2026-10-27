import { describe, expect, it } from "vitest";

import { isLimitedDevice, recommendedModel, tagModels, variantFor } from "./models";

const desktop = (memoryGB: number | null, f16 = true, storageMB: number | null = null) => ({ memoryGB, f16, mobile: false, storageMB });

describe("model recommendations", () => {
  it("recommends the biggest model that fits the device", () => {
    expect(recommendedModel(desktop(8))).toBe("qwen3.5-4b");
    expect(recommendedModel(desktop(6))).toBe("qwen3.5-2b");
    expect(recommendedModel(desktop(4))).toBe("qwen3-0.6b");
    expect(recommendedModel({ memoryGB: 8, f16: true, mobile: true, storageMB: null })).toBe("qwen3-0.6b");
  });

  it("uses f32 builds without shader-f16, which changes what fits", () => {
    expect(variantFor("qwen3.5-4b", { f16: false }).id).toBe("Qwen3.5-4B-q4f32_1-MLC");
    expect(recommendedModel(desktop(8, false))).toBe("gemma-4-e2b");
  });

  it("flags heavy models instead of hiding them", () => {
    const tags = tagModels(desktop(8));
    expect(tags["qwen3-0.6b"]).toContain("lightest");
    expect(tags["qwen3-8b"]).toContain("heavy");
    expect(tagModels(desktop(4))["qwen3.5-9b"]).toContain("tooHeavy");
  });

  it("accounts for free storage, unless the model is already cached", () => {
    const device = desktop(8, true, 3000);
    expect(tagModels(device)["qwen3.5-4b"]).toContain("noSpace");
    expect(recommendedModel(device)).toBe("qwen3.5-2b");
    expect(recommendedModel(device, ["Qwen3.5-4B-q4f16_1-MLC"])).toBe("qwen3.5-4b");
  });

  it("treats very small devices as limited", () => {
    expect(isLimitedDevice(desktop(2))).toBe(true);
    expect(isLimitedDevice(desktop(null))).toBe(false);
    expect(tagModels(desktop(2))["qwen3-0.6b"]).not.toContain("recommended");
  });
});
