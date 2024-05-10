// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

/**
 * Dynamic byte buffer.
 *
 * <p>Buffer increases its capacity as needed. It never decreases capacity.
 *
 * <p>All UInt storage references are little-endian.
 */
export class GByteBuffer {

  /**
   * Creates an empty buffer.
   *
   * @param initialCapacity Initial capacity.
   * @param expansionRate Rate of growth when more capacity is needed.
   * @return A GByteBuffer object.
   */
  public static create(initialCapacity = 64, expansionRate = 1.5): GByteBuffer {
    return new GByteBuffer(new Uint8Array(initialCapacity), 0, expansionRate)
  }

  /**
   * Creates a buffer with the given contents.
   *
   * <p>The given byte array will be used internally as the buffer until there is an increase in capacity.
   *
   * @param bytes Initial byte array.
   * @param expansionRate Rate of growth when more capacity is needed.
   * @return A GByteBuffer object.
   */
  public static fromBytes(bytes: Uint8Array, expansionRate = 1.5): GByteBuffer {
    return new GByteBuffer(bytes, bytes.length, expansionRate)
  }

  private bytes: Uint8Array
  private size = 0
  private readonly expansionRate: number

  private constructor(bytes: Uint8Array, size: number, expansionRate: number) {
    this.bytes = bytes
    if (expansionRate <= 1) {
      throw new Error(`Expansion rate (${expansionRate}) must be greater than 1!`)
    }
    this.size = size
    this.expansionRate = expansionRate
  }

  /**
   * Returns the number of used bytes in buffer.
   *
   * @return The number of used bytes in buffer.
   */
  public get length(): number {
    return this.size
  }

  /**
   * Returns the overall buffer capacity.
   *
   * @return The overall buffer capacity.
   */
  public get capacity(): number {
    return this.bytes.length
  }

  /**
   * Resets used bytes count to zero.
   */
  public reset() {
    this.size = 0
  }

  /**
   * Get byte at the given index.
   *
   * @param index Byte index.
   * @return Byte at the given index.
   */
  public getAt(index: number): number | undefined {
    return this.bytes[index]
  }

  /**
   * Set the byte at the given index.
   *
   * @param index Byte index.
   * @param value Value to store.
   */
  public setAt(index: number, value: number) {
    this.bytes[index] = value
  }

  private ensureCapacity(capacity: number) {
    if (capacity <= this.bytes.length) {
      return
    }
    const newLength = Math.ceil(capacity * this.expansionRate)
    const newBuffer = new Uint8Array(newLength)
    newBuffer.set(this.bytes, 0)
    this.bytes = newBuffer
  }

  /**
   * Appends the contents of the given byte array to the buffer.
   *
   * @param bytes Byte array.
   */
  public append(bytes: ArrayLike<number> | GByteBuffer) {
    const count = bytes.length
    this.ensureCapacity(this.size + count)
    if (bytes instanceof GByteBuffer) {
      this.bytes.set(bytes.bytes, this.size)
    } else {
      this.bytes.set(bytes, this.size)
    }
    this.size += count
  }

  /**
   * Inserts a byte at the given offset.
   *
   * @param offset Insertion offset.
   * @param byte Byte to insert.
   */
  public insert(offset: number, byte: number) {
    if ((offset < 0) || (offset > this.size)) {
      throw new Error("Out of bounds!")
    }
    this.ensureCapacity(this.size + 1)
    if (offset < this.size) {
      this.bytes.copyWithin(offset + 1, offset, this.size)
    }
    this.bytes[offset] = byte
    this.size += 1
  }

  /**
   * Inserts the contents of an ArrayLike object at the given object.
   *
   * @param offset Insertion offset.
   * @param bytes ArrayLike object.
   */
  public insertAll(offset: number, bytes: ArrayLike<number>) {
    if ((offset < 0) || (offset > this.size)) {
      throw new Error("Out of bounds!")
    }
    const count = bytes.length
    this.ensureCapacity(this.size + count)
    if (offset < this.size) {
      this.bytes.copyWithin(offset + count, offset, this.size)
    }
    this.bytes.set(bytes, offset)
    this.size += count
  }

  /**
   * Remove a number of bytes from buffer.
   *
   * @param offset Removal offset.
   * @param count Count of bytes to remove.
   */
  public remove(offset: number, count = 1) {
    if ((offset < 0) || (offset >= this.size)) {
      throw new Error("Out of bounds!")
    }
    if (count === 0) {
      return
    }
    const start = offset + count
    if (start > this.size) {
      throw new Error("Out of bounds!")
    }
    if (start < this.size) {
      this.bytes.copyWithin(offset, start, this.size)
    }
    this.size -= count
  }

  /**
   * Stores a UInt8 at the given offset.
   *
   * @param offset Buffer offset.
   * @param value UInt8 to store.
   */
  public setUInt8(offset: number, value: number) {
    this.bytes[offset] = value & 0xff
  }

  /**
   * Stores a UInt16 at the given offset.
   *
   * @param offset Buffer offset.
   * @param value UInt16 to store.
   */
  public setUInt16(offset: number, value: number) {
    this.bytes[offset] = value & 0xff
    this.bytes[offset + 1] = (value & 0xff00) >> 8
  }

  /**
   * Stores a UInt32 at the given offset.
   *
   * @param offset Buffer offset.
   * @param value UInt32 to store.
   */
  public setUInt32(offset: number, value: number) {
    this.bytes[offset] = value & 0xff
    this.bytes[offset + 1] = (value & 0xff00) >> 8
    this.bytes[offset + 2] = (value & 0xff0000) >> 16
    this.bytes[offset + 3] = (value & 0xff000000) >> 24
  }

  /**
   * Retrieves a UInt8 at the given offset.
   *
   * @param offset Buffer offset.
   * @return UInt8 value.
   */
  public getUInt8(offset: number): number {
    return this.bytes[offset]
  }

  /**
   * Retrieves a UInt16 at the given offset.
   *
   * @param offset Buffer offset.
   * @return UInt16 value.
   */
  public getUInt16(offset: number): number {
    return this.bytes[offset] |
      (this.bytes[offset + 1] << 8)
  }

  /**
   * Retrieves a UInt32 at the given offset.
   *
   * @param offset Buffer offset.
   * @return UInt32 value.
   */
  public getUInt32(offset: number): number {
    return this.bytes[offset] |
      (this.bytes[offset + 1] << 8) |
      (this.bytes[offset + 2] << 16) |
      (this.bytes[offset + 3] << 24)
  }

  /**
   * Appends a UInt8 to the buffer.
   *
   * @param value UInt8 to append.
   */
  public appendUInt8(value: number) {
    this.ensureCapacity(this.size + 1)
    this.setUInt8(this.size, value)
    this.size += 1
  }

  /**
   * Appends a UInt16 to the buffer.
   *
   * @param value UInt16 to append.
   */
  public appendUInt16(value: number) {
    this.ensureCapacity(this.size + 2)
    this.setUInt16(this.size, value)
    this.size += 2
  }

  /**
   * Appends a UInt32 to the buffer.
   *
   * @param value UInt32 to append.
   */
  public appendUInt32(value: number) {
    this.ensureCapacity(this.size + 4)
    this.setUInt32(this.size, value)
    this.size += 4
  }

  /**
   * Returns the internal buffer.
   *
   * <p>It will contain used and unused areas.
   *
   * @return The internal buffer.
   */
  public buffer(): Uint8Array {
    return this.bytes
  }

  /**
   * Returns a view of the buffer containing only the used bytes.
   *
   * <p>This view is backed by the internal buffer.
   *
   * @return A view of the buffer containing only the used bytes.
   */
  public view(): Uint8Array {
    return this.bytes.subarray(0, this.size)
  }

  /**
   * Returns a copy of the used bytes as its own byte array.
   *
   * @return A copy of the used bytes as its own byte array.
   */
  public copy(): Uint8Array {
    return new Uint8Array(this.bytes, 0, this.size)
  }

  public toString() {
    return this.view().toString()
  }
}
