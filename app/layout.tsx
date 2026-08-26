import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garage Goblin",
  description: "A document-grounded garage copilot for Factory Five Mk5 builders.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
