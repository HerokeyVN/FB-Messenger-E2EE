import { str, num, date } from "../../../src/utils/fca-utils.ts";

describe("fca-utils", () => {
  describe("str", () => {
    it("should return string as is", () => {
      expect(str("hello")).toBe("hello");
    });
    it("should convert number to string", () => {
      expect(str(123)).toBe("123");
    });
    it("should convert boolean to string", () => {
      expect(str(true)).toBe("true");
    });
    it("should return empty string for null/undefined", () => {
      expect(str(null)).toBe("");
      expect(str(undefined)).toBe("");
    });
  });

  describe("num", () => {
    it("should return number as is", () => {
      expect(num(123)).toBe(123);
    });
    it("should convert string to number", () => {
      expect(num("123")).toBe(123);
    });
    it("should return 0 for invalid numbers", () => {
      expect(num("abc")).toBe(0);
      expect(num(null)).toBe(0);
    });
  });

  describe("date", () => {
    it("should return timestamp from Date object", () => {
      const d = new Date();
      expect(date(d)).toBe(d.getTime());
    });
    it("should parse date string", () => {
      const s = "2023-01-01T00:00:00Z";
      expect(date(s)).toBe(new Date(s).getTime());
    });
    it("should return current time for invalid input", () => {
      const now = Date.now();
      const result = date("invalid");
      expect(result).toBeGreaterThanOrEqual(now);
    });
  });
});
