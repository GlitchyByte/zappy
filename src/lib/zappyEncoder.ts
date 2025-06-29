// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { ZappyContractionTables } from "./zappy"
import { encodeBytesToBase64 } from "./base64Encoder"
import { GByteBufferWriter, stringToBytes } from "@glitchybyte/dash"

const MAX_DECIMAL = 0x7fffffff

function addContractionToken(compressed: GByteBufferWriter, source: Uint8Array, index: number, contractions: ZappyContractionTables): number {
  const findLookupIndex = (lookup: Map<number, Uint8Array>, source: Uint8Array, index: number): number | null => {
    for (const [ lookupIndex, bytes ] of lookup) {
      if (bytes.length > (source.length - index)) {
        continue
      }
      let found = true
      for (let i = 0; i < bytes.length; ++i) {
        if (bytes[i] !== source[index + i]) {
          found = false
          break
        }
      }
      if (found) {
        return lookupIndex
      }
    }
    return null
  }

  for (let tableId = 16; tableId >= 0; --tableId) {
    const lookup = contractions.get(tableId)
    if (!lookup) {
      continue
    }
    const lookupIndex = findLookupIndex(lookup, source, index)
    if (lookupIndex === null) {
      continue
    }
    if (tableId === 0) {
      const token = 0xe0 | lookupIndex
      compressed.writeUInt8(token)
    } else {
      const token = 0xf0 | (tableId - 1)
      compressed.writeUInt8(token)
      compressed.writeUInt8(lookupIndex)
    }
    return lookup.get(lookupIndex)!.length
  }
  return 0
}

function addRepeatToken(compressed: GByteBufferWriter, source: Uint8Array, index: number): number {
  const maxRepeatCount = 0x1f
  let count = 1
  const value = source[index]
  while (count < maxRepeatCount) {
    const walker = index + count
    if (walker >= source.length) {
      break
    }
    const byte = source[walker]
    if (value !== byte) {
      break
    }
    ++count
  }
  if (count < 3) {
    return 0
  }
  const token = 0xa0 | count
  compressed.writeUInt8(token)
  compressed.writeUInt8(value)
  return count
}

function isDigit(byte: number): boolean {
  return (byte >= 0x30) && (byte <= 0x39) // [0..9]
}

function isUppercaseHexDigit(byte: number): boolean {
  return (byte >= 0x41) && (byte <= 0x46) // [A..F]
}

function isLowercaseHexDigit(byte: number): boolean {
  return (byte >= 0x61) && (byte <= 0x66) // [a..f]
}

function addDecimalToken(compressed: GByteBufferWriter, source: Uint8Array, index: number, count: number) {
  // FIXME JS BUG: Can't have an unsigned 32bit int, if bit 31 is set JS interprets it as a negative number.
  //  So we'll only encode numbers up to 31 bits long. Though the problem only shows when decoding, we prevent
  //  encoding so we don't manifest the bug later.
  let digit = 0
  let value = 0
  while (digit < count) {
    const byte = source[index + digit]
    const newValue = (value * 10) + (byte - 0x30)
    if (newValue > MAX_DECIMAL) {
      break
    }
    value = newValue
    ++digit
  }
  // Minimum encoding size is 2 bytes (token + UInt8). So we do not encode numbers under 100 which are
  // 2 bytes to start with in ASCII.
  if (value < 100) {
    return 0
  }
  let byteCount = 1
  if (value > 0xffff) {
    byteCount = 4
  } else if (value > 0xff) {
    byteCount = 2
  }
  const token = 0xc0 | byteCount
  compressed.writeUInt8(token)
  switch (byteCount) {
    case 4:
      compressed.writeUInt32(value)
      break
    case 2:
      compressed.writeUInt16(value)
      break
    default:
      compressed.writeUInt8(value)
  }
  return count
}

function addHexadecimalToken(compressed: GByteBufferWriter, source: Uint8Array, index: number, count: number, isUppercase: boolean) {
  // FIXME JS BUG: Can't have an unsigned 32bit int, if bit 31 is set JS interprets it as a negative number.
  //  So we'll only encode numbers up to 31 bits long. Though the problem only shows when decoding, we prevent
  //  encoding so we don't manifest the bug later.
  let digit = 0
  let value = 0
  while (digit < count) {
    const byte = source[index + digit]
    let digitValue = 0
    if (isDigit(byte)) {
      digitValue = byte - 0x30
    } else if (isUppercase) {
      digitValue = byte - 0x37 // 0x0a + (byte - 0x41)
    } else {
      digitValue = byte - 0x57 // 0x0a + (byte - 0x61)
    }
    if ((value & 0x08000000) !== 0) {
      break
    }
    value = (value * 0x10) | digitValue
    ++digit
  }
  // Minimum encoding size is 3 bytes (token + UInt16). So we do not encode hex numbers under 0x1000 which are
  // 3 bytes to start with in ASCII.
  if (value < 0x1000) {
    return 0
  }
  const byteCount = value > 0xffff ? 4 : 2
  const token = (isUppercase ? 0xd0 : 0xd8) | byteCount
  compressed.writeUInt8(token)
  if (byteCount === 4) {
    compressed.writeUInt32(value)
  } else {
    compressed.writeUInt16(value)
  }
  return digit
}

function addUnsignedIntegerToken(compressed: GByteBufferWriter, source: Uint8Array, index: number): number {
  // Collect up to 10 decimal or 8 hex.
  let count = 1
  let byte = source[index]
  let isUppercase = isUppercaseHexDigit(byte)
  let isHex = isUppercase || isLowercaseHexDigit(byte)
  while ((isHex && (count < 8)) || (!isHex && (count < 10))) {
    const walker = index + count
    if (walker >= source.length) {
      break
    }
    byte = source[walker]
    if (isDigit(byte)) {
      ++count
      continue
    }
    if (isHex) {
      if (isUppercase && isUppercaseHexDigit(byte)) {
        ++count
        continue
      }
      if (!isUppercase && isLowercaseHexDigit(byte)) {
        ++count
        continue
      }
      break
    }
    if (isUppercaseHexDigit(byte)) {
      if (count >= 8) {
        break
      }
      isHex = true
      isUppercase = true
      ++count
      continue
    }
    if (isLowercaseHexDigit(byte)) {
      if (count >= 8) {
        break
      }
      isHex = true
      ++count
      continue
    }
    break
  }
  return isHex ?
    addHexadecimalToken(compressed, source, index, count, isUppercase) :
    addDecimalToken(compressed, source, index, count)
}

function addAsciiToken(compressed: GByteBufferWriter, source: Uint8Array, index: number): number {
  compressed.writeUInt8(source[index])
  return 1
}

function addBlobToken(compressed: GByteBufferWriter, source: Uint8Array, index: number): number {
  const maxBlobSize = 0x1f
  let count = 1
  while (count < maxBlobSize) {
    const walker = index + count
    if (walker >= source.length) {
      break
    }
    const byte = source[walker]
    if ((byte & 0x80) === 0) {
      break
    }
    ++count
  }
  const token = 0x80 | count
  compressed.writeUInt8(token)
  // const start = compressed.length
  // compressed.setLength(start + count)
  for (let i = 0; i < count; ++i) {
    // compressed.setUInt8(start + i, source[index + i])
    compressed.writeUInt8(source[index + i])
  }
  return count
}

function addNextToken(compressed: GByteBufferWriter, source: Uint8Array, index: number, contractions: ZappyContractionTables): number {
  {
    // Contraction.
    const used = addContractionToken(compressed, source, index, contractions)
    if (used > 0) {
      return used
    }
  }
  {
    // Repeated.
    const used = addRepeatToken(compressed, source, index)
    if (used > 0) {
      return used
    }
  }
  const byte = source[index]
  // Check for (0..9] || [A..F] || [a..f]
  if (((byte > 0x30) && (byte <= 0x39)) || ((byte >= 0x41) && (byte <= 0x46)) || ((byte >= 0x61) && (byte <= 0x66))) {
    // Unsigned integer.
    const used = addUnsignedIntegerToken(compressed, source, index)
    if (used > 0) {
      return used
    }
  }
  if ((byte & 0x80) === 0) {
    // ASCII. Take as-is.
    return addAsciiToken(compressed, source, index)
  }
  // Non-ASCII. Take as-is as a group.
  return addBlobToken(compressed, source, index)
}

function compressToZappyBytes(source: Uint8Array, contractions: ZappyContractionTables): Uint8Array {
  const compressed = new GByteBufferWriter()
  let index = 0
  while (index < source.length) {
    index += addNextToken(compressed, source, index, contractions)
  }
  return compressed.extractBytes()
}

/**
 * Encodes an utf-8 string into a Zappy string.
 *
 * @param str Utf-8 string to encode.
 * @param contractions Contractions for aiding compression.
 */
export function encodeStringToZappy(str: string, contractions: ZappyContractionTables): string {
  let bytes = stringToBytes(str)
  bytes = compressToZappyBytes(bytes, contractions)
  return encodeBytesToBase64(bytes)
}
