import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  Sparkles, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Languages, 
  CheckCircle2, 
  Check,
  RotateCw
} from 'lucide-react';
import { getMediaUrl, formatFileSize } from '../../utils/file.js';
import { useVoiceStore } from '../../store/voiceStore.js';
import { useAiStore } from '../../store/aiStore.js';
import { useTranslationStore } from '../../store/translationStore.js';

export default function VoicePlayer({ message, isOwn }) {
  const attachment = message.attachment;
  const audioUrl = getMediaUrl(attachment?.url);

  const {
    activeAudioId,
    isPlaying: globalIsPlaying,
    playbackSpeed,
    cyclePlaybackSpeed,
    setActiveAudio,
    stopAudio,
    transcripts,
    transcribeVoiceNote,
  } = useVoiceStore();

  const { settings: aiSettings } = useAiStore();
  const { translateMessage } = useTranslationStore();

  const [localPlaying, setLocalPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(attachment?.durationSec || 0);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  const audioRef = useRef(null);

  const isCurrentAudio = activeAudioId === message._id;
  const isPlaying = isCurrentAudio && localPlaying;

  const transcript = transcripts[message._id];
  const isTranscribing = transcript?.isLoading;

  useEffect(() => {
    if (!isCurrentAudio && localPlaying) {
      audioRef.current?.pause();
      setLocalPlaying(false);
    }
  }, [activeAudioId, isCurrentAudio, localPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleTogglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setLocalPlaying(false);
      stopAudio();
    } else {
      setActiveAudio(message._id, duration);
      audioRef.current.play().catch(() => {});
      setLocalPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setLocalPlaying(false);
    setCurrentTime(0);
    stopAudio();
  };

  const handleSeek = (e) => {
    const seekTo = Number(e.target.value);
    setCurrentTime(seekTo);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTo;
    }
  };

  const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTranscribe = () => {
    transcribeVoiceNote(message._id);
    setIsTranscriptExpanded(true);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 min-w-[240px] sm:min-w-[280px] max-w-sm">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Audio Player Bar */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-subtle flex-shrink-0 ${
            isOwn
              ? 'bg-white text-brand-700 hover:bg-white/90'
              : 'bg-brand-gradient text-white hover:shadow-brand active:scale-95'
          }`}
          title={isPlaying ? 'Pause' : 'Play voice note'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Progress bar & Time */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-brand-500 bg-black/10"
          />
          <div className="flex items-center justify-between text-[10px] opacity-80 select-none">
            <span>{formatSeconds(currentTime)}</span>
            <span>{formatSeconds(duration)}</span>
          </div>
        </div>

        {/* Playback Speed Multiplier */}
        <button
          type="button"
          onClick={cyclePlaybackSpeed}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors select-none ${
            isOwn
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-surface-alt hover:bg-border-main text-text-primary border border-border-main'
          }`}
          title="Playback speed"
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* AI Transcription & Summary Controls */}
      {aiSettings?.enabled && (
        <div className="pt-1 border-t border-black/10 text-xs">
          {!transcript && !isTranscribing ? (
            <button
              type="button"
              onClick={handleTranscribe}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-opacity hover:opacity-80 ${
                isOwn ? 'text-white' : 'text-brand-600'
              }`}
            >
              <Sparkles className="w-3 h-3 text-brand-500 fill-brand-500" />
              Transcribe Voice Note
            </button>
          ) : isTranscribing ? (
            <div className="flex items-center gap-1.5 text-[11px] animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
              <span>Transcribing audio...</span>
            </div>
          ) : transcript ? (
            <div
              className={`rounded-xl p-2.5 space-y-1.5 text-xs shadow-subtle ${
                isOwn
                  ? 'bg-white/15 text-white border border-white/25'
                  : 'bg-brand-50/90 text-text-primary border border-brand-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-brand-700 shadow-xs border border-brand-200">
                  <Sparkles className="w-3 h-3 text-brand-500 fill-brand-500" />
                  AI Transcript · {transcript.language?.toUpperCase() || 'AUDIO'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                  className="p-1 text-text-muted hover:text-text-primary"
                >
                  {isTranscriptExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Transcript Text */}
              {isTranscriptExpanded && (
                <div className="space-y-2 pt-1 animate-fade-in">
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">
                    {transcript.text}
                  </p>

                  {/* Summary Card for Audio > 60s */}
                  {transcript.summary && (
                    <div className="p-2 rounded-lg bg-surface border border-brand-200 text-xs space-y-1 text-text-primary">
                      <span className="text-[10px] font-bold text-brand-700 uppercase block">
                        Summary
                      </span>
                      <p className="text-[11px] leading-normal text-text-secondary">
                        {transcript.summary}
                      </p>
                    </div>
                  )}

                  {/* Action Items */}
                  {transcript.actionItems?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-brand-700 uppercase block">
                        Action Items Detected
                      </span>
                      {transcript.actionItems.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
