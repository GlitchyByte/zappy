// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { Twaddle } from "../src/Twaddle"

test("base64 encode sanity", () => {
  const twaddle = new Twaddle(null)
  const encoded = twaddle.base64StringEncode("hello")
  expect(encoded).toBe("aGVsbG8")
})

test("base64 encode/decode", () => {
  const twaddle = new Twaddle(null)
  const original = "hello"
  const encoded = twaddle.base64StringEncode(original)
  expect(encoded).not.toBe(original)
  const decoded = twaddle.base64StringDecode(encoded)
  expect(decoded).toBe(original)
})

test("default contraction empty message", () => {
  const twaddle = new Twaddle(null)
  const encoded = twaddle.encode("")
  expect(encoded).toBe("")
})

test("default contraction encode/decode number", () => {
  const twaddle = new Twaddle(null)
  const original = "123456789"
  const encoded = twaddle.encode(original)
  expect(encoded).not.toBe(original)
  const decoded = twaddle.decode(encoded)
  expect(decoded).toBe(original)
})

test("default contraction encode/decode json", () => {
  const twaddle = new Twaddle(null)
  const original = '{"url":"https://example.com"}'
  const encoded = twaddle.encode(original)
  expect(encoded).not.toBe(original)
  const decoded = twaddle.decode(encoded)
  expect(decoded).toBe(original)
})

test("custom contraction encode/decode", () => {
  const contractionSource = new Map<number, string[]>([
    [1, [
      "hello"
    ]]
  ])
  const defaultTwaddle = new Twaddle(null)
  const twaddle = new Twaddle(contractionSource)
  const original = "hello"
  const defaultEncoded = defaultTwaddle.encode(original)
  const encoded = twaddle.encode(original)
  expect(encoded).not.toBe(original)
  expect(encoded).not.toBe(defaultEncoded)
  const decoded = twaddle.decode(encoded)
  expect(decoded).toBe(original)
})

test("custom contraction layering", () => {
  const contractionSource = new Map<number, string[]>([
    [1, [
      "hello"
    ]]
  ])
  const defaultTwaddle = new Twaddle(null)
  const twaddle = new Twaddle(contractionSource)
  const original = '{"url":"https://example.nope"}' // Does NOT contain "hello" or any default 1-contraction.
  const defaultEncoded = defaultTwaddle.encode(original)
  const encoded = twaddle.encode(original)
  expect(encoded).not.toBe(original)
  expect(encoded).toBe(defaultEncoded)
  const decoded = twaddle.decode(encoded)
  expect(decoded).toBe(original)
})

test("prevent a contraction that is not larger than its encoding", () => {
  const contractionSource = new Map<number, string[]>([
    [1, [
      "hi"
    ]]
  ])
  expect(() => {
    // @ts-ignore
    const twaddle = new Twaddle(contractionSource)
  }).toThrow()
})
