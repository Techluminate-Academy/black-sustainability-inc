import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import Sidebar from "@/components/layouts/Sidebar";
import InfoCard from "@/components/common/InfoCard";
import { memberIndustryHouse } from "@/lib/memberIndustryHouse";

jest.mock("@/components/common/BlurText", () => ({ __esModule: true, default: () => <span aria-hidden="true">Members only</span> }));

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/icons", () => ({ __esModule: true, default: new Proxy({}, { get: () => () => <span /> }) }));

jest.mock("next/image", () => ({ __esModule: true, default: ({ fill, ...props }: any) => <img {...props} /> }));

const fields = {
  "FULL NAME": "Ada Green", "FIRST NAME": "Ada", "LAST NAME": "Green",
  "EMAIL ADDRESS": "ada@example.com", "PRIMARY INDUSTRY HOUSE": "Climate",
  "ORGANIZATION NAME": "An organization", "Location (Nearest City)": "Chicago",
  BIO: "I work with communities to grow sustainable food.",
};
const record = { id: "123", fields };

test.each([undefined, "", [], " No industry house ", "not yet updated"])(
  "uses welcoming industry fallback for %p", (value) => {
    expect(memberIndustryHouse(value)).toBe("General member");
  }
);
test("supports legacy industry arrays", () => {
  expect(memberIndustryHouse([" Climate ", "Business"])).toBe("Climate, Business");
});

test.each([0, 1])("sidebar name and photo open the member bio without moving the map (%i)", async (trigger) => {
  const onRecordClick = jest.fn();
  render(<Sidebar filteredData={[record]} isAuthenticated totalNumber={1} onRecordClick={onRecordClick} />);
  expect(screen.getByText("Industry house")).toBeInTheDocument();
  expect(screen.getByText("Climate")).toBeInTheDocument();
  expect(screen.getByText("Organization")).toBeInTheDocument();
  expect(screen.getByText("An organization")).toBeInTheDocument();
  expect(screen.queryByText("not yet updated")).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "View Ada Green's profile" })[trigger]);
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText(fields.BIO)).toBeInTheDocument();
  expect(within(dialog).getByText("Chicago")).toBeInTheDocument();
  expect(within(dialog).queryByRole("button", { name: /update.*location/i })).not.toBeInTheDocument();
  expect(onRecordClick).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Close member profile" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("signed-out sidebar does not expose profile triggers or bio", () => {
  render(<Sidebar filteredData={[record]} isAuthenticated={false} totalNumber={1} />);
  expect(screen.queryByRole("button", { name: /view .*profile/i })).not.toBeInTheDocument();
  expect(screen.queryByText(fields.BIO)).not.toBeInTheDocument();
});

test("marker popup name opens the same profile and labels missing industry clearly", async () => {
  render(<InfoCard fields={{ ...fields, "PRIMARY INDUSTRY HOUSE": "" }} FIRST_NAME="Ada" LAST_NAME="Green" isAuthenticated />);
  expect(screen.getByText("General member")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "View Ada Green's profile" })[1]);
  expect(within(await screen.findByRole("dialog")).getByText(fields.BIO)).toBeInTheDocument();
});

// Regression for Kelyce's screenshot: the map contains 12 members, while the
// directory's global total is 2,643. The primary count must describe these cards.
test("zoomed map shows the viewport result count instead of the global total", () => {
  const members = Array.from({ length: 12 }, (_, index) => ({ ...record, id: String(index) }));
  render(<Sidebar filteredData={members} isAuthenticated totalNumber={2643} visibleInViewport={12} />);
  expect(screen.getByText("12 result(s)")).toBeInTheDocument();
  expect(screen.queryByText("2643 result(s)")).not.toBeInTheDocument();
  expect(screen.getAllByTestId("member-card")).toHaveLength(12);
});

test("organization affiliations appear on cards and in profiles while signed-out viewers cannot see them", async () => {
  const member = { ...record, fields: { ...fields, "AFFILIATED ENTITY": "Partner Network" } };
  const { rerender } = render(<Sidebar filteredData={[member]} isAuthenticated totalNumber={1} />);
  expect(screen.getByText("An organization")).toBeInTheDocument();
  expect(screen.getByText("Partner Network")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "View Ada Green's profile" })[1]);
  const dialog = within(await screen.findByRole("dialog"));
  expect(dialog.getByText("An organization")).toBeInTheDocument();
  expect(dialog.getByText("Partner Network")).toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", { name: "Close member profile" }));
  rerender(<Sidebar filteredData={[member]} isAuthenticated={false} totalNumber={1} />);
  expect(screen.queryByText("An organization")).not.toBeInTheDocument();
  expect(screen.queryByText("Partner Network")).not.toBeInTheDocument();
});
