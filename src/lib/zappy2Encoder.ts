// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { encodeBytesToBase64 } from "./base64Encoder"
import { baseNStringToNumber, bytesToString, GBitBufferWriter, GMath, stringToBytes } from "@glitchybyte/dash"
import {
  bytesToSeptet,
  byteToSeptet,
  DEFAULT_CONTRACTION_MAX_LENGTH,
  isValidAscii,
  ZAPPY_LOWERCASE_CHARS,
  ZAPPY_UPPERCASE_CHARS
} from "./zappy2"

function addBlob(compressed: GBitBufferWriter, source: Uint8Array, index: number): number {
  // Check for invalid ASCII. Take as-is as a group.
  const maxBlobSize = GMath.min(0b1_0000, source.length - index)
  let count = 0
  while (count < maxBlobSize) {
    const walker = index + count
    const byte = source[walker]
    if (isValidAscii(byte)) {
      break
    }
    ++count
  }
  if (count === 0) {
    return 0
  }
  compressed.write(6, 0b1_11_11_0)
  compressed.write(4, count - 1)
  for (let i = 0; i < count; ++i) {
    compressed.write(8, source[index + i])
  }
  return count
}

function addRepeat(compressed: GBitBufferWriter, source: Uint8Array, index: number): number {
  const maxRepeatCount = GMath.min(0b1_0000, source.length - index)
  const value = source[index]
  let count = 1
  while (count < maxRepeatCount) {
    const walker = index + count
    const byte = source[walker]
    if (value !== byte) {
      break
    }
    ++count
  }
  if (count < 2) {
    return 0
  }
  compressed.write(3, 0b1_00)
  compressed.write(4, count - 1)
  compressed.write(7, byteToSeptet(value))
  return count
}

function addContraction(compressed: GBitBufferWriter, source: Uint8Array, index: number): number {
  const count = GMath.min(DEFAULT_CONTRACTION_MAX_LENGTH, source.length - index)
  if (count <= 1) {
    return 0
  }
  const segment = source.subarray(index, index + count)
  const [septet, bytesUsed] = bytesToSeptet(segment)
  if (bytesUsed === 0) {
    return 0
  }
  compressed.write(1, 0b0)
  compressed.write(7, septet)
  return bytesUsed
}

function addValidAscii(compressed: GBitBufferWriter, source: Uint8Array, index: number): number {
  const byte = source[index]
  if (!isValidAscii(byte)) {
    return 0
  }
  compressed.write(1, 0b0)
  compressed.write(7, byteToSeptet(byte))
  return 1
}

// type ByteCollectionType = "decimal" | "hex" | "zappy" | null
type ByteCollectionType = "d" | "dh" | "h" | "hz" | "z" | null
function addBaseNCompression(compressed: GBitBufferWriter, source: Uint8Array, index: number): number {
  // Collect characters until we can compress something.
  const sourceLength = source.length
  let stringType: ByteCollectionType = null
  let isUppercase = false
  let count = 0
  collectorLoop: while ((index + count) < sourceLength) {
    const walker = index + count
    const byte = source[walker]
    const isByteZero = byte === 0x30 // 0
    const isByteDecimal = (byte >= 0x30) && (byte <= 0x39) // [0..9]
    const isByteHex = ((byte >= 0x41) && (byte <= 0x46)) || ((byte >= 0x61) && (byte <= 0x66)) // [A..F] || [a..f]
    const isByteBase26 = ((byte >= 0x41) && (byte <= 0x5a)) || ((byte >= 0x61) && (byte <= 0x7a)) // [A..Z] || [a..z]
    const isByteUppercase = (byte & 0b0010_0000) === 0
    const byteType: ByteCollectionType = isByteDecimal ? "d" : isByteHex ? "h" : isByteBase26 ? "z" : null
    if (byteType === null) {
      // We don't know what this is.
      break
    }
    if ((count === 0) && isByteZero) {
      // We don't take zeroes on the left.
      break
    }
    if (stringType === null) {
      stringType = byteType
      if ((stringType === "h") || (stringType === "z")) {
        isUppercase = isByteUppercase
      }
    }
    if (isByteDecimal) {
      if (stringType.at(-1) === "z") {
        break
      }
      if (stringType[0] === "h") {
        stringType = "dh"
      }
    } else if (isByteHex) {
      if (stringType === "d") {
        stringType = "dh"
        isUppercase = isByteUppercase
      } else if (isUppercase !== isByteUppercase) {
        break
      }
    } else {
      if ((stringType[0] === "d") || (isUppercase !== isByteUppercase)) {
        break
      } else if (stringType === "h") {
        stringType = "hz"
      }
    }
    ++count
    switch (stringType.at(-1)) {
      case "d":
        if (count >= 10) {
          break collectorLoop
        }
        break
      case "h":
        if (count >= 8) {
          break collectorLoop
        }
        break
      case "z":
        if (count >= 7) {
          break collectorLoop
        }
        break
      default:
        throw new Error("Internal error: Unknown baseN type")
    }
  }
  if (count < 2) {
    return 0
  }
  let valueByteCount: number
  let str: string
  let value: number
  let bitCount: number
  switch (stringType!.at(-1)) {
    case "d":
      valueByteCount = GMath.min(10, count)
      str = bytesToString(source.subarray(index, index + valueByteCount))
      value = parseInt(str, 10)
      if (value > 0xffffffff) {
        valueByteCount = 9
        str = bytesToString(source.subarray(index, index + 9))
        value = parseInt(str, 10)
      }
      bitCount = 32 - Math.clz32(value)
      compressed.write(5, 0b1_11_00)
      compressed.write(5, bitCount - 1)
      compressed.write(bitCount, value)
      return valueByteCount
    case "h":
      valueByteCount = GMath.min(8, count)
      str = bytesToString(source.subarray(index, index + valueByteCount))
      value = parseInt(str, 16)
      bitCount = 32 - Math.clz32(value)
      compressed.write(5, isUppercase ? 0b1_11_01 : 0b1_11_10)
      compressed.write(5, bitCount - 1)
      compressed.write(bitCount, value)
      return valueByteCount
    case "z":
      if (count < 3) {
        // Benefit starts at 3 characters.
        return 0
      }
      valueByteCount = GMath.min(7, count)
      while (true) {
        str = bytesToString(source.subarray(index, index + valueByteCount))
        if ((str.length < 7) ||
          (isUppercase && (str <= "ENQWLTJ")) ||
          (!isUppercase && (str <= "enqwltj"))
        ) { // "enqwltj" is max 7 characters that fit in 32 bits.
          break
        }
        --valueByteCount
      }
      value = baseNStringToNumber(str, isUppercase ? ZAPPY_UPPERCASE_CHARS : ZAPPY_LOWERCASE_CHARS)
      bitCount = 32 - Math.clz32(value)
      compressed.write(3, isUppercase ? 0b1_01 : 0b1_10)
      compressed.write(5, bitCount - 1)
      compressed.write(bitCount, value)
      return valueByteCount
    default:
      throw new Error("Internal error: Unknown baseN type")
  }
}

function addNextInstruction(compressed: GBitBufferWriter, source: Uint8Array, index: number): number {
  let used: number
  // Blob.
  used = addBlob(compressed, source, index)
  if (used > 0) {
    return used
  }
  // Contraction.
  used = addContraction(compressed, source, index)
  if (used > 0) {
    return used
  }
  // BaseN compression: UInt, Hex, Zappy.
  used = addBaseNCompression(compressed, source, index)
  if (used > 0) {
    return used
  }
  // Repeated.
  used = addRepeat(compressed, source, index)
  if (used > 0) {
    return used
  }
  used = addValidAscii(compressed, source, index)
  if (used > 0) {
    return used
  }
  throw new Error("Internal error: Bits are escaping!")
}

function compressToZappyBytes(source: Uint8Array): Uint8Array {
  const compressed = new GBitBufferWriter()
  let index = 0
  // console.log("-".repeat(64))
  while (index < source.length) {
    // const ss = index
    // const cs = compressed.bitCount

    index += addNextInstruction(compressed, source, index)

    // const se = index
    // const ce = compressed.bitCount
    // const str = bytesToString(source.subarray(ss, se))
    // console.log(`enc: ${(se - ss) * 8} => ${ce - cs}`, str)
  }
  compressed.write(6, 0b1_11_11_1) // End of data.
  return compressed.extractBytes()
}

/**
 * Encodes an utf-8 string into a Zappy string.
 *
 * @param str Utf-8 string to encode.
 * @param contractions Contractions for aiding compression.
 */
export function encodeStringToZappy2(str: string): string {
  let bytes = stringToBytes(str)
  bytes = compressToZappyBytes(bytes)
  return encodeBytesToBase64(bytes)
}
