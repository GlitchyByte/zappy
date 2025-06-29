// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { bench, describe, expect } from "vitest"
import { makeFakeJson, loadLinesFromFile, saveLinesToFile } from "./gtestutils"
import {
  createZappyContractionTables,
  decodeBase64ToString, decodeZappyToString,
  encodeStringToBase64, encodeStringToZappy,
  zappyDefaultContractions
} from "../src"

const passCount = 10_000
const knownIdentifiers = [ "user", "location", "rank", "score", "target", "color", "size", "origin" ]
const testContractions = new Map<number, string[]>([
  [1, knownIdentifiers]
])
const contractionTables = createZappyContractionTables(zappyDefaultContractions, testContractions)

const getPayloads = (count: number): [string[], string[], string[], string[]] => {
  let decodedPayloads = loadLinesFromFile("random-decoded.txt")
  let encodedBase64Payloads = loadLinesFromFile("random-encoded-base64.txt")
  let encodedZappyBase64Payloads = loadLinesFromFile("random-encoded-zappy-base64.txt")
  let encodedZappyPayloads = loadLinesFromFile("random-encoded-zappy.txt")
  if (decodedPayloads.length > count) {
    decodedPayloads = decodedPayloads.slice(0, count)
    encodedBase64Payloads = encodedBase64Payloads.slice(0, count)
    encodedZappyBase64Payloads = encodedZappyBase64Payloads.slice(0, count)
    encodedZappyPayloads = encodedZappyPayloads.slice(0, count)
  } else if (decodedPayloads.length < count) {
    for (let i = decodedPayloads.length; i < count; ++i) {
      const payload = makeFakeJson(knownIdentifiers)
      decodedPayloads.push(payload)
      encodedBase64Payloads.push(btoa(payload))
      encodedZappyBase64Payloads.push(encodeStringToBase64(payload))
      encodedZappyPayloads.push(encodeStringToZappy(payload, contractionTables))
    }
    saveLinesToFile("random-decoded.txt", decodedPayloads)
    saveLinesToFile("random-encoded-base64.txt", encodedBase64Payloads)
    saveLinesToFile("random-encoded-zappy-base64.txt", encodedZappyBase64Payloads)
    saveLinesToFile("random-encoded-zappy.txt", encodedZappyPayloads)
  }
  return [decodedPayloads, encodedBase64Payloads, encodedZappyBase64Payloads, encodedZappyPayloads]
}
const [decodedPayloads, encodedBase64Payloads, encodedZappyBase64Payloads, encodedZappyPayloads] = getPayloads(passCount)

describe("encoding", () => {
  bench("Vanilla base64", () => {
    for (let i = 0; i < passCount; ++i) {
      const value = btoa(decodedPayloads[i])
      expect(value).toBe(encodedBase64Payloads[i])
    }
  })

  bench("Zappy base64", () => {
    for (let i = 0; i < passCount; ++i) {
      const value = encodeStringToBase64(decodedPayloads[i])
      expect(value).toBe(encodedZappyBase64Payloads[i])
    }
  })

  bench("Zappy", () => {
    for (let i = 0; i < passCount; ++i) {
      const value = encodeStringToZappy(decodedPayloads[i], contractionTables)
      expect(value).toBe(encodedZappyPayloads[i])
    }
  })
})

describe("decoding", () => {
  bench("Vanilla base64", () => {
    for (let i = 0; i < passCount; ++i) {
      const value = atob(encodedBase64Payloads[i])
      expect(value).toBe(decodedPayloads[i])
    }
  })

  bench("Zappy base64", () => {
    for (let i = 0; i < passCount; ++i) {
      const value = decodeBase64ToString(encodedZappyBase64Payloads[i])
      expect(value).toBe(decodedPayloads[i])
    }
  })

  bench("Zappy", () => {
    for (let i = 0; i < passCount; ++i) {
      const value = decodeZappyToString(encodedZappyPayloads[i], contractionTables)
      expect(value).toBe(decodedPayloads[i])
    }
  })
})
