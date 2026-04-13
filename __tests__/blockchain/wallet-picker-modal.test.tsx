/**
 * Tests for WalletPickerModal component
 *
 * Covers: rendering, wallet discovery flow, wallet selection,
 * error handling, and modal open/close behavior.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
import WalletPickerModal from "../../src/components/layout/WalletPickerModal";

// Mock wallet services
vi.mock("@/src/services/walletProviders", () => ({
  startWalletDiscovery: vi.fn(),
  getAvailableWallets: vi.fn(() => []),
}));

vi.mock("@/src/services/wallet", () => ({
  selectWalletProvider: vi.fn(),
  connectWallet: vi.fn(),
}));

import {
  startWalletDiscovery,
  getAvailableWallets,
} from "@/src/services/walletProviders";
import { selectWalletProvider, connectWallet } from "@/src/services/wallet";

const mockStartDiscovery = startWalletDiscovery as ReturnType<typeof vi.fn>;
const mockGetWallets = getAvailableWallets as ReturnType<typeof vi.fn>;
const mockSelectProvider = selectWalletProvider as ReturnType<typeof vi.fn>;
const mockConnectWallet = connectWallet as ReturnType<typeof vi.fn>;

const fakeWallet = {
  info: {
    uuid: "wallet-1",
    name: "MetaMask",
    icon: "https://example.com/icon.png",
    rdns: "io.metamask",
  },
  provider: {},
};

const fakeWalletNoIcon = {
  info: { uuid: "wallet-2", name: "Brave Wallet", icon: "", rdns: "com.brave" },
  provider: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("WalletPickerModal", () => {
  describe("rendering", () => {
    it("should render nothing when open is false", () => {
      const { container } = render(
        <WalletPickerModal
          open={false}
          onClose={vi.fn()}
          onConnected={vi.fn()}
        />,
      );
      expect(container.innerHTML).toBe("");
    });

    it("should render the modal when open is true", () => {
      render(
        <WalletPickerModal
          open={true}
          onClose={vi.fn()}
          onConnected={vi.fn()}
        />,
      );
      expect(screen.getByText("Connect Wallet")).toBeTruthy();
    });

    it("should show 'No wallets detected' when no wallets available", () => {
      mockGetWallets.mockReturnValue([]);
      render(
        <WalletPickerModal
          open={true}
          onClose={vi.fn()}
          onConnected={vi.fn()}
        />,
      );
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByText("No wallets detected")).toBeTruthy();
    });
  });

  describe("wallet discovery", () => {
    it("should call startWalletDiscovery on mount when open", () => {
      render(
        <WalletPickerModal
          open={true}
          onClose={vi.fn()}
          onConnected={vi.fn()}
        />,
      );
      expect(mockStartDiscovery).toHaveBeenCalled();
    });

    it("should call getAvailableWallets after a delay", () => {
      mockGetWallets.mockReturnValue([fakeWallet]);
      render(
        <WalletPickerModal
          open={true}
          onClose={vi.fn()}
          onConnected={vi.fn()}
        />,
      );
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(mockGetWallets).toHaveBeenCalled();
    });

    it("should display discovered wallets with name and rdns", () => {
      mockGetWallets.mockReturnValue([fakeWallet]);
      render(
        <WalletPickerModal
          open={true}
          onClose={vi.fn()}
          onConnected={vi.fn()}
        />,
      );
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByText("MetaMask")).toBeTruthy();
      expect(screen.getByText("io.metamask")).toBeTruthy();
    });

    it("should render wallet icon when provided", () => {
      mockGetWallets.mockReturnValue([fakeWallet]);
      render(
        <WalletPickerModal
          open={true}
          onClose={vi.fn()}
          onConnected={vi.fn()}
        />,
      );
      act(() => {
        vi.advanceTimersByTime(200);
      });
      const img = screen.getByAltText("MetaMask");
      expect(img).toBeTruthy();
      expect(img.getAttribute("src")).toBe("https://example.com/icon.png");
    });

    it("should render fallback icon when wallet has no icon", () => {
      mockGetWallets.mockReturnValue([fakeWalletNoIcon]);
      render(
        <WalletPickerModal
          open={true}
          onClose={vi.fn()}
          onConnected={vi.fn()}
        />,
      );
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByText("Brave Wallet")).toBeTruthy();
      expect(screen.queryByAltText("Brave Wallet")).toBeNull();
    });
  });

  describe("wallet selection", () => {
    it("should call selectWalletProvider and connectWallet on wallet click", async () => {
      vi.useRealTimers();
      mockGetWallets.mockReturnValue([fakeWallet]);
      mockConnectWallet.mockResolvedValue("0xabc123");
      const onClose = vi.fn();
      const onConnected = vi.fn();

      render(
        <WalletPickerModal
          open={true}
          onClose={onClose}
          onConnected={onConnected}
        />,
      );
      await waitFor(() => expect(screen.getByText("MetaMask")).toBeTruthy());

      fireEvent.click(screen.getByText("MetaMask"));

      await waitFor(() => {
        expect(mockSelectProvider).toHaveBeenCalledWith(fakeWallet);
        expect(mockConnectWallet).toHaveBeenCalled();
        expect(onConnected).toHaveBeenCalledWith("0xabc123");
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("should show WALLET_UNAVAILABLE error message", async () => {
      vi.useRealTimers();
      mockGetWallets.mockReturnValue([fakeWallet]);
      mockConnectWallet.mockRejectedValue(new Error("WALLET_UNAVAILABLE"));

      render(
        <WalletPickerModal
          open={true}
          onClose={vi.fn()}
          onConnected={vi.fn()}
        />,
      );
      await waitFor(() => expect(screen.getByText("MetaMask")).toBeTruthy());

      fireEvent.click(screen.getByText("MetaMask"));

      await waitFor(() => {
        expect(screen.getByText("Wallet not available")).toBeTruthy();
      });
    });

    it("should show generic error for other failures", async () => {
      vi.useRealTimers();
      mockGetWallets.mockReturnValue([fakeWallet]);
      mockConnectWallet.mockRejectedValue(new Error("UNKNOWN_ERROR"));

      render(
        <WalletPickerModal
          open={true}
          onClose={vi.fn()}
          onConnected={vi.fn()}
        />,
      );
      await waitFor(() => expect(screen.getByText("MetaMask")).toBeTruthy());

      fireEvent.click(screen.getByText("MetaMask"));

      await waitFor(() => {
        expect(screen.getByText("Connection failed. Try again.")).toBeTruthy();
      });
    });
  });

  describe("modal close", () => {
    it("should call onClose when backdrop is clicked", () => {
      const onClose = vi.fn();
      render(
        <WalletPickerModal
          open={true}
          onClose={onClose}
          onConnected={vi.fn()}
        />,
      );
      const backdrop = document.querySelector(".backdrop-blur-sm");
      expect(backdrop).toBeTruthy();
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalled();
    });

    it("should call onClose when X button is clicked", () => {
      const onClose = vi.fn();
      render(
        <WalletPickerModal
          open={true}
          onClose={onClose}
          onConnected={vi.fn()}
        />,
      );
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
