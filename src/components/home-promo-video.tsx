'use client';

import { Play } from 'lucide-react';
import { useRef, useState } from 'react';

export function HomePromoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPlayButton, setShowPlayButton] = useState(true);

  function playVideo() {
    void videoRef.current?.play();
  }

  return (
    <div className="home-promo-video">
      <video
        ref={videoRef}
        aria-label="OpenSync demo: publish one hours change to multiple channels"
        width={1280}
        height={800}
        poster="/images/opensync-publish-demo.webp"
        preload="none"
        controls
        playsInline
        onPlay={() => setShowPlayButton(false)}
        onPause={() => setShowPlayButton(true)}
        onEnded={() => setShowPlayButton(true)}
      >
        <source src="/opensync-publish-demo.webm" type="video/webm" />
        <source src="/opensync-publish-demo.mp4" type="video/mp4" />
        <track kind="captions" src="/opensync-publish-demo.en.vtt" srcLang="en" label="English" />
        Your browser does not support embedded video.
      </video>
      {showPlayButton ? (
        <button
          className="home-promo-play"
          type="button"
          onClick={playVideo}
          aria-label="Play video"
        >
          <Play aria-hidden="true" fill="currentColor" />
        </button>
      ) : null}
    </div>
  );
}
