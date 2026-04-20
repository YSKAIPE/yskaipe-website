import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YSKAIPE",
  description: "Fair Price. Smart Choice. Everybody Wins.",
  icons: {
    icon: "/favicon.ico?v=2",
  },
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
