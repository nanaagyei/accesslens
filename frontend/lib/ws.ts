"use client";

import { DetectionResponse } from "./types";

type MessageHandler = (response: DetectionResponse) => void;
type StatusHandler = (connected: boolean) => void;

/**
 * WebSocket client with reconnect logic.
 * Sends frame metadata (text) + JPEG bytes (binary).
 * Receives DetectionResponse JSON.
 */
export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessage: MessageHandler;
  private onStatus: StatusHandler;
  private retryCount = 0;
  private maxRetries = 3;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private _closed = false;

  constructor(
    url: string,
    onMessage: MessageHandler,
    onStatus: StatusHandler,
  ) {
    this.url = url;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
  }

  connect(): void {
    this._closed = false;
    this.retryCount = 0;
    this._connect();
  }

  private _connect(): void {
    if (this._closed) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.retryCount = 0;
      this.onStatus(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as DetectionResponse;
        this.onMessage(data);
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.onStatus(false);
      if (!this._closed && this.retryCount < this.maxRetries) {
        this.retryCount++;
        this.retryTimer = setTimeout(() => this._connect(), 3000);
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  /** Send frame metadata header + JPEG binary. */
  sendFrame(frameId: number, blob: Blob, w: number, h: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const header = JSON.stringify({ type: "frame", id: frameId, w, h });
    this.ws.send(header);
    this.ws.send(blob);
  }

  close(): void {
    this._closed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
