// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest"
import { decodeZappyToString, encodeStringToBase64, encodeStringToZappy } from "../src"

describe("Zappy", () => {
  describe("Zappy encoding", () => {
    it("empty message", () => {
      const encoded = encodeStringToZappy("")
      expect(encoded).toBe("")
    })

    it("malformed check", () => {
      expect(() => {
        decodeZappyToString("ac_")
      }).toThrow()
    })

    it("repeated characters", () => {
      const original = '{"v":"wwwwww"}'
      const base64Encoded = encodeStringToBase64(original)
      const encoded = encodeStringToZappy(original)
      expect(encoded).not.toBe(original)
      expect(encoded.length).toBeLessThan(base64Encoded.length)
      const decoded = decodeZappyToString(encoded)
      expect(decoded).toBe(original)
    })

    it("long repeated characters", () => {
      const original = "o".repeat(0x30)
      const base64Encoded = encodeStringToBase64(original)
      const encoded = encodeStringToZappy(original)
      expect(encoded).not.toBe(original)
      expect(encoded.length).toBeLessThan(base64Encoded.length)
      const decoded = decodeZappyToString(encoded)
      expect(decoded).toBe(original)
    })

    it("blob", () => {
      // Blobs are not smaller than simple base64.
      const original = "👍☠️✌️"
      const encoded = encodeStringToZappy(original)
      expect(encoded).not.toBe(original)
      const decoded = decodeZappyToString(encoded)
      expect(decoded).toBe(original)
    })

    it("long blob", () => {
      // Blobs are not smaller than simple base64.
      const original = "👍☠️✌️".repeat(0x30)
      const encoded = encodeStringToZappy(original)
      expect(encoded).not.toBe(original)
      const decoded = decodeZappyToString(encoded)
      expect(decoded).toBe(original)
    })

    describe("Unsigned integer", () => {
      // Every 3 characters we get 4 base64 characters. So for these tests we make sure we always
      // have multiple of 3 characters + 1 to prove we are getting less base64 characters after
      // contraction. If contraction removes at least one byte, it will reduce the output length.
      describe("Decimal", () => {
        it("1 byte contraction", () => {
          const original = '{"v":255}'
          const base64Encoded = encodeStringToBase64(original)
          const encoded = encodeStringToZappy(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBeLessThan(base64Encoded.length)
          const decoded = decodeZappyToString(encoded)
          expect(decoded).toBe(original)
        })

        it("2 byte contraction", () => {
          const original = '{"v":65535}'
          const base64Encoded = encodeStringToBase64(original)
          const encoded = encodeStringToZappy(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBeLessThan(base64Encoded.length)
          const decoded = decodeZappyToString(encoded)
          expect(decoded).toBe(original)
        })

        it("4 byte contraction", () => {
          const original = '{"v":2147483647}'
          const base64Encoded = encodeStringToBase64(original)
          const encoded = encodeStringToZappy(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBeLessThan(base64Encoded.length)
          const decoded = decodeZappyToString(encoded)
          expect(decoded).toBe(original)
        })

        it("multi-group contraction", () => {
          const original = '{"v":12345678901}'
          const base64Encoded = encodeStringToBase64(original)
          const encoded = encodeStringToZappy(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBeLessThan(base64Encoded.length)
          const decoded = decodeZappyToString(encoded)
          expect(decoded).toBe(original)
        })

        it("with leading zeroes", () => {
          const original = '{"v":00123}'
          const base64Encoded = encodeStringToBase64(original)
          const encoded = encodeStringToZappy(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBeLessThan(base64Encoded.length)
          const decoded = decodeZappyToString(encoded)
          expect(decoded).toBe(original)
        })
      })
      describe("Hexadecimal", () => {
        it("mixed case", () => {
          const original = '{"v":"2b7CaDe"}'
          const base64Encoded = encodeStringToBase64(original)
          const encoded = encodeStringToZappy(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBeLessThan(base64Encoded.length)
          const decoded = decodeZappyToString(encoded)
          expect(decoded).toBe(original)
        })

        describe("Uppercase", () => {
          it("2 byte contraction", () => {
            const original = '{"v":"8E2A"}'
            const base64Encoded = encodeStringToBase64(original)
            const encoded = encodeStringToZappy(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = decodeZappyToString(encoded)
            expect(decoded).toBe(original)
          })

          it("4 byte contraction", () => {
            const original = '{"v":"7FFFFFFF"}'
            const base64Encoded = encodeStringToBase64(original)
            const encoded = encodeStringToZappy(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = decodeZappyToString(encoded)
            expect(decoded).toBe(original)
          })

          it("with leading zeroes", () => {
            const original = '{"v":"0012A0"}'
            const base64Encoded = encodeStringToBase64(original)
            const encoded = encodeStringToZappy(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = decodeZappyToString(encoded)
            expect(decoded).toBe(original)
          })

          it("long number", () => {
            const original = '{"v":"E0012A0F92CC7"}'
            const base64Encoded = encodeStringToBase64(original)
            const encoded = encodeStringToZappy(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = decodeZappyToString(encoded)
            expect(decoded).toBe(original)
          })
        })
        describe("Lowercase", () => {
          it("2 byte contraction", () => {
            const original = '{"v":"8e2a"}'
            const base64Encoded = encodeStringToBase64(original)
            const encoded = encodeStringToZappy(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = decodeZappyToString(encoded)
            expect(decoded).toBe(original)
          })

          it("4 byte contraction", () => {
            const original = '{"v":"7fffffff"}'
            const base64Encoded = encodeStringToBase64(original)
            const encoded = encodeStringToZappy(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = decodeZappyToString(encoded)
            expect(decoded).toBe(original)
          })

          it("with leading zeroes", () => {
            const original = '{"v":"0012a0"}'
            const base64Encoded = encodeStringToBase64(original)
            const encoded = encodeStringToZappy(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = decodeZappyToString(encoded)
            expect(decoded).toBe(original)
          })

          it("long number", () => {
            const original = '{"v":"e0012a0f92cc7"}'
            const base64Encoded = encodeStringToBase64(original)
            const encoded = encodeStringToZappy(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = decodeZappyToString(encoded)
            expect(decoded).toBe(original)
          })
        })
      })
    })

    it("default contraction encode/decode json", () => {
      const original = '{"url":"https://example.com","emoji":"🥸"}'
      const encoded = encodeStringToZappy(original)
      expect(encoded).not.toBe(original)
      const decoded = decodeZappyToString(encoded)
      expect(decoded).toBe(original)
    })

    // describe("Contraction layering", () => {
    //   it("fast table unmodified", () => {
    //     const contractionSource = new Map<number, string[]>([
    //       [1, [ "hello", "hey" ]],
    //       [2, [ "banana smoothie" ]],
    //       [4, [ "ice cream" ]]
    //     ])
    //     const overlaidContractionTables = createZappyContractionTables(zappyDefaultContractions, contractionSource)
    //     const original = '{"url":"https://example.nope"}' // Only default 0-contractions.
    //     const defaultEncoded = encodeStringToZappy(original, contractionTables)
    //     const encoded = encodeStringToZappy(original, overlaidContractionTables)
    //     expect(encoded).not.toBe(original)
    //     expect(encoded).toBe(defaultEncoded)
    //     const decoded = decodeZappyToString(encoded, overlaidContractionTables)
    //     expect(decoded).toBe(original)
    //   })
    //
    //   it("layered tables", () => {
    //     const contractionSource = new Map<number, string[]>([
    //       [1, [ "hello", "hey" ]],
    //       [2, [ "banana smoothie" ]],
    //       [4, [ "ice cream" ]]
    //     ])
    //     const overlaidContractionTables = createZappyContractionTables(zappyDefaultContractions, contractionSource)
    //     const original = '{"msg":"hello","dessert":"ice cream"}'
    //     const defaultEncoded = encodeStringToZappy(original, contractionTables)
    //     const encoded = encodeStringToZappy(original, overlaidContractionTables)
    //     expect(encoded).not.toBe(original)
    //     expect(encoded.length).toBeLessThan(defaultEncoded.length)
    //     const decoded = decodeZappyToString(encoded, overlaidContractionTables)
    //     expect(decoded).toBe(original)
    //   })
    //
    //   it("prevent a contraction that is not larger than its encoding", () => {
    //     const contractionSource = new Map<number, string[]>([
    //       [11, [ "hi" ]] // Encoding would 1 control byte and 1 index byte, which is not smaller.
    //     ])
    //     expect(() => {
    //       createZappyContractionTables(contractionSource)
    //     }).toThrow()
    //   })
    // })

    describe("Samples that found problems", () => {
      // const knownIdentifiers = [
      //   "user", "location", "rank", "score", "target", "color", "size", "origin", "name", "track", "command", "time"
      // ]

      it("10 digit in UUID but only 9 are compressible in one token", () => {
        const json = '{"track":"0x6A830D","user":1448,"score":"341c9a18-20bf-4ccf-95ef-1d001ebe1de5","origin":"15d759cd-7891-4a62-863c-866465076610"}'
        const encoded = encodeStringToZappy(json)
        expect(encoded).not.toBe(json)
        const decoded = decodeZappyToString(encoded)
        expect(decoded).toBe(json)
      })

      it("7 uppercase characters that don't fit in one token", () => {
        const json = '{"v":"VXDVAPR"}'
        const encoded = encodeStringToZappy(json)
        expect(encoded).not.toBe(json)
        const decoded = decodeZappyToString(encoded)
        expect(decoded).toBe(json)
      })
    })
  })
})
