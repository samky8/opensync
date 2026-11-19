'use client';

import { ChromaFlow, FlutedGlass, Shader, Swirl } from 'shaders/react';

const swirlStops = [
  { color: '#f2f0ff', position: 0 },
  { color: '#c9c5ff', position: 0.45 },
  { color: '#8580ed', position: 1 },
];

export function HeroShader() {
  return (
    <Shader
      aria-hidden="true"
      className="hero-shader"
      colorSpace="p3-linear"
      toneMapping="neutral"
      disableTelemetry
    >
      <Swirl stops={swirlStops} blend={54} detail={1.55} speed={0.12} colorSpace="oklch" />
      <ChromaFlow
        baseColor="#7657f4"
        downColor="#4f46e5"
        leftColor="#6255e8"
        rightColor="#a78bfa"
        upColor="#8b5cf6"
        intensity={0.72}
        radius={3.2}
        momentum={38}
      />
      <FlutedGlass
        aberration={0.12}
        angle={30}
        frequency={8}
        highlight={0.18}
        highlightColor="#ffffff"
        highlightSoftness={0.55}
        refraction={2.7}
        softness={0.58}
        speed={0.025}
      />
    </Shader>
  );
}
