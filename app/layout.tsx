import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const brandFont = Barlow_Condensed({
  variable: "--font-garage-brand",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Garage Goblin",
  description: "A document-grounded garage copilot for Factory Five Mk5 builders.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={brandFont.variable}>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
