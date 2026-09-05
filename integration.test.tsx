import { describe, expect, it, vi } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider, ToastViewport, Toaster, toast } from "./index";

const wait = (ms: number) => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, ms));
});

// integration tests for toast provider, viewport and imperative actions
describe("ztoast integration", () => {
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

  it("keeps a hovered toast alive until the pointer leaves", async () => {
    render(<Toaster />);

    act(() => {
      toast.info("hover to keep me", { duration: 400 });
    });

    fireEvent.mouseEnter(screen.getByRole("status"));

    // well past the original duration: the countdown must be frozen
    await wait(700);
    expect(screen.queryByText("hover to keep me")).not.toBeNull();

    fireEvent.mouseLeave(screen.getByRole("status"));

    await waitFor(
      () => {
        expect(screen.queryByText("hover to keep me")).toBeNull();
      },
      { timeout: 3000 }
    );
  });

  it("auto-dismisses a toast that was replaced in place", async () => {
    render(<Toaster />);

    let resolveFn: (value: string) => void;
    const pending = new Promise<string>((resolve) => {
      resolveFn = resolve;
    });

    act(() => {
      toast.promise(
        pending,
        { loading: "saving", success: "saved", error: "failed" },
        { duration: 150 }
      );
    });

    await act(async () => {
      resolveFn!("ok");
    });

    // the loading toast was persistent; the success toast that replaced it
    // must still honour its own finite duration
    expect(screen.getByText("saved")).toBeTruthy();

    await waitFor(
      () => {
        expect(screen.queryByText("saved")).toBeNull();
      },
      { timeout: 3000 }
    );
  });

  it("fires onClose exactly once per dismissal", () => {
    const onClose = vi.fn();
    render(<Toaster />);

    act(() => {
      toast.show("closing soon", { id: "close-me", onClose, duration: Infinity });
    });

    act(() => {
      toast.dismiss("close-me");
      toast.dismiss("close-me");
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps a toast that reuses a just dismissed id", async () => {
    render(<Toaster />);

    act(() => {
      toast.show("first", { id: "reused", duration: Infinity });
    });
    act(() => {
      toast.dismiss("reused");
    });
    act(() => {
      toast.show("second", { id: "reused", duration: Infinity });
    });

    // the pending exit timer from the dismissal must not delete the new toast
    await wait(400);
    expect(screen.queryByText("second")).not.toBeNull();
  });
});

