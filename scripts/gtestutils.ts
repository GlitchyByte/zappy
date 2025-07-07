// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import fs from "fs-extra"
import { GMath, numberToHexString, pickRandomArrayItem } from "@glitchybyte/dash"

export function saveLinesToFile(path: string, lines: string[]): void {
  const stream = fs.createWriteStream(path, "utf8")
  for (let i = 0; i < (lines.length - 1); ++i) {
    stream.write(lines[i] + "\n")
  }
  stream.end(lines[lines.length - 1])
}

export function loadLinesFromFile(path: string): string[] {
  const lines = []
  const bufferSize = 64 * 1024
  const textDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
  let isPartial = false
  try {
    const fd = fs.openSync(path, "r")
    const buffer = new Uint8Array(bufferSize)
    while (true) {
      const read = fs.readSync(fd, buffer, 0, bufferSize, null)
      if (read === 0) {
        break
      }
      const chunk = buffer.subarray(0, read)
      const str = textDecoder.decode(chunk, { stream: true })
      if (str.length === 0) {
        continue
      }
      const parts = str.split("\n")
      for (let i = 0; i < parts.length; ++i) {
        if ((i === 0) && isPartial) {
          lines[lines.length - 1] += parts[0]
          isPartial = parts.length === 1
          continue
        }
        lines.push(parts[i])
        isPartial = true
      }
    }
    fs.closeSync(fd)
  } catch (e) {
    // Can't read from file.
    // Return what we have so far, probably empty array.
  }
  return lines
}

export function makeFakeJson(knownIdentifiers: string[]): string {
  const makeKnownIdentifier = (): string => {
    return pickRandomArrayItem(knownIdentifiers)!
  }

  const makeUnknownIdentifier = (): string => {
    const characters = "abcdefghijklmnopqrstuvwxyz"
    const length = GMath.randomUIntRange(4, 10)
    let str = ""
    for (let i = 0; i < length; ++i) {
      const index = GMath.randomUInt(characters.length)
      str += characters.charAt(index)
    }
    return str
  }

  const makeBoolean = (): string => {
    return GMath.randomBoolean() ? "false" : "true"
  }

  const makeNumber = (): string => {
    const characters = "0123456789"
    const isNegative = GMath.randomBoolean(0.1)
    const length = GMath.randomUIntRange(2, 6)
    const hasDecimalPoint = GMath.randomBoolean(0.2)
    const fractionalLength = GMath.randomUIntRange(1, 4)
    let str = isNegative ? "-" : ""
    for (let i = 0; i < length; ++i) {
      const index = i == 0 ? GMath.randomUIntRange(1, characters.length) : GMath.randomUInt(characters.length)
      str += characters.charAt(index)
    }
    if (hasDecimalPoint) {
      str += "."
      for (let i = 0; i < fractionalLength; ++i) {
        const index = GMath.randomUInt(characters.length)
        str += characters.charAt(index)
      }
    }
    return str
  }

  const makeString = (): string => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 "
    const length = GMath.randomUIntRange(6, 32)
    let str = ""
    for (let i = 0; i < length; ++i) {
      const index = GMath.randomUInt(characters.length)
      str += characters.charAt(index)
    }
    return str
  }

  const makeHex = (): string => {
    const value = GMath.randomUInt(0x01000000)
    const isUppercase = GMath.randomBoolean()
    return "0x" + numberToHexString(value, 1, isUppercase)
  }

  const makeUUID = (): string => {
    return crypto.randomUUID()
  }

  const makeArray = (): string => {
    const itemCount = GMath.randomUIntRange(3, 20)
    const itemType = GMath.randomUInt(3)
    let str = "["
    for (let i = 0; i < itemCount; ++i) {
      switch (itemType) {
        case 0:
          str += makeNumber()
          break
        case 1:
          str += `"${makeHex()}"`
          break
        case 2:
          str += `"${makeString()}"`
          break
      }
      if (i < (itemCount - 1)) {
        str += ","
      }
    }
    str += "]"
    return str
  }

  const makeObject = (): string => {
    const itemCount = GMath.randomUIntRange(4, 12)
    let str = "{"
    for (let i = 0; i < itemCount; ++i) {
      str += GMath.randomBoolean(0.75) ? `"${makeKnownIdentifier()}":` : `"${makeUnknownIdentifier()}":`
      const itemType = GMath.randomWeightIndex([2, 3, 3, 3, 5, 1, 0.5])
      switch (itemType) {
        case 0:
          str += makeBoolean()
          break
        case 1:
          str += makeNumber()
          break
        case 2:
          str += `"${makeHex()}"`
          break
        case 3:
          str += `"${makeUUID()}"`
          break
        case 4:
          str += `"${makeString()}"`
          break
        case 5:
          str += makeArray()
          break
        case 6:
          str += makeObject()
          break
      }
      if (i < (itemCount - 1)) {
        str += ","
      }
    }
    str += "}"
    return str
  }

  return makeObject()
}
