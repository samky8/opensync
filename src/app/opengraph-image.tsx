import { ImageResponse } from 'next/og';
export const alt = 'OpenSync · Change your hours once. Update everywhere.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#f5f5fa',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 90,
        color: '#33364c',
      }}
    >
      <div style={{ fontSize: 36, color: '#6563b6', marginBottom: 60 }}>OpenSync.</div>
      <div style={{ fontSize: 72, lineHeight: 1.1, letterSpacing: -3 }}>
        Change your hours once.
      </div>
      <div style={{ fontSize: 72, lineHeight: 1.1, letterSpacing: -3, color: '#7775ba' }}>
        Update everywhere.
      </div>
      <div style={{ fontSize: 23, color: '#9695a9', marginTop: 40 }}>
        One update. Everywhere your customers look.
      </div>
    </div>,
    size,
  );
}
