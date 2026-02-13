import { PrismaClient, EmotionState, GratitudeVisibility, PlanType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function startOfDayUTC(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function startOfWeekMonday(d: Date) {
  // Monday-start weekStart (matches your API logic intent)
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7; // Mon->0, Tue->1 ... Sun->6
  x.setDate(x.getDate() - diffToMonday);
  x.setHours(0, 0, 0, 0);
  return x;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function emotionFromRating(rating: number): { state: EmotionState; intensity: number; reasonCode: string } {
  if (rating >= 5) return { state: EmotionState.THRIVING, intensity: 85, reasonCode: "HIGH_RATING" };
  if (rating === 4) return { state: EmotionState.GOOD, intensity: 70, reasonCode: "GOOD_RATING" };
  if (rating === 3) return { state: EmotionState.NEUTRAL, intensity: 50, reasonCode: "NEUTRAL_RATING" };
  if (rating === 2) return { state: EmotionState.STRESSED, intensity: 70, reasonCode: "LOW_RATING" };
  return { state: EmotionState.DISCONNECTED, intensity: 85, reasonCode: "VERY_LOW_RATING" };
}

async function main() {
  const SEED_PASSWORD = process.env.SEED_PASSWORD || "Password123!";
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // Deterministic seed users
  const user1Email = "seed.alex@bondiq.local";
  const user2Email = "seed.sam@bondiq.local";

  const user1 = await prisma.user.upsert({
    where: { email: user1Email },
    update: {
      name: "Alex (Seed)",
      passwordHash,
      onboardingCompleted: true,
      onboardingStep: 99,
    },
    create: {
      email: user1Email,
      name: "Alex (Seed)",
      passwordHash,
      onboardingCompleted: true,
      onboardingStep: 99,
      planType: PlanType.FREE, // user-level is non-authoritative now
    },
    select: { id: true, email: true },
  });

  const user2 = await prisma.user.upsert({
    where: { email: user2Email },
    update: {
      name: "Sam (Seed)",
      passwordHash,
      onboardingCompleted: true,
      onboardingStep: 99,
    },
    create: {
      email: user2Email,
      name: "Sam (Seed)",
      passwordHash,
      onboardingCompleted: true,
      onboardingStep: 99,
      planType: PlanType.FREE, // user-level is non-authoritative now
    },
    select: { id: true, email: true },
  });

  // Find existing couple where both are members, else create one
  const user1Couples = await prisma.coupleMember.findMany({
    where: { userId: user1.id },
    select: { coupleId: true },
  });
  const user2Couples = await prisma.coupleMember.findMany({
    where: { userId: user2.id },
    select: { coupleId: true },
  });

  const user1Set = new Set(user1Couples.map((m) => m.coupleId));
  const existingCoupleId = user2Couples.map((m) => m.coupleId).find((id) => user1Set.has(id)) || null;

  const couple =
    existingCoupleId
      ? await prisma.couple.update({
          where: { id: existingCoupleId },
          data: {
            timezone: "America/Toronto",
            planType: PlanType.FREE,
            planUpdatedAt: new Date(),
            billingOwnerUserId: user1.id,
          },
          select: { id: true },
        })
      : await prisma.couple.create({
          data: {
            timezone: "America/Toronto",
            reportDay: 0,
            planType: PlanType.FREE,
            billingOwnerUserId: user1.id,
            members: {
              create: [
                { userId: user1.id },
                { userId: user2.id },
              ],
            },
            subscription: {
              create: {
                plan: PlanType.FREE,
                status: "seed_free",
              },
            },
          },
          select: { id: true },
        });

  const coupleId = couple.id;

  // Ensure memberships exist (idempotent)
  await prisma.coupleMember.upsert({
    where: { coupleId_userId: { coupleId, userId: user1.id } },
    update: {},
    create: { coupleId, userId: user1.id },
  });
  await prisma.coupleMember.upsert({
    where: { coupleId_userId: { coupleId, userId: user2.id } },
    update: {},
    create: { coupleId, userId: user2.id },
  });

  // Clean prior seed data for this couple (so reruns don’t duplicate)
  await prisma.gratitudeEntry.deleteMany({
    where: { coupleId, title: { startsWith: "[seed]" } },
  });
  await prisma.partnerEmotionSignal.deleteMany({
    where: { coupleId, note: { contains: "[seed]" } },
  });
  await prisma.dailyCoupleMetric.deleteMany({
    where: { coupleId },
  });
  await prisma.checkIn.deleteMany({
    where: { coupleId, whatMadeMeFeelLoved: { contains: "[seed]" } },
  });

  // Seed 30 days of daily metrics + emotion signals
  const today = startOfDayUTC(new Date());
  const days = 30;

  for (let i = days - 1; i >= 0; i--) {
    const day = startOfDayUTC(new Date(today.getTime() - i * 24 * 60 * 60 * 1000));

    // deterministic “wave” to show highs/lows
    const wave = Math.sin((days - i) / 4);
    const base = 70 + Math.round(wave * 12); // 58..82-ish

    const bondScore = clamp(base + 3, 0, 100);
    const connectionScore = clamp(base + (i % 5 === 0 ? -10 : 0), 0, 100);
    const stabilityScore = clamp(base + (i % 7 === 0 ? -12 : 0), 0, 100);

    const avgRating = clamp(Math.round((connectionScore / 20)) , 1, 5); // simple mapping 1..5
    const checkInCount = (i % 3 === 0) ? 2 : 1;

    const topTags =
      i % 6 === 0 ? ["WORK_STRESS", "TOUCH"] :
      i % 5 === 0 ? ["TIME", "WORDS"] :
      i % 4 === 0 ? ["SERVICE"] :
      ["WORDS"];

    await prisma.dailyCoupleMetric.upsert({
      where: { coupleId_day: { coupleId, day } },
      update: {
        bondScore,
        connectionScore,
        stabilityScore,
        checkInCount,
        avgRating: Number(avgRating),
        topTags,
      },
      create: {
        coupleId,
        day,
        bondScore,
        connectionScore,
        stabilityScore,
        checkInCount,
        avgRating: Number(avgRating),
        topTags,
      },
    });

    // Partner emotion signals
    const r1 = clamp((avgRating + (i % 5 === 0 ? -1 : 0)), 1, 5);
    const r2 = clamp((avgRating + (i % 7 === 0 ? -1 : 0)), 1, 5);

    const e1 = emotionFromRating(r1);
    const e2 = emotionFromRating(r2);

    await prisma.partnerEmotionSignal.upsert({
      where: { coupleId_userId_day: { coupleId, userId: user1.id, day } },
      update: {
        state: e1.state,
        intensity: e1.intensity,
        reasonCode: e1.reasonCode,
        note: "[seed] daily signal",
      },
      create: {
        coupleId,
        userId: user1.id,
        day,
        state: e1.state,
        intensity: e1.intensity,
        reasonCode: e1.reasonCode,
        note: "[seed] daily signal",
      },
    });

    await prisma.partnerEmotionSignal.upsert({
      where: { coupleId_userId_day: { coupleId, userId: user2.id, day } },
      update: {
        state: e2.state,
        intensity: e2.intensity,
        reasonCode: e2.reasonCode,
        note: "[seed] daily signal",
      },
      create: {
        coupleId,
        userId: user2.id,
        day,
        state: e2.state,
        intensity: e2.intensity,
        reasonCode: e2.reasonCode,
        note: "[seed] daily signal",
      },
    });
  }

  // Seed check-ins for last 2 weeks (so weekly reports have data)
  const now = new Date();
  const week0 = startOfWeekMonday(now);
  const week1 = startOfWeekMonday(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

  const checkIns = [
    { userId: user1.id, weekStart: week1, rating: 4, text: "[seed] Felt loved when you asked about my day.", tags: ["WORDS", "TIME"] },
    { userId: user2.id, weekStart: week1, rating: 3, text: "[seed] Felt loved when you helped with a task.", tags: ["SERVICE"] },
    { userId: user1.id, weekStart: week0, rating: 5, text: "[seed] Felt loved when we hugged before you left.", tags: ["TOUCH"] },
    { userId: user2.id, weekStart: week0, rating: 2, text: "[seed] Felt distant when we didn’t talk much mid-week.", tags: ["TIME"] },
  ];

  for (const c of checkIns) {
    await prisma.checkIn.create({
      data: {
        coupleId,
        userId: c.userId,
        weekStart: c.weekStart,
        rating: c.rating,
        whatMadeMeFeelLoved: c.text,
        languageTags: c.tags,
      },
    });
  }

  // Seed gratitude entries
  await prisma.gratitudeEntry.createMany({
    data: [
      {
        coupleId,
        userId: user1.id,
        targetUserId: user2.id,
        visibility: GratitudeVisibility.PRIVATE,
        title: "[seed] Small things I appreciate",
        body: "I appreciate how you keep us grounded when life gets busy.",
        pinned: true,
      },
      {
        coupleId,
        userId: user2.id,
        targetUserId: user1.id,
        visibility: GratitudeVisibility.SHARED,
        title: "[seed] Thank you",
        body: "Thank you for making time to reconnect even on stressful days.",
        pinned: false,
      },
    ],
  });

  console.log("✅ Seed complete");
  console.log("Seed users:");
  console.log(" -", user1Email);
  console.log(" -", user2Email);
  console.log("Seed password (for both):", SEED_PASSWORD);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
