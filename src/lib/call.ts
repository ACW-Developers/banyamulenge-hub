import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Minimal 1:1 WebRTC audio-call helper that uses a Supabase Realtime
 * broadcast channel for signaling. Both peers subscribe to the same
 * conversation-scoped channel; either side can initiate.
 */

export type CallStatus = "idle" | "ringing" | "incoming" | "connecting" | "in-call" | "ended";

export type CallHandlers = {
  onStatus: (s: CallStatus) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onError: (err: Error) => void;
};

const ICE = [{ urls: "stun:stun.l.google.com:19302" }];

export class CallSession {
  private pc: RTCPeerConnection | null = null;
  private ch: RealtimeChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream = new MediaStream();
  private meId: string;
  private convoId: string;
  private handlers: CallHandlers;
  private isCaller = false;

  constructor(convoId: string, meId: string, handlers: CallHandlers) {
    this.convoId = convoId;
    this.meId = meId;
    this.handlers = handlers;
  }

  async init() {
    this.ch = supabase.channel(`call-${this.convoId}`, {
      config: { broadcast: { self: false } },
    });
    this.ch
      .on("broadcast", { event: "offer" }, ({ payload }) => this.onOffer(payload))
      .on("broadcast", { event: "answer" }, ({ payload }) => this.onAnswer(payload))
      .on("broadcast", { event: "ice" }, ({ payload }) => this.onIce(payload))
      .on("broadcast", { event: "hangup" }, () => this.close("ended"))
      .on("broadcast", { event: "ring" }, ({ payload }) => {
        if (payload.from !== this.meId) this.handlers.onStatus("incoming");
      });
    await this.ch.subscribe();
  }

  private newPc() {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    pc.onicecandidate = (e) => {
      if (e.candidate) this.send("ice", { candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => this.remoteStream.addTrack(t));
      this.handlers.onRemoteStream(this.remoteStream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") this.handlers.onStatus("in-call");
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      )
        this.close("ended");
    };
    return pc;
  }

  private send(event: string, payload: unknown) {
    this.ch?.send({ type: "broadcast", event, payload });
  }

  private async getMic() {
    if (this.localStream) return this.localStream;
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return this.localStream;
  }

  async call() {
    try {
      this.isCaller = true;
      this.handlers.onStatus("ringing");
      const stream = await this.getMic();
      this.pc = this.newPc();
      stream.getTracks().forEach((t) => this.pc!.addTrack(t, stream));
      this.send("ring", { from: this.meId });
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.send("offer", { sdp: offer });
    } catch (e) {
      this.handlers.onError(e as Error);
      this.close("ended");
    }
  }

  async accept() {
    // called after receiving offer via onOffer
    this.handlers.onStatus("connecting");
  }

  private async onOffer(payload: { sdp: RTCSessionDescriptionInit }) {
    try {
      if (this.isCaller) return;
      this.handlers.onStatus("connecting");
      const stream = await this.getMic();
      this.pc = this.newPc();
      stream.getTracks().forEach((t) => this.pc!.addTrack(t, stream));
      await this.pc.setRemoteDescription(payload.sdp);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.send("answer", { sdp: answer });
    } catch (e) {
      this.handlers.onError(e as Error);
      this.close("ended");
    }
  }

  private async onAnswer(payload: { sdp: RTCSessionDescriptionInit }) {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(payload.sdp);
  }

  private async onIce(payload: { candidate: RTCIceCandidateInit }) {
    try {
      await this.pc?.addIceCandidate(payload.candidate);
    } catch {
      /* ignore */
    }
  }

  hangup() {
    this.send("hangup", {});
    this.close("ended");
  }

  close(status: CallStatus) {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
    this.handlers.onStatus(status);
  }

  dispose() {
    this.close("ended");
    if (this.ch) supabase.removeChannel(this.ch);
    this.ch = null;
  }
}
