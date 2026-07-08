import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZaimKarta — подбор микрозаймов на карту онлайн",
  description:
    "Сравнение кредитных предложений: займы на карту, срочные займы, первый заем под 0%, условия, сроки и ставки.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
