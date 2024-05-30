// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { Zappy } from "../main/Zappy"
import { makeFakeJson, loadLinesFromFile, saveLinesToFile } from "./gtestutils"

const isDirectRun = process.argv.includes("profile")
const conditionalRun = isDirectRun ? describe : describe.skip

conditionalRun("profiling", () => {
  const passCount = 100_000
  const knownIdentifiers = [ "user", "location", "rank", "score", "target", "color", "size", "origin" ]
  const testContractions = new Map<number, string[]>([
    [1, knownIdentifiers]
  ])
  let decodedPayloads: string[]
  let encodedBase64Payloads: string[]
  let encodedZappyBase64Payloads: string[]
  let encodedZappyPayloads: string[]

  beforeAll(() => {
    const getPayloads = (count: number): [ string[], string[], string[], string[] ] => {
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
        const zappy = new Zappy(testContractions, true)
        for (let i = decodedPayloads.length; i < count; ++i) {
          const payload = makeFakeJson(knownIdentifiers)
          decodedPayloads.push(payload)
          encodedBase64Payloads.push(btoa(payload))
          encodedZappyBase64Payloads.push(zappy.base64StringEncode(payload))
          encodedZappyPayloads.push(zappy.encode(payload))
        }
        saveLinesToFile("random-decoded.txt", decodedPayloads)
        saveLinesToFile("random-encoded-base64.txt", encodedBase64Payloads)
        saveLinesToFile("random-encoded-zappy-base64.txt", encodedZappyBase64Payloads)
        saveLinesToFile("random-encoded-zappy.txt", encodedZappyPayloads)
      }
      return [ decodedPayloads, encodedBase64Payloads, encodedZappyBase64Payloads, encodedZappyPayloads ]
    }
    [ decodedPayloads, encodedBase64Payloads, encodedZappyBase64Payloads, encodedZappyPayloads ] = getPayloads(passCount)
  })

  describe("Vanilla base64", () => {
    test("encode", () => {
      for (let i = 0; i < passCount; ++i) {
        btoa(decodedPayloads[i])
      }
    })

    test("decode", () => {
      for (let i = 0; i < passCount; ++i) {
        atob(encodedBase64Payloads[i])
      }
    })
  })

  describe("Zappy base64", () => {
    const zappy = new Zappy(null, true)
    test("encode", () => {
      for (let i = 0; i < passCount; ++i) {
        zappy.base64StringEncode(decodedPayloads[i])
      }
    })

    test("decode", () => {
      for (let i = 0; i < passCount; ++i) {
        zappy.base64StringDecode(encodedZappyBase64Payloads[i])
      }
    })
  })

  describe("Zappy", () => {
    const zappy = new Zappy(testContractions, true)
    test("encode", () => {
      for (let i = 0; i < passCount; ++i) {
        zappy.encode(decodedPayloads[i])
      }
    })

    test("decode", () => {
      for (let i = 0; i < passCount; ++i) {
        zappy.decode(encodedZappyPayloads[i])
      }
    })
  })
})
