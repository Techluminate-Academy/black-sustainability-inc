import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ProfilePhoto from "../components/layouts/Nav/ProfilePhoto";

jest.mock("next/image", () => ({ __esModule: true, default: ({ fill, ...props }: any) => <img {...props} data-testid="photo" /> }));

test("falls back after a failed image and tries a changed source", () => {
  const { rerender } = render(<ProfilePhoto src="https://example.com/old.jpg" />);
  fireEvent.error(screen.getByTestId("photo"));
  expect(screen.getByTestId("photo")).toHaveAttribute("src", "/png/default.png");
  rerender(<ProfilePhoto src="https://example.com/recovered.jpg" />);
  expect(screen.getByTestId("photo")).toHaveAttribute("src", "https://example.com/recovered.jpg");
});

test("handles absent and malformed encoded image URLs", () => {
  const { rerender } = render(<ProfilePhoto />);
  expect(screen.getByTestId("photo")).toHaveAttribute("src", "/png/default.png");
  rerender(<ProfilePhoto src="https://example.com/100%.jpg" />);
  expect(screen.getByTestId("photo")).toHaveAttribute("src", "https://example.com/100%.jpg");
});
