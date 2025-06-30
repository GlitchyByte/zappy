// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { ZappyContractionTables } from "./zappy"
import { decodeBase64ToBytes } from "./base64Decoder"
import {
  bytesToString,
  GByteBufferReader,
  GByteBufferWriter,
  numberToHexString,
  stringToBytes
} from "@glitchybyte/dash"

function resolveAsciiToken(decompressed: GByteBufferWriter, byte: number): void {
  decompressed.writeUInt8(byte)
}

function resolveBlobToken(decompressed: GByteBufferWriter, byte: number, source: GByteBufferReader): void {
  const count = byte & 0x1f
  for (let i = 0; i < count; ++i) {
    const b = source.readUInt8()
    decompressed.writeUInt8(b)
  }
}

function resolveRepeatToken(decompressed: GByteBufferWriter, byte: number, source: GByteBufferReader): void {
  const count = byte & 0x1f
  const b = source.readUInt8()
  for (let i = 0; i < count; ++i) {
    decompressed.writeUInt8(b)
  }
}

function resolveDecimalToken(decompressed: GByteBufferWriter, byte: number, source: GByteBufferReader): void {
  const count = byte & 0x0f
  let value: number
  switch (count) {
    case 1:
      value = source.readUInt8()
      break
    case 2:
      value = source.readUInt16()
      break
    case 4:
      value = source.readUInt32()
      break
    default:
      throw new Error(`Invalid byte count: ${count}`)
  }
  const digits = value.toString()
  for (const ch of digits) {
    decompressed.writeUInt8(ch.charCodeAt(0))
  }
}

function resolveHexadecimalToken(decompressed: GByteBufferWriter, byte: number, source: GByteBufferReader, isUppercase: boolean): void {
  const count = byte & 0x07
  let value: number
  switch (count) {
    case 2:
      value = source.readUInt16()
      break
    case 4:
      value = source.readUInt32()
      break
    default:
      throw new Error(`Invalid byte count: ${count}`)
  }
  const digits = stringToBytes(numberToHexString(value, 1, isUppercase)) //numberToHexBytes(value, isUppercase)
  decompressed.writeBytes(digits)
}

function resolveContractionToken(decompressed: GByteBufferWriter, byte: number, source: GByteBufferReader, contractions: ZappyContractionTables): void {
  let tableId: number
  let lookupIndex: number
  if ((byte & 0x10) === 0) {
    // Fast lookup!
    tableId = 0
    lookupIndex = byte & 0x0f
  } else {
    tableId = (byte & 0x0f) + 1
    lookupIndex = source.readUInt8()
  }
  const lookup = contractions.get(tableId)
  if (!lookup) {
    throw new Error(`No contractions found [tableId: ${tableId}]`)
  }
  const bytes = lookup.get(lookupIndex)
  if (!bytes) {
    throw new Error(`Contraction lookup index [${tableId}]:${lookupIndex} not found!`)
  }
  decompressed.writeBytes(bytes)
}

function resolveNextToken(decompressed: GByteBufferWriter, byte: number, source: GByteBufferReader, contractions: ZappyContractionTables): void {
  if ((byte & 0x80) === 0) {
    // ASCII character. Take as-is.
    resolveAsciiToken(decompressed, byte)
    return
  }
  if ((byte & 0x40) === 0) {
    // Level 1 compressed instruction.
    if ((byte & 0x20) === 0) {
      // Blob. Take as-is as a group.
      resolveBlobToken(decompressed, byte, source)
      return
    }
    // Repeated character.
    resolveRepeatToken(decompressed, byte, source)
    return
  }
  // Level 2 compressed instruction.
  if ((byte & 0x20) === 0) {
    // Unsigned integer.
    if ((byte & 0x10) === 0) {
      // Decimal integer.
      resolveDecimalToken(decompressed, byte, source)
      return
    }
    // Hexadecimal integer.
    const isUppercase = (byte & 0x08) === 0
    resolveHexadecimalToken(decompressed, byte, source, isUppercase)
    return
  }
  // Contraction lookup.
  resolveContractionToken(decompressed, byte, source, contractions)
}

function decompressFromZappyBytes(bytes: Uint8Array<ArrayBuffer>, contractions: ZappyContractionTables): Uint8Array {
  const source = new GByteBufferReader(bytes.buffer)
  const decompressed = new GByteBufferWriter()
  while (!source.isAtEnd()) {
    const byte = source.readUInt8()
    resolveNextToken(decompressed, byte, source, contractions)
  }
  return decompressed.extractBytes()
}

/**
 * Decodes a Zappy string into an utf-8 string.
 *
 * @param str Zappy string.
 * @param contractions Contractions for aiding compression.
 * @throws Error If str is an invalid Zappy string.
 */
export function decodeZappyToString(str: string, contractions: ZappyContractionTables): string {
  const bytes = decodeBase64ToBytes(str)
  const decompressedBytes = decompressFromZappyBytes(bytes, contractions)
  return bytesToString(decompressedBytes)
}
