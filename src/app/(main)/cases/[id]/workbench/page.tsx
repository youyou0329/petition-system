"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Check,
  AlertCircle,
  FileText,
  ClipboardCopy,
  Download,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowRight,
} from "lucide-react";

interface Appeal {
  id: string;
  content: string;
  type: string;
  confirmed: boolean;
  answer_hint?: string;
}

interface KeyInfo {
  time?: string;
  location?: string;
  departments?: string[];
  events?: string[];
  [key: string]: string | string[] | undefined;
}

interface AnalysisData {
  id: string;
  appeals: Appeal[];
  key_info: KeyInfo;
  user_confirmed: boolean;
}

interface CaseData {
  id: string;
  case_number: string;
  source: string;
  raw_content: string;
  petitioner_name: string | null;
  petitioner_contact: string | null;
  requires_written_reply: boolean;
  status: string;
}

interface ProcessGuide {
  id: string;
  steps: ProcessStep[];
  deadline_reminder: string;
  legal_basis: string;
}

interface ProcessStep {
  step_number: number;
  title: string;
  description: string;
  completed: boolean;
  document_type?: string;
}

// 来源标签映射
const sourceLabels: Record<string, string> = {
  "首问负责制": "首问负责制",
  "12345热线": "12345热线",
  "生态环境平台": "生态环境信访平台",
  "信访信息系统": "信访信息系统",
};

// 时限配置
const deadlineConfig: Record<string, { accept: number; process: number; unit: string }> = {
  "首问负责制": { accept: 0, process: 20, unit: "工作日" },
  "12345热线": { accept: 0, process: 7, unit: "自然日" },
  "生态环境平台": { accept: 15, process: 60, unit: "自然日" },
  "信访信息系统": { accept: 15, process: 60, unit: "日" },
};

export default function WorkbenchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [processGuide, setProcessGuide] = useState<ProcessGuide | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null);
  const [showDocument, setShowDocument] = useState(false);

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
      setProcessGuide(data.processGuide);

      if (data.analysis) {
        setAppeals(data.analysis.appeals || []);
        if (data.analysis.user_confirmed) {
          setCurrentStep(2);
        }
      }

      if (data.processGuide) {
        setCurrentStep(3);
      }
    } catch {
      setError("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  // 开始 AI 分析
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError("");

    try {
      const response = await fetch(`/api/cases/${id}/analyze`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "分析失败");
        return;
      }

      setAnalysis(data.analysis);
      setAppeals(data.analysis.appeals || []);
    } catch {
      setError("分析失败，请稍后重试");
    } finally {
      setAnalyzing(false);
    }
  };

  // 确认诉求
  const handleConfirmAppeals = async () => {
    const confirmedAppeals = appeals.filter((a) => a.confirmed && a.content.trim());
    if (confirmedAppeals.length === 0) {
      setError("请至少确认一个有效诉求");
      return;
    }

    try {
      const response = await fetch(`/api/cases/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appeals: confirmedAppeals,
          key_info: analysis?.key_info || {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "确认失败");
        return;
      }

      // 获取流程指引
      const guideResponse = await fetch(`/api/cases/${id}/guide`, {
        method: "POST",
      });
      const guideData = await guideResponse.json();

      if (guideResponse.ok) {
        setProcessGuide(guideData.guide);
        setCurrentStep(3);
      }
    } catch {
      setError("确认失败，请稍后重试");
    }
  };

  // 生成文书
  const handleGenerateDocument = async (documentType: string) => {
    setGenerating(documentType);
    setError("");

    try {
      const response = await fetch(`/api/cases/${id}/document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_type: documentType }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "生成失败");
        return;
      }

      setGeneratedDocument(data.document.content);
      setShowDocument(true);
    } catch {
      setError("生成失败，请稍后重试");
    } finally {
      setGenerating(null);
    }
  };

  // 复制文书
  const handleCopyDocument = () => {
    if (generatedDocument) {
      navigator.clipboard.writeText(generatedDocument);
    }
  };

  // 计算剩余天数
  const calculateRemainingDays = (days: number) => {
    return days;
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

  const isPetitionSystem = caseData.source === "信访信息系统";
  const needsDocument = isPetitionSystem || caseData.requires_written_reply;
  const deadline = deadlineConfig[caseData.source] || { accept: 0, process: 60, unit: "日" };

  return (
    <div className="max-w-5xl mx-auto pb-8">
      {/* 顶部状态栏 */}
      <div className="bg-card border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold">{caseData.case_number}</span>
              <Badge variant={isPetitionSystem ? "destructive" : "secondary"}>
                {sourceLabels[caseData.source] || caseData.source}
              </Badge>
              {needsDocument && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  需出具文书
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              信访人：{caseData.petitioner_name || "未提供"} |
              状态：<span className="text-primary font-medium">办理中</span>
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="font-medium text-foreground">
                {caseData.source === "信访信息系统" && "收到之日起15日内受理，受理之日起60日内答复"}
                {caseData.source === "首问负责制" && "20个工作日"}
                {caseData.source === "12345热线" && "7个自然日"}
                {caseData.source === "生态环境平台" && "点击受理之日起60个自然日"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center justify-center mb-6 gap-2">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                currentStep >= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {currentStep > step ? <Check className="h-4 w-4" /> : step}
            </div>
            {step < 4 && (
              <div
                className={`w-12 h-0.5 mx-1 ${
                  currentStep > step ? "bg-primary" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* 第1步：AI分析诉求 */}
      {currentStep === 1 && (
        <Card className="mb-6">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              AI 分析诉求要点
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {!analysis ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">需要先进行 AI 分析</p>
                <p className="text-muted-foreground mb-6">
                  AI 将自动提取信访人的核心诉求和关键信息
                </p>
                <Button onClick={handleAnalyze} disabled={analyzing} size="lg">
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      AI 分析中...
                    </>
                  ) : (
                    <>
                      开始 AI 分析
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">AI 已分析完成</span>
                  </div>
                  <p className="text-sm text-green-600">
                    共提取 {appeals.length} 个诉求要点，请逐条确认
                  </p>
                </div>

                {/* 诉求列表 */}
                <div className="space-y-4 mb-6">
                  <h3 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    信访人诉求清单
                  </h3>
                  {appeals.map((appeal, index) => (
                    <div
                      key={appeal.id}
                      className={`border rounded-lg p-4 ${
                        appeal.confirmed ? "bg-green-50 border-green-200" : "bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => {
                            setAppeals(
                              appeals.map((a) =>
                                a.id === appeal.id
                                  ? { ...a, confirmed: !a.confirmed }
                                  : a
                              )
                            );
                          }}
                          className="mt-0.5"
                        >
                          {appeal.confirmed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-slate-400" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-primary">
                              诉求{index + 1}：
                            </span>
                            <Badge variant="outline">{appeal.type}</Badge>
                          </div>
                          <p className="text-sm mb-2">{appeal.content}</p>
                          {appeal.confirmed && (
                            <div className="bg-white border rounded p-2 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">答复要点：</span>
                              针对此诉求，需说明调查情况、处理措施、整改结果
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 关键信息 */}
                <div className="bg-slate-50 border rounded-lg p-4 mb-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    关键信息提取
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {analysis.key_info?.time && (
                      <div>
                        <span className="text-muted-foreground">时间：</span>
                        <span className="font-medium">{analysis.key_info.time}</span>
                      </div>
                    )}
                    {analysis.key_info?.location && (
                      <div>
                        <span className="text-muted-foreground">地点：</span>
                        <span className="font-medium">{analysis.key_info.location}</span>
                      </div>
                    )}
                    {analysis.key_info?.departments && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">涉及部门：</span>
                        <span className="font-medium">
                          {Array.isArray(analysis.key_info.departments)
                            ? analysis.key_info.departments.join("、")
                            : analysis.key_info.departments}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleConfirmAppeals} size="lg">
                    确认诉求，进入下一步
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 第2步：流程指引 */}
      {currentStep === 2 && !processGuide && (
        <Card className="mb-6">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              流程指引
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Button onClick={handleConfirmAppeals}>
              获取流程指引
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 第2/3步：办理步骤和文书 */}
      {currentStep >= 2 && processGuide && (
        <div className="space-y-6">
          {/* 办理要求卡片 */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-bold text-orange-800 mb-2">
                    {sourceLabels[caseData.source]} 办理要求
                  </h3>
                  <div className="text-sm text-orange-700 space-y-1">
                    {caseData.source === "信访信息系统" && (
                      <>
                        <p>• 总体时限：收到之日起<strong>15日内受理</strong>，受理之日起<strong>60日内答复</strong></p>
                        <p>• 必须出具受理告知书和答复意见书</p>
                        <p>• 答复需逐条回应诉求，告知救济途径</p>
                      </>
                    )}
                    {caseData.source === "首问负责制" && (
                      <>
                        <p>• 总体时限：<strong>20个工作日</strong></p>
                        <p>• 答复要体现反映单位全称、是否属实、查处情况、整改完成情况</p>
                      </>
                    )}
                    {caseData.source === "12345热线" && (
                      <>
                        <p>• 总体时限：<strong>7个自然日</strong></p>
                        <p>• 合理诉求尽量解决，不合理诉求解释清楚</p>
                        <p>• 办理情况报送至市局"环境信访"内网账号</p>
                      </>
                    )}
                    {caseData.source === "生态环境平台" && (
                      <>
                        <p>• 总体时限：点击受理之日起<strong>60个自然日内</strong>回复</p>
                        <p>• 关键节点：15日内确认职责并点击受理，不在职责范围2个工作日内回退</p>
                        <p>• 答复要体现反映单位全称、是否属实、查处情况</p>
                        <p>• 需整改的要上传整改前后对比照片</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 办理步骤 */}
          <Card>
            <CardHeader className="bg-blue-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {needsDocument ? 3 : 2}
                </div>
                办理步骤
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {processGuide.steps.map((step, index) => (
                  <div
                    key={step.step_number}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          step.completed
                            ? "bg-green-500 text-white"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {step.completed ? <Check className="h-4 w-4" /> : step.step_number}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{step.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {step.description}
                        </p>

                        {/* 如果是需要生成文书的步骤 */}
                        {step.document_type && !step.completed && (
                          <Button
                            onClick={() => handleGenerateDocument(step.document_type!)}
                            disabled={generating === step.document_type}
                            variant="outline"
                          >
                            {generating === step.document_type ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 mr-2" />
                                生成{step.document_type}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 文书生成区域 */}
          {needsDocument && (
            <Card>
              <CardHeader className="bg-blue-50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    {isPetitionSystem ? 4 : 3}
                  </div>
                  文书生成
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3 mb-6">
                  {isPetitionSystem ? (
                    <>
                      <Button
                        onClick={() => handleGenerateDocument("告知书（受理告知书）")}
                        disabled={generating !== null}
                        variant="outline"
                      >
                        {generating === "告知书（受理告知书）" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        生成受理告知书
                      </Button>
                      <Button
                        onClick={() => handleGenerateDocument("依法履职答复书")}
                        disabled={generating !== null}
                        variant="outline"
                      >
                        {generating === "依法履职答复书" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        生成依法履职答复书
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleGenerateDocument("投诉（举报）处理情况告知书")}
                        disabled={generating !== null}
                        variant="outline"
                      >
                        {generating === "投诉（举报）处理情况告知书" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        生成处理情况告知书
                      </Button>
                      <Button
                        onClick={() => handleGenerateDocument("信访事项受理告知书")}
                        disabled={generating !== null}
                        variant="outline"
                      >
                        {generating === "信访事项受理告知书" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        生成受理告知书
                      </Button>
                      <Button
                        onClick={() => handleGenerateDocument("信访事项不予受理告知书")}
                        disabled={generating !== null}
                        variant="outline"
                      >
                        {generating === "信访事项不予受理告知书" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        生成不予受理告知书
                      </Button>
                      <Button
                        onClick={() => handleGenerateDocument("延期办理告知书")}
                        disabled={generating !== null}
                        variant="outline"
                      >
                        {generating === "延期办理告知书" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        生成延期办理告知书
                      </Button>
                    </>
                  )}
                </div>

                {showDocument && generatedDocument && (
                  <div className="border rounded-lg">
                    <div className="bg-slate-50 border-b px-4 py-2 flex items-center justify-between">
                      <span className="font-medium">文书预览</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopyDocument}>
                          <ClipboardCopy className="h-4 w-4 mr-2" />
                          复制全文
                        </Button>
                      </div>
                    </div>
                    <div className="p-6 bg-white">
                      <pre className="whitespace-pre-wrap font-sans text-sm">
                        {generatedDocument}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 完成按钮 */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => router.push("/cases")}>
              返回列表
            </Button>
            <Button onClick={() => router.push(`/cases/${id}/check`)}>
              进行文书检查
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
