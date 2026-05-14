"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Check,
  AlertCircle,
  FileText,
  Download,
  Copy,
  ChevronRight,
} from "lucide-react";

interface DocumentData {
  id: string;
  document_type: string;
  content: string;
  created_at: string;
}

interface CaseData {
  id: string;
  case_number: string;
  source: string;
  requires_written_response: boolean;
  current_step: number;
}

const documentTypes = [
  { value: "投诉（举报）处理情况告知书", label: "投诉（举报）处理情况告知书" },
  { value: "信访事项答复意见书", label: "信访事项答复意见书" },
  { value: "受理告知书", label: "受理告知书" },
  { value: "延期办结告知书", label: "延期办结告知书" },
  { value: "不予受理告知书", label: "不予受理告知书" },
];

export default function DocumentPage({
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
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentData | null>(null);
  const [documentType, setDocumentType] = useState("投诉（举报）处理情况告知书");

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
      setDocuments(data.documents || []);
      if (data.documents && data.documents.length > 0) {
        setSelectedDoc(data.documents[0]);
      }
    } catch {
      setError("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
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

      setDocuments([data.document, ...documents]);
      setSelectedDoc(data.document);
    } catch {
      setError("生成失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (selectedDoc) {
      navigator.clipboard.writeText(selectedDoc.content);
    }
  };

  const handleDownload = () => {
    if (selectedDoc) {
      const blob = new Blob([selectedDoc.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDoc.document_type}_${caseData?.case_number || "document"}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleNextStep = () => {
    router.push(`/cases/${id}/check`);
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
        <h1 className="text-2xl font-bold">文书模板</h1>
        <p className="text-muted-foreground">第四步：生成并下载文书模板</p>
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
        <div className="w-16 h-1 bg-primary mx-2" />
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            4
          </div>
          <span className="ml-2 font-medium">文书模板</span>
        </div>
        <div className="w-16 h-1 bg-slate-200 mx-2" />
        <div className="flex items-center opacity-50">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold">
            5
          </div>
          <span className="ml-2">文书检查</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：生成文书 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">生成文书</CardTitle>
            <CardDescription>选择文书类型并生成</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">文书类型</label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="选择文书类型" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  生成文书
                </>
              )}
            </Button>

            {documents.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <label className="text-sm font-medium">已生成的文书</label>
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedDoc?.id === doc.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-slate-50"
                        }`}
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <div className="font-medium text-sm">{doc.document_type}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 右侧：文书预览 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">文书预览</CardTitle>
                <CardDescription>
                  {selectedDoc
                    ? `${selectedDoc.document_type} - ${caseData.case_number}`
                    : "请先生成文书"}
                </CardDescription>
              </div>
              {selectedDoc && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-2" />
                    复制
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    下载
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedDoc ? (
              <div className="bg-white border rounded-lg p-6 min-h-[500px] whitespace-pre-wrap text-sm leading-relaxed font-serif">
                {selectedDoc.content}
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>选择文书类型并点击生成</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={() => router.push(`/cases/${id}/guide`)}>
          返回上一步
        </Button>
        <Button onClick={handleNextStep} disabled={documents.length === 0}>
          进入文书检查
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
