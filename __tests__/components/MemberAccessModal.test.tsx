import { render, screen, fireEvent } from "@testing-library/react";
import MemberAccessModal from "@/components/common/MemberAccessModal";
import {
  MEMBER_ACCESS_CTA_LABEL,
  MEMBER_ACCESS_SIGNIN_ROUTE,
  MEMBER_ACCESS_TITLE,
} from "@/constants/memberAccess";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe("MemberAccessModal", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders member access copy when open", () => {
    render(<MemberAccessModal isOpen onClose={jest.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(MEMBER_ACCESS_TITLE)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: MEMBER_ACCESS_CTA_LABEL })
    ).toBeInTheDocument();
  });

  it("routes to sign-in when CTA is clicked", () => {
    render(<MemberAccessModal isOpen onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: MEMBER_ACCESS_CTA_LABEL }));
    expect(mockPush).toHaveBeenCalledWith(MEMBER_ACCESS_SIGNIN_ROUTE);
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(<MemberAccessModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
