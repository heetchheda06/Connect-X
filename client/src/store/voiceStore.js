import { create } from 'zustand';
import { transcribeVoiceApi } from '../api/ai.api.js';
import { toast } from 'react-hot-toast';

export const useVoiceStore = create((set, get) => ({
  // Playback state
  activeAudioId: null, // messageId currently playing
  isPlaying: false,
  playbackSpeed: 1, // 1 | 1.5 | 2
  currentTime: 0,
  duration: 0,

  // Transcripts cache: { [messageId]: { text, language, summary, actionItems, durationSec, isLoading, error } }
  transcripts: {},

  // Set audio playback
  setActiveAudio: (messageId, duration = 0) => {
    set({
      activeAudioId: messageId,
      isPlaying: true,
      currentTime: 0,
      duration,
    });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),

  cyclePlaybackSpeed: () => {
    const speeds = [1, 1.5, 2];
    const current = get().playbackSpeed;
    const nextIdx = (speeds.indexOf(current) + 1) % speeds.length;
    set({ playbackSpeed: speeds[nextIdx] });
  },

  stopAudio: () => {
    set({ activeAudioId: null, isPlaying: false, currentTime: 0 });
  },

  // Transcribe voice note
  transcribeVoiceNote: async (messageId) => {
    if (!messageId) return;

    set((state) => ({
      transcripts: {
        ...state.transcripts,
        [messageId]: {
          isLoading: true,
          error: null,
        },
      },
    }));

    try {
      const res = await transcribeVoiceApi({ messageId });
      if (res.success && res.data) {
        set((state) => ({
          transcripts: {
            ...state.transcripts,
            [messageId]: {
              ...res.data,
              isLoading: false,
              error: null,
            },
          },
        }));
        return res.data;
      } else {
        throw new Error(res.message || 'Transcription failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Transcription failed';
      set((state) => ({
        transcripts: {
          ...state.transcripts,
          [messageId]: {
            isLoading: false,
            error: msg,
          },
        },
      }));
      toast.error(msg);
      return null;
    }
  },

  // Socket event handler for transcript:ready
  setTranscriptReady: (messageId, transcriptData) => {
    set((state) => ({
      transcripts: {
        ...state.transcripts,
        [messageId]: {
          ...transcriptData,
          isLoading: false,
          error: null,
        },
      },
    }));
  },
}));
