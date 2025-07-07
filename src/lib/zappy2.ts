// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { baseNStringToNumber, GMath, numberToBaseNString, stringToBytes } from "@glitchybyte/dash"

const defaultContractions = [
  // Common values.
  "null",
  "true",
  "false",
  "0x",
  "\"\"",
  // End of identifier, beginning of value.
  "\":",
  "\":\"",
  "\":{\"",
  "\":[",
  "\":[\"",
  "\":[{\"",
  // Closing object and array, beginning of identifier.
  "},\"",
  "],\"",
  "}],\"",
  "]},\"",
  "\"},\"",
  "\"],\"",
  "\"}],\"",
  "\"]},\"",
  // Comma separators.
  ",\"",
  "\",\"",
  // Beginning and end of json.
  "{\"",
  "]}",
  "\"}",
  "\"]}",
  // Common url parts.
  "https://",
  "ws://",
  "://",
  ".com",
  ".org",
  ".net",
  ".io",
  ".gg"
]

export const DEFAULT_CONTRACTION_MAX_LENGTH = defaultContractions
  .map((value) => value.length)
  .reduce((previousValue, currentValue) => GMath.max(previousValue, currentValue))

const septetToBytesMap = new Map<number, Uint8Array>(
  defaultContractions.map((value, index) => [95 + index, stringToBytes(value)])
)

function fnv1a(bytes: Uint8Array): number {
  let hash = 0x811c9dc5
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const hashedBytesToSeptetMap = new Map<number, number>(
  defaultContractions.map((value, index) => [fnv1a(stringToBytes(value)), 95 + index])
)

// TODO: Can we bake this?

export function septetToBytes(septet: number): number | Uint8Array {
  //  0-94  -> 32-126 ASCII (95 characters)
  // 95-127 -> json commons (33 contractions)
  if (septet < 95) {
    return septet + 32
  }
  return septetToBytesMap.get(septet)!
}

export function isValidAscii(byte: number): boolean {
  return (byte >= 32) && (byte <= 126)
}

export function byteToSeptet(byte: number): number {
  //  0-94  -> 32-126 ASCII (95 characters)
  return byte - 32
}

export function bytesToSeptet(bytes: Uint8Array): [septet: number, bytesUsed: number] {
  // 95-127 -> json commons (33 contractions)
  for (let i = bytes.length; i > 1; --i) {
    const hash = fnv1a(bytes.subarray(0, i))
    const septet = hashedBytesToSeptetMap.get(hash)
    if (septet) {
      return [septet, i]
    }
  }
  return [-1, 0]
}

export const ZAPPY_UPPERCASE_CHARS = "0ABCDEFGHIJKLMNOPQRSTUVWXYZ"
export const ZAPPY_LOWERCASE_CHARS = "0abcdefghijklmnopqrstuvwxyz"
