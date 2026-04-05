import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  title: "PinPic - 연세대 vs 고려대 사진 투표",
  description: "투표하고 우리 학교를 응원하세요. 연세대 vs 고려대, 당신의 선택은?",
  openGraph: {
    title: "PinPic - 연세대 vs 고려대 사진 투표",
    description: "투표하고 우리 학교를 응원하세요.",
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
