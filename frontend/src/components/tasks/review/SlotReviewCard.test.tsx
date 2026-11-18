import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import SlotReviewCard from "./SlotReviewCard";
import { he } from "../../../i18n/he";
import type { ReviewItem } from "../../../utils/slotReview";

vi.mock("./SlotMedia", () => ({ default: () => <div data-testid="slot-media" /> }));

function item(previous?: ReviewItem["attachment"]["previous_review"]): ReviewItem {
  return {
    index: 0,
    title: "מדף",
    required: true,
    requirement: { kind: "video", title: "מדף" },
    attachment: { kind: "video", url: "/uploads/b.webm", ...(previous ? { previous_review: previous } : {}) },
  };
}

function renderCard(reviewItem: ReviewItem) {
  render(
    <SlotReviewCard item={reviewItem} position={1} draft={undefined} onApprove={vi.fn()} onReject={vi.fn()} onEnlarge={vi.fn()} />,
  );
}

describe("SlotReviewCard", () => {
  it("shows what the menahel asked last time on a take that answers a refusal", () => {
    renderCard(item({ remark: "להזיז את הקרטון", annotated_url: "/uploads/marked.jpg" }));
    const asked = screen.getByTestId("slot-previous-ask");
    expect(within(asked).getByText(he.slotReviewPreviousAsk)).toBeTruthy();
    expect(within(asked).getByText("להזיז את הקרטון")).toBeTruthy();
  });

  it("shows nothing extra on a first send", () => {
    renderCard(item());
    expect(screen.queryByTestId("slot-previous-ask")).toBeNull();
  });
});
