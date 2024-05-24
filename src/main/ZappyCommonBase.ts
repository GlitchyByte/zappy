// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

export type StringGenerator = Generator<string, void, void>
export type BytesGenerator = Generator<Uint8Array, void, void>

export class ZappyCommonBase {

  protected readonly textEncoder = new TextEncoder()

  protected *stringToUtf8Bytes(str: string): BytesGenerator {
    const bytes = this.textEncoder.encode(str)
    yield bytes
  }

  protected stringCollector(gen: StringGenerator): string {
    let buffer = ""
    for (const str of gen) {
      buffer += str
    }
    return buffer
  }
}
