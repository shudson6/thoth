import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddTaskForm from "@/components/AddTaskForm";
import type { Group } from "@/types/task";

const groups: Group[] = [
  { id: "g1", name: "Work", color: "#3b82f6" },
];

function setup(overrides?: Partial<Parameters<typeof AddTaskForm>[0]>) {
  const props = {
    groups: [],
    onAdd: vi.fn(),
    onCancel: vi.fn(),
    onCreateGroup: vi.fn(),
    ...overrides,
  };
  const user = userEvent.setup();
  render(<AddTaskForm {...props} />);
  return { user, ...props };
}

describe("AddTaskForm", () => {
  describe("initial render", () => {
    it("renders a title input", () => {
      setup();
      expect(screen.getByPlaceholderText("Task title")).toBeInTheDocument();
    });

    it("renders a description textarea", () => {
      setup();
      expect(screen.getByPlaceholderText("Description (optional)")).toBeInTheDocument();
    });

    it("renders a points input", () => {
      setup();
      expect(screen.getByPlaceholderText("Points")).toBeInTheDocument();
    });

    it("renders an estimate input", () => {
      setup();
      expect(screen.getByPlaceholderText("Estimate (min)")).toBeInTheDocument();
    });

    it("renders Add and Cancel buttons", () => {
      setup();
      expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("title input starts empty", () => {
      setup();
      expect(screen.getByPlaceholderText("Task title")).toHaveValue("");
    });
  });

  describe("cancel button", () => {
    it("calls onCancel when Cancel is clicked", async () => {
      const { user, onCancel } = setup();
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledOnce();
    });
  });

  describe("form submission", () => {
    it("does not call onAdd when title is empty", async () => {
      const { user, onAdd } = setup();
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(onAdd).not.toHaveBeenCalled();
    });

    it("does not call onAdd when title is only whitespace", async () => {
      const { user, onAdd } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "   ");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(onAdd).not.toHaveBeenCalled();
    });

    it("calls onAdd with trimmed title", async () => {
      const { user, onAdd } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "  Buy milk  ");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(onAdd).toHaveBeenCalledOnce();
      expect(onAdd.mock.calls[0][0]).toBe("Buy milk");
    });

    it("calls onAdd with undefined points when points field is empty", async () => {
      const { user, onAdd } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "Task");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(onAdd.mock.calls[0][1]).toBeUndefined();
    });

    it("calls onAdd with numeric points when provided", async () => {
      const { user, onAdd } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "Task");
      await user.type(screen.getByPlaceholderText("Points"), "5");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(onAdd.mock.calls[0][1]).toBe(5);
    });

    it("calls onAdd with undefined description when field is empty", async () => {
      const { user, onAdd } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "Task");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(onAdd.mock.calls[0][2]).toBeUndefined();
    });

    it("calls onAdd with trimmed description when provided", async () => {
      const { user, onAdd } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "Task");
      await user.type(screen.getByPlaceholderText("Description (optional)"), "  Some notes  ");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(onAdd.mock.calls[0][2]).toBe("Some notes");
    });

    it("calls onAdd with undefined estimate when field is empty", async () => {
      const { user, onAdd } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "Task");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(onAdd.mock.calls[0][3]).toBeUndefined();
    });

    it("calls onAdd with numeric estimate when provided", async () => {
      const { user, onAdd } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "Task");
      await user.type(screen.getByPlaceholderText("Estimate (min)"), "30");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(onAdd.mock.calls[0][3]).toBe(30);
    });

    it("calls onAdd with undefined groupId when no group is selected", async () => {
      const { user, onAdd } = setup({ groups });
      await user.type(screen.getByPlaceholderText("Task title"), "Task");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(onAdd.mock.calls[0][4]).toBeUndefined();
    });

    it("can submit via Enter key in the title field", async () => {
      const { user, onAdd } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "Quick task{Enter}");
      expect(onAdd).toHaveBeenCalledOnce();
      expect(onAdd.mock.calls[0][0]).toBe("Quick task");
    });
  });

  describe("form reset after submission", () => {
    it("clears the title field after a successful submission", async () => {
      const { user } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "My task");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(screen.getByPlaceholderText("Task title")).toHaveValue("");
    });

    it("clears the points field after a successful submission", async () => {
      const { user } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "Task");
      await user.type(screen.getByPlaceholderText("Points"), "3");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(screen.getByPlaceholderText("Points")).toHaveValue(null);
    });

    it("clears the description field after a successful submission", async () => {
      const { user } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "Task");
      await user.type(screen.getByPlaceholderText("Description (optional)"), "notes");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(screen.getByPlaceholderText("Description (optional)")).toHaveValue("");
    });

    it("clears the estimate field after a successful submission", async () => {
      const { user } = setup();
      await user.type(screen.getByPlaceholderText("Task title"), "Task");
      await user.type(screen.getByPlaceholderText("Estimate (min)"), "45");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(screen.getByPlaceholderText("Estimate (min)")).toHaveValue(null);
    });
  });

  describe("defaultGroupId", () => {
    it("uses defaultGroupId as the initial group selection", async () => {
      const onAdd = vi.fn();
      const user = userEvent.setup();
      render(
        <AddTaskForm
          groups={groups}
          defaultGroupId="g1"
          onAdd={onAdd}
          onCancel={vi.fn()}
          onCreateGroup={vi.fn()}
        />
      );
      await user.type(screen.getByPlaceholderText("Task title"), "Task");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(onAdd.mock.calls[0][4]).toBe("g1");
    });

    it("preserves defaultGroupId after submission (does not reset to null)", async () => {
      const onAdd = vi.fn();
      const user = userEvent.setup();
      render(
        <AddTaskForm
          groups={groups}
          defaultGroupId="g1"
          onAdd={onAdd}
          onCancel={vi.fn()}
          onCreateGroup={vi.fn()}
        />
      );
      await user.type(screen.getByPlaceholderText("Task title"), "First");
      await user.click(screen.getByRole("button", { name: /add/i }));
      await user.type(screen.getByPlaceholderText("Task title"), "Second");
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(onAdd.mock.calls[1][4]).toBe("g1");
    });
  });
});
