import { create } from 'zustand';
import { useSocketStore } from './socketStore.js';
import { getIceServersApi } from '../api/chat.api.js';

let peerConnection = null;
let pendingIceCandidates = [];

export const useCallStore = create((set, get) => ({
  activeCall: null,      // { callId, conversationId, peer, type, status: 'ringing'|'connected'|'ended', durationSec }
  incomingCall: null,    // { callId, conversationId, caller, type }
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  facingMode: 'user', // 'user' (front) | 'environment' (rear)
  isSwitchingCamera: false,
  callDuration: 0,
  timerInterval: null,

  // Initiate an outgoing call
  startCall: async (conversationId, callee, type = 'voice') => {
    try {
      const socket = useSocketStore.getState().socket;
      if (!socket) throw new Error('Socket not connected');

      // Request user media with crystal-clear echo cancellation and noise suppression
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: type === 'video' ? { facingMode: 'user' } : false,
        });
      } catch (e) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: type === 'video' ? { facingMode: 'user' } : false,
          });
        } catch (e2) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: type === 'video',
          });
        }
      }

      set({
        localStream: stream,
        activeCall: {
          conversationId,
          peer: callee,
          type,
          status: 'ringing',
        },
        isMuted: false,
        isCameraOff: false,
        isScreenSharing: false,
        facingMode: 'user',
        isSwitchingCamera: false,
        callDuration: 0,
      });

      socket.emit('call:invite', {
        conversationId,
        calleeId: callee._id || callee,
        type,
      });
    } catch (err) {
      console.error('[Call Error] startCall:', err.message);
      get().cleanUpCall();
    }
  },

  // Set incoming call alert
  setIncomingCall: (incoming) => {
    set({ incomingCall: incoming });
  },

  // Accept incoming call
  acceptCall: async () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    try {
      const socket = useSocketStore.getState().socket;
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: incomingCall.type === 'video' ? { facingMode: 'user' } : false,
        });
      } catch (e) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: incomingCall.type === 'video' ? { facingMode: 'user' } : false,
          });
        } catch (e2) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: incomingCall.type === 'video',
          });
        }
      }

      set({
        localStream: stream,
        activeCall: {
          callId: incomingCall.callId,
          conversationId: incomingCall.conversationId,
          peer: incomingCall.caller,
          type: incomingCall.type,
          status: 'connected',
        },
        incomingCall: null,
        isMuted: false,
        isCameraOff: false,
        isScreenSharing: false,
        facingMode: 'user',
        isSwitchingCamera: false,
        callDuration: 0,
      });

      socket.emit('call:accept', { callId: incomingCall.callId });
      await get().initPeerConnection(incomingCall.caller._id);
      get().startCallTimer();
    } catch (err) {
      console.error('[Call Error] acceptCall:', err.message);
      get().rejectCall('media_failed');
    }
  },

  // Reject incoming call
  rejectCall: (reason = 'declined') => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit('call:reject', { callId: incomingCall.callId, reason });
    }
    set({ incomingCall: null });
  },

  // Cancel outgoing call before answer
  cancelCall: () => {
    const { activeCall } = get();
    const socket = useSocketStore.getState().socket;
    if (socket && activeCall?.callId) {
      socket.emit('call:cancel', { callId: activeCall.callId });
    }
    get().cleanUpCall();
  },

  // End active call
  endCall: () => {
    const { activeCall, callDuration } = get();
    const socket = useSocketStore.getState().socket;
    if (socket && activeCall?.callId) {
      socket.emit('call:end', {
        callId: activeCall.callId,
        durationSec: callDuration,
      });
    }
    get().cleanUpCall();
  },

  // Initialize WebRTC RTCPeerConnection
  initPeerConnection: async (targetUserId) => {
    try {
      const { localStream } = get();
      const socket = useSocketStore.getState().socket;

      let iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
      ];
      try {
        const res = await getIceServersApi();
        if (res.success && res.data?.iceServers) {
          iceServers = res.data.iceServers;
        }
      } catch (e) {}

      peerConnection = new RTCPeerConnection({ iceServers });

      // Add local tracks (audio and/or video)
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });
      }

      // Handle remote stream and individual tracks (supports mobile Safari & Android Chrome)
      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set({ remoteStream: event.streams[0] });
        } else if (event.track) {
          const currentRemote = get().remoteStream || new MediaStream();
          currentRemote.addTrack(event.track);
          set({ remoteStream: new MediaStream(currentRemote.getTracks()) });
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('call:ice-candidate', {
            callId: get().activeCall?.callId,
            candidate: event.candidate,
            targetUserId,
          });
        }
      };

      return peerConnection;
    } catch (err) {
      console.error('[WebRTC Error] initPeerConnection:', err.message);
    }
  },

  // Create and send SDP Offer (caller side once callee accepted)
  createOffer: async (targetUserId) => {
    try {
      const pc = await get().initPeerConnection(targetUserId);
      if (!pc) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const socket = useSocketStore.getState().socket;
      if (socket) {
        socket.emit('call:offer', {
          callId: get().activeCall?.callId,
          sdp: offer,
          targetUserId,
        });
      }
    } catch (err) {
      console.error('[WebRTC Error] createOffer:', err.message);
    }
  },

  // Handle incoming SDP Offer (callee side)
  handleOffer: async (sdp, senderId) => {
    try {
      let pc = peerConnection;
      if (!pc) {
        pc = await get().initPeerConnection(senderId);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush any queued ICE candidates that arrived before remoteDescription
      while (pendingIceCandidates.length > 0) {
        const candidate = pendingIceCandidates.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[WebRTC] Error applying buffered ICE candidate:', e);
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const socket = useSocketStore.getState().socket;
      if (socket) {
        socket.emit('call:answer', {
          callId: get().activeCall?.callId,
          sdp: answer,
          targetUserId: senderId,
        });
      }
    } catch (err) {
      console.error('[WebRTC Error] handleOffer:', err.message);
    }
  },

  // Handle incoming SDP Answer (caller side)
  handleAnswer: async (sdp) => {
    try {
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

        // Flush any queued ICE candidates
        while (pendingIceCandidates.length > 0) {
          const candidate = pendingIceCandidates.shift();
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[WebRTC] Error applying buffered ICE candidate:', e);
          }
        }
      }
    } catch (err) {
      console.error('[WebRTC Error] handleAnswer:', err.message);
    }
  },

  // Handle incoming ICE Candidate
  handleIceCandidate: async (candidate) => {
    try {
      if (!candidate) return;
      if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue candidates until remote description is set
        pendingIceCandidates.push(candidate);
      }
    } catch (err) {
      console.error('[WebRTC Error] handleIceCandidate:', err.message);
    }
  },

  // Toggle Mute Audio
  toggleMute: () => {
    const { localStream, isMuted, activeCall } = get();
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = isMuted; // Toggle enabled
      const newMuted = !isMuted;
      set({ isMuted: newMuted });

      const socket = useSocketStore.getState().socket;
      if (socket && activeCall?.peer?._id) {
        socket.emit('call:media-state', {
          callId: activeCall.callId,
          targetUserId: activeCall.peer._id,
          isMuted: newMuted,
        });
      }
    }
  },

  // Toggle Video Camera
  toggleCamera: () => {
    const { localStream, isCameraOff, activeCall } = get();
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = isCameraOff;
      const newCameraOff = !isCameraOff;
      set({ isCameraOff: newCameraOff });

      const socket = useSocketStore.getState().socket;
      if (socket && activeCall?.peer?._id) {
        socket.emit('call:media-state', {
          callId: activeCall.callId,
          targetUserId: activeCall.peer._id,
          isCameraOff: newCameraOff,
        });
      }
    }
  },

  // Switch Camera between Front (user) and Rear (environment)
  switchCamera: async () => {
    const { localStream, facingMode, isCameraOff, isSwitchingCamera } = get();
    if (!localStream || isCameraOff || isSwitchingCamera) return;

    set({ isSwitchingCamera: true });
    const nextFacingMode = facingMode === 'user' ? 'environment' : 'user';

    try {
      const oldVideoTrack = localStream.getVideoTracks()[0];
      let newStream = null;

      // 1. Try mobile-standard ideal facingMode constraint
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: nextFacingMode } },
        });
      } catch (e1) {
        // 2. Fallback: inspect connected devices and pick alternate camera
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === 'videoinput');
          const currentDeviceId = oldVideoTrack?.getSettings?.()?.deviceId;
          const alternate = videoDevices.find((d) => d.deviceId && d.deviceId !== currentDeviceId);
          if (alternate) {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: alternate.deviceId } },
            });
          }
        } catch (e2) {}

        // 3. Fallback: unconstrained video
        if (!newStream) {
          newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      if (!newStream) {
        throw new Error('Unable to switch camera');
      }

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        throw new Error('No video track available from switched camera');
      }

      // Stop previous video track
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        localStream.removeTrack(oldVideoTrack);
      }

      // Attach new video track to existing stream
      localStream.addTrack(newVideoTrack);

      // Replace track on WebRTC peer connection so remote participant sees switched camera
      if (peerConnection) {
        const videoSender = peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      // Recreate MediaStream reference to trigger React hook re-renders
      const updatedStream = new MediaStream([
        ...localStream.getAudioTracks(),
        newVideoTrack,
      ]);

      set({
        localStream: updatedStream,
        facingMode: nextFacingMode,
        isSwitchingCamera: false,
      });
    } catch (err) {
      console.error('[WebRTC Error] switchCamera:', err.message);
      set({ isSwitchingCamera: false });
    }
  },

  // Toggle Screen Share
  toggleScreenShare: async () => {
    const { isScreenSharing, localStream, activeCall } = get();
    if (!peerConnection) return;

    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          get().toggleScreenShare();
        };

        set({ isScreenSharing: true });
      } else {
        const cameraTrack = localStream?.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && cameraTrack) {
          sender.replaceTrack(cameraTrack);
        }
        set({ isScreenSharing: false });
      }
    } catch (err) {
      console.error('[WebRTC Error] toggleScreenShare:', err.message);
    }
  },

  // Call timer helper
  startCallTimer: () => {
    if (get().timerInterval) clearInterval(get().timerInterval);
    const interval = setInterval(() => {
      set((state) => ({ callDuration: state.callDuration + 1 }));
    }, 1000);
    set({ timerInterval: interval });
  },

  // Clean up media streams and reset call state
  cleanUpCall: () => {
    const { localStream, timerInterval } = get();

    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    pendingIceCandidates = [];

    if (timerInterval) {
      clearInterval(timerInterval);
    }

    set({
      activeCall: null,
      incomingCall: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
      facingMode: 'user',
      isSwitchingCamera: false,
      callDuration: 0,
      timerInterval: null,
    });
  },
}));

