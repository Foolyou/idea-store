import { InspirationCard } from "@/components/inspiration-card";
import { FloatingMenu } from "@/components/floating-menu";

const mockFeed = [
  {
    id: "1",
    authorName: "小陈",
    timeAgo: "3 分钟前",
    content: "刚刚想到一个绝妙的点子：用 AI 帮用户自动分类灵感标签，这样就不用自己手动整理了。",
    likeCount: 12,
    bookmarkCount: 5,
  },
  {
    id: "2",
    authorName: "设计师小王",
    timeAgo: "15 分钟前",
    circleName: "产品设计圈",
    content: "复古像素风配现代圆角，这个反差感应该很有趣。我打算先做个组件库把基础元素定下来。",
    likeCount: 28,
    bookmarkCount: 7,
  },
  {
    id: "3",
    authorName: "创客小李",
    timeAgo: "1 小时前",
    circleName: "独立开发圈",
    content: "记录一个关于笔记 app 的交互方案：下拉手势触发画布模式，比传统按钮入口更直觉。",
    likeCount: 45,
    bookmarkCount: 12,
  },
  {
    id: "4",
    authorName: "阿琳",
    timeAgo: "2 小时前",
    content: "早上喝咖啡的时候突然想到，如果把待办事项和番茄钟合并成一个时间轴视图会不会更好用？",
    likeCount: 6,
    bookmarkCount: 2,
  },
  {
    id: "5",
    authorName: "前端小张",
    timeAgo: "3 小时前",
    circleName: "独立开发圈",
    content:
      "Tailwind v4 的 CSS-first 配置方式比 v3 的 JS config 优雅太多了，主题定义直接写在 CSS 里，和设计 token 天然对齐。",
    likeCount: 33,
    bookmarkCount: 9,
  },
];

export default function Home() {
  return (
    <div className="max-w-app mx-auto min-h-screen relative">
      {/* Publish area */}
      <div className="bg-bg-card rounded-b-md px-lg pt-lg pb-lg shadow-card">
        <textarea
          className="w-full bg-bg-page rounded-md p-lg text-body text-text-primary placeholder:text-text-tertiary resize-none outline-none min-h-[80px]"
          placeholder="此刻的想法…"
          readOnly
        />
        <div className="flex items-center justify-between mt-md">
          <div className="flex gap-sm">
            <span className="text-caption text-text-secondary bg-bg-accent rounded-sm px-sm py-[4px]">
              📷 添加图片
            </span>
            <span className="text-caption text-text-secondary bg-bg-accent rounded-sm px-sm py-[4px]">
              🌐 公开
            </span>
          </div>
          <span className="inline-flex items-center justify-center rounded-full min-h-[44px] px-xl text-body font-medium bg-action-primary text-white">
            发布
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="text-center py-lg">
        <span className="text-caption text-text-tertiary">— 社区灵感 —</span>
      </div>

      {/* Feed */}
      <div className="px-lg flex flex-col gap-md pb-3xl">
        {mockFeed.map((item) => (
          <InspirationCard key={item.id} {...item} />
        ))}
      </div>

      {/* Floating menu */}
      <FloatingMenu />
    </div>
  );
}
