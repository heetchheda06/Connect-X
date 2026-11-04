import React, { useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
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
    callDuration,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCameraOff]);

  // Attach remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-900/90 backdrop-blur-lg p-4 sm:p-6 animate-fade-in select-none">
        <div className="relative w-full max-w-4xl h-[85vh] max-h-[720px] bg-deep-950 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between">
          
          {/* Top Bar: Peer info & Timer */}
          <div className="relative z-20 flex items-center justify-between p-5 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center gap-3">
              <Avatar
                src={peer.avatar}
                name={peer.name || peer.username}
                id={peer._id}
                size="md"
              />
              <div className="text-left">
                <h4 className="text-base font-bold text-white">
                  {peer.name || peer.username}
                </h4>
                <p className="text-xs font-semibold text-brand-300">
                  {isRinging ? 'Ringing...' : formatTimer(callDuration)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-medium border border-white/10">
              <span className={`w-2 h-2 rounded-full ${isRinging ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span>{isVideo ? 'Encrypted Video' : 'Encrypted Voice'}</span>
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
              <div className="absolute top-4 right-4 w-36 h-48 sm:w-44 sm:h-60 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-deep-900 z-30">
                {!isCameraOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
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
          <div className="relative z-20 flex items-center justify-center gap-4 sm:gap-6 p-6 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
            {/* Mute Audio */}
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
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
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isCameraOff
                    ? 'bg-status-danger text-white'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}

            {/* Screen Share (Video calls only) */}
            {isVideo && (
              <button
                onClick={toggleScreenShare}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
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
              className="w-14 h-14 rounded-full bg-status-danger text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
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
