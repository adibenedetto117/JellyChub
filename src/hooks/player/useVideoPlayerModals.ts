import { useState, useCallback, useMemo } from 'react';

export type ModalName =
  | 'audioSelector'
  | 'subtitleSelector'
  | 'audioSubtitleSelector'
  | 'subtitleStyleModal'
  | 'speedSelector'
  | 'sleepTimerSelector'
  | 'chapterList'
  | 'episodeList'
  | 'openSubtitlesSearch'
  | 'moreOptions'
  | 'qualitySelector'
  | 'castRemote';

export interface VideoPlayerModalsState {
  audioSelector: boolean;
  subtitleSelector: boolean;
  audioSubtitleSelector: boolean;
  subtitleStyleModal: boolean;
  speedSelector: boolean;
  sleepTimerSelector: boolean;
  chapterList: boolean;
  episodeList: boolean;
  openSubtitlesSearch: boolean;
  moreOptions: boolean;
  qualitySelector: boolean;
  castRemote: boolean;
}

const initialState: VideoPlayerModalsState = {
  audioSelector: false,
  subtitleSelector: false,
  audioSubtitleSelector: false,
  subtitleStyleModal: false,
  speedSelector: false,
  sleepTimerSelector: false,
  chapterList: false,
  episodeList: false,
  openSubtitlesSearch: false,
  moreOptions: false,
  qualitySelector: false,
  castRemote: false,
};

export function useVideoPlayerModals() {
  const [modals, setModals] = useState<VideoPlayerModalsState>(initialState);

  const openModal = useCallback((name: ModalName) => {
    setModals(prev => ({ ...prev, [name]: true }));
  }, []);

  const closeModal = useCallback((name: ModalName) => {
    setModals(prev => ({ ...prev, [name]: false }));
  }, []);

  const toggleModal = useCallback((name: ModalName) => {
    setModals(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(initialState);
  }, []);

  // Individual visibility checks for convenience
  const isOpen = useMemo(() => ({
    audioSelector: modals.audioSelector,
    subtitleSelector: modals.subtitleSelector,
    audioSubtitleSelector: modals.audioSubtitleSelector,
    subtitleStyleModal: modals.subtitleStyleModal,
    speedSelector: modals.speedSelector,
    sleepTimerSelector: modals.sleepTimerSelector,
    chapterList: modals.chapterList,
    episodeList: modals.episodeList,
    openSubtitlesSearch: modals.openSubtitlesSearch,
    moreOptions: modals.moreOptions,
    qualitySelector: modals.qualitySelector,
    castRemote: modals.castRemote,
  }), [modals]);

  return {
    modals,
    isOpen,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,
  };
}
