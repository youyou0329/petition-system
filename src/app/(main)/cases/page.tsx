'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  FileText, 
  Search,
  Eye,
  Edit,
  Calendar,
  User
} from 'lucide-react';

interface PetitionCase {
  id: string;
  case_number: string;
  source: string;
  petitioner_name: string;
  petitioner_contact: string;
  raw_content: string;
  requires_written_reply: boolean;
  status: string;
  created_at: string;
}

const sourceLabels: Record<string, string> = {
  '首问负责制': '首问负责制',
  '12345热线': '12345热线',
  '生态环境平台': '生态环境平台',
  '信访信息系统': '信访信息系统'
};

const statusLabels: Record<string, { label: string; color: string }> = {
  'draft': { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  'analyzing': { label: '分析中', color: 'bg-blue-100 text-blue-800' },
  'confirmed': { label: '已确认', color: 'bg-green-100 text-green-800' },
  'processing': { label: '办理中', color: 'bg-yellow-100 text-yellow-800' },
  'completed': { label: '已完成', color: 'bg-green-100 text-green-800' }
};

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<PetitionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCases();
  }, [sourceFilter, statusFilter]);

  const fetchCases = async () => {
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/cases?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCases(data.cases || []);
      }
    } catch (error) {
      console.error('获取信访件列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => 
    !searchTerm || 
    c.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.petitioner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.raw_content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const truncate = (text: string, length: number) => {
    if (!text) return '-';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">信访件管理</h1>
          <p className="text-muted-foreground mt-1">
            管理所有信访件，查看办理进度
          </p>
        </div>
        <Link href="/cases/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            新建信访件
          </Button>
        </Link>
      </div>

      {/* 筛选条件 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">信访来源：</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部来源</SelectItem>
                  <SelectItem value="首问负责制">首问负责制</SelectItem>
                  <SelectItem value="12345热线">12345热线</SelectItem>
                  <SelectItem value="生态环境平台">生态环境平台</SelectItem>
                  <SelectItem value="信访信息系统">信访信息系统</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">办理状态：</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="analyzing">分析中</SelectItem>
                  <SelectItem value="confirmed">已确认</SelectItem>
                  <SelectItem value="processing">办理中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm font-medium">搜索：</label>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索编号、信访人或内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-md text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 信访件列表 */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            加载中...
          </CardContent>
        </Card>
      ) : filteredCases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">暂无信访件</p>
            <Link href="/cases/new">
              <Button>创建第一个信访件</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-primary">
                        {c.case_number}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {sourceLabels[c.source] || c.source}
                      </Badge>
                      {c.requires_written_reply && (
                        <Badge variant="secondary" className="text-xs">
                          需书面答复
                        </Badge>
                      )}
                      <Badge className={statusLabels[c.status]?.color || 'bg-gray-100'}>
                        {statusLabels[c.status]?.label || c.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {c.petitioner_name || '未知'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(c.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {truncate(c.raw_content, 100)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/cases/${c.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        查看
                      </Button>
                    </Link>
                    <Link href={`/cases/${c.id}/workbench`}>
                      <Button size="sm">
                        进入工作台
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 统计信息 */}
      {filteredCases.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>共 {filteredCases.length} 条记录</span>
              <span>
                需书面答复: {filteredCases.filter(c => c.requires_written_reply).length} 条
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
