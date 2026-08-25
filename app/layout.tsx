import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '纸上日程 · 个人任务手账',
  description: '把要紧的事，安静地做完。一个有纸张温度的个人任务看板。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
