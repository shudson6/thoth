import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TimeRuler from "@/components/TimeRuler";

describe("TimeRuler", () => {
  describe("hour labels", () => {
    it("renders 24 hour slots", () => {
      render(<TimeRuler rowHeight={60} />);
      // One label per hour 0–23
      const labels = screen.getAllByText(/AM|PM/);
      expect(labels).toHaveLength(24);
    });

    it("labels midnight as '12 AM'", () => {
      render(<TimeRuler rowHeight={60} />);
      expect(screen.getByText("12 AM")).toBeInTheDocument();
    });

    it("labels noon as '12 PM'", () => {
      render(<TimeRuler rowHeight={60} />);
      expect(screen.getByText("12 PM")).toBeInTheDocument();
    });

    it("labels 1 AM correctly", () => {
      render(<TimeRuler rowHeight={60} />);
      expect(screen.getByText("1 AM")).toBeInTheDocument();
    });

    it("labels 11 AM correctly", () => {
      render(<TimeRuler rowHeight={60} />);
      expect(screen.getByText("11 AM")).toBeInTheDocument();
    });

    it("labels 1 PM correctly", () => {
      render(<TimeRuler rowHeight={60} />);
      expect(screen.getByText("1 PM")).toBeInTheDocument();
    });

    it("labels 11 PM correctly", () => {
      render(<TimeRuler rowHeight={60} />);
      expect(screen.getByText("11 PM")).toBeInTheDocument();
    });

    it("does not render '0 AM' for midnight", () => {
      render(<TimeRuler rowHeight={60} />);
      expect(screen.queryByText("0 AM")).toBeNull();
    });

    it("does not render '0 PM' for noon", () => {
      render(<TimeRuler rowHeight={60} />);
      expect(screen.queryByText("0 PM")).toBeNull();
    });
  });

  describe("container height", () => {
    it("sets total height to rowHeight × 24", () => {
      const { container } = render(<TimeRuler rowHeight={60} />);
      const root = container.firstChild as HTMLElement;
      expect(root.style.height).toBe("1440px"); // 60 × 24
    });

    it("reflects a different rowHeight", () => {
      const { container } = render(<TimeRuler rowHeight={80} />);
      const root = container.firstChild as HTMLElement;
      expect(root.style.height).toBe("1920px"); // 80 × 24
    });
  });
});
