"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

interface CaseData {
  id: string;
  case_number: string;
  source: string;
  raw_content: string;
  petitioner_name: string | null;
  petitioner_contact: string | null;
  requires_written_response: boolean;
}

const sourceOptions = [
  { value: "首问负责制", label: "首问负责制" },
  { value: "12345热线", label: "12345热线" },
  { value: "生态环境信访平台", label: "生态环境信访平台" },
  { value: "信访信息系统", label: "信访信息系统" },
];

export default function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    source: "",
    raw_content: "",
    petitioner_name: "",
    petitioner_contact: "",
    requires_written_response: false,
  });

  useEffect(() => {
    fetchCase();
  }, [id]);

  const fetchCase = async () => {
    try {
      const response = await fetch(`/api/cases/${id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "获取数据失败");
        return;
      }

      setFormData({
        source: data.case.source,
        raw_content: data.case.raw_content,
        petitioner_name: data.case.petitioner_name || "",
        petitioner_contact: data.case.petitioner_contact || "",
        requires_written_response: data.case.requires_written_response,
      });
    } catch {
      setError("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/cases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "保存失败");
        return;
      }

      router.push(`/cases/${id}/analyze`);
    } catch {
      setError("保存失败，请稍后重试");
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

  const isXinfangSystem = formData.source === "信访信息系统";
  const isOtherSource = formData.source && !isXinfangSystem;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">编辑信访信息</h1>
        <p className="text-muted-foreground">修改信访件基本信息</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>信访信息</CardTitle>
            <CardDescription>请填写信访件的基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 信访来源 */}
            <div className="space-y-2">
              <Label htmlFor="source">信访来源 *</Label>
              <Select
                value={formData.source}
                onValueChange={(value) =>
                  setFormData({ ...formData, source: value, requires_written_response: false })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择信访来源" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 书面答复判断 */}
            {isXinfangSystem && (
              <Alert>
                <AlertDescription>
                  <strong>信访信息系统</strong> 的信访件需要完整文书流程，系统将引导您完成所有步骤。
                </AlertDescription>
              </Alert>
            )}

            {isOtherSource && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                <Label>信访人是否明确要求书面答复？</Label>
                <RadioGroup
                  value={formData.requires_written_response ? "yes" : "no"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, requires_written_response: value === "yes" })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="no" />
                    <Label htmlFor="no" className="font-normal">
                      否，仅需平台规范答复
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="yes" />
                    <Label htmlFor="yes" className="font-normal">
                      是，需要出具投诉/举报事项答复函
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* 信访人姓名 */}
              <div className="space-y-2">
                <Label htmlFor="petitioner_name">信访人姓名</Label>
                <Input
                  id="petitioner_name"
                  value={formData.petitioner_name}
                  onChange={(e) =>
                    setFormData({ ...formData, petitioner_name: e.target.value })
                  }
                  placeholder="输入信访人姓名"
                />
              </div>

              {/* 联系方式 */}
              <div className="space-y-2">
                <Label htmlFor="petitioner_contact">联系方式</Label>
                <Input
                  id="petitioner_contact"
                  value={formData.petitioner_contact}
                  onChange={(e) =>
                    setFormData({ ...formData, petitioner_contact: e.target.value })
                  }
                  placeholder="输入联系方式"
                />
              </div>
            </div>

            {/* 信访件原文 */}
            <div className="space-y-2">
              <Label htmlFor="raw_content">信访件原文 *</Label>
              <Textarea
                id="raw_content"
                value={formData.raw_content}
                onChange={(e) =>
                  setFormData({ ...formData, raw_content: e.target.value })
                }
                placeholder="粘贴信访件原文内容..."
                rows={10}
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/cases/${id}`)}
          >
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                保存并继续
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
