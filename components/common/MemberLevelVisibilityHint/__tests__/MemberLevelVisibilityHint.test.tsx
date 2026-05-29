import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MemberLevelVisibilityHint from "../index";
import { MEMBER_LEVEL_VISIBILITY_TOOLTIP } from "@/constants/memberLevelVisibility";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ""} src={props.src} />
  ),
}));

describe("MemberLevelVisibilityHint", () => {
  it("renders the help button", () => {
    render(<MemberLevelVisibilityHint />);
    expect(screen.getByTestId("member-level-visibility-hint")).toBeInTheDocument();
  });

  it("shows approved tooltip copy on click", () => {
    render(<MemberLevelVisibilityHint />);
    fireEvent.click(screen.getByTestId("member-level-visibility-hint"));
    const tooltip = screen.getByTestId("member-level-visibility-tooltip");
    expect(tooltip).toHaveClass("block");
    expect(tooltip).toHaveTextContent(MEMBER_LEVEL_VISIBILITY_TOOLTIP);
  });

  it("hides tooltip when clicking outside", () => {
    render(
      <div>
        <MemberLevelVisibilityHint />
        <button type="button">outside</button>
      </div>
    );
    fireEvent.click(screen.getByTestId("member-level-visibility-hint"));
    expect(screen.getByTestId("member-level-visibility-tooltip")).toHaveClass("block");
    fireEvent.pointerDown(screen.getByRole("button", { name: "outside" }));
    expect(screen.getByTestId("member-level-visibility-tooltip")).toHaveClass("hidden");
  });
});
