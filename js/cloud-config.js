/* ===== 云端共享弹幕配置（可选） =====
   配置后，所有访客发的弹幕互相可见；留空则弹幕只保存在每个人自己的浏览器里。

   开通步骤（一次性，约 5 分钟）：
   1. 打开 https://supabase.com 用 GitHub 账号登录，New project 建一个免费项目
   2. 左侧 SQL Editor → 粘贴执行本仓库 tools/supabase_setup.sql 的内容
   3. 左侧 Settings → API：
      - 把 Project URL 填到下面的 url
      - 把 anon public key 填到下面的 anonKey
        （新版控制台叫 Publishable key，sb_publishable_ 开头，作用相同；
         sb_secret_ 开头的 Secret key 是后端专用，千万不要填到这里）
   4. 保存本文件，提交到仓库（合并进 main 后 Pages 生效）

   说明：anon key 本来就是设计为公开放在前端的，
   配合上面 SQL 里的行级安全策略，访客只能「读弹幕、发弹幕」，无法改删。 */
window.CLOUD_DANMAKU = {
  url: "https://ndvfdkcojvvkyngnhitz.supabase.co/rest/v1/",      // 例如 "https://abcd1234.supabase.co"
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmZka2NvanZ2a3luZ25oaXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTY3OTQsImV4cCI6MjA5Njc3Mjc5NH0.gbf9rMlmpLUJvFBQ594a5CgrsPkHMEddy--EWEmezkE"   // 例如 "eyJhbGciOiJIUzI1NiIs..."
};
