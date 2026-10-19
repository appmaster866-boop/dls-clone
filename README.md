# DLS Clone: 3D Football (Unity + Firebase)

Mobil 3D futbol o'yini. Stack: Unity 6 LTS (URP, C#), Firebase (Auth, Firestore, Functions, Analytics), GitHub Actions.

## Boshlash
1. Unity Hub orqali **Unity 6 LTS** o'rnating (Android + iOS modullari bilan).
2. Repo'ni klon qiling: `git clone <repo-url> && cd dls-clone && git lfs install && git lfs pull`
3. Unity Hub -> Add -> shu papkani tanlang. Birinchi ochilishda `ProjectSettings/` avtomatik yaratiladi (3D URP shablon tavsiya etiladi).
4. `Edit > Project Settings > Editor`: Version Control = **Visible Meta Files**, Asset Serialization = **Force Text**.
5. Firebase Console'da dev loyiha oching, `google-services.json` va `GoogleService-Info.plist` ni `Assets/` ichiga qo'ying (repo'ga **qo'shilmaydi**).
6. Firebase Unity SDK (Auth, Firestore, Functions, Analytics) .unitypackage'larini import qiling.

## Backend
```
cd functions && npm install && npm run build
firebase emulators:start
firebase deploy --only functions,firestore:rules
```

## Branch strategiyasi
Qarang: [CONTRIBUTING.md](CONTRIBUTING.md)
