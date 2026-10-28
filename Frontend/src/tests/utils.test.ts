import { describe, expect, it } from "vitest";
import { pageItems } from "../components/ui/Pagination";
import { formatDateRange, formatPrice, nightsBetween, tripStatus } from "../utils/format";
import { validateImageFile } from "../components/ImageUpload";

describe("pageItems", () => {
  it("lists every page when there are few", () => {
    expect(pageItems(2, 4)).toEqual([1, 2, 3, 4]);
  });
  it("collapses distant pages with ellipses", () => {
    expect(pageItems(6, 12)).toEqual([1, "…", 5, 6, 7, "…", 12]);
    expect(pageItems(1, 12)).toEqual([1, 2, "…", 12]);
  });
});

describe("format utils", () => {
  it("formats prices and date ranges", () => {
    expect(formatPrice(2890)).toBe("$2,890");
    expect(formatDateRange("2026-11-12T00:00:00.000Z", "2026-11-19T00:00:00.000Z")).toBe("12 Nov – 19 Nov 2026");
    expect(nightsBetween("2026-11-12T00:00:00.000Z", "2026-11-19T00:00:00.000Z")).toBe(7);
  });

  it("derives trip status like the backend filters", () => {
    const now = new Date("2026-06-10T12:00:00Z");
    expect(tripStatus("2026-06-11T00:00:00Z", "2026-06-15T00:00:00Z", now)).toBe("upcoming");
    expect(tripStatus("2026-06-05T00:00:00Z", "2026-06-10T00:00:00Z", now)).toBe("active");
    expect(tripStatus("2026-06-01T00:00:00Z", "2026-06-09T00:00:00Z", now)).toBe("past");
  });
});

describe("validateImageFile", () => {
  it("accepts images and rejects other types and oversized files", () => {
    expect(validateImageFile(new File(["x"], "a.png", { type: "image/png" }))).toBeNull();
    expect(validateImageFile(new File(["x"], "a.gif", { type: "image/gif" }))).toMatch(/JPEG, PNG or WebP/);
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    expect(validateImageFile(big)).toMatch(/smaller than/);
  });
});
