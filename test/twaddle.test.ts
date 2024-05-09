// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { Twaddle } from "../src/Twaddle"

describe("Twaddle", () => {
  describe("Base64", () => {
    test("base64 encode/decode", () => {
      const twaddle = new Twaddle(null)
      const original = "hello"
      const encoded = twaddle.base64StringEncode(original)
      expect(encoded).not.toBe(original)
      const decoded = twaddle.base64StringDecode(encoded)
      expect(decoded).toBe(original)
    })

    test("base64 proper encode check", () => {
      const twaddle = new Twaddle(null)
      const encoded = twaddle.base64StringEncode("hello")
      expect(encoded).toBe("aGVsbG8")
    })

    test("base64 malformed check", () => {
      const twaddle = new Twaddle(null)
      expect(() => {
        // @ts-ignore
        const decoded = twaddle.base64StringDecode("aGVsb@8") // Wrong character.
      }).toThrow()
      expect(() => {
        // @ts-ignore
        const decoded = twaddle.base64StringDecode("aGVsbG8c1") // Wrong length.
      }).toThrow()
    })
  })

  describe("Twaddle encoding", () => {
    test("empty message", () => {
      const twaddle = new Twaddle(null)
      const encoded = twaddle.encode("")
      expect(encoded).toBe("")
    })

    describe("Numbers", () => {
      // Every 3 characters we get 4 base64 characters. So for these tests we make sure we always
      // have multiple of 3 characters + 1 to prove we are getting less base64 characters after
      // contraction. If contraction removes at least one byte, it will reduce the output length.
      test("less than 100 no contraction", () => {
        const twaddle = new Twaddle(null)
        const original = "::12"
        const defaultEncoded = twaddle.base64StringEncode(original)
        const encoded = twaddle.encode(original)
        expect(encoded).not.toBe(original)
        expect(encoded.length).toBe(defaultEncoded.length)
        const decoded = twaddle.decode(encoded)
        expect(decoded).toBe(original)
      })

      test("1 byte contraction", () => {
        const twaddle = new Twaddle(null)
        const original = ":123"
        const defaultEncoded = twaddle.base64StringEncode(original)
        const encoded = twaddle.encode(original)
        expect(encoded).not.toBe(original)
        expect(encoded.length).toBeLessThan(defaultEncoded.length)
        const decoded = twaddle.decode(encoded)
        expect(decoded).toBe(original)
      })

      test("2 byte contraction", () => {
        const twaddle = new Twaddle(null)
        const original = "1234"
        const defaultEncoded = twaddle.base64StringEncode(original)
        const encoded = twaddle.encode(original)
        expect(encoded).not.toBe(original)
        expect(encoded.length).toBeLessThan(defaultEncoded.length)
        const decoded = twaddle.decode(encoded)
        expect(decoded).toBe(original)
      })

      test("4 byte contraction", () => {
        const twaddle = new Twaddle(null)
        const original = ":123456789"
        const defaultEncoded = twaddle.base64StringEncode(original)
        const encoded = twaddle.encode(original)
        expect(encoded).not.toBe(original)
        expect(encoded.length).toBeLessThan(defaultEncoded.length)
        const decoded = twaddle.decode(encoded)
        expect(decoded).toBe(original)
      })

      test("multi-group contraction", () => {
        const twaddle = new Twaddle(null)
        const original = "::12345678901"
        const defaultEncoded = twaddle.base64StringEncode(original)
        const encoded = twaddle.encode(original)
        expect(encoded).not.toBe(original)
        expect(encoded.length).toBeLessThan(defaultEncoded.length)
        const decoded = twaddle.decode(encoded)
        expect(decoded).toBe(original)
      })
    })

    test("default contraction encode/decode json", () => {
      const twaddle = new Twaddle(null)
      const original = '{"url":"https://example.com","emoji":"🥸"}'
      const encoded = twaddle.encode(original)
      expect(encoded).not.toBe(original)
      const decoded = twaddle.decode(encoded)
      expect(decoded).toBe(original)
    })

    describe("Contraction layering", () => {
      test("0-contraction unmodified", () => {
        const contractionSource = new Map<number, string[]>([
          [1, [ "hello" ]],
          [2, [ "banana smoothie" ]],
          [4, [ "ice cream" ]]
        ])
        const defaultTwaddle = new Twaddle(null)
        const twaddle = new Twaddle(contractionSource)
        let original = '{"url":"https://example.nope"}' // Only default 0-contractions.
        let defaultEncoded = defaultTwaddle.encode(original)
        let encoded = twaddle.encode(original)
        expect(encoded).not.toBe(original)
        expect(encoded).toBe(defaultEncoded)
        let decoded = twaddle.decode(encoded)
        expect(decoded).toBe(original)
      })

      test("1-contraction", () => {
        const contractionSource = new Map<number, string[]>([
          [1, [ "hello" ]],
          [2, [ "banana smoothie" ]],
          [4, [ "ice cream" ]]
        ])
        const defaultTwaddle = new Twaddle(null)
        const twaddle = new Twaddle(contractionSource)
        const original = '{"msg":"hello"}'
        const defaultEncoded = defaultTwaddle.encode(original)
        const encoded = twaddle.encode(original)
        expect(encoded).not.toBe(original)
        expect(encoded.length).toBeLessThan(defaultEncoded.length)
        const decoded = twaddle.decode(encoded)
        expect(decoded).toBe(original)
      })

      test("2-contraction", () => {
        const contractionSource = new Map<number, string[]>([
          [1, [ "hello" ]],
          [2, [ "banana smoothie" ]],
          [4, [ "ice cream" ]]
        ])
        const defaultTwaddle = new Twaddle(null)
        const twaddle = new Twaddle(contractionSource)
        const original = '{"msg":"banana smoothie"}'
        const defaultEncoded = defaultTwaddle.encode(original)
        const encoded = twaddle.encode(original)
        expect(encoded).not.toBe(original)
        expect(encoded.length).toBeLessThan(defaultEncoded.length)
        const decoded = twaddle.decode(encoded)
        expect(decoded).toBe(original)
      })

      test("4-contraction", () => {
        const contractionSource = new Map<number, string[]>([
          [1, [ "hello" ]],
          [2, [ "banana smoothie" ]],
          [4, [ "ice cream" ]]
        ])
        const defaultTwaddle = new Twaddle(null)
        const twaddle = new Twaddle(contractionSource)
        const original = '{"msg":"ice cream"}'
        const defaultEncoded = defaultTwaddle.encode(original)
        const encoded = twaddle.encode(original)
        expect(encoded).not.toBe(original)
        expect(encoded.length).toBeLessThan(defaultEncoded.length)
        const decoded = twaddle.decode(encoded)
        expect(decoded).toBe(original)
      })
    })

    test("prevent invalid index size contraction", () => {
      const contractionSource = new Map<number, string[]>([
        [1, [ "hello" ]],
        [2, [ "banana smoothie" ]],
        [3, [ "ice cream" ]]
      ])
      expect(() => {
        // @ts-ignore
        const twaddle = new Twaddle(contractionSource)
      }).toThrow()
    })

    test("prevent a contraction that is not larger than its encoding", () => {
      const contractionSource = new Map<number, string[]>([
        [1, [ "hi" ]] // Encoding would 1 control byte and 1 index byte, which is not smaller.
      ])
      expect(() => {
        // @ts-ignore
        const twaddle = new Twaddle(contractionSource)
      }).toThrow()
    })
  })
})
