// Copyright 2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest"
import { decodeDeflateToString, encodeStringToDeflate } from "../src"

describe("Deflate", () => {
  describe("Deflate encoding", () => {
    it("deflate encode/decode", async () => {
      const original = "hello"
      const encoded = await encodeStringToDeflate(original)
      expect(encoded).not.toBe(original)
      const decoded = await decodeDeflateToString(encoded)
      expect(decoded).toBe(original)
    })

    it("deflate malformed check", async () => {
      await expect(async () => {
        await decodeDeflateToString("aGVsb@8") // Wrong characters.
      }).rejects.toThrow()
    })
  })
})
