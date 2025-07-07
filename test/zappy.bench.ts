// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { bench, describe, expect } from "vitest"
// @ts-ignore
import { makeFakeJson, loadLinesFromFile, saveLinesToFile } from "../scripts/gtestutils"
import {
  createZappyContractionTables,
  decodeBase64ToString, decodeDeflateToString, decodeZappy2ToString, decodeZappyToString,
  encodeStringToBase64, encodeStringToDeflate, encodeStringToZappy, encodeStringToZappy2,
  zappyDefaultContractions
} from "../src"
import { GMath } from "@glitchybyte/dash"

const sampleCount = 1_000
const knownIdentifiers = [
  "user", "location", "rank", "score", "target", "color", "size", "origin", "name", "track", "command", "time"
]
const testContractions = new Map<number, string[]>([
  [1, knownIdentifiers]
])
const contractionTables = createZappyContractionTables(zappyDefaultContractions, testContractions)

async function getPayloads(count: number): Promise<[string[], string[], string[], string[], string[], string[]]> {
  let decodedPayloads = loadLinesFromFile("random-decoded.txt")
  let encodedBase64Payloads = loadLinesFromFile("random-encoded-base64.txt")
  let encodedZappyBase64Payloads = loadLinesFromFile("random-encoded-zappy-base64.txt")
  let encodedZappyDeflatePayloads = loadLinesFromFile("random-encoded-zappy-deflate.txt")
  let encodedZappyPayloads = loadLinesFromFile("random-encoded-zappy.txt")
  let encodedZappy2Payloads = loadLinesFromFile("random-encoded-zappy2.txt")
  if (decodedPayloads.length > count) {
    decodedPayloads = decodedPayloads.slice(0, count)
    encodedBase64Payloads = encodedBase64Payloads.slice(0, count)
    encodedZappyBase64Payloads = encodedZappyBase64Payloads.slice(0, count)
    encodedZappyDeflatePayloads = encodedZappyDeflatePayloads.slice(0, count)
    encodedZappyPayloads = encodedZappyPayloads.slice(0, count)
    encodedZappy2Payloads = encodedZappy2Payloads.slice(0, count)
  } else if (decodedPayloads.length < count) {
    for (let i = decodedPayloads.length; i < count; ++i) {
      const payload = makeFakeJson(knownIdentifiers)
      decodedPayloads.push(payload)
      encodedBase64Payloads.push(btoa(payload))
      encodedZappyBase64Payloads.push(encodeStringToBase64(payload))
      encodedZappyDeflatePayloads.push(await encodeStringToDeflate(payload))
      encodedZappyPayloads.push(encodeStringToZappy(payload, contractionTables))
      encodedZappy2Payloads.push(encodeStringToZappy2(payload))
    }
    saveLinesToFile("random-decoded.txt", decodedPayloads)
    saveLinesToFile("random-encoded-base64.txt", encodedBase64Payloads)
    saveLinesToFile("random-encoded-zappy-base64.txt", encodedZappyBase64Payloads)
    saveLinesToFile("random-encoded-zappy-deflate.txt", encodedZappyDeflatePayloads)
    saveLinesToFile("random-encoded-zappy.txt", encodedZappyPayloads)
    saveLinesToFile("random-encoded-zappy2.txt", encodedZappy2Payloads)
  }
  return [
    decodedPayloads,
    encodedBase64Payloads,
    encodedZappyBase64Payloads,
    encodedZappyDeflatePayloads,
    encodedZappyPayloads,
    encodedZappy2Payloads
  ]
}
const [
  decodedPayloads,
  encodedBase64Payloads,
  encodedZappyBase64Payloads,
  encodedZappyDeflatePayloads,
  encodedZappyPayloads,
  encodedZappy2Payloads
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
    const value = encodeStringToZappy(decodedPayloads[index], contractionTables)
    expect(value).toBe(encodedZappyPayloads[index])
  })

  bench("Zappy3", () => {
    const index = GMath.randomUInt(sampleCount)
    const value = encodeStringToZappy2(decodedPayloads[index])
    expect(value).toBe(encodedZappy2Payloads[index])
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
    const value = decodeZappyToString(encodedZappyPayloads[index], contractionTables)
    expect(value).toBe(decodedPayloads[index])
  })

  bench("Zappy3", () => {
    const index = GMath.randomUInt(sampleCount)
    const value = decodeZappy2ToString(encodedZappy2Payloads[index])
    expect(value).toBe(decodedPayloads[index])
  })
})
