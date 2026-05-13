"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface PetitionCase {
  id: string;
  case_number: string;
  source: string;
  status: string;
  current_step: number;
  petitioner_name: string | null;
  created_at: string;
}

const sourceLabels: Record<string, string> = {
  "首问负责制": "首问负责制",
  "12345热线": "12345热线",
  "生态环境信访平台": "生态环境信访平台",
  "信访信息系统": "信访信息系统",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "待处理", color: "bg-gray-500" },
  analyzing: { label: "AI分析中", color: "bg-blue-500" },
  confirmed: { label: "已确认", color: "bg-green-500" },
  processing: { label: "处理中", color: "bg-yellow-500" },
  completed: { label: "已完成", color: "bg-green-600" },
};

export default function DashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<PetitionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
  });

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await fetch("/api/cases");
      const data = await response.json();
      setCases(data.cases || []);
      
      // 计算统计数据
      const total = data.cases?.length || 0;
      const pending = data.cases?.filter((c: PetitionCase) => c.status === "pending").length || 0;
      const processing = data.cases?.filter((c: PetitionCase) => 
        ["analyzing", "confirmed", "processing"].includes(c.status)
      ).length || 0;
      const completed = data.cases?.filter((c: PetitionCase) => c.status === "completed").length || 0;
      
      setStats({ total, pending, processing, completed });
    } catch (error) {
      console.error("获取信访件列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewCase = () => {
    router.push("/cases/new");
  };

  const handleViewCase = (caseId: string) => {
    router.push(`/cases/${caseId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">工作台</h1>
        <Button onClick={handleNewCase}>
          <Plus className="h-4 w-4 mr-2" />
          新建信访件
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总计
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              待处理
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              处理中
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              已完成
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* 最近信访件 */}
      <Card>
        <CardHeader>
          <CardTitle>最近信访件</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : cases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无信访件，点击&quot;新建信访件&quot;开始处理
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>信访编号</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>信访人</TableHead>
                  <TableHead>当前步骤</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.case_number}</TableCell>
                    <TableCell>{sourceLabels[caseItem.source] || caseItem.source}</TableCell>
                    <TableCell>{caseItem.petitioner_name || "-"}</TableCell>
                    <TableCell>第 {caseItem.current_step} 步</TableCell>
                    <TableCell>
                      <Badge className={`${statusLabels[caseItem.status]?.color || "bg-gray-500"} text-white`}>
                        {statusLabels[caseItem.status]?.label || caseItem.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(caseItem.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewCase(caseItem.id)}
                      >
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
