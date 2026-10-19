import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

const START_COINS = 50_000;
const START_GEMS = 20;
const MAX_DEBT = 500_000;
const INTEREST_PCT = 5;

function requireUid(req: { auth?: { uid: string } }): string {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Kirish talab qilinadi");
  return uid;
}

/** Yangi foydalanuvchi profili + hamyon */
export const initUser = onCall(async (req) => {
  const uid = requireUid(req);
  const userRef = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(userRef)).exists) return;
    tx.set(userRef, {
      displayName: `Player${uid.slice(0, 5)}`,
      avatarId: 0, level: 1, xp: 0, banned: false,
      settings: { language: "uz", graphicsQuality: "auto", controlScheme: "default" },
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.doc(`users/${uid}/wallet/main`), {
      coins: START_COINS, gems: START_GEMS, totalDebt: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});

/** O'yinchi darajasini oshirish */
export const upgradePlayer = onCall(async (req) => {
  const uid = requireUid(req);
  const { ownedId } = req.data as { ownedId: string };
  if (!ownedId) throw new HttpsError("invalid-argument", "ownedId kerak");

  await db.runTransaction(async (tx) => {
    const walletRef = db.doc(`users/${uid}/wallet/main`);
    const playerRef = db.doc(`users/${uid}/ownedPlayers/${ownedId}`);
    const rulesRef = db.doc("config/upgradeRules");
    const [wallet, player, rules] = await Promise.all([
      tx.get(walletRef), tx.get(playerRef), tx.get(rulesRef),
    ]);
    if (!player.exists) throw new HttpsError("not-found", "O'yinchi topilmadi");

    const nextLevel = player.data()!.level + 1;
    const rule = rules.data()!.levels.find((l: any) => l.level === nextLevel);
    if (!rule) throw new HttpsError("failed-precondition", "Maksimal daraja");

    const { coins, gems } = wallet.data()!;
    if (coins < rule.costCoins || gems < rule.costGems)
      throw new HttpsError("failed-precondition", "Mablag' yetarli emas");

    tx.update(walletRef, {
      coins: coins - rule.costCoins, gems: gems - rule.costGems,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(playerRef, { level: nextLevel });
    tx.set(db.collection(`users/${uid}/ledger`).doc(), {
      type: "upgrade", currency: "coins", amount: -rule.costCoins,
      balanceAfter: coins - rule.costCoins, refId: ownedId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});

/** Qarz olish */
export const takeLoan = onCall(async (req) => {
  const uid = requireUid(req);
  const { amount, type } = req.data as { amount: number; type: string };
  if (!Number.isInteger(amount) || amount <= 0)
    throw new HttpsError("invalid-argument", "Noto'g'ri miqdor");

  await db.runTransaction(async (tx) => {
    const walletRef = db.doc(`users/${uid}/wallet/main`);
    const { coins, totalDebt } = (await tx.get(walletRef)).data()!;
    if (totalDebt + amount > MAX_DEBT)
      throw new HttpsError("failed-precondition", "Qarz limiti oshdi");

    const debtRef = db.collection(`users/${uid}/debts`).doc();
    tx.set(debtRef, {
      type, principal: amount, remaining: amount, interestRatePct: INTEREST_PCT,
      status: "active", minPayment: Math.ceil(amount * 0.1),
      createdAt: FieldValue.serverTimestamp(),
      dueAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    tx.update(walletRef, {
      coins: coins + amount, totalDebt: totalDebt + amount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection(`users/${uid}/ledger`).doc(), {
      type: "debt_take", currency: "coins", amount, balanceAfter: coins + amount,
      refId: debtRef.id, createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});

/** Qarzni to'lash */
export const payDebt = onCall(async (req) => {
  const uid = requireUid(req);
  const { debtId, amount } = req.data as { debtId: string; amount: number };
  if (!Number.isInteger(amount) || amount <= 0)
    throw new HttpsError("invalid-argument", "Noto'g'ri miqdor");

  await db.runTransaction(async (tx) => {
    const walletRef = db.doc(`users/${uid}/wallet/main`);
    const debtRef = db.doc(`users/${uid}/debts/${debtId}`);
    const [wallet, debt] = await Promise.all([tx.get(walletRef), tx.get(debtRef)]);
    if (!debt.exists) throw new HttpsError("not-found", "Qarz topilmadi");

    const { coins, totalDebt } = wallet.data()!;
    const remaining = debt.data()!.remaining as number;
    const pay = Math.min(amount, remaining);
    if (coins < pay) throw new HttpsError("failed-precondition", "Mablag' yetarli emas");

    tx.update(debtRef, {
      remaining: remaining - pay,
      status: remaining - pay === 0 ? "paid" : debt.data()!.status,
    });
    tx.update(walletRef, {
      coins: coins - pay, totalDebt: Math.max(0, totalDebt - pay),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection(`users/${uid}/ledger`).doc(), {
      type: "debt_pay", currency: "coins", amount: -pay, balanceAfter: coins - pay,
      refId: debtId, createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});

/** Har 24 soatda foiz hisoblash */
export const accrueInterest = onSchedule("every 24 hours", async () => {
  const snap = await db.collectionGroup("debts")
    .where("status", "in", ["active", "overdue"]).get();

  for (const doc of snap.docs) {
    const d = doc.data();
    const interest = Math.ceil(d.remaining * (d.interestRatePct / 100));
    const uid = doc.ref.parent.parent!.id;
    const walletRef = db.doc(`users/${uid}/wallet/main`);
    const overdue = d.dueAt && d.dueAt.toDate() < new Date();

    await db.runTransaction(async (tx) => {
      const w = (await tx.get(walletRef)).data()!;
      tx.update(doc.ref, {
        remaining: d.remaining + interest,
        status: overdue ? "overdue" : d.status,
      });
      tx.update(walletRef, { totalDebt: w.totalDebt + interest });
      tx.set(db.collection(`users/${uid}/ledger`).doc(), {
        type: "interest", currency: "coins", amount: 0, balanceAfter: w.coins,
        interestAdded: interest, refId: doc.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  }
});
