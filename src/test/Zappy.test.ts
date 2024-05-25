// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { Zappy } from "../main/Zappy"

describe("Zappy", () => {
  describe("Base64 encoding", () => {
    test("base64 encode/decode", () => {
      const zappy = new Zappy(null)
      const original = "hello"
      const encoded = zappy.base64StringEncode(original)
      expect(encoded).not.toBe(original)
      const decoded = zappy.base64StringDecode(encoded)
      expect(decoded).toBe(original)
    })

    test("base64 proper encode check", () => {
      const zappy = new Zappy(null)
      const encoded = zappy.base64StringEncode("hello")
      expect(encoded).toBe("aGVsbG8")
    })

    test("base64 malformed check", () => {
      const zappy = new Zappy(null)
      let decoded = zappy.base64StringDecode("aGVsb@8") // Wrong character.
      expect(decoded).toBeNull()
      decoded = zappy.base64StringDecode("aGVsbG8c1") // Wrong length.
      expect(decoded).toBeNull()
    })

    test("base64 malformed check with exception", () => {
      const zappy = new Zappy(null, true)
      expect(() => {
        // @ts-ignore
        const decoded = zappy.base64StringDecode("aGVsb@8") // Wrong character.
      }).toThrow()
      expect(() => {
        // @ts-ignore
        const decoded = zappy.base64StringDecode("aGVsbG8c1") // Wrong length.
      }).toThrow()
    })
  })

  describe("Zappy encoding", () => {
    test("empty message", () => {
      const zappy = new Zappy(null)
      const encoded = zappy.encode("")
      expect(encoded).toBe("")
    })

    test("malformed check", () => {
      const zappy = new Zappy(null)
      const decoded = zappy.decode("c")
      expect(decoded).toBeNull()
    })

    test("malformed check with exception", () => {
      const zappy = new Zappy(null, true)
      expect(() => {
        // @ts-ignore
        const decoded = zappy.decode("c__")
      }).toThrow()
    })

    test("repeated characters", () => {
      const zappy = new Zappy(null)
      const original = "wwwwww"
      const base64Encoded = zappy.base64StringEncode(original)
      const encoded = zappy.encode(original)
      expect(encoded).not.toBe(original)
      expect(encoded.length).toBeLessThan(base64Encoded.length)
      const decoded = zappy.decode(encoded)
      expect(decoded).toBe(original)
    })

    test("long repeated characters", () => {
      const zappy = new Zappy(null)
      const original = "o".repeat(0x30)
      const base64Encoded = zappy.base64StringEncode(original)
      const encoded = zappy.encode(original)
      expect(encoded).not.toBe(original)
      expect(encoded.length).toBeLessThan(base64Encoded.length)
      const decoded = zappy.decode(encoded)
      expect(decoded).toBe(original)
    })

    test("blob", () => {
      // Blobs are not smaller than simple base64.
      const zappy = new Zappy(null)
      const original = "👍☠️✌️"
      const encoded = zappy.encode(original)
      expect(encoded).not.toBe(original)
      const decoded = zappy.decode(encoded)
      expect(decoded).toBe(original)
    })

    test("long blob", () => {
      // Blobs are not smaller than simple base64.
      const zappy = new Zappy(null)
      const original = "👍☠️✌️".repeat(0x30)
      const encoded = zappy.encode(original)
      expect(encoded).not.toBe(original)
      const decoded = zappy.decode(encoded)
      expect(decoded).toBe(original)
    })

    describe("Unsigned integer", () => {
      // Every 3 characters we get 4 base64 characters. So for these tests we make sure we always
      // have multiple of 3 characters + 1 to prove we are getting less base64 characters after
      // contraction. If contraction removes at least one byte, it will reduce the output length.
      describe("Decimal", () => {
        test("less than 100 no contraction", () => {
          const zappy = new Zappy(null)
          const original = "::12"
          const base64Encoded = zappy.base64StringEncode(original)
          const encoded = zappy.encode(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBe(base64Encoded.length)
          const decoded = zappy.decode(encoded)
          expect(decoded).toBe(original)
        })

        test("1 byte contraction", () => {
          const zappy = new Zappy(null)
          const original = ":255"
          const base64Encoded = zappy.base64StringEncode(original)
          const encoded = zappy.encode(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBeLessThan(base64Encoded.length)
          const decoded = zappy.decode(encoded)
          expect(decoded).toBe(original)
        })

        test("2 byte contraction", () => {
          const zappy = new Zappy(null)
          const original = "65535"
          const base64Encoded = zappy.base64StringEncode(original)
          const encoded = zappy.encode(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBeLessThan(base64Encoded.length)
          const decoded = zappy.decode(encoded)
          expect(decoded).toBe(original)
        })

        test("4 byte contraction", () => {
          const zappy = new Zappy(null)
          const original = "2147483647"
          const base64Encoded = zappy.base64StringEncode(original)
          const encoded = zappy.encode(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBeLessThan(base64Encoded.length)
          const decoded = zappy.decode(encoded)
          expect(decoded).toBe(original)
        })

        test("multi-group contraction", () => {
          const zappy = new Zappy(null)
          const original = "::12345678901"
          const base64Encoded = zappy.base64StringEncode(original)
          const encoded = zappy.encode(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBeLessThan(base64Encoded.length)
          const decoded = zappy.decode(encoded)
          expect(decoded).toBe(original)
        })

        test("with leading zeroes", () => {
          const zappy = new Zappy(null)
          const original = "00123"
          const base64Encoded = zappy.base64StringEncode(original)
          const encoded = zappy.encode(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBeLessThan(base64Encoded.length)
          const decoded = zappy.decode(encoded)
          expect(decoded).toBe(original)
        })
      })
      describe("Hexadecimal", () => {
        test("mixed case should not contract", () => {
          const zappy = new Zappy(null)
          const original = "2b7CaDe"
          const base64Encoded = zappy.base64StringEncode(original)
          const encoded = zappy.encode(original)
          expect(encoded).not.toBe(original)
          expect(encoded.length).toBe(base64Encoded.length)
          const decoded = zappy.decode(encoded)
          expect(decoded).toBe(original)
        })

        describe("Uppercase", () => {
          test("less than 0x1000 no contraction", () => {
            const zappy = new Zappy(null)
            const original = ":2B7"
            const base64Encoded = zappy.base64StringEncode(original)
            const encoded = zappy.encode(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBe(base64Encoded.length)
            const decoded = zappy.decode(encoded)
            expect(decoded).toBe(original)
          })

          test("2 byte contraction", () => {
            const zappy = new Zappy(null)
            const original = "8E2A"
            const base64Encoded = zappy.base64StringEncode(original)
            const encoded = zappy.encode(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = zappy.decode(encoded)
            expect(decoded).toBe(original)
          })

          test("4 byte contraction", () => {
            const zappy = new Zappy(null)
            const original = "::7FFFFFFF"
            const base64Encoded = zappy.base64StringEncode(original)
            const encoded = zappy.encode(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = zappy.decode(encoded)
            expect(decoded).toBe(original)
          })

          test("with leading zeroes", () => {
            const zappy = new Zappy(null)
            const original = "0012A0"
            const base64Encoded = zappy.base64StringEncode(original)
            const encoded = zappy.encode(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = zappy.decode(encoded)
            expect(decoded).toBe(original)
          })

          test("long number", () => {
            const zappy = new Zappy(null)
            const original = "E0012A0F92CC7"
            const base64Encoded = zappy.base64StringEncode(original)
            const encoded = zappy.encode(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = zappy.decode(encoded)
            expect(decoded).toBe(original)
          })
        })
        describe("Lowercase", () => {
          test("less than 0x1000 no contraction", () => {
            const zappy = new Zappy(null)
            const original = ":2b7"
            const base64Encoded = zappy.base64StringEncode(original)
            const encoded = zappy.encode(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBe(base64Encoded.length)
            const decoded = zappy.decode(encoded)
            expect(decoded).toBe(original)
          })

          test("2 byte contraction", () => {
            const zappy = new Zappy(null)
            const original = "8e2a"
            const base64Encoded = zappy.base64StringEncode(original)
            const encoded = zappy.encode(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = zappy.decode(encoded)
            expect(decoded).toBe(original)
          })

          test("4 byte contraction", () => {
            const zappy = new Zappy(null)
            const original = "::7fffffff"
            const base64Encoded = zappy.base64StringEncode(original)
            const encoded = zappy.encode(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = zappy.decode(encoded)
            expect(decoded).toBe(original)
          })

          test("with leading zeroes", () => {
            const zappy = new Zappy(null)
            const original = "0012a0"
            const base64Encoded = zappy.base64StringEncode(original)
            const encoded = zappy.encode(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = zappy.decode(encoded)
            expect(decoded).toBe(original)
          })

          test("long number", () => {
            const zappy = new Zappy(null)
            const original = "e0012a0f92cc7"
            const base64Encoded = zappy.base64StringEncode(original)
            const encoded = zappy.encode(original)
            expect(encoded).not.toBe(original)
            expect(encoded.length).toBeLessThan(base64Encoded.length)
            const decoded = zappy.decode(encoded)
            expect(decoded).toBe(original)
          })
        })
      })
    })

    test("default contraction encode/decode json", () => {
      const zappy = new Zappy(null)
      const original = '{"url":"https://example.com","emoji":"🥸"}'
      const encoded = zappy.encode(original)
      expect(encoded).not.toBe(original)
      const decoded = zappy.decode(encoded)
      expect(decoded).toBe(original)
    })

    describe("Contraction layering", () => {
      test("fast table unmodified", () => {
        const contractionSource = new Map<number, string[]>([
          [1, [ "hello", "hey" ]],
          [2, [ "banana smoothie" ]],
          [4, [ "ice cream" ]]
        ])
        const defaultZappy = new Zappy(null)
        const zappy = new Zappy(contractionSource)
        let original = '{"url":"https://example.nope"}' // Only default 0-contractions.
        let defaultEncoded = defaultZappy.encode(original)
        let encoded = zappy.encode(original)
        expect(encoded).not.toBe(original)
        expect(encoded).toBe(defaultEncoded)
        let decoded = zappy.decode(encoded)
        expect(decoded).toBe(original)
      })

      test("layered tables", () => {
        const contractionSource = new Map<number, string[]>([
          [1, [ "hello", "hey" ]],
          [2, [ "banana smoothie" ]],
          [4, [ "ice cream" ]]
        ])
        const defaultZappy = new Zappy(null)
        const zappy = new Zappy(contractionSource)
        const original = '{"msg":"hello","dessert":"ice cream"}'
        const defaultEncoded = defaultZappy.encode(original)
        const encoded = zappy.encode(original)
        expect(encoded).not.toBe(original)
        expect(encoded.length).toBeLessThan(defaultEncoded.length)
        const decoded = zappy.decode(encoded)
        expect(decoded).toBe(original)
      })

      test("prevent invalid tableId", () => {
        const contractionSource = new Map<number, string[]>([
          [1, [ "hello", "hey" ]],
          [2, [ "banana smoothie" ]],
          [30, [ "ice cream" ]]
        ])
        expect(() => {
          // @ts-ignore
          const zappy = new Zappy(contractionSource)
        }).toThrow()
      })

      test("prevent a contraction that is not larger than its encoding", () => {
        const contractionSource = new Map<number, string[]>([
          [11, [ "hi" ]] // Encoding would 1 control byte and 1 index byte, which is not smaller.
        ])
        expect(() => {
          // @ts-ignore
          const zappy = new Zappy(contractionSource)
        }).toThrow()
      })
    })
  })
})
