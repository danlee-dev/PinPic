import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  title: "제1회 사진 고연전 - 어느 캠퍼스가 더 낭만적인가?",
  description: "연세대 vs 고려대, 투표하고 우리 학교를 응원하세요!",
  openGraph: {
    title: "제1회 사진 고연전 - 어느 캠퍼스가 더 낭만적인가?",
    description: "연세대 vs 고려대, 투표하고 우리 학교를 응원하세요!",
    siteName: "PinPic",
    type: "website",
    images: [{ url: "/poster.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "제1회 사진 고연전 - 어느 캠퍼스가 더 낭만적인가?",
    description: "연세대 vs 고려대, 투표하고 우리 학교를 응원하세요!",
    images: ["/poster.png"],
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
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}</Script>
          </>
        )}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
