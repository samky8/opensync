import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OpenSync',
    short_name: 'OpenSync',
    description: 'One update. Everywhere your customers look.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f8f9fb',
    theme_color: '#5155d9',
    icons: [
      { src: '/api/icon?size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/api/icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
