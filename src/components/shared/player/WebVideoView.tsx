/**
 * Web Video View - HTML5 video for web/desktop platforms
 * Works independently of expo-video, uses native HTML5 video element
 */
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Platform } from 'react-native';

interface WebVideoViewProps {
  player?: any;
  streamUrl: string;
  style?: any;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
}

export const WebVideoView = forwardRef<HTMLVideoElement, WebVideoViewProps>(
  ({ player, streamUrl, style, onTimeUpdate, onDurationChange, onEnded, onError, onPlay, onPause, onLoadStart, onCanPlay }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasLoadedSource = useRef(false);

    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

    // Load video source
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !streamUrl) {
        console.log('[WebVideoView] No video element or streamUrl', { hasVideo: !!video, streamUrl });
        return;
      }

      console.log('[WebVideoView] Loading stream URL:', streamUrl);
      hasLoadedSource.current = false;
      video.src = streamUrl;
      video.load();
    }, [streamUrl]);

    // Set up event listeners
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        onTimeUpdate?.(video.currentTime);
      };

      const handleDurationChange = () => {
        console.log('[WebVideoView] Duration changed:', video.duration);
        onDurationChange?.(video.duration);
      };

      const handleEnded = () => {
        console.log('[WebVideoView] Video ended');
        onEnded?.();
      };

      const handleError = (e: Event) => {
        const error = video.error;
        console.error('[WebVideoView] Video error:', error?.code, error?.message);
        onError?.(error);
      };

      const handleLoadStart = () => {
        console.log('[WebVideoView] Load started');
        onLoadStart?.();
      };

      const handleCanPlay = () => {
        console.log('[WebVideoView] Can play');
        hasLoadedSource.current = true;
        onCanPlay?.();
        // Auto-play when ready
        video.play().catch((e) => {
          console.log('[WebVideoView] Auto-play blocked:', e.name);
        });
      };

      const handlePlay = () => {
        console.log('[WebVideoView] Playing');
        onPlay?.();
      };

      const handlePause = () => {
        console.log('[WebVideoView] Paused');
        onPause?.();
      };

      const handleWaiting = () => {
        console.log('[WebVideoView] Buffering...');
      };

      const handlePlaying = () => {
        console.log('[WebVideoView] Playing (buffered)');
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('durationchange', handleDurationChange);
      video.addEventListener('ended', handleEnded);
      video.addEventListener('error', handleError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('playing', handlePlaying);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('durationchange', handleDurationChange);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
      };
    }, [onTimeUpdate, onDurationChange, onEnded, onError, onPlay, onPause, onLoadStart, onCanPlay]);

    // Expose control methods via ref
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      // Expose play/pause methods on the video element for external control
      (video as any).togglePlayPause = () => {
        if (video.paused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      };

      (video as any).seekTo = (timeInSeconds: number) => {
        video.currentTime = timeInSeconds;
      };
    }, []);

    if (Platform.OS !== 'web') {
      return null;
    }

    return (
      <View style={[{ width: '100%', height: '100%' }, style]}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: 'black',
          }}
          playsInline
          controls={false}
        />
      </View>
    );
  }
);

WebVideoView.displayName = 'WebVideoView';

export default WebVideoView;
