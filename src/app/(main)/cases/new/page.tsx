"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const sources = [
  { value: "首问负责制", label: "首问负责制", description: "一般不需要书面答复" },
  { value: "12345热线", label: "12345热线", description: "一般不需要书面答复" },
  { value: "生态环境信访平台", label: "生态环境信访平台", description: "一般不需要书面答复" },
  { value: "信访信息系统", label: "信访信息系统", description: "必须出具文书" },
];

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 表单数据
  const [source, setSource] = useState("");
  const [requiresWrittenResponse, setRequiresWrittenResponse] = useState(false);
  const [showWrittenQuestion, setShowWrittenQuestion] = useState(false);
  const [rawContent, setRawContent] = useState("");
  const [petitionerName, setPetitionerName] = useState("");
  const [petitionerContact, setPetitionerContact] = useState("");

  // 处理来源选择
  const handleSourceChange = (value: string) => {
    setSource(value);
    if (value === "信访信息系统") {
      setRequiresWrittenResponse(true);
      setShowWrittenQuestion(false);
    } else {
      setRequiresWrittenResponse(false);
      setShowWrittenQuestion(true);
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!source) {
      setError("请选择信访来源");
      return;
    }

    if (!rawContent.trim()) {
      setError("请输入信访内容或原文");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          requires_written_response: requiresWrittenResponse,
          raw_content: rawContent,
          petitioner_name: petitionerName || null,
          petitioner_contact: petitionerContact || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "创建失败");
        return;
      }

      // 跳转到第二步：AI 分析
      router.push(`/cases/${data.case.id}/analyze`);
    } catch {
      setError("创建失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">新建信访件</h1>
        <p className="text-muted-foreground">第一步：录入信访基本信息</p>
      </div>

      {/* 进度指示器 */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            1
          </div>
          <span className="ml-2 font-medium">信息录入</span>
        </div>
        <div className="w-16 h-1 bg-slate-200 mx-2" />
        <div className="flex items-center opacity-50">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold">
            2
          </div>
          <span className="ml-2">AI分析</span>
        </div>
        <div className="w-16 h-1 bg-slate-200 mx-2" />
        <div className="flex items-center opacity-50">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold">
            3
          </div>
          <span className="ml-2">流程指引</span>
        </div>
        <div className="w-16 h-1 bg-slate-200 mx-2" />
        <div className="flex items-center opacity-50">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold">
            4
          </div>
          <span className="ml-2">文书模板</span>
        </div>
        <div className="w-16 h-1 bg-slate-200 mx-2" />
        <div className="flex items-center opacity-50">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold">
            5
          </div>
          <span className="ml-2">文书检查</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              信访来源
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    不同来源对应不同的处理流程和文书要求
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>请选择信访件的来源渠道</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={source} onValueChange={handleSourceChange}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sources.map((item) => (
                  <Label
                    key={item.value}
                    htmlFor={item.value}
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      source === item.value ? "border-primary bg-primary/5" : "hover:bg-slate-50"
                    }`}
                  >
                    <RadioGroupItem value={item.value} id={item.value} />
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </Label>
                ))}
              </div>
            </RadioGroup>

            {/* 信访信息系统提示 */}
            {source === "信访信息系统" && (
              <Alert className="mt-4">
                <AlertDescription>
                  <Badge variant="destructive" className="mr-2">重要</Badge>
                  信访信息系统来源需要完整文书流程，系统将引导您完成所有步骤。
                </AlertDescription>
              </Alert>
            )}

            {/* 是否需要书面答复 */}
            {showWrittenQuestion && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-medium mb-3">信访人是否明确要求书面答复？</p>
                <RadioGroup
                  value={requiresWrittenResponse ? "yes" : "no"}
                  onValueChange={(v) => setRequiresWrittenResponse(v === "yes")}
                >
                  <div className="space-y-2">
                    <Label htmlFor="written-yes" className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="written-yes" />
                      是，需要出具投诉/举报事项答复函
                    </Label>
                    <Label htmlFor="written-no" className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="written-no" />
                      否，仅需平台规范答复
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>信访件信息</CardTitle>
            <CardDescription>请填写信访件的基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="petitioner_name">信访人姓名</Label>
                <Input
                  id="petitioner_name"
                  placeholder="请输入信访人姓名"
                  value={petitionerName}
                  onChange={(e) => setPetitionerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="petitioner_contact">联系方式</Label>
                <Input
                  id="petitioner_contact"
                  placeholder="请输入联系方式"
                  value={petitionerContact}
                  onChange={(e) => setPetitionerContact(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="raw_content">
                信访件原文 / 诉求内容 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="raw_content"
                placeholder="请粘贴信访件原文或输入诉求内容..."
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                rows={10}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                支持粘贴完整的信访件原文，系统将自动提取关键信息
              </p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            提交并进入下一步
          </Button>
        </div>
      </form>
    </div>
  );
}
