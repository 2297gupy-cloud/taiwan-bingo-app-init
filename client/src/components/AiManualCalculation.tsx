import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Brain, ChevronDown, ExternalLink, Settings, Trash2, Edit2, Plus, Link2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function AiManualCalculation() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  // 查詢用戶的 AI 網址列表
  const { data: urls, refetch } = trpc.aiStar.getUrls.useQuery(undefined, {
    staleTime: 30000,
  });

  // 設置默認 AI 網址 mutation
  const setDefaultMutation = trpc.aiStar.setDefaultUrl.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("✅ 已設置為默認 AI 網址");
    },
    onError: () => {
      toast.error("❌ 設置失敗");
    },
  });

  // 添加 AI 網址 mutation
  const addUrlMutation = trpc.aiStar.addUrl.useMutation({
    onSuccess: () => {
      toast.success("✅ AI 網址已添加");
      setNewName("");
      setNewUrl("");
      refetch();
    },
    onError: (error) => {
      toast.error(`❌ 添加失敗：${error.message}`);
    },
  });

  // 更新 AI 網址 mutation
  const updateUrlMutation = trpc.aiStar.updateUrl.useMutation({
    onSuccess: () => {
      toast.success("✅ AI 網址已更新");
      setEditingId(null);
      setEditName("");
      setEditUrl("");
      refetch();
    },
    onError: (error) => {
      toast.error(`❌ 更新失敗：${error.message}`);
    },
  });

  // 刪除 AI 網址 mutation
  const deleteUrlMutation = trpc.aiStar.deleteUrl.useMutation({
    onSuccess: () => {
      toast.success("✅ AI 網址已刪除");
      refetch();
    },
    onError: (error) => {
      toast.error(`❌ 刪除失敗：${error.message}`);
    },
  });

  // 默認 AI 網址（如果沒有設置，使用 Gemini）
  const defaultUrl = "https://gemini.google.com/app/a35bb8c4886f6949";
  const defaultName = "Gemini";

  // 找到默認網址
  const defaultAiUrl = urls?.find(u => u.isDefault === 1);
  const currentUrl = defaultAiUrl?.url || defaultUrl;
  const currentName = defaultAiUrl?.name || defaultName;

  const handleOpenUrl = (url: string) => {
    window.open(url, "_blank");
    setIsDropdownOpen(false);
  };

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultMutation.mutateAsync({ id });
    } catch (error) {
      // 錯誤已在 onError 中處理
    }
  };

  const handleAddUrl = async () => {
    if (!newName.trim() || !newUrl.trim()) {
      toast.error("❌ 請填寫網址名稱和 URL");
      return;
    }
    try {
      await addUrlMutation.mutateAsync({ name: newName, url: newUrl });
    } catch (error) {
      // 錯誤已在 onError 中處理
    }
  };

  const handleUpdateUrl = async (id: number) => {
    if (!editName.trim() || !editUrl.trim()) {
      toast.error("❌ 請填寫網址名稱和 URL");
      return;
    }
    try {
      await updateUrlMutation.mutateAsync({ id, name: editName, url: editUrl });
    } catch (error) {
      // 錯誤已在 onError 中處理
    }
  };

  const handleDeleteUrl = async (id: number) => {
    if (confirm("確定要刪除此 AI 網址嗎？")) {
      try {
        await deleteUrlMutation.mutateAsync({ id });
      } catch (error) {
        // 錯誤已在 onError 中處理
      }
    }
  };

  const startEdit = (id: number, name: string, url: string) => {
    setEditingId(id);
    setEditName(name);
    setEditUrl(url);
  };

  return (
    <div className="flex items-center gap-1">
      {/* AI 手動計算 + 快速切換下拉選單 */}
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-[10px] px-2 py-0.5 h-auto bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40"
            title={`當前 AI：${currentName}`}
          >
            <Brain className="w-3 h-3" />
            <span className="truncate max-w-[80px]">AI手動網址</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">AI 手動計算 - 快速切換</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* 默認 Gemini 選項 */}
          <DropdownMenuItem
            onClick={() => handleOpenUrl(defaultUrl)}
            className="flex items-center justify-between text-xs"
          >
            <span className="flex-1">{defaultName}</span>
            <ExternalLink className="w-3 h-3 ml-2" />
          </DropdownMenuItem>

          {/* 用戶保存的網址 */}
          {urls && urls.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                已保存的網址
              </DropdownMenuLabel>
              {urls.map((url) => (
                <div key={url.id} className="flex items-center gap-1 px-2 py-1.5 hover:bg-accent rounded">
                  <button
                    onClick={() => handleOpenUrl(url.url)}
                    className="flex-1 text-left text-xs hover:text-blue-400 transition-colors truncate"
                    title={url.url}
                  >
                    {url.name}
                  </button>
                  {url.isDefault === 1 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                      默認
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* 管理網址選項 */}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            管理
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="w-full text-left text-xs px-2 py-1.5 hover:bg-accent rounded flex items-center gap-2">
                  <Settings className="w-3 h-3" />
                  <span>編輯網址</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>AI 網址管理</DialogTitle>
                </DialogHeader>

                {/* 添加新網址 */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold text-sm">添加新的 AI 網址</h3>
                  <div className="space-y-2">
                    <Input
                      placeholder="網址名稱（例如：ChatGPT）"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <Input
                      placeholder="完整 URL（例如：https://chat.openai.com）"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      type="url"
                    />
                    <Button
                      onClick={handleAddUrl}
                      disabled={addUrlMutation.isPending}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {addUrlMutation.isPending ? "添加中..." : "添加"}
                    </Button>
                  </div>
                </div>

                {/* 已保存的網址列表 */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">已保存的 AI 網址</h3>
                  {!urls || urls.length === 0 ? (
                    <p className="text-sm text-muted-foreground">還沒有保存任何 AI 網址</p>
                  ) : (
                    <div className="space-y-2">
                      {urls.map((url) => (
                        <div key={url.id} className="border rounded-lg p-3 space-y-2">
                          {editingId === url.id ? (
                            // 編輯模式
                            <div className="space-y-2">
                              <Input
                                placeholder="網址名稱"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                              />
                              <Input
                                placeholder="完整 URL"
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                                type="url"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateUrl(url.id)}
                                  disabled={updateUrlMutation.isPending}
                                >
                                  {updateUrlMutation.isPending ? "保存中..." : "保存"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingId(null)}
                                >
                                  取消
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // 顯示模式
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">{url.name}</p>
                                    {url.isDefault === 1 && (
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground break-all">{url.url}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {url.isDefault === 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSetDefault(url.id)}
                                    disabled={setDefaultMutation.isPending}
                                  >
                                    設為默認
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEdit(url.id, url.name, url.url)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteUrl(url.id)}
                                  disabled={deleteUrlMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => window.open(url.url, "_blank")}
                                >
                                  打開
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
