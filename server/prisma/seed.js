/**
 * 数据库种子脚本
 * 初始化预置知识图谱数据
 * 运行: npx prisma db seed
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const KNOWLEDGE_NODES = [
  // 数学
  { name: '函数-基本性质', subject: '数学', gradeLevel: '高一' },
  { name: '函数-定义域值域', subject: '数学', gradeLevel: '高一' },
  { name: '函数-单调性', subject: '数学', gradeLevel: '高一' },
  { name: '函数-奇偶性', subject: '数学', gradeLevel: '高一' },
  { name: '三角函数-诱导公式', subject: '数学', gradeLevel: '高一' },
  { name: '三角函数-正弦定理', subject: '数学', gradeLevel: '高二' },
  { name: '三角函数-余弦定理', subject: '数学', gradeLevel: '高二' },
  { name: '数列-等差数列', subject: '数学', gradeLevel: '高二' },
  { name: '数列-等比数列', subject: '数学', gradeLevel: '高二' },
  { name: '导数-求导法则', subject: '数学', gradeLevel: '高二' },
  { name: '导数-极值问题', subject: '数学', gradeLevel: '高三' },
  { name: '解析几何-直线方程', subject: '数学', gradeLevel: '高二' },
  { name: '解析几何-圆锥曲线', subject: '数学', gradeLevel: '高三' },
  { name: '概率-古典概型', subject: '数学', gradeLevel: '高二' },
  { name: '统计-方差与标准差', subject: '数学', gradeLevel: '高二' },
  // 物理
  { name: '力学-匀变速直线运动', subject: '物理', gradeLevel: '高一' },
  { name: '力学-牛顿运动定律', subject: '物理', gradeLevel: '高一' },
  { name: '力学-动能定理', subject: '物理', gradeLevel: '高一' },
  { name: '力学-机械能守恒', subject: '物理', gradeLevel: '高一' },
  { name: '电磁学-电场强度', subject: '物理', gradeLevel: '高二' },
  { name: '电磁学-电磁感应', subject: '物理', gradeLevel: '高二' },
  // 化学
  { name: '化学-元素周期表', subject: '化学', gradeLevel: '高一' },
  { name: '化学-氧化还原反应', subject: '化学', gradeLevel: '高一' },
  { name: '化学-化学平衡', subject: '化学', gradeLevel: '高二' },
  { name: '有机-烷烃', subject: '化学', gradeLevel: '高二' },
  { name: '有机-羧酸酯', subject: '化学', gradeLevel: '高二' },
];

async function main() {
  console.log('开始初始化知识图谱数据...');

  for (const node of KNOWLEDGE_NODES) {
    const existing = await prisma.knowledgeNode.findFirst({
      where: { name: node.name, subject: node.subject },
    });
    if (!existing) {
      await prisma.knowledgeNode.create({ data: node });
    }
  }

  console.log(`成功初始化 ${KNOWLEDGE_NODES.length} 个知识点节点`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });