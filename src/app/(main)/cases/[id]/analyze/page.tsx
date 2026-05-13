"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface Appeal {
  id: string;
  content: string;
  type: string;
  confirmed: boolean;
  user_modified: boolean;
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
  ai_raw_response: string;
  user_confirmed: boolean;
}

interface CaseData {
  id: string;
  case_number: string;
  source: string;
  raw_content: string;
  petitioner_name: string | null;
}

const appealTypeLabels: Record<string, string> = {
  "咨询类": "咨询类",
  "投诉类": "投诉类",
  "建议类": "建议类",
  "求助类": "求助类",
  "其他": "其他",
};

export default function AnalyzePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [keyInfo, setKeyInfo] = useState<KeyInfo>({});
  const [editingAppeal, setEditingAppeal] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

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

      if (data.analysis) {
        setAppeals(data.analysis.appeals || []);
        setKeyInfo(data.analysis.key_info || {});
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
      setKeyInfo(data.analysis.key_info || {});
    } catch {
      setError("分析失败，请稍后重试");
    } finally {
      setAnalyzing(false);
    }
  };

  // 编辑诉求
  const startEditAppeal = (appeal: Appeal) => {
    setEditingAppeal(appeal.id);
    setEditContent(appeal.content);
  };

  const saveEditAppeal = (appealId: string) => {
    setAppeals(
      appeals.map((a) =>
        a.id === appealId
          ? { ...a, content: editContent, user_modified: true }
          : a
      )
    );
    setEditingAppeal(null);
    setEditContent("");
  };

  const cancelEdit = () => {
    setEditingAppeal(null);
    setEditContent("");
  };

  // 删除诉求
  const deleteAppeal = (appealId: string) => {
    setAppeals(appeals.filter((a) => a.id !== appealId));
  };

  // 添加诉求
  const addAppeal = () => {
    const newAppeal: Appeal = {
      id: `appeal_${Date.now()}`,
      content: "",
      type: "其他",
      confirmed: true,
      user_modified: true,
    };
    setAppeals([...appeals, newAppeal]);
    setEditingAppeal(newAppeal.id);
    setEditContent("");
  };

  // 切换诉求确认状态
  const toggleAppealConfirmed = (appealId: string) => {
    setAppeals(
      appeals.map((a) =>
        a.id === appealId ? { ...a, confirmed: !a.confirmed } : a
      )
    );
  };

  // 更新关键信息
  const updateKeyInfo = (field: string, value: string | string[]) => {
    setKeyInfo({ ...keyInfo, [field]: value });
  };

  // 提交确认
  const handleConfirm = async () => {
    // 检查是否有确认的诉求
    const confirmedAppeals = appeals.filter((a) => a.confirmed && a.content.trim());
    if (confirmedAppeals.length === 0) {
      setError("请至少确认一个有效诉求");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/cases/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appeals: confirmedAppeals,
          key_info: keyInfo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "确认失败");
        return;
      }

      // 跳转到第三步
      router.push(`/cases/${id}/guide`);
    } catch {
      setError("确认失败，请稍后重试");
    } finally {
      setSaving(false);
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI 诉求分析</h1>
        <p className="text-muted-foreground">第二步：分析信访诉求并确认要点</p>
      </div>

      {/* 进度指示器 */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center opacity-50">
          <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
            <Check className="h-5 w-5" />
          </div>
          <span className="ml-2">信息录入</span>
        </div>
        <div className="w-16 h-1 bg-primary mx-2" />
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            2
          </div>
          <span className="ml-2 font-medium">AI分析</span>
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

      {/* 信访件基本信息 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">信访件信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">编号：</span>
              <span className="font-medium">{caseData.case_number}</span>
            </div>
            <div>
              <span className="text-muted-foreground">来源：</span>
              <span className="font-medium">{caseData.source}</span>
            </div>
            <div>
              <span className="text-muted-foreground">信访人：</span>
              <span className="font-medium">{caseData.petitioner_name || "-"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分析按钮 */}
      {!analysis && (
        <Card className="mb-6">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              点击下方按钮开始 AI 分析，系统将自动提取信访诉求和关键信息
            </p>
            <Button onClick={handleAnalyze} disabled={analyzing} size="lg">
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  开始 AI 分析
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 分析结果 */}
      {analysis && (
        <>
          {/* 诉求列表 */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>信访人核心诉求</CardTitle>
                  <CardDescription>以下为 AI 提取的诉求，请确认或修改</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? "animate-spin" : ""}`} />
                    重新分析
                  </Button>
                  <Button variant="outline" size="sm" onClick={addAppeal}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加诉求
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {appeals.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">暂无诉求，请添加</p>
              ) : (
                appeals.map((appeal, index) => (
                  <div
                    key={appeal.id}
                    className={`p-4 border rounded-lg ${
                      !appeal.confirmed ? "opacity-50 bg-slate-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          checked={appeal.confirmed}
                          onChange={() => toggleAppealConfirmed(appeal.id)}
                          className="h-4 w-4"
                        />
                        <span className="font-medium">{index + 1}.</span>
                      </div>
                      <div className="flex-1">
                        {editingAppeal === appeal.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              placeholder="请输入诉求内容"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveEditAppeal(appeal.id)}
                                disabled={!editContent.trim()}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                保存
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                              >
                                <X className="h-4 w-4 mr-1" />
                                取消
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className={appeal.content ? "" : "text-muted-foreground"}>
                              {appeal.content || "请输入诉求内容"}
                            </p>
                            {appeal.user_modified && (
                              <Badge variant="outline" className="mt-1">
                                已修改
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="mt-2">
                          <Badge variant="secondary">
                            {appealTypeLabels[appeal.type] || appeal.type}
                          </Badge>
                        </div>
                      </div>
                      {editingAppeal !== appeal.id && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditAppeal(appeal)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAppeal(appeal.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 关键信息 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>关键信息提取</CardTitle>
              <CardDescription>请核实以下信息是否准确</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">相关时间</label>
                  <Input
                    value={keyInfo.time || ""}
                    onChange={(e) => updateKeyInfo("time", e.target.value)}
                    placeholder="请输入相关时间"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">相关地点</label>
                  <Input
                    value={keyInfo.location || ""}
                    onChange={(e) => updateKeyInfo("location", e.target.value)}
                    placeholder="请输入相关地点"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">涉及部门</label>
                <Input
                  value={(keyInfo.departments || []).join("、")}
                  onChange={(e) =>
                    updateKeyInfo(
                      "departments",
                      e.target.value.split("、").filter(Boolean)
                    )
                  }
                  placeholder="多个部门用顿号分隔"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">事件经过</label>
                <Textarea
                  value={(keyInfo.events || []).join("\n")}
                  onChange={(e) =>
                    updateKeyInfo(
                      "events",
                      e.target.value.split("\n").filter(Boolean)
                    )
                  }
                  placeholder="每行一个要点"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 提交按钮 */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => router.push(`/cases/${id}`)}>
              返回
            </Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认无误，进入下一步
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
