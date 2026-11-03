import { ImageResponse } from 'next/og';
export function GET(req: Request) {
  const size = new URL(req.url).searchParams.get('size') === '192' ? 192 : 512;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#5155d9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '46%',
          height: '46%',
          border: '28px solid white',
          borderRadius: 70,
          display: 'flex',
        }}
      />
    </div>,
    { width: size, height: size },
  );
}
