# Hikari-Tsai Profile Repository

這個 Repository 管理 [Hikari Tsai 的 GitHub 個人頁面](https://github.com/Hikari-Tsai)。根目錄的 `README.md` 是實際顯示在個人頁面的內容；這份文件則用來說明背後的素材與自動更新方式。

## 這裡放了什麼

- 個人簡介、作品入口與近期活動
- AWS 證照圖片及 Credly 驗證連結
- LeetCode 統計、重要 Badge 與完整成就列表
- Code Portfolio 和 Music Portfolio 的入口素材

## 自動更新

LeetCode Badge 由 GitHub Actions 每天更新一次。程式會讀取公開 Badge 資料，挑出較具代表性的長期里程碑、年度成就與進階學習計畫放在主畫面，其餘項目收進可展開的 More 區域。

如果當天沒有新資料，工作流程不會產生額外 Commit。也可以從 Actions 頁面手動執行更新。

## 目錄

| 路徑 | 用途 |
| --- | --- |
| `README.md` | GitHub 個人頁面的主要內容 |
| `assets/` | AWS Badge 與 Portfolio 按鈕圖片 |
| `scripts/update-leetcode-badge.mjs` | 取得、排序並寫入 LeetCode Badge |
| `.github/workflows/update-leetcode-badge.yml` | 每日自動更新設定 |
| `tests/` | Badge 排序與顯示規則測試 |

## 相關連結

- [GitHub Profile](https://github.com/Hikari-Tsai)
- [Code Portfolio](https://hikari-tsai.github.io/code-portfolio/)
- [Music Portfolio](https://hikari-tsai.github.io/homepage/)
- [LeetCode](https://leetcode.com/u/Hikari-Tsai/)
