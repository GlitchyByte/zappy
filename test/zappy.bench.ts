// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { bench, describe, expect } from "vitest"
import { GMath } from "@glitchybyte/dash"
// @ts-ignore
import { loadLinesFromFile, makeFakeJson, saveLinesToFile } from "../scripts/gtestutils"
import {
  decodeBase64ToString,
  decodeDeflateToString,
  decodeZappyToString,
  encodeStringToBase64,
  encodeStringToDeflate,
  encodeStringToZappy
} from "../src"

const sampleCount = 1_000
const knownIdentifiers = [
  "user", "location", "rank", "score", "target", "color", "size", "origin", "name", "track", "command", "time"
]

async function getPayloads(count: number): Promise<string[][]> {
  let decodedPayloads = loadLinesFromFile("random-decoded.txt")
  let encodedBase64Payloads = loadLinesFromFile("random-encoded-base64.txt")
  let encodedZappyBase64Payloads = loadLinesFromFile("random-encoded-zappy-base64.txt")
  let encodedZappyDeflatePayloads = loadLinesFromFile("random-encoded-zappy-deflate.txt")
  let encodedZappyPayloads = loadLinesFromFile("random-encoded-zappy.txt")
  if (decodedPayloads.length > count) {
    decodedPayloads = decodedPayloads.slice(0, count)
    encodedBase64Payloads = encodedBase64Payloads.slice(0, count)
    encodedZappyBase64Payloads = encodedZappyBase64Payloads.slice(0, count)
    encodedZappyDeflatePayloads = encodedZappyDeflatePayloads.slice(0, count)
    encodedZappyPayloads = encodedZappyPayloads.slice(0, count)
  } else if (decodedPayloads.length < count) {
    for (let i = decodedPayloads.length; i < count; ++i) {
      const payload = makeFakeJson(knownIdentifiers)
      decodedPayloads.push(payload)
      encodedBase64Payloads.push(btoa(payload))
      encodedZappyBase64Payloads.push(encodeStringToBase64(payload))
      encodedZappyDeflatePayloads.push(await encodeStringToDeflate(payload))
      encodedZappyPayloads.push(encodeStringToZappy(payload))
    }
    saveLinesToFile("random-decoded.txt", decodedPayloads)
    saveLinesToFile("random-encoded-base64.txt", encodedBase64Payloads)
    saveLinesToFile("random-encoded-zappy-base64.txt", encodedZappyBase64Payloads)
    saveLinesToFile("random-encoded-zappy-deflate.txt", encodedZappyDeflatePayloads)
    saveLinesToFile("random-encoded-zappy.txt", encodedZappyPayloads)
  }
  return [
    decodedPayloads,
    encodedBase64Payloads,
    encodedZappyBase64Payloads,
    encodedZappyDeflatePayloads,
    encodedZappyPayloads
  ]
}
const [
  decodedPayloads,
  encodedBase64Payloads,
  encodedZappyBase64Payloads,
  encodedZappyDeflatePayloads,
  encodedZappyPayloads,
] = await getPayloads(sampleCount)

describe("encoding", () => {
  bench("Vanilla base64", () => {
    const index = GMath.randomUInt(sampleCount)
    const value = btoa(decodedPayloads[index])
    expect(value).toBe(encodedBase64Payloads[index])
  })

  bench("Zappy base64", () => {
    const index = GMath.randomUInt(sampleCount)
    const value = encodeStringToBase64(decodedPayloads[index])
    expect(value).toBe(encodedZappyBase64Payloads[index])
  })

  bench("Zappy deflate", async () => {
    const index = GMath.randomUInt(sampleCount)
    const value = await encodeStringToDeflate(decodedPayloads[index])
    expect(value).toBe(encodedZappyDeflatePayloads[index])
  })

  bench("Zappy", () => {
    const index = GMath.randomUInt(sampleCount)
    const value = encodeStringToZappy(decodedPayloads[index])
    expect(value).toBe(encodedZappyPayloads[index])
  })
})

describe("decoding", () => {
  bench("Vanilla base64", () => {
    const index = GMath.randomUInt(sampleCount)
    const value = atob(encodedBase64Payloads[index])
    expect(value).toBe(decodedPayloads[index])
  })

  bench("Zappy base64", () => {
    const index = GMath.randomUInt(sampleCount)
    const value = decodeBase64ToString(encodedZappyBase64Payloads[index])
    expect(value).toBe(decodedPayloads[index])
  })

  bench("Zappy deflate", async () => {
    const index = GMath.randomUInt(sampleCount)
    const value = await decodeDeflateToString(encodedZappyDeflatePayloads[index])
    expect(value).toBe(decodedPayloads[index])
  })

  bench("Zappy", () => {
    const index = GMath.randomUInt(sampleCount)
    const value = decodeZappyToString(encodedZappyPayloads[index])
    expect(value).toBe(decodedPayloads[index])
  })
})
