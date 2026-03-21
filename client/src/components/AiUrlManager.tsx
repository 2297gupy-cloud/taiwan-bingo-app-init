import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Edit2, Plus, Link2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function AiUrlManager() {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  // 查詢用戶的 AI 網址列表
  const { data: urls, refetch } = trpc.aiStar.getUrls.useQuery(undefined, {
    staleTime: 30000,
  });

  // 添加 AI 網址 mutation
  const addUrlMutation = trpc.aiStar.addUrl.useMutation({
    onSuccess: () => {
      toast.success("✅ AI 網址已添加");
      setNewName("");
      setNewUrl("");
      setOpen(false);
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

  // 設置默認 AI 網址 mutation
  const setDefaultUrlMutation = trpc.aiStar.setDefaultUrl.useMutation({
    onSuccess: () => {
      toast.success("✅ 默認 AI 網址已設置");
      refetch();
    },
    onError: (error) => {
      toast.error(`❌ 設置失敗：${error.message}`);
    },
  });

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

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultUrlMutation.mutateAsync({ id });
    } catch (error) {
      // 錯誤已在 onError 中處理
    }
  };

  const startEdit = (id: number, name: string, url: string) => {
    setEditingId(id);
    setEditName(name);
    setEditUrl(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="w-4 h-4" />
          AI 網址管理
        </Button>
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
                            disabled={setDefaultUrlMutation.isPending}
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
  );
}
