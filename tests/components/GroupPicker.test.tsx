import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroupPicker from "@/components/GroupPicker";
import type { Group } from "@/types/task";

const groups: Group[] = [
  { id: "g1", name: "Work", color: "#3b82f6" },
  { id: "g2", name: "Personal", color: "#22c55e" },
];

describe("GroupPicker", () => {
  describe("closed state (trigger button)", () => {
    it("shows 'No group' placeholder when no group is selected", () => {
      render(
        <GroupPicker
          groups={groups}
          selectedGroupId={null}
          onChange={vi.fn()}
          onCreateGroup={vi.fn()}
        />
      );
      expect(screen.getByText("No group")).toBeInTheDocument();
    });

    it("shows the selected group's name when a group is selected", () => {
      render(
        <GroupPicker
          groups={groups}
          selectedGroupId="g1"
          onChange={vi.fn()}
          onCreateGroup={vi.fn()}
        />
      );
      expect(screen.getByText("Work")).toBeInTheDocument();
    });

    it("does not show the dropdown before the button is clicked", () => {
      render(
        <GroupPicker
          groups={groups}
          selectedGroupId={null}
          onChange={vi.fn()}
          onCreateGroup={vi.fn()}
        />
      );
      expect(screen.queryByText("+ New group")).toBeNull();
    });
  });

  describe("open state (dropdown)", () => {
    async function openDropdown() {
      const user = userEvent.setup();
      render(
        <GroupPicker
          groups={groups}
          selectedGroupId={null}
          onChange={vi.fn()}
          onCreateGroup={vi.fn()}
        />
      );
      await user.click(screen.getByRole("button", { name: /no group/i }));
      return user;
    }

    it("opens the dropdown when the trigger button is clicked", async () => {
      await openDropdown();
      expect(screen.getByText("+ New group")).toBeInTheDocument();
    });

    it("lists all groups in the dropdown", async () => {
      await openDropdown();
      expect(screen.getByRole("button", { name: /Work/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Personal/ })).toBeInTheDocument();
    });

    it("includes a 'No group' option in the dropdown", async () => {
      // There will be two: the trigger + the dropdown option
      await openDropdown();
      const noGroupButtons = screen.getAllByText("No group");
      expect(noGroupButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("selecting a group", () => {
    it("calls onChange with the group id when a group is clicked", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(
        <GroupPicker
          groups={groups}
          selectedGroupId={null}
          onChange={handleChange}
          onCreateGroup={vi.fn()}
        />
      );
      await user.click(screen.getByRole("button", { name: /no group/i }));
      await user.click(screen.getByRole("button", { name: /Work/ }));
      expect(handleChange).toHaveBeenCalledWith("g1");
    });

    it("calls onChange with null when 'No group' dropdown item is clicked", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(
        <GroupPicker
          groups={groups}
          selectedGroupId="g1"
          onChange={handleChange}
          onCreateGroup={vi.fn()}
        />
      );
      // Open dropdown (trigger shows "Work" now)
      await user.click(screen.getByRole("button", { name: /Work/ }));
      // Click the "No group" option inside the dropdown
      const noGroupButtons = screen.getAllByRole("button", { name: /No group/i });
      // The first one is the option inside the dropdown list
      await user.click(noGroupButtons[0]);
      expect(handleChange).toHaveBeenCalledWith(null);
    });

    it("closes the dropdown after a group is selected", async () => {
      const user = userEvent.setup();
      render(
        <GroupPicker
          groups={groups}
          selectedGroupId={null}
          onChange={vi.fn()}
          onCreateGroup={vi.fn()}
        />
      );
      await user.click(screen.getByRole("button", { name: /no group/i }));
      await user.click(screen.getByRole("button", { name: /Work/ }));
      expect(screen.queryByText("+ New group")).toBeNull();
    });
  });

  describe("creating a new group", () => {
    async function openCreateForm() {
      const onCreateGroup = vi.fn();
      const user = userEvent.setup();
      render(
        <GroupPicker
          groups={groups}
          selectedGroupId={null}
          onChange={vi.fn()}
          onCreateGroup={onCreateGroup}
        />
      );
      await user.click(screen.getByRole("button", { name: /no group/i }));
      await user.click(screen.getByText("+ New group"));
      return { user, onCreateGroup };
    }

    it("shows the create form when '+ New group' is clicked", async () => {
      await openCreateForm();
      expect(screen.getByPlaceholderText("Group name")).toBeInTheDocument();
    });

    it("calls onCreateGroup with trimmed name and selected color on submit", async () => {
      const { user, onCreateGroup } = await openCreateForm();
      await user.type(screen.getByPlaceholderText("Group name"), "  Fitness  ");
      await user.click(screen.getByRole("button", { name: /create/i }));
      expect(onCreateGroup).toHaveBeenCalledOnce();
      const [name, color] = onCreateGroup.mock.calls[0];
      expect(name).toBe("Fitness");
      expect(typeof color).toBe("string");
      expect(color).toMatch(/^#/);
    });

    it("calls onCreateGroup when Enter is pressed in the name input", async () => {
      const { user, onCreateGroup } = await openCreateForm();
      await user.type(screen.getByPlaceholderText("Group name"), "Health{Enter}");
      expect(onCreateGroup).toHaveBeenCalledWith("Health", expect.stringMatching(/^#/));
    });

    it("does not call onCreateGroup when name is blank", async () => {
      const { user, onCreateGroup } = await openCreateForm();
      await user.click(screen.getByRole("button", { name: /create/i }));
      expect(onCreateGroup).not.toHaveBeenCalled();
    });

    it("does not call onCreateGroup when name is only whitespace", async () => {
      const { user, onCreateGroup } = await openCreateForm();
      await user.type(screen.getByPlaceholderText("Group name"), "   ");
      await user.click(screen.getByRole("button", { name: /create/i }));
      expect(onCreateGroup).not.toHaveBeenCalled();
    });

    it("hides the create form and shows '+ New group' again after Cancel", async () => {
      const { user } = await openCreateForm();
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.queryByPlaceholderText("Group name")).toBeNull();
      expect(screen.getByText("+ New group")).toBeInTheDocument();
    });

    it("closes the dropdown after successful creation", async () => {
      const { user } = await openCreateForm();
      await user.type(screen.getByPlaceholderText("Group name"), "Hobby");
      await user.click(screen.getByRole("button", { name: /create/i }));
      expect(screen.queryByText("+ New group")).toBeNull();
    });
  });
});
