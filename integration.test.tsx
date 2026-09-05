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
    expect(screen.getByTestId("ztoast-progress-track")).toBeTruthy();
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
    expect(screen.getByTestId("ztoast-progress-track")).toBeTruthy();
  });

  it("renders a toast with custom positioning coordinates like top 50vh", () => {
    render(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    );

    act(() => {
      toast.info("custom centered position", {
        top: "50vh",
        position: "top-center",
      });
    });

    const toastElement = screen.getByText("custom centered position");
    expect(toastElement).toBeTruthy();

    const viewportContainer = toastElement.closest("div[style*='position: fixed']") as HTMLElement;
    expect(viewportContainer).toBeTruthy();
    expect(viewportContainer.style.top).toBe("50vh");
    expect(viewportContainer.style.left).toBe("50%");
    expect(viewportContainer.style.transform).toBe("translateX(-50%)");
  });

  it("supports custom offset object on toast invocation", () => {
    render(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    );

    act(() => {
      toast.success("custom offset toast", {
        position: "bottom-right",
        offset: { bottom: "40px", right: "32px" },
      });
    });

    const toastElement = screen.getByText("custom offset toast");
    expect(toastElement).toBeTruthy();

    const viewportContainer = toastElement.closest("div[style*='position: fixed']") as HTMLElement;
    expect(viewportContainer).toBeTruthy();
    expect(viewportContainer.style.bottom).toBe("40px");
    expect(viewportContainer.style.right).toBe("32px");
  });

  it("supports global positioning offsets on Toaster component", () => {
    render(
      <div>
        <Toaster defaultPosition="top-center" top="30vh" />
      </div>
    );

    act(() => {
      toast.warning("inherits toaster position");
    });

    const toastElement = screen.getByText("inherits toaster position");
    expect(toastElement).toBeTruthy();

    const viewportContainer = toastElement.closest("div[style*='position: fixed']") as HTMLElement;
    expect(viewportContainer).toBeTruthy();
    expect(viewportContainer.style.top).toBe("30vh");
  });
});

