// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs"
import { GMath } from "../main/GMath"
import { numberToHexString } from "../main/gutils"

export const saveLinesToFile = (path: string, lines: string[]) => {
  const stream = fs.createWriteStream(path, "utf8")
  for (let i = 0; i < (lines.length - 1); ++i) {
    stream.write(lines[i] + "\n")
  }
  stream.end(lines[lines.length - 1])
}

export const loadLinesFromFile = (path: string): string[] => {
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

export const makeFakeJson = (knownIdentifiers: string[]): string => {
  const makeKnownIdentifier = (): string => {
    const index = GMath.randomUInt(knownIdentifiers.length)
    return knownIdentifiers[index]
  }
  const makeUnknownIdentifier = (): string => {
    const characters = "abcdefghijklmnopqrstuvwxyz"
    const length = GMath.randomUIntRange(4, 8)
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
    const fractionalLength = GMath.randomUIntRange(1, 3)
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
    const length = GMath.randomUIntRange(4, 24)
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
    return "0x" + numberToHexString(value, isUppercase).padStart(6, "0")
  }

  const itemCount = GMath.randomUIntRange(4, 12)
  let str = "{"
  for (let i = 0; i < itemCount; ++i) {
    str += GMath.randomBoolean(0.75) ? `"${makeKnownIdentifier()}":` : `"${makeUnknownIdentifier()}":`
    const itemType = GMath.randomUInt(4)
    switch (itemType) {
      case 0:
        str += makeBoolean()
        break
      case 1:
        str += makeNumber()
        break
      case 2:
        str += `"${makeString()}"`
        break
      case 3:
        str += `"${makeHex()}"`
    }
    if (i < (itemCount - 1)) {
      str += ","
    }
  }
  str += "}"
  return str
}
