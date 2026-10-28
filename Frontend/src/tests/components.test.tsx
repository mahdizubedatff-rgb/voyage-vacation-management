import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { VacationCard } from "../components/VacationCard";
import { ConfirmDialog } from "../components/ui/Modal";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import type { Vacation } from "../types";

const vacation: Vacation = {
  id: "v1",
  destination: "Kyoto, Japan",
  description: "Temples and tea.",
  startDate: "2030-11-12T00:00:00.000Z",
  endDate: "2030-11-19T00:00:00.000Z",
  price: 3640,
  imageName: "kyoto.jpg",
  imageUrl: "/api/images/kyoto.jpg",
  likesCount: 4,
  isLiked: false,
};

describe("VacationCard", () => {
  it("shows the vacation details and a like button for users", async () => {
    const onToggleLike = vi.fn();
    render(
      <MemoryRouter>
        <VacationCard vacation={vacation} mode="user" onToggleLike={onToggleLike} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Kyoto" })).toBeInTheDocument();
    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.getByText("$3,640")).toBeInTheDocument();
    expect(screen.getByText("12 Nov – 19 Nov 2030")).toBeInTheDocument();
    expect(screen.getByAltText("Kyoto, Japan")).toHaveAttribute("src", "/api/images/kyoto.jpg");

    const like = screen.getByRole("button", { name: /add kyoto, japan to favourites/i });
    expect(like).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(like);
    expect(onToggleLike).toHaveBeenCalledWith(vacation);
    expect(screen.queryByRole("link", { name: /edit/i })).not.toBeInTheDocument();
  });

  it("shows edit and delete, and no like button, for admins", async () => {
    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <VacationCard vacation={{ ...vacation, isLiked: true }} mode="admin" onDelete={onDelete} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /favourites/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit Kyoto, Japan" })).toHaveAttribute("href", "/admin/vacations/v1/edit");
    await userEvent.click(screen.getByRole("button", { name: "Delete Kyoto, Japan" }));
    expect(onDelete).toHaveBeenCalledWith({ ...vacation, isLiked: true });
  });
});

describe("ConfirmDialog", () => {
  it("cancels without confirming and confirms on request", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Delete this vacation?" description="Gone forever" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole("alertdialog", { name: "Delete this vacation?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe("SegmentedControl", () => {
  it("exposes radio semantics and supports arrow keys", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Filter"
        value="all"
        onChange={onChange}
        segments={[
          { value: "all", label: "All" },
          { value: "liked", label: "Liked" },
        ]}
      />,
    );
    const all = screen.getByRole("radio", { name: "All" });
    expect(all).toHaveAttribute("aria-checked", "true");
    all.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("liked");
  });
});
