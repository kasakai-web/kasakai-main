import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
        <div style={{
          flex: 1,
          background: '#f4efe8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#111111',
          fontSize: 16,
          fontWeight: 900,
          letterSpacing: 1,
        }}>
          KASA
        </div>
        <div style={{ height: 2, background: '#444444' }} />
        <div style={{
          flex: 1,
          background: '#111111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f4efe8',
          fontSize: 17,
          fontWeight: 900,
          letterSpacing: 1,
        }}>
          KAI
        </div>
      </div>
    ),
    size,
  );
}
