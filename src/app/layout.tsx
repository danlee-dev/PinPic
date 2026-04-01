import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PinPic - 연세대 vs 고려대 사진 투표",
  description: "마음에 드는 사진을 더블탭해서 투표하세요. 연세대 vs 고려대, 당신의 선택은?",
  openGraph: {
    title: "PinPic - 연세대 vs 고려대 사진 투표",
    description: "마음에 드는 사진을 더블탭해서 투표하세요.",
    siteName: "PinPic",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
