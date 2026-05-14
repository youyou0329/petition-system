"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Check,
  AlertCircle,
  Upload,
  FileText,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
} from "lucide-react";

interface CheckItem {
  category: string;
  item: string;
  status: "pass" | "warning" | "fail";
  message: string;
}

interface CheckResult {
  passed: boolean;
  score: number;
  checks: CheckItem[];
  issues: string[];
  suggestions: string[];
  summary: string;
}

interface CheckData {
  id: string;
  check_result: CheckResult;
  issues: string[];
  suggestions: string[];
  created_at: string;
}

interface CaseData {
  id: string;
  case_number: string;
  source: string;
  requires_written_response: boolean;
  current_step: number;
  status: string;
}

export default function CheckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [checkHistory, setCheckHistory] = useState<CheckData[]>([]);
  const [currentResult, setCurrentResult] = useState<CheckResult | null>(null);
  const [textContent, setTextContent] = useState("");

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
      setCheckHistory(data.checks || []);
    } catch {
      setError("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setChecking(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/cases/${id}/check`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "检查失败");
        return;
      }

      setCurrentResult(data.result);
      setCheckHistory([data.check, ...checkHistory]);
    } catch {
      setError("检查失败，请稍后重试");
    } finally {
      setChecking(false);
    }
  };

  const handleTextCheck = async () => {
    if (!textContent.trim()) {
      setError("请输入文书内容");
      return;
    }

    setChecking(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("content", textContent);

      const response = await fetch(`/api/cases/${id}/check`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "检查失败");
        return;
      }

      setCurrentResult(data.result);
      setCheckHistory([data.check, ...checkHistory]);
    } catch {
      setError("检查失败，请稍后重试");
    } finally {
      setChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">文书检查</h1>
        <p className="text-muted-foreground">第五步：检查文书合规性</p>
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
        <div className="w-16 h-1 bg-green-500 mx-2" />
        <div className="flex items-center opacity-50">
          <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
            <Check className="h-5 w-5" />
          </div>
          <span className="ml-2">流程指引</span>
        </div>
        <div className="w-16 h-1 bg-green-500 mx-2" />
        <div className="flex items-center opacity-50">
          <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
            <Check className="h-5 w-5" />
          </div>
          <span className="ml-2">文书模板</span>
        </div>
        <div className="w-16 h-1 bg-primary mx-2" />
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            5
          </div>
          <span className="ml-2 font-medium">文书检查</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 检查标准说明 */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
            检查标准
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caseData.source === "信访信息系统" || caseData.requires_written_response ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-800">本信访件需出具正式文书，检查标准：</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>是否针对诉求<strong>逐一答复</strong></li>
                <li>措辞是否得当、通俗易懂</li>
                <li>是否体现反映单位全称、问题是否属实、现场查处情况、处理措施</li>
                <li>是否包含<strong>救济途径告知</strong>（复议/诉讼权利和时限）</li>
                <li>格式是否规范（标题、编号、落款、日期等）</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-800">本信访件无需出具正式文书，检查标准：</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>是否针对诉求<strong>逐一答复</strong></li>
                <li>措辞是否得当、通俗易懂，不可敷衍了事、语句不通、晦涩难懂</li>
                <li>是否体现反映单位<strong>规范全称</strong></li>
                <li>是否说明<strong>问题是否属实</strong></li>
                <li>是否说明<strong>现场查处情况及采取的措施</strong></li>
                <li>是否说明<strong>是否整改完成</strong></li>
                <li>如需整改，是否上传整改前后对比照片</li>
                <li>如不在职责范围，是否明确描述核查情况及依据</li>
              </ul>
              <p className="text-xs text-orange-600 mt-3">
                ⚠️ 只有信访人提出经济赔偿等诉求时，才需要检查是否提供救济途径告知
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：上传文书 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">上传文书</CardTitle>
            <CardDescription>
              上传已制作好的文书进行检查
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 文件上传 */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.doc,.docx,.pdf"
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full h-24 border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={checking}
              >
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <span>点击上传文书文件</span>
                  <span className="block text-xs text-muted-foreground mt-1">
                    支持 txt、doc、docx 格式
                  </span>
                </div>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  或者
                </span>
              </div>
            </div>

            {/* 文本输入 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">粘贴文书内容</label>
              <Textarea
                placeholder="将文书内容粘贴到此处进行检查..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={8}
              />
              <Button
                onClick={handleTextCheck}
                disabled={checking || !textContent.trim()}
                className="w-full"
              >
                {checking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    检查中...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    开始检查
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 右侧：检查结果 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">检查结果</CardTitle>
            <CardDescription>
              {currentResult
                ? `综合评分：${currentResult.score}分`
                : "上传文书后显示检查结果"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentResult ? (
              <div className="space-y-6">
                {/* 评分 */}
                <div className="text-center">
                  <div
                    className={`text-5xl font-bold ${getScoreColor(
                      currentResult.score
                    )}`}
                  >
                    {currentResult.score}
                  </div>
                  <Progress value={currentResult.score} className="mt-2" />
                  <div className="mt-2">
                    <Badge
                      variant={currentResult.passed ? "default" : "destructive"}
                    >
                      {currentResult.passed ? "检查通过" : "存在问题"}
                    </Badge>
                  </div>
                </div>

                {/* 检查项详情 */}
                <div className="space-y-3">
                  {currentResult.checks.map((check, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg"
                    >
                      {getStatusIcon(check.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {check.item}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {check.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {check.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 问题列表 */}
                {currentResult.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-red-600">
                      发现问题
                    </h4>
                    <ul className="space-y-1">
                      {currentResult.issues.map((issue, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 改进建议 */}
                {currentResult.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-blue-600">
                      改进建议
                    </h4>
                    <ul className="space-y-1">
                      {currentResult.suggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground"
                        >
                          {index + 1}. {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 整体评价 */}
                <Alert>
                  <AlertDescription className="text-sm">
                    {currentResult.summary}
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>上传文书文件或粘贴内容</p>
                  <p className="text-xs mt-1">系统将自动检查程序、格式、内容</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 检查历史 */}
      {checkHistory.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">检查历史</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checkHistory.map((check, index) => (
                <div
                  key={check.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        check.check_result.passed ? "default" : "destructive"
                      }
                    >
                      {check.check_result.score}分
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(check.created_at).toLocaleString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentResult(check.check_result)}
                  >
                    查看详情
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => router.push(`/cases/${id}/document`)}
        >
          返回上一步
        </Button>
        <Button
          onClick={() => router.push(`/cases/${id}`)}
          disabled={!currentResult?.passed}
        >
          完成办理
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
