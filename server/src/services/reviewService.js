/**
 * 复习计划服务
 * 基于 SM-2 间隔重复算法
 * 对应 PRD 模块四
 */

const prisma = require('./prisma');

/**
 * 处理复习反馈，更新 SM-2 参数
 * quality: 0=忘记, 1=模糊, 2=记得
 */
async function processReview(userId, mistakeId, quality) {
  const plan = await prisma.reviewPlan.findUnique({ where: { mistakeId } });
  if (!plan) {
    throw Object.assign(new Error('复习计划不存在'), { status: 404 });
  }
  // 数据隔离：校验该错题属于当前用户
  if (plan.userId !== userId) {
    throw Object.assign(new Error('无权操作该错题'), { status: 403 });
  }

  // SM-2 算法核心逻辑
  let { repetitions, interval, easeFactor } = plan;

  if (quality >= 2) {
    // 记得：增加间隔
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
    easeFactor = Math.max(1.3, easeFactor + 0.1);
  } else if (quality >= 1) {
    // 模糊：间隔不变
    repetitions = Math.max(0, repetitions);
    easeFactor = Math.max(1.3, easeFactor - 0.05);
  } else {
    // 忘记：重置
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  nextReviewDate.setHours(0, 0, 0, 0);

  // 更新复习计划
  await prisma.reviewPlan.update({
    where: { mistakeId },
    data: { repetitions, interval, easeFactor, nextReviewDate, lastQuality: quality },
  });

  // 记录复习日志
  await prisma.reviewLog.create({
    data: { userId, mistakeId, quality },
  });

  // 计算掌握状态：每次复习后都更新
  let masteryStatus = 'learning';
  if (repetitions >= 2 && quality >= 2) {
    masteryStatus = 'mastered';
  } else if (repetitions >= 1 && quality >= 1) {
    masteryStatus = 'learning';
  } else if (quality === 0) {
    masteryStatus = 'reviewing'; // 需要再复习
  }

  // 更新错题掌握状态
  await prisma.mistake.update({
    where: { id: mistakeId },
    data: { masteryStatus },
  });

  return {
    repetitions,
    interval,
    easeFactor,
    nextReviewDate,
    masteryStatus,
  };
}

module.exports = { processReview };