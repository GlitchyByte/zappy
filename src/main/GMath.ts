// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

/**
 * Math utilities.
 */
export class GMath {

  /**
   * Return the smallest value.
   *
   * <p>This is way faster than Math.min for two values.
   *
   * @param v1 The 1st value.
   * @param v2 The 2nd value.
   * @return The smallest value.
   */
  public static min(v1: number, v2: number): number {
    return v1 < v2 ? v1 : v2
  }

  /**
   * Return the largest value.
   *
   * <p>This is way faster than Math.max for two values.
   *
   * @param v1 The 1st value.
   * @param v2 The 2nd value.
   * @return The largest value.
   */
  public static max(v1: number, v2: number): number {
    return v1 > v2 ? v1 : v2
  }

  /**
   * Returns a random int within range [0, limit)
   *
   * @param limit The upper non-inclusive limit of the range.
   * @return A random int.
   */
  public static randomUInt(limit: number): number {
    return Math.trunc(Math.random() * limit)
  }

  /**
   * Returns a random int within range [low, high)
   *
   * @param low The lower inclusive limit.
   * @param high the upper non-inclusive limit.
   * @return A random int.
   */
  public static randomUIntRange(low: number, high: number): number {
    return low + GMath.randomUInt(high - low)
  }

  /**
   * Returns a random "true" or "false" value.
   *
   * @param truthProbability The probability of returning true. Default is 50%.
   * @return A random int.
   */
  public static randomBoolean(truthProbability = 0.5): boolean {
    return Math.random() < truthProbability
  }
}
