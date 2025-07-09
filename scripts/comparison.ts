// Copyright 2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { styleText } from "node:util"
import { baseNStringToNumber, numberToBaseNString } from "@glitchybyte/dash"
import { decodeZappyToString, encodeStringToBase64, encodeStringToDeflate, encodeStringToZappy } from "../src"
import { ZAPPY_LOWERCASE_CHARS, ZAPPY_UPPERCASE_CHARS } from "../src/lib/zappyCommon"

const json1 = '{"codeUrl":"https://github.com/glitchybyte/zappy","msg":"When I deal with internationalization I think of defenestration."}'
const json2 = '{"a":"ababcababcd","s":"✌️"}'
const json3 =
  '{"widget":{"debug":"on","window":{"title":"Sample Konfabulator Widget","name":"main_window","width":500,"height":5' +
  '00},"image":{"src":"Images/Sun.png","name":"sun1","hOffset":250,"vOffset":250,"alignment":"center"},"text":{"data"' +
  ':"Click Here","size":36,"style":"bold","name":"text1","hOffset":250,"vOffset":100,"alignment":"center","onMouseUp"' +
  ':"sun1.opacity = (sun1.opacity / 100) * 90;"}}}'

function payloadSummary(label: string, payload: string, isOriginal: boolean = false): string {
  const labelStr = styleText("white", label.padStart(9))
  const payloadStr = styleText(isOriginal ? "blackBright" : "blue", payload)
  const lengthStr = styleText(["bgWhiteBright", "black"], ` ${payload.length} `)
  return ` ${labelStr}: ${lengthStr} ${payloadStr}`
}

async function printComparison(payload: string): Promise<void> {
  const zappy = encodeStringToZappy(payload)
  const str =
    payloadSummary("original", payload, true) + "\n" +
    payloadSummary("base64", encodeStringToBase64(payload)) + "\n" +
    payloadSummary("deflate", await encodeStringToDeflate(payload)) + "\n" +
    payloadSummary("zappy", zappy) + "\n" +
    payloadSummary("dezapped", decodeZappyToString(zappy), true)
  console.log(str)
}

await printComparison(json1)
console.log()
await printComparison(json2)
console.log()
await printComparison(json3)

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

// gytisyx - enqwltj
// const str = "is32VXDVAPR4gPtCk "
// const original = baseNStringToNumber(str, ZAPPY_UPPERCASE_CHARS)
// console.log("bits:", str, 3 + 5 + (32 - Math.clz32(original)))
// const back = numberToBaseNString(original, ZAPPY_UPPERCASE_CHARS)
// console.log("tionali", original.toString(16), back)
