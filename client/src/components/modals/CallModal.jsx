import React, { useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  SwitchCamera,
  Monitor, 
  User, 
  Volume2 
} from 'lucide-react';
import { useCallStore } from '../../store/callStore.js';
import Avatar from '../ui/Avatar.jsx';

export default function CallModal() {
  const {
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    facingMode,
    isSwitchingCamera,
    callDuration,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    toggleScreenShare,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Attach local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCameraOff, facingMode]);

  // Attach remote video stream (video calls)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Attach remote audio stream (crucial for crystal-clear voice and video calls)
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1.0;
      const playPromise = remoteAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[WebRTC Audio Playback AutoPlay]:', err.message);
        });
      }
    }
  }, [remoteStream]);

  // Format call timer (MM:SS)
  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  // 1. INCOMING CALL MODAL
  if (incomingCall) {
    const isVideo = incomingCall.type === 'video';
    const caller = incomingCall.caller || {};

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-900/80 backdrop-blur-md p-4 animate-fade-in">
        <div className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl border border-brand-200/50 flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full p-1 bg-brand-gradient animate-pulse flex items-center justify-center">
              <Avatar
                src={caller.avatar}
                name={caller.name || caller.username}
                id={caller._id}
                size="xl"
              />
            </div>
            <span className="absolute bottom-0 right-0 p-2 bg-brand-500 rounded-full text-white shadow-md">
              {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-heading font-bold text-text-primary">
              {caller.name || caller.username}
            </h3>
            <p className="text-sm font-medium text-brand-600 mt-1">
              Incoming {isVideo ? 'Video' : 'Voice'} Call...
            </p>
          </div>

          <div className="flex items-center gap-6 pt-2">
            {/* Decline */}
            <button
              onClick={() => rejectCall('declined')}
              className="w-14 h-14 rounded-full bg-status-danger text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            {/* Accept */}
            <button
              onClick={acceptCall}
              className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all animate-bounce"
              title="Accept"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE IN-CALL / OUTGOING CALL VIEW
  if (activeCall) {
    const isVideo = activeCall.type === 'video';
    const isRinging = activeCall.status === 'ringing';
    const peer = activeCall.peer || {};

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-900/95 sm:bg-deep-900/90 backdrop-blur-lg p-0 sm:p-6 animate-fade-in select-none">
        {/* Dedicated Remote Audio Player (Essential for voice calls and background audio) */}
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
        />

        <div className="relative w-full h-[100dvh] sm:h-[85vh] sm:max-w-4xl sm:max-h-[720px] bg-deep-950 rounded-none sm:rounded-3xl overflow-hidden shadow-2xl sm:border sm:border-white/10 flex flex-col justify-between">
          
          {/* Top Bar: Peer info, Timer & Mobile Quick Flip */}
          <div className="relative z-20 flex items-center justify-between p-3.5 sm:p-5 bg-gradient-to-b from-black/80 via-black/50 to-transparent">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Avatar
                src={peer.avatar}
                name={peer.name || peer.username}
                id={peer._id}
                size="md"
              />
              <div className="text-left truncate">
                <h4 className="text-sm sm:text-base font-bold text-white truncate">
                  {peer.name || peer.username}
                </h4>
                <p className="text-xs font-semibold text-brand-300">
                  {isRinging ? 'Ringing...' : formatTimer(callDuration)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Quick Flip Camera button right in the top header */}
              {isVideo && (
                <button
                  type="button"
                  onClick={switchCamera}
                  disabled={isSwitchingCamera}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold border border-white/20 active:scale-95 transition-all shadow-md"
                  title="Flip Camera (Front/Rear)"
                >
                  <SwitchCamera className={`w-4 h-4 ${isSwitchingCamera ? 'animate-spin text-brand-300' : ''}`} />
                  <span className="text-[11px] font-medium">{facingMode === 'user' ? 'Rear' : 'Front'}</span>
                </button>
              )}

              <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-medium border border-white/10">
                <span className={`w-2 h-2 rounded-full ${isRinging ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                <span className="hidden sm:inline">{isVideo ? 'Encrypted Video' : 'Encrypted Voice'}</span>
              </div>
            </div>
          </div>

          {/* Video / Audio Area */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden">
            {isVideo && remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-32 h-32 rounded-full p-2 bg-brand-gradient shadow-2xl flex items-center justify-center animate-pulse">
                  <Avatar
                    src={peer.avatar}
                    name={peer.name || peer.username}
                    id={peer._id}
                    size="2xl"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {peer.name || peer.username}
                  </h3>
                  <p className="text-sm text-brand-200 mt-1">
                    {isRinging ? 'Connecting...' : 'Call in progress'}
                  </p>
                </div>
              </div>
            )}

            {/* Draggable Local PIP Video */}
            {isVideo && localStream && (
              <div className="absolute top-16 right-3 sm:top-20 sm:right-6 w-28 h-40 sm:w-44 sm:h-60 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-deep-900 z-30 group">
                {!isCameraOff ? (
                  <>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        facingMode === 'user' ? 'transform -scale-x-100' : ''
                      }`}
                    />
                    {/* Quick switch button overlaid on self-view */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        switchCamera();
                      }}
                      disabled={isSwitchingCamera}
                      className="absolute top-2 left-2 p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 active:scale-90 transition-all shadow-md"
                      title={facingMode === 'user' ? 'Switch to Rear Camera' : 'Switch to Front Camera'}
                    >
                      <SwitchCamera className={`w-4 h-4 ${isSwitchingCamera ? 'animate-spin text-brand-300' : ''}`} />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-deep-900 text-white/50 text-xs">
                    <VideoOff className="w-6 h-6 mb-1 text-white/30" />
                    <span>Camera Off</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Call Controls Bar */}
          <div className="relative z-20 flex items-center justify-center gap-3 sm:gap-6 px-3 pt-3 pb-8 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
            {/* Mute Audio */}
            <button
              onClick={toggleMute}
              className={`w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-all ${
                isMuted
                  ? 'bg-status-danger text-white'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Camera Toggle (Video calls only) */}
            {isVideo && (
              <button
                onClick={toggleCamera}
                className={`w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-all ${
                  isCameraOff
                    ? 'bg-status-danger text-white'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}

            {/* Switch Camera Button (Video calls only) */}
            {isVideo && (
              <button
                type="button"
                onClick={switchCamera}
                disabled={isSwitchingCamera}
                className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 rounded-full flex items-center justify-center bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all disabled:opacity-50"
                title={facingMode === 'user' ? 'Switch to Rear Camera' : 'Switch to Front Camera'}
              >
                <SwitchCamera className={`w-5 h-5 ${isSwitchingCamera ? 'animate-spin text-brand-300' : ''}`} />
              </button>
            )}

            {/* Screen Share (Video calls only - hidden on mobile viewports as mobile browsers do not support getDisplayMedia) */}
            {isVideo && (
              <button
                onClick={toggleScreenShare}
                className={`hidden md:flex w-12 h-12 flex-shrink-0 rounded-full items-center justify-center transition-all ${
                  isScreenSharing
                    ? 'bg-brand-500 text-white'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              >
                <Monitor className="w-5 h-5" />
              </button>
            )}

            {/* End Call / Cancel */}
            <button
              onClick={isRinging ? cancelCall : endCall}
              className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-full bg-status-danger text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

