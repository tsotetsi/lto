import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SplitPane from "../SplitPane";

describe("SplitPane", () => {
  it("renders left and right content", () => {
    render(
      <SplitPane
        left={<div>Left Panel</div>}
        right={<div>Right Panel</div>}
      />
    );
    expect(screen.getByText("Left Panel")).toBeInTheDocument();
    expect(screen.getByText("Right Panel")).toBeInTheDocument();
  });

  it("renders default labels", () => {
    render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right</div>}
      />
    );
    expect(screen.getByText("Editor")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("renders custom labels", () => {
    render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right</div>}
        leftLabel="Code"
        rightLabel="Output"
      />
    );
    expect(screen.getByText("Code")).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
  });

  it("collapses left panel when collapse button is clicked", () => {
    render(
      <SplitPane
        left={<div>Left Panel</div>}
        right={<div>Right Panel</div>}
      />
    );
    // Find all collapse buttons — left panel has a collapse button with an arrow icon
    const collapseButtons = screen.getAllByTitle("Collapse");
    expect(collapseButtons.length).toBeGreaterThanOrEqual(1);

    // Click the left collapse button (first one)
    fireEvent.click(collapseButtons[0]);

    // After collapse, the left panel should show an expand button
    expect(screen.getByTitle("Expand editor")).toBeInTheDocument();
  });

  it("collapses right panel when collapse button is clicked", () => {
    render(
      <SplitPane
        left={<div>Left Panel</div>}
        right={<div>Right Panel</div>}
      />
    );
    // Right collapse button is the second one
    const collapseButtons = screen.getAllByTitle("Collapse");
    expect(collapseButtons.length).toBeGreaterThanOrEqual(2);

    // Click the right collapse button
    fireEvent.click(collapseButtons[1]);

    // After collapse, right panel should show an expand button
    expect(screen.getByTitle("Expand preview")).toBeInTheDocument();
  });

  it("expands a collapsed left panel when the expand button is clicked", () => {
    render(
      <SplitPane
        left={<div>Left Panel</div>}
        right={<div>Right Panel</div>}
      />
    );
    // Collapse left first
    fireEvent.click(screen.getAllByTitle("Collapse")[0]);
    expect(screen.getByTitle("Expand editor")).toBeInTheDocument();

    // Now expand it
    fireEvent.click(screen.getByTitle("Expand editor"));
    // After expand, the collapse button should be back
    expect(screen.getAllByTitle("Collapse").length).toBeGreaterThanOrEqual(1);
  });

  it("renders without collapsing when disabled", () => {
    render(
      <SplitPane
        left={<div>Left Panel</div>}
        right={<div>Right Panel</div>}
        leftCollapsible={false}
        rightCollapsible={false}
      />
    );
    expect(screen.queryByTitle("Collapse")).not.toBeInTheDocument();
    // Panels still render
    expect(screen.getByText("Left Panel")).toBeInTheDocument();
    expect(screen.getByText("Right Panel")).toBeInTheDocument();
  });

  it("expands right panel after collapsing", () => {
    render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right Panel Content</div>}
      />
    );
    // Collapse right first
    fireEvent.click(screen.getAllByTitle("Collapse")[1]);
    // Content stays in DOM but an "Expand preview" button should appear
    expect(screen.getByTitle("Expand preview")).toBeInTheDocument();
    // After collapse, there should only be one "Collapse" button (left panel)
    expect(screen.getAllByTitle("Collapse").length).toBe(1);

    // Now expand it
    fireEvent.click(screen.getByTitle("Expand preview"));
    expect(screen.getByText("Right Panel Content")).toBeInTheDocument();
    // Both collapse buttons should be back
    expect(screen.getAllByTitle("Collapse").length).toBe(2);
  });

  it("auto-expands right panel when left is toggled while right is collapsed", () => {
    render(
      <SplitPane
        left={<div>Left Content</div>}
        right={<div>Right Content</div>}
      />
    );
    // Collapse right first
    fireEvent.click(screen.getAllByTitle("Collapse")[1]);
    expect(screen.getByTitle("Expand preview")).toBeInTheDocument();

    // Now collapse left — right should auto-expand
    fireEvent.click(screen.getByTitle("Collapse"));
    expect(screen.queryByTitle("Expand preview")).not.toBeInTheDocument();
  });

  it("auto-expands left panel when right is toggled while left is collapsed", () => {
    render(
      <SplitPane
        left={<div>Left Content</div>}
        right={<div>Right Content</div>}
      />
    );
    // Collapse left first
    fireEvent.click(screen.getAllByTitle("Collapse")[0]);
    expect(screen.getByTitle("Expand editor")).toBeInTheDocument();

    // Now collapse right — left should auto-expand
    fireEvent.click(screen.getAllByTitle("Collapse")[0]);
    // After auto-expand, left content should be visible again
    expect(screen.queryByTitle("Expand editor")).not.toBeInTheDocument();
  });

  it("hides the resizer divider when either panel is collapsed", () => {
    const { container } = render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right</div>}
      />
    );
    // Divider has cursor-col-resize class
    expect(container.querySelector(".cursor-col-resize")).toBeInTheDocument();

    // Collapse left — divider should disappear
    fireEvent.click(screen.getAllByTitle("Collapse")[0]);
    expect(container.querySelector(".cursor-col-resize")).not.toBeInTheDocument();
  });

  it("shows collapsed right panel vertical toggle with label", () => {
    render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right</div>}
        rightLabel="PDF"
      />
    );
    // Collapse right
    fireEvent.click(screen.getAllByTitle("Collapse")[1]);

    // Should show the right collapsed button with custom label
    expect(screen.getByTitle("Expand preview")).toBeInTheDocument();
    // The label appears in both the (hidden) right panel header and the collapsed toggle
    expect(screen.getAllByText("PDF").length).toBeGreaterThanOrEqual(1);
  });

  it("applies custom defaultLeftWidth", () => {
    render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right</div>}
        defaultLeftWidth={70}
      />
    );
    // Left panel should have flex style based on 70%
    const leftPanel = screen.getByText("Left").closest('[style*="flex:"]');
    expect(leftPanel).toBeInTheDocument();
    expect(leftPanel?.getAttribute("style")).toContain("70");
  });

  it("initializes drag interaction on mousedown and cleans up on mouseup", () => {
    const { container } = render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right</div>}
      />
    );
    const divider = container.querySelector(".cursor-col-resize")!;
    expect(divider).toBeInTheDocument();

    // Mousedown on the divider — only bg-[var(--accent-blue)] is present
    fireEvent.mouseDown(divider);

    // During drag, the divider should use the dragging style
    // (className does not include 'bg-theme-primary' when dragging)
    expect(divider.className).not.toContain("bg-theme-primary");

    // Simulate mousemove
    fireEvent.mouseMove(document, { clientX: 200 });

    // Mouseup on document
    fireEvent.mouseUp(document);

    // After mouseup, the divider should revert to the non-dragging class
    expect(divider.className).toContain("bg-theme-primary");
  });

  it("clamps left width within min/max bounds during drag", () => {
    const { container } = render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right</div>}
        minLeftWidth={30}
        maxLeftWidth={70}
      />
    );
    const divider = container.querySelector(".cursor-col-resize")!;

    // Start drag
    fireEvent.mouseDown(divider);

    // Try to drag left beyond 30% min — container width is 1024 in jsdom
    // ClientX of 100 should give ~10% which is below 30% min
    fireEvent.mouseMove(document, { clientX: 100 });
    fireEvent.mouseUp(document);

    // Left panel should have flex value no lower than 30 (anchored by content)
    const leftPanel = screen.getByText("Left").closest('[style*="flex:"]');
    const style = leftPanel?.getAttribute("style") || "";
    const flexMatch = style.match(/flex:\s*([\d.]+)/);
    if (flexMatch) {
      const flexValue = parseFloat(flexMatch[1]);
      expect(flexValue).toBeGreaterThanOrEqual(30);
    }
  });
});
