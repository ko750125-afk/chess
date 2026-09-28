import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chess',
  description: '오리지널 체스 게임',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
