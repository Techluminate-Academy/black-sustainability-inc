import React from "react";
import { fireEvent, render } from "@testing-library/react";
import ProfilePhoto from "../components/layouts/Nav/ProfilePhoto";

function photo(container: HTMLElement) {
  return container.querySelector("img")!;
}

test("falls back after a failed image and tries a changed source", () => {
  const { container, rerender } = render(<ProfilePhoto src="https://example.com/old.jpg" />);
  fireEvent.error(photo(container));
  expect(photo(container)).toHaveAttribute("src", "/png/default.png");
  rerender(<ProfilePhoto src="https://example.com/recovered.jpg" />);
  expect(photo(container)).toHaveAttribute("src", "https://example.com/recovered.jpg");
});

test.each([undefined, "", "  ", "not-a-url", "javascript:alert(1)", "data:text/html,test"])(
  "uses default avatar for an absent or invalid source (%p)", (src) => {
    const { container } = render(<ProfilePhoto src={src} />);
    expect(photo(container)).toHaveAttribute("src", "/png/default.png");
  }
);

test("renders the Mighty Imgix URL without requiring an image optimizer host allowlist", () => {
  const src = "https://media1-production-mightynetworks.imgix.net/asset/photo.png?ixlib=rails-4.3.1&auto=format";
  const { container } = render(<ProfilePhoto src={src} className="rounded-full object-cover" />);
  expect(photo(container)).toHaveAttribute("src", src);
  expect(photo(container)).toHaveClass("absolute", "h-full", "w-full", "rounded-full");
});

test("preserves escaped paths and signed query parameters", () => {
  const src = "https://cdn.example.com/member%2Fphoto.jpg?signature=a%2Bb%26c%3Dd";
  const { container } = render(<ProfilePhoto src={src} />);
  expect(photo(container)).toHaveAttribute("src", src);
});

test("accepts a fully encoded legacy URL", () => {
  const src = "https://cdn.example.com/photo.jpg?signature=a%2Bb";
  const { container } = render(<ProfilePhoto src={encodeURIComponent(src)} />);
  expect(photo(container)).toHaveAttribute("src", src);
});

test("accepts local recovered-photo URLs and retains their query parameters", () => {
  const src = "/api/member-legacy-asset?id=123&name=photo%2Blogo.png";
  const { container } = render(<ProfilePhoto src={src} />);
  expect(photo(container)).toHaveAttribute("src", src);
});
