import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Job Fit Analyzer',
  description: 'Automated job matching using AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
