// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { GByteBuffer } from "../src/GByteBuffer"

describe("GByteBuffer", () => {
  test("create with existing buffer", () => {
    const bytes = new Uint8Array(8)
    const buffer = GByteBuffer.fromBytes(bytes)
    expect(buffer.length).toBe(bytes.length)
    expect(buffer.capacity).toBe(bytes.length)
    buffer.setAt(2, 0x02)
    expect(bytes[2]).toBe(0x02)
    bytes[2] = 0x55
    expect(buffer.getAt(2)).toBe(0x55)
  })

  test("prevent illegal expansion rate", () => {
    expect(() => {
      // @ts-ignore
      const buffer = GByteBuffer.create(8, 0)
    }).toThrow()
    expect(() => {
      // @ts-ignore
      const buffer = GByteBuffer.create(8, -2.3)
    }).toThrow()
  })

  test("ensure buffer expansion", () => {
    const buffer = GByteBuffer.create(4)
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x01)
    expect(buffer.capacity).toBe(4)
    buffer.appendUInt8(0x02)
    expect(buffer.capacity).toBeGreaterThan(4)
  })

  test("reset", () => {
    const buffer = GByteBuffer.create()
    buffer.appendUInt32(0x01)
    buffer.appendUInt32(0x02)
    expect(buffer.length).toBeGreaterThan(0)
    buffer.reset()
    expect(buffer.length).toBe(0)
  })

  test("append UInt8", () => {
    const buffer = GByteBuffer.create()
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    buffer.appendUInt8(0x03)
    buffer.appendUInt8(0xaa)
    const value = buffer.getUInt8(3)
    expect(buffer.length).toBe(4)
    expect(value).toBe(0xaa)
  })

  test("append UInt16", () => {
    const buffer = GByteBuffer.create()
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    buffer.appendUInt8(0x03)
    buffer.appendUInt16(0xaabb)
    const value = buffer.getUInt16(3)
    expect(buffer.length).toBe(5)
    expect(value).toBe(0xaabb)
  })

  test("append UInt32", () => {
    const buffer = GByteBuffer.create(8)
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    buffer.appendUInt8(0x03)
    buffer.appendUInt32(0xaabbccdd)
    const value = buffer.getUInt32(3)
    expect(buffer.length).toBe(7)
    expect(value).toBe(0xaabbccdd | 0)
  })

  test("append byte array", () => {
    const buffer = GByteBuffer.create(8)
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    buffer.appendUInt8(0x03)
    buffer.append([ 0x11, 0x12, 0x13 ])
    const value = buffer.getUInt8(3)
    expect(buffer.length).toBe(6)
    expect(value).toBe(0x11)
  })

  test("append GByteBuffer", () => {
    const data = GByteBuffer.fromBytes(new Uint8Array([ 0x11, 0x12, 0x13 ]))
    const buffer = GByteBuffer.create(8)
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    buffer.appendUInt8(0x03)
    buffer.append(data)
    const value = buffer.getUInt8(3)
    expect(buffer.length).toBe(6)
    expect(value).toBe(0x11)
  })

  test("insert", () => {
    const buffer = GByteBuffer.create()
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    expect(buffer.length).toBe(2)
    expect(buffer.getAt(1)).toBe(0x02)
    buffer.insert(1, 0x03)
    expect(buffer.length).toBe(3)
    expect(buffer.getAt(1)).toBe(0x03)
    expect(buffer.getAt(2)).toBe(0x02)
  })

  test("insert at the end", () => {
    const buffer = GByteBuffer.create()
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    expect(buffer.length).toBe(2)
    buffer.insert(2, 0x03)
    expect(buffer.length).toBe(3)
    expect(buffer.getAt(1)).toBe(0x02)
    expect(buffer.getAt(2)).toBe(0x03)
  })

  test("insert array", () => {
    const buffer = GByteBuffer.create()
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    expect(buffer.length).toBe(2)
    expect(buffer.getAt(1)).toBe(0x02)
    buffer.insertAll(1, [ 0x03, 0x04, 0x05 ])
    expect(buffer.length).toBe(5)
    expect(buffer.getAt(1)).toBe(0x03)
    expect(buffer.getAt(3)).toBe(0x05)
    expect(buffer.getAt(4)).toBe(0x02)
  })

  test("insert array at the end", () => {
    const buffer = GByteBuffer.create()
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    expect(buffer.length).toBe(2)
    buffer.insertAll(2, [ 0x03, 0x04, 0x05 ])
    expect(buffer.length).toBe(5)
    expect(buffer.getAt(1)).toBe(0x02)
    expect(buffer.getAt(2)).toBe(0x03)
    expect(buffer.getAt(4)).toBe(0x05)
  })

  test("insert out of bounds", () => {
    const buffer = GByteBuffer.create()
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    expect(buffer.length).toBe(2)
    expect(() => {
      buffer.insert(-1, 0x03)
    }).toThrow()
    expect(() => {
      buffer.insert(3, 0x03)
    }).toThrow()
  })

  test("insert array out of bounds", () => {
    const buffer = GByteBuffer.create()
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    expect(buffer.length).toBe(2)
    expect(() => {
      buffer.insertAll(-1, [ 0x03, 0x04, 0x05 ])
    }).toThrow()
    expect(() => {
      buffer.insertAll(3, [ 0x03, 0x04, 0x05 ])
    }).toThrow()
  })

  test("remove", () => {
    const buffer = GByteBuffer.create()
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    buffer.appendUInt8(0x03)
    buffer.appendUInt8(0x04)
    buffer.appendUInt8(0x05)
    expect(buffer.length).toBe(5)
    expect(buffer.getAt(1)).toBe(0x02)
    buffer.remove(1, 3)
    expect(buffer.length).toBe(2)
    expect(buffer.getAt(0)).toBe(0x01)
    expect(buffer.getAt(1)).toBe(0x05)
  })

  test("remove last", () => {
    const buffer = GByteBuffer.create()
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    buffer.appendUInt8(0x03)
    buffer.appendUInt8(0x04)
    buffer.appendUInt8(0x05)
    expect(buffer.length).toBe(5)
    buffer.remove(4)
    expect(buffer.length).toBe(4)
    expect(buffer.getAt(3)).toBe(0x04)
    buffer.remove(2, 2)
    expect(buffer.length).toBe(2)
    expect(buffer.getAt(1)).toBe(0x02)
  })

  test("remove out of bounds", () => {
    const buffer = GByteBuffer.create()
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    buffer.appendUInt8(0x03)
    buffer.appendUInt8(0x04)
    buffer.appendUInt8(0x05)
    expect(buffer.length).toBe(5)
    expect(() => {
      buffer.remove(-1, 2)
    }).toThrow()
    expect(() => {
      buffer.remove(5, 2)
    }).toThrow()
    expect(() => {
      buffer.remove(4, 2)
    }).toThrow()
  })

  test("view", () => {
    const buffer = GByteBuffer.create(16)
    buffer.appendUInt8(0x01)
    buffer.appendUInt8(0x02)
    buffer.appendUInt8(0x03)
    buffer.appendUInt8(0x04)
    buffer.appendUInt8(0x05)
    expect(buffer.capacity).toBe(16)
    expect(buffer.length).toBe(5)
    const view = buffer.view()
    expect(view.length).toBe(5)
  })
})
