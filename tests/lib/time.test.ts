import { describe, it, expect } from "vitest";
import { timeToMinutes, minutesToTime, formatEstimate } from "@/lib/time";

describe("timeToMinutes", () => {
  it("converts midnight", () => expect(timeToMinutes("00:00")).toBe(0));
  it("converts 1 minute past midnight", () => expect(timeToMinutes("00:01")).toBe(1));
  it("converts a whole hour", () => expect(timeToMinutes("01:00")).toBe(60));
  it("converts hours and minutes", () => expect(timeToMinutes("09:30")).toBe(570));
  it("converts noon", () => expect(timeToMinutes("12:00")).toBe(720));
  it("converts last minute of the day", () => expect(timeToMinutes("23:59")).toBe(1439));
  it("converts double-digit minutes below 10", () => expect(timeToMinutes("08:05")).toBe(485));
});

describe("minutesToTime", () => {
  it("converts 0 to midnight", () => expect(minutesToTime(0)).toBe("00:00"));
  it("converts 1 minute", () => expect(minutesToTime(1)).toBe("00:01"));
  it("converts a whole hour", () => expect(minutesToTime(60)).toBe("01:00"));
  it("converts hours and minutes", () => expect(minutesToTime(570)).toBe("09:30"));
  it("converts noon", () => expect(minutesToTime(720)).toBe("12:00"));
  it("converts last minute of the day", () => expect(minutesToTime(1439)).toBe("23:59"));
  it("pads single-digit hours with a leading zero", () => expect(minutesToTime(61)).toBe("01:01"));
  it("pads single-digit minutes with a leading zero", () => expect(minutesToTime(65)).toBe("01:05"));
  it("wraps at the 24-hour boundary", () => expect(minutesToTime(1440)).toBe("00:00"));
  it("wraps one minute past midnight", () => expect(minutesToTime(1441)).toBe("00:01"));
});

describe("timeToMinutes / minutesToTime round-trip", () => {
  const times = ["00:00", "00:01", "01:00", "09:30", "12:00", "17:45", "23:59"];
  for (const t of times) {
    it(`round-trips ${t}`, () => expect(minutesToTime(timeToMinutes(t))).toBe(t));
  }
});

describe("formatEstimate", () => {
  it("formats zero minutes", () => expect(formatEstimate(0)).toBe("0m"));
  it("formats 1 minute", () => expect(formatEstimate(1)).toBe("1m"));
  it("formats minutes below an hour", () => expect(formatEstimate(45)).toBe("45m"));
  it("formats 59 minutes (boundary below 1h)", () => expect(formatEstimate(59)).toBe("59m"));
  it("formats exactly 1 hour", () => expect(formatEstimate(60)).toBe("1h"));
  it("formats exactly 2 hours", () => expect(formatEstimate(120)).toBe("2h"));
  it("formats 1 hour and 1 minute", () => expect(formatEstimate(61)).toBe("1h1m"));
  it("formats 1 hour 30 minutes", () => expect(formatEstimate(90)).toBe("1h30m"));
  it("formats 2 hours 30 minutes", () => expect(formatEstimate(150)).toBe("2h30m"));
  it("formats a large round number of hours", () => expect(formatEstimate(600)).toBe("10h"));
  it("omits the minute part when minutes are zero", () => expect(formatEstimate(180)).toBe("3h"));
});
