import { describe, expect, it } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider, ToastViewport, Toaster, toast } from "./index";

// integration tests for toast provider, viewport and imperative actions
describe("ZNotify Toast integration", () => {
  it("renders a toast with title and description", () => {
    render(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    );

    act(() => {
      toast.success("profile updated", {
        description: "all your settings have been saved",
      });
    });

    expect(screen.getByText("profile updated")).toBeTruthy();
    expect(screen.getByText("all your settings have been saved")).toBeTruthy();
  });

  it("dismisses toast when close button is clicked", async () => {
    render(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    );

    act(() => {
      toast.info("temporary notification");
    });

    expect(screen.getByText("temporary notification")).toBeTruthy();

    const closeButton = screen.getByLabelText("Dismiss notification");
    fireEvent.click(closeButton);

    await waitFor(
      () => {
        expect(screen.queryByText("temporary notification")).toBeNull();
      },
      { timeout: 1000 }
    );
  });

  it("updates existing toast in place when given same id", () => {
    render(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    );

    act(() => {
      toast.show("loading data...", { id: "my-toast" });
    });
    expect(screen.getByText("loading data...")).toBeTruthy();

    act(() => {
      toast.success("data loaded!", { id: "my-toast" });
    });
    expect(screen.queryByText("loading data...")).toBeNull();
    expect(screen.getByText("data loaded!")).toBeTruthy();
  });

  it("handles toast.promise on resolution", async () => {
    render(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    );

    let resolveFn: (val: string) => void;
    const testPromise = new Promise<string>((resolve) => {
      resolveFn = resolve;
    });

    act(() => {
      toast.promise(testPromise, {
        loading: "saving file...",
        success: (data) => `saved: ${data}`,
        error: "failed to save",
      });
    });

    expect(screen.getByText("saving file...")).toBeTruthy();

    await act(async () => {
      resolveFn!("document.pdf");
    });

    expect(screen.queryByText("saving file...")).toBeNull();
    expect(screen.getByText("saved: document.pdf")).toBeTruthy();
  });

  it("handles toast.promise on rejection", async () => {
    render(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    );

    let rejectFn: (err: Error) => void;
    const testPromise = new Promise<string>((_, reject) => {
      rejectFn = reject;
    });

    act(() => {
      toast.promise(testPromise, {
        loading: "uploading...",
        success: "uploaded!",
        error: "network timeout",
      });
    });

    expect(screen.getByText("uploading...")).toBeTruthy();

    await act(async () => {
      rejectFn!(new Error("timeout"));
    });

    expect(screen.queryByText("uploading...")).toBeNull();
    expect(screen.getByText("network timeout")).toBeTruthy();
  });

  it("renders progress bar element when progressBar is true", () => {
    render(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    );

    act(() => {
      toast.show("timed notification", {
        duration: 6000,
        progressBar: true,
      });
    });

    expect(screen.getByText("timed notification")).toBeTruthy();
    expect(screen.getByTestId("shalua-progress-track")).toBeTruthy();
  });

  it("works with all-in-one Toaster component", () => {
    render(
      <div>
        <Toaster defaultProgressBar={true} />
      </div>
    );

    act(() => {
      toast.success("using toaster component");
    });

    expect(screen.getByText("using toaster component")).toBeTruthy();
    expect(screen.getByTestId("shalua-progress-track")).toBeTruthy();
  });
});
