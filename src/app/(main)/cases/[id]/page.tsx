"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  Check,
  Edit,
  FileText,
  ClipboardList,
  MessageSquare,
} from "lucide-react";

interface CaseData {
  id: string;
  case_number: string;
  source: string;
  raw_content: string;
  petitioner_name: string | null;
  petitioner_contact: string | null;
  requires_written_response: boolean;
  current_step: number;
  status: string;
  created_at: string;
}

interface AnalysisData {
  id: string;
  appeals: Array<{ id: string; content: string; type: string; confirmed: boolean }>;
  key_info: Record<string, string | string[] | undefined>;
  confirmed_at: string | null;
}

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/cases/${id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "获取数据失败");
        return;
      }

      setCaseData(data.case);
      setAnalysis(data.analysis);
    } catch {
      setError("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">草稿</Badge>;
      case "pending":
        return <Badge variant="outline">待处理</Badge>;
      case "processing":
        return <Badge variant="default">处理中</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500">已完成</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      "首问负责制": "首问负责制",
      "12345热线": "12345热线",
      "生态环境信访平台": "生态环境信访平台",
      "信访信息系统": "信访信息系统",
    };
    return labels[source] || source;
  };

  const getCurrentStepInfo = () => {
    if (!caseData) return { step: 1, label: "信息录入", href: `/cases/${id}/workbench` };

    const hasWrittenResponse =
      caseData.requires_written_response || caseData.source === "信访信息系统";

    // 所有步骤都跳转到工作台
    return { step: caseData.current_step, label: "工作台", href: `/cases/${id}/workbench` };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>信访件不存在或无权限查看</AlertDescription>
      </Alert>
    );
  }

  const stepInfo = getCurrentStepInfo();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">信访件详情</h1>
          <p className="text-muted-foreground">{caseData.case_number}</p>
        </div>
        {getStatusBadge(caseData.status)}
      </div>

      {/* 流程状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">办理进度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {[
              { step: 1, label: "信息录入", icon: <Edit className="h-4 w-4" /> },
              { step: 2, label: "AI分析", icon: <MessageSquare className="h-4 w-4" /> },
              { step: 3, label: "流程指引", icon: <ClipboardList className="h-4 w-4" /> },
              { step: 4, label: "文书模板", icon: <FileText className="h-4 w-4" /> },
              { step: 5, label: "文书检查", icon: <Check className="h-4 w-4" /> },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div
                  className={`flex flex-col items-center ${
                    caseData.current_step >= item.step
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      caseData.current_step >= item.step
                        ? "bg-primary text-primary-foreground"
                        : "bg-slate-100"
                    }`}
                  >
                    {caseData.current_step > item.step ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      item.icon
                    )}
                  </div>
                  <span className="text-xs mt-2">{item.label}</span>
                </div>
                {index < 4 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      caseData.current_step > item.step
                        ? "bg-primary"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {caseData.status !== "completed" && (
            <div className="mt-6 pt-4 border-t">
              <Button size="lg" onClick={() => router.push(`/cases/${id}/workbench`)}>
                📋 进入工作台办理
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                点击进入工作台，按步骤完成办理
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">信访编号</label>
              <p className="font-medium">{caseData.case_number}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">信访来源</label>
              <p className="font-medium">{getSourceLabel(caseData.source)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">信访人</label>
              <p className="font-medium">{caseData.petitioner_name || "未填写"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">联系方式</label>
              <p className="font-medium">{caseData.petitioner_contact || "未填写"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">是否需要书面答复</label>
              <p className="font-medium">
                {caseData.requires_written_response || caseData.source === "信访信息系统"
                  ? "是"
                  : "否"}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">创建时间</label>
              <p className="font-medium">
                {new Date(caseData.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <label className="text-sm text-muted-foreground">信访件原文</label>
            <div className="mt-2 p-4 bg-slate-50 rounded-lg text-sm whitespace-pre-wrap">
              {caseData.raw_content}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI分析结果 */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">诉求分析结果</CardTitle>
            <CardDescription>
              {analysis.confirmed_at
                ? `已确认于 ${new Date(analysis.confirmed_at).toLocaleString()}`
                : "待确认"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">诉求要点</label>
                <div className="mt-2 space-y-2">
                  {analysis.appeals
                    .filter((a) => a.confirmed)
                    .map((appeal, index) => (
                      <div key={appeal.id} className="flex items-start gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="text-sm">{appeal.content}</span>
                      </div>
                    ))}
                </div>
              </div>

              {analysis.key_info && Object.keys(analysis.key_info).length > 0 && (
                <div>
                  <label className="text-sm font-medium">关键信息</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {Object.entries(analysis.key_info).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="text-muted-foreground">{key}：</span>
                        <span>{Array.isArray(value) ? value.join("、") : value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
