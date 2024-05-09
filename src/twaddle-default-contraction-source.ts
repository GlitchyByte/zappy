// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

/**
 * Default contraction source for Twaddle.
 *
 * <p>It is highly recommended developers using Twaddle construct their own contraction tables.
 *
 * <p>These defaults are optimized for json messages and local testing. Feel free to use this
 * as a starting point for your own tables.
 */
export const defaultContractionsSource = new Map<number, string[]>([
  [0, [
    "null",
    "true",
    "false",
    "https://",
    "://",
    "{\"",
    "\"}",
    "\":",
    "\":\"",
    ",\"",
    "\",\"",
    "\":[",
    "\":[\"",
    "\":[{",
    "}]",
    "]}"
  ]],
  [1, [
    "http://",
    "localhost",
    "127.0.0.1",
    ".com",
    ".org",
    ".net",
    ".io"
  ]]
])
