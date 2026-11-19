'use client';

import { FilmGrain, ImageTexture, Shader, SimplexNoise } from 'shaders/react';

export function SignupBackdrop() {
  return (
    <div className="signup-backdrop" aria-hidden="true">
      <Shader
        className="signup-shader"
        colorSpace="srgb"
        toneMapping="neutral"
        disableTelemetry
      >
        <ImageTexture url="/images/signup-storefront.png" objectFit="cover" />
        <SimplexNoise
          colorA="#d9d2c8"
          colorB="#2f2634"
          scale={3.4}
          balance={0.18}
          contrast={-0.35}
          seed={27}
          speed={0.08}
          opacity={0.12}
          blendMode="softLight"
        />
        <FilmGrain
          strength={0.16}
          bias={1.5}
          animated={false}
          opacity={0.18}
          blendMode="overlay"
        />
      </Shader>
    </div>
  );
}
