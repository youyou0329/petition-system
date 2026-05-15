import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '信访工作智能辅助系统',
    template: '%s | 信访工作智能辅助系统',
  },
  description:
    '信访工作智能辅助系统，提供诉求分析、流程指引、文书生成与检查等功能，帮助信访工作人员规范、完整地处理信访件。',
  keywords: [
    '信访工作',
    '智能辅助',
    '诉求分析',
    '文书生成',
    '流程指引',
  ],
  authors: [{ name: '信访工作智能辅助系统' }],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
