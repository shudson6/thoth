import { describe, it, expect } from "vitest";
import { timeToMinutes, minutesToTime, formatEstimate } from "@/lib/time";

describe("timeToMinutes", () => {
  it("converts midnight", () => expect(timeToMinutes("00:00")).toBe(0));
  it("converts noon", () => expect(timeToMinutes("12:00")).toBe(720));
  it("converts end of day", () => expect(timeToMinutes("23:59")).toBe(1439));
  it("converts arbitrary time", () => expect(timeToMinutes("09:30")).toBe(570));
});

describe("minutesToTime", () => {
  it("converts 0 to midnight", () => expect(minutesToTime(0)).toBe("00:00"));
  it("converts 720 to noon", () => expect(minutesToTime(720)).toBe("12:00"));
  it("converts 570 to 09:30", () => expect(minutesToTime(570)).toBe("09:30"));
  it("wraps at 24h boundary", () => expect(minutesToTime(1440)).toBe("00:00"));
});

describe("formatEstimate", () => {
  it("formats minutes only", () => expect(formatEstimate(45)).toBe("45m"));
  it("formats exact hours", () => expect(formatEstimate(120)).toBe("2h"));
  it("formats hours and minutes", () => expect(formatEstimate(90)).toBe("1h30m"));
  it("formats 1 hour", () => expect(formatEstimate(60)).toBe("1h"));
});
