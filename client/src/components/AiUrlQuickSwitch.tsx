import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ExternalLink, Settings } from "lucide-react";
import { toast } from "sonner";

export function AiUrlQuickSwitch() {
  const [isOpen, setIsOpen] = useState(false);

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

  // 默認 AI 網址（如果沒有設置，使用 Gemini）
  const defaultUrl = "https://gemini.google.com/app/a35bb8c4886f6949";
  const defaultName = "Gemini";

  // 找到默認網址
  const defaultAiUrl = urls?.find(u => u.isDefault === 1);
  const currentUrl = defaultAiUrl?.url || defaultUrl;
  const currentName = defaultAiUrl?.name || defaultName;

  const handleOpenUrl = (url: string) => {
    window.open(url, "_blank");
    setIsOpen(false);
  };

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultMutation.mutateAsync({ id });
    } catch (error) {
      // 錯誤已在 onError 中處理
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-[10px] px-2 py-0.5 h-auto"
          title={`當前 AI：${currentName}`}
        >
          <span className="truncate max-w-[80px]">{currentName}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">AI 網址快速切換</DropdownMenuLabel>
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
              <div key={url.id} className="flex items-center gap-1 px-2 py-1.5">
                <button
                  onClick={() => handleOpenUrl(url.url)}
                  className="flex-1 text-left text-xs hover:text-blue-400 transition-colors truncate"
                  title={url.url}
                >
                  {url.name}
                </button>
                {url.isDefault === 0 && (
                  <button
                    onClick={() => handleSetDefault(url.id)}
                    className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                    title="設為默認"
                  >
                    設為默認
                  </button>
                )}
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
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          <Settings className="w-3 h-3 mr-2" />
          <span>點擊「AI 網址管理」按鍵編輯</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
