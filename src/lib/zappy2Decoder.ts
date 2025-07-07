// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { decodeBase64ToBytes } from "./base64Decoder"
import {
  bytesToString,
  GBitBufferReader,
  GByteBufferWriter,
  numberToBaseNString,
  numberToHexString,
  stringToBytes
} from "@glitchybyte/dash"
import { septetToBytes, ZAPPY_LOWERCASE_CHARS, ZAPPY_UPPERCASE_CHARS } from "./zappy2"

function resolveLookup(decompressed: GByteBufferWriter, source: GBitBufferReader): void {
  const septet = source.read(7)
  const bytes = septetToBytes(septet)
  if (typeof bytes === "number") {
    decompressed.writeUInt8(bytes)
    return
  }
  decompressed.writeBytes(bytes)
}

function resolveBlob(decompressed: GByteBufferWriter, source: GBitBufferReader): void {
  const count = source.read(4) + 1
  for (let i = 0; i < count; ++i) {
    const byte = source.read(8)
    decompressed.writeUInt8(byte)
  }
}

function resolveRepeat(decompressed: GByteBufferWriter, source: GBitBufferReader): void {
  const count = source.read(4) + 1
  const septet = source.read(7)
  const bytes = septetToBytes(septet)
  if (typeof bytes !== "number") {
    throw new Error("Invalid repeat septet")
  }
  for (let i = 0; i < count; ++i) {
    decompressed.writeUInt8(bytes)
  }
}

function resolveDecimal(decompressed: GByteBufferWriter, source: GBitBufferReader): void {
  const bitCount = source.read(5) + 1
  const value = source.read(bitCount)
  const digits = stringToBytes(value.toString())
  decompressed.writeBytes(digits)
}

function resolveHexadecimal(decompressed: GByteBufferWriter, source: GBitBufferReader, uppercase: boolean): void {
  const bitCount = source.read(5) + 1
  const value = source.read(bitCount)
  const digits = stringToBytes(numberToHexString(value, 1, uppercase))
  decompressed.writeBytes(digits)
}

function resolveZappy(decompressed: GByteBufferWriter, source: GBitBufferReader, uppercase: boolean): void {
  const bitCount = source.read(5) + 1
  const value = source.read(bitCount)
  const digits = stringToBytes(numberToBaseNString(value, uppercase ? ZAPPY_UPPERCASE_CHARS : ZAPPY_LOWERCASE_CHARS))
  decompressed.writeBytes(digits)
}

function resolveLevel4Instruction(decompressed: GByteBufferWriter, source: GBitBufferReader): boolean {
  // Level 4 instruction.
  const level4 = source.read(1)
  switch (level4) {
    case 0:
      resolveBlob(decompressed, source)
      return true
    case 1:
    default:
      return false
  }
}

function resolveLevel3Instruction(decompressed: GByteBufferWriter, source: GBitBufferReader): boolean {
  // Level 3 instruction.
  const level3 = source.read(2)
  switch (level3) {
    case 0b00:
      resolveDecimal(decompressed, source)
      return true
    case 0b01:
      resolveHexadecimal(decompressed, source, true)
      return true
    case 0b10:
      resolveHexadecimal(decompressed, source, false)
      return true
    case 0b11:
    default:
      return resolveLevel4Instruction(decompressed, source)
  }
}

function resolveLevel2Instruction(decompressed: GByteBufferWriter, source: GBitBufferReader): boolean {
  // Level 2 instruction.
  const level2 = source.read(2)
  switch (level2) {
    case 0b00:
      resolveRepeat(decompressed, source)
      return true
    case 0b01:
      resolveZappy(decompressed, source, true)
      return true
    case 0b10:
      resolveZappy(decompressed, source, false)
      return true
    case 0b11:
    default:
      return resolveLevel3Instruction(decompressed, source)
  }
}

function resolveLevel1Instruction(decompressed: GByteBufferWriter, source: GBitBufferReader): boolean {
  // Level 1 instruction.
  const level1 = source.read(1)
  switch (level1) {
    case 0:
      resolveLookup(decompressed, source)
      return true
    case 1:
    default:
      return resolveLevel2Instruction(decompressed, source)
  }
}

function decompressFromZappyBytes(bytes: Uint8Array<ArrayBuffer>): Uint8Array {
  const source = new GBitBufferReader(bytes.buffer)
  const decompressed = new GByteBufferWriter()
  // console.log("-".repeat(64))
  while (true) {
    // const ss = source.position
    // const ds = decompressed.size

    if (!resolveLevel1Instruction(decompressed, source)) {
      break
    }

    // const se = source.position
    // const de = decompressed.size
    // const str = bytesToString(decompressed.extractBytes().subarray(ds, de))
    // console.log(`dec: ${se - ss} => ${(de - ds) * 8}`, str)
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
export function decodeZappy2ToString(str: string): string {
  const bytes = decodeBase64ToBytes(str)
  const decompressedBytes = decompressFromZappyBytes(bytes)
  return bytesToString(decompressedBytes)
}
