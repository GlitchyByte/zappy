// Copyright 2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { styleText } from "node:util"
import { baseNStringToNumber, numberToBaseNString } from "@glitchybyte/dash"
// @ts-ignore
import { loadLinesFromFile } from "./gtestutils"
import {
  createZappyContractionTables,
  decodeZappy2ToString,
  encodeStringToBase64,
  encodeStringToDeflate,
  encodeStringToZappy,
  encodeStringToZappy2,
  zappyDefaultContractions
} from "../src"
import { ZAPPY_LOWERCASE_CHARS, ZAPPY_UPPERCASE_CHARS } from "../src/lib/zappy2"

const contractions = new Map<number, string[]>([
  [1, [
    "glitchybyte",
    "zappy",
    "codeUrl",
    "msg"
  ]]
])
const contractionTables = createZappyContractionTables(zappyDefaultContractions, contractions)
const json1 = '{"codeUrl":"https://github.com/glitchybyte/zappy✌️","msg":"When I 😭 deal with internationalization I think of defenestration."}'
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
    payloadSummary("base64", encodeStringToBase64(payload)) + "\n" +
    payloadSummary("deflate", await encodeStringToDeflate(payload)) + "\n" +
    payloadSummary("zappy", encodeStringToZappy(payload, contractionTables)) + "\n" +
    // payloadSummary("zappy2", encodeStringToZappy2(payload)) + "\n" +
    payloadSummary("zappy3", encodeStringToZappy2(payload))
  console.log(str)
  const zappy = encodeStringToZappy2(payload)
  console.log(`dezapped = ${decodeZappy2ToString(zappy)}`)
}

await printComparison(json1)
console.log()
await printComparison(json2)
console.log()
await printComparison(json3)

// const BASE26_CHARS = "abcdefghijklmnopqrstuvwxyz"
//
// // console.log(base26ToNumber("userid").toString(16))
// // console.log("      ff [1]", numberToBase26(parseInt("00", 16)), numberToBase26(parseInt("ff", 16)))
// // console.log("    ffff [2]", numberToBase26(parseInt("0100", 16)), numberToBase26(parseInt("ffff", 16)))
// // console.log("  ffffff [3]", numberToBase26(parseInt("010000", 16)), numberToBase26(parseInt("ffffff", 16)))
// // console.log("ffffffff [4]", numberToBase26(parseInt("01000000", 16)), numberToBase26(parseInt("ffffffff", 16)))

// for (let i = 10; i < 32; ++i) {
//   const strLow = "1".padEnd(i, "0")
//   const strHigh = "1".repeat(i)
//   const low = parseInt(strLow, 2)
//   const high = parseInt(strHigh, 2)
//   const zLow = numberToBaseNString(low, ZAPPY_LOWERCASE_CHARS)
//   const zHigh = numberToBaseNString(high, ZAPPY_LOWERCASE_CHARS)
//   console.log(
//     "bits needed:", 1 + 2 + 5 + i,
//     `[${zLow} - ${zHigh}]`, `[${zLow.length * 8} - ${zHigh.length * 8}]`
//   )
// }

// ey - zz
// gytisyx - enqwltj
// const str = "is32VXDVAPR4gPtCk "
// const original = baseNStringToNumber(str, ZAPPY_UPPERCASE_CHARS)
// console.log("bits:", str, 3 + 5 + (32 - Math.clz32(original)))
// const back = numberToBaseNString(original, ZAPPY_UPPERCASE_CHARS)
// console.log("tionali", original.toString(16), back)
