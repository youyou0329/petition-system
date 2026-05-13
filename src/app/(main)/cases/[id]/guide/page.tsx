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
  Check,
  AlertCircle,
  Clock,
  FileText,
  ChevronRight,
} from "lucide-react";

interface GuideStep {
  step: number;
  title: string;
  description: string;
  deadline?: string;
  completed: boolean;
}

interface Regulation {
  name: string;
  article: string;
  content: string;
}

interface GuideData {
  id: string;
  steps: GuideStep[];
  regulations: Regulation[];
}

interface CaseData {
  id: string;
  case_number: string;
  source: string;
  requires_written_response: boolean;
  status: string;
  current_step: number;
}

interface AnalysisData {
  appeals: Array<{ id: string; content: string; type: string; confirmed: boolean }>;
  key_info: Record<string, string | string[] | undefined>;
}

export default function GuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [guide, setGuide] = useState<GuideData | null>(null);

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
      setGuide(data.guide);
    } catch {
      setError("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateGuide = async () => {
    setGenerating(true);
    setError("");

    try {
      const response = await fetch(`/api/cases/${id}/guide`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "生成失败");
        return;
      }

      setGuide(data.guide);
    } catch {
      setError("生成失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  };

  const handleNextStep = () => {
    // 判断流程模式
    const hasWrittenResponse =
      caseData?.requires_written_response || caseData?.source === "信访信息系统";

    if (hasWrittenResponse) {
      router.push(`/cases/${id}/document`);
    } else {
      // 简化流程，直接完成
      router.push(`/cases/${id}`);
    }
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

  const hasWrittenResponse =
    caseData.requires_written_response || caseData.source === "信访信息系统";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">流程指引</h1>
        <p className="text-muted-foreground">第三步：查看办理流程与法规依据</p>
      </div>

      {/* 进度指示器 */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center opacity-50">
          <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
            <Check className="h-5 w-5" />
          </div>
          <span className="ml-2">信息录入</span>
        </div>
        <div className="w-16 h-1 bg-green-500 mx-2" />
        <div className="flex items-center opacity-50">
          <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
            <Check className="h-5 w-5" />
          </div>
          <span className="ml-2">AI分析</span>
        </div>
        <div className="w-16 h-1 bg-primary mx-2" />
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            3
          </div>
          <span className="ml-2 font-medium">流程指引</span>
        </div>
        <div className="w-16 h-1 bg-slate-200 mx-2" />
        <div className={`flex items-center ${hasWrittenResponse ? "opacity-50" : "opacity-30"}`}>
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold">
            4
          </div>
          <span className="ml-2">文书模板</span>
        </div>
        <div className="w-16 h-1 bg-slate-200 mx-2" />
        <div className={`flex items-center ${hasWrittenResponse ? "opacity-50" : "opacity-30"}`}>
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold">
            5
          </div>
          <span className="ml-2">文书检查</span>
        </div>
      </div>

      {/* 流程模式说明 */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-2">
            <Badge variant={hasWrittenResponse ? "default" : "secondary"}>
              {hasWrittenResponse ? "标准流程" : "简化流程"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {hasWrittenResponse
                ? "此信访件需要完整文书流程，系统将引导您完成所有步骤"
                : "此信访件仅需平台规范答复，完成流程指引即可"}
            </span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 生成按钮 */}
      {!guide && (
        <Card className="mb-6">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              点击下方按钮生成详细的办理流程指引
            </p>
            <Button onClick={handleGenerateGuide} disabled={generating} size="lg">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  生成流程指引
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 流程指引内容 */}
      {guide && (
        <>
          {/* 诉求要点回顾 */}
          {analysis && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">诉求要点</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.appeals
                    .filter((a) => a.confirmed)
                    .map((appeal, index) => (
                      <div key={appeal.id} className="flex items-start gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span>{appeal.content}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 办理流程 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>办理流程</CardTitle>
              <CardDescription>请按以下步骤办理信访事项</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {guide.steps.map((step, index) => (
                  <div key={step.step}>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                        {step.step}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{step.title}</h3>
                          {step.deadline && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {step.deadline}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {index < guide.steps.length - 1 && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90 ml-1.5 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 法规依据 */}
          {guide.regulations && guide.regulations.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>法规依据</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {guide.regulations.map((reg, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-lg">
                      <div className="font-medium">
                        {reg.name} {reg.article}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {reg.content}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push(`/cases/${id}/analyze`)}
            >
              返回上一步
            </Button>
            <Button onClick={handleNextStep}>
              {hasWrittenResponse ? "生成文书模板" : "完成"}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
