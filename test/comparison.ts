// Copyright 2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import {
  createZappyContractionTables,
  decodeZappyToString,
  encodeStringToBase64, encodeStringToDeflate,
  encodeStringToZappy,
  zappyDefaultContractions
} from "../src"
import { styleText } from "node:util"
import { loadLinesFromFile } from "./gtestutils"

const contractions = new Map<number, string[]>([
  [1, [
    "glitchybyte",
    "zappy",
    "codeUrl",
    "msg"
  ]]
])
const contractionTables = createZappyContractionTables(zappyDefaultContractions, contractions)
const json1 = '{"codeUrl":"https://github.com/glitchybyte/zappy","msg":"When I deal with internationalization I think of defenestration."}'
const json2 = '{"a":"ababcababcd"}'
const json3 = loadLinesFromFile("sample1.json")[0]

function payloadSummary(label: string, payload: string, isOriginal: boolean = false): string {
  const labelStr = styleText("white", label.padStart(9))
  const payloadStr = styleText(isOriginal ? "blackBright" : "blue", payload)
  const lengthStr = styleText(["bgWhiteBright", "black"], ` ${payload.length} `)
  return ` ${labelStr}: ${lengthStr} ${payloadStr}`
}

async function printComparison(payload: string): Promise<void> {
  const str =
    payloadSummary("original", payload, true) + "\n" +
    payloadSummary("based64", encodeStringToBase64(payload)) + "\n" +
    payloadSummary("deflate", await encodeStringToDeflate(payload)) + "\n" +
    payloadSummary("zappy", encodeStringToZappy(payload, contractionTables))
  console.log(str)
}

await printComparison(json1)
console.log()
await printComparison(json2)
console.log()
await printComparison(json3)
