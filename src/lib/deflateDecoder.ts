// Copyright 2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { decodeBase64ToBytes } from "./base64Decoder"
import { bytesToString, GByteBufferWriter } from "@glitchybyte/dash"

/**
 * Decompress deflate-raw bytes.
 *
 * @param bytes Deflate-raw bytes.
 * @throws Error If there is a problem decompressing.
 */
export async function decompressWithDeflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream("deflate-raw")
  const reader = stream.readable.getReader()
  const writer = stream.writable.getWriter()
  await writer.write(bytes)
  await writer.close()
  const buffer = new GByteBufferWriter()
  while (true) {
    const { value } = await reader.read()
    if (value) {
      buffer.writeBytes(value)
    } else {
      break
    }
  }
  return buffer.extractBytes()
}

/**
 * Decodes a deflate-raw, as base64, string into an utf-8 string.
 *
 * @param str Deflate-raw, as base64, string.
 * @throws Error If str is an invalid base64 string or there is a problem decompressing.
 */
export async function decodeDeflateToString(str: string): Promise<string> {
  const bytes = decodeBase64ToBytes(str)
  const decompressedBytes = await decompressWithDeflate(bytes)
  return bytesToString(decompressedBytes)
}
