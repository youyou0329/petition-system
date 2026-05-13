'use client';

import Link from 'next/link';
import { FileText, FileQuestion, FileCheck, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const adminMenus = [
  {
    title: '用户管理',
    description: '管理系统用户账号和权限',
    icon: Users,
    href: '/admin/users',
    color: 'text-blue-600',
  },
  {
    title: '指引文件',
    description: '管理信访办理指引文件',
    icon: FileText,
    href: '/admin/guidelines',
    color: 'text-green-600',
  },
  {
    title: '文书模板',
    description: '管理各类文书模板',
    icon: FileQuestion,
    href: '/admin/templates',
    color: 'text-orange-600',
  },
  {
    title: '操作日志',
    description: '查看系统操作日志',
    icon: FileCheck,
    href: '/admin/logs',
    color: 'text-purple-600',
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">管理后台</h1>
        <p className="text-muted-foreground">系统管理和配置</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {adminMenus.map((menu) => (
          <Link key={menu.href} href={menu.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{menu.title}</CardTitle>
                <menu.icon className={`h-5 w-5 ${menu.color}`} />
              </CardHeader>
              <CardContent>
                <CardDescription>{menu.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
