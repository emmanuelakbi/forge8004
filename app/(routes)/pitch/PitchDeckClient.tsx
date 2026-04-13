"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";

const PitchDeck = dynamic(() => import("@/src/views/pitch"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px]">
      <div className="w-5 h-5 border-2 border-emerald-cyber/30 border-t-emerald-cyber rounded-full animate-spin" />
    </div>
  ),
});

type State = { hasError: boolean; message: string };

class PitchDeckErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { hasError: true, message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] gap-3 text-center px-4">
          <p className="text-amber-warning font-medium">
            Failed to load Pitch Deck
          </p>
          <p className="text-sm text-zinc-400">
            html2canvas or jsPDF could not be loaded.{" "}
            {this.state.message && (
              <span className="block mt-1 text-zinc-500">
                {this.state.message}
              </span>
            )}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="btn-secondary mt-2 text-sm px-4 py-1.5"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PitchDeckClient() {
  return (
    <PitchDeckErrorBoundary>
      <PitchDeck />
    </PitchDeckErrorBoundary>
  );
}
