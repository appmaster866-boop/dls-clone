# Branch strategiyasi

| Branch | Vazifasi |
|---|---|
| `main` | Production (store'dagi versiya). Himoyalangan, faqat `release/*` / `hotfix/*` PR orqali. Har merge'ga teg: `v1.2.0` |
| `dev` | Integratsiya. Doim build bo'ladi. PR + 1 review + CI |
| `feature/<nom>` | Yangi funksiya. `dev`dan ochiladi, `dev`ga squash merge |
| `release/x.y.z` | Chiqarishdan oldingi QA. `main` va `dev`ga merge |
| `hotfix/<nom>` | `main`dan ochiladi, `main` va `dev`ga merge |

## Ish tartibi
```
git checkout dev && git pull
git checkout -b feature/debt-ledger
# ... ishlash ...
git commit -m "feat(economy): add takeLoan function"
git push -u origin feature/debt-ledger   # keyin PR -> dev
```

## Commit formati (Conventional Commits)
`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`  (masalan `fix(match): ball stuck at corner`)

## Qoidalar
- Bir sahnada bir vaqtda bitta kishi ishlaydi; kichik prefab va additive sahnalardan foydalaning.
- Maxfiy fayllar (`google-services.json`, service account) hech qachon commit qilinmaydi.
- Iqtisodiy amallar faqat Cloud Functions orqali.
