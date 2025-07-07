// Copyright 2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { encodeBytesToBase64 } from "./base64Encoder"
import { GByteBufferWriter, stringToBytes } from "@glitchybyte/dash"

/**
 * Compresses raw bytes into DeflateRaw bytes.
 *
 * @param bytes Bytes to compress.
 */
export async function compressWithDeflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream("deflate-raw")
  const reader = stream.readable.getReader()
  const writer = stream.writable.getWriter()
  await writer.write(bytes)
  await writer.close()
  const buffer = new GByteBufferWriter()
  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    buffer.writeBytes(value)
  }
  return buffer.extractBytes()
}

/**
 * Encodes an utf-8 string into a DeflateRaw-Base64Url string.
 *
 * @param str Utf-8 string to encode.
 */
export async function encodeStringToDeflate(str: string): Promise<string> {
  let bytes = stringToBytes(str)
  bytes = await compressWithDeflate(bytes)
  return encodeBytesToBase64(bytes)
}
