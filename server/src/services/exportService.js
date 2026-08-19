/**
 * 考前冲刺导出服务
 * 对应 PRD 模块六：考前冲刺导出
 */

/**
 * 生成错题集PDF数据（MVP阶段返回结构化数据，后续用PDF库渲染）
 */
function generatePdfData(mistakes, options = {}) {
  const { includeAnalysis = true } = options;

  return {
    title: 'Recall 错题集',
    generatedAt: new Date().toISOString(),
    totalCount: mistakes.length,
    pages: mistakes.map((m, index) => ({
      number: index + 1,
      question: {
        image: m.originalImage,
        text: m.ocrText || '(题目文字待识别)',
      },
      metadata: {
        subject: m.subject,
        knowledgePoints: m.knowledgePoints || [],
        errorType: m.errorType || '未分类',
        difficulty: m.difficulty || '未知',
      },
      ...(includeAnalysis ? {
        answer: m.correctAnswer || '(暂无)',
        analysis: m.analysis || '(暂无)',
        // 留白作答区
        answerSpace: true,
      } : {}),
    })),
  };
}

module.exports = { generatePdfData };