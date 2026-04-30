// ReportGenerator service placeholder
class ReportGenerator {
  generateReport(data) {
    return {
      reportId: `RPT-${Date.now()}`,
      ...data,
      generatedAt: new Date().toISOString()
    };
  }
}

export default new ReportGenerator();
