/**
 * Web Video View - HTML5 video fallback for web/desktop platforms
 */
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Platform } from 'react-native';

interface WebVideoViewProps {
  player: any;
  streamUrl: string;
  style?: any;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
}

export const WebVideoView = forwardRef<HTMLVideoElement, WebVideoViewProps>(
  ({ player, streamUrl, style, onTimeUpdate, onDurationChange, onEnded, onError }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

    // Sync player state to video element
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !player) return;

      // Handle play/pause from player
      const handlePlayingChange = () => {
        if (player.playing) {
          video.play().catch(console.error);
        } else {
          video.pause();
        }
      };

      // Handle seek
      const handleSeek = () => {
        if (player.currentTime !== undefined) {
          video.currentTime = player.currentTime;
        }
      };

      // Handle volume/mute
      const handleVolumeChange = () => {
        video.volume = player.volume ?? 1;
        video.muted = player.muted ?? false;
      };

      // Handle playback rate
      const handleRateChange = () => {
        video.playbackRate = player.playbackRate ?? 1;
      };

      // Subscribe to player changes
      if (player.addListener) {
        const listeners = [
          player.addListener('playingChange', handlePlayingChange),
          player.addListener('currentTimeChange', handleSeek),
          player.addListener('volumeChange', handleVolumeChange),
          player.addListener('playbackRateChange', handleRateChange),
        ];
        return () => listeners.forEach(l => l?.remove?.());
      }
    }, [player]);

    // Sync video element state back to player
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        onTimeUpdate?.(video.currentTime);
        // Update player's currentTime if possible
        if (player && typeof player.currentTime === 'number') {
          // Don't set directly to avoid loops
        }
      };

      const handleDurationChange = () => {
        onDurationChange?.(video.duration);
      };

      const handleEnded = () => {
        onEnded?.();
      };

      const handleError = (e: any) => {
        onError?.(e);
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('durationchange', handleDurationChange);
      video.addEventListener('ended', handleEnded);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('durationchange', handleDurationChange);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('error', handleError);
      };
    }, [onTimeUpdate, onDurationChange, onEnded, onError, player]);

    // Update source when streamUrl changes
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !streamUrl) return;

      video.src = streamUrl;
      video.load();

      // Auto-play if player is in playing state
      if (player?.playing) {
        video.play().catch(console.error);
      }
    }, [streamUrl, player]);

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
