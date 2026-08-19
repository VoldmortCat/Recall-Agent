const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const mistakes = await prisma.mistake.findMany({ include: { reviewPlan: true } });
  for (const m of mistakes) {
    const text = (m.ocrText || '').slice(0, 25);
    console.log(m.id.slice(0,8) + ' ' + m.subject + ' - ' + text + ' | 有复习计划: ' + !!m.reviewPlan + ' | nextReview: ' + (m.reviewPlan ? m.reviewPlan.nextReviewDate : '无'));
  }
  await prisma.$disconnect();
})();