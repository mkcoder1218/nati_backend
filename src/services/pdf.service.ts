/**
 * PDF Generation Service
 *
 * This service handles the generation of PDF reports based on AI analysis
 * and sentiment data.
 */

import PDFDocument from "pdfkit";
import fs from "fs-extra";
import path from "path";
// Define the AIReport interface here to match the one in gemini.service.ts
interface AIReport {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  trendAnalysis: string;
  fullAnalysis: string;
}

// Ensure the reports directory exists
const REPORTS_DIR = path.join(__dirname, "../../public/reports");
try {
  console.log(`Ensuring reports directory exists: ${REPORTS_DIR}`);
  fs.ensureDirSync(REPORTS_DIR);
  console.log("Reports directory created or already exists");

  // Check if the directory is writable
  const testFile = path.join(REPORTS_DIR, ".test-write-access");
  fs.writeFileSync(testFile, "test");
  fs.unlinkSync(testFile);
  console.log("Reports directory is writable");
} catch (error) {
  console.error("Error setting up reports directory:", error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(`Failed to set up reports directory: ${errorMessage}`);
}

interface ReportData {
  officeName: string;
  reportType: string;
  startDate: string;
  endDate: string;
  aiReport: AIReport;
  sentimentData: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
    topIssues: Array<{
      issue: string;
      count: number;
      percentage: number;
    }>;
  };
}

/**
 * Generates a PDF report based on the provided data
 * @param data Report data including AI analysis and sentiment statistics
 * @returns The filename of the generated PDF
 */
export const generatePDFReport = async (data: ReportData): Promise<string> => {
  const {
    officeName,
    reportType,
    startDate,
    endDate,
    aiReport,
    sentimentData,
  } = data;

  // Create a unique filename
  const timestamp = Date.now();
  const sanitizedOfficeName = officeName.replace(/\s+/g, "-").toLowerCase();
  const filename = `${sanitizedOfficeName}-${reportType}-${timestamp}.pdf`;
  const filePath = path.join(REPORTS_DIR, filename);

  // Create a new PDF document
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    font: "Helvetica", // Set default font to Helvetica (built-in)
    info: {
      Title: `${
        reportType.charAt(0).toUpperCase() + reportType.slice(1)
      } Report - ${officeName}`,
      Author: "Negari Government Service Feedback System",
      Subject: `${reportType} Analysis for ${officeName}`,
      Keywords: "sentiment, feedback, government, service, analysis",
      CreationDate: new Date(),
    },
  });

  // Pipe the PDF to a file
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Add header
  doc
    .fontSize(24)
    .font("Helvetica-Bold") // PDFKit has built-in support for standard PDF fonts
    .text("Negari", { align: "center" })
    .fontSize(16)
    .font("Helvetica") // Use standard font
    .text("Government Service Feedback System", { align: "center" })
    .moveDown(0.5);

  // Add report title
  doc
    .fontSize(20)
    .font("Helvetica-Bold") // Use Helvetica-Bold for bold text
    .text(
      `${
        reportType.charAt(0).toUpperCase() + reportType.slice(1)
      } Analysis Report`,
      { align: "center" } // Only use supported options
    )
    .moveDown(0.5);

  // Add office name and date range
  doc
    .fontSize(14)
    .font("Helvetica")
    .text(`Office: ${officeName}`, { align: "center" })
    .text(`Period: ${startDate} to ${endDate}`, { align: "center" })
    .moveDown(1);

  // Add horizontal line
  doc
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .stroke()
    .moveDown(1);

  // Add executive summary section
  doc
    .fontSize(16)
    .font("Helvetica-Bold") // Use Helvetica-Bold for bold text
    .text("Executive Summary", { underline: true })
    .moveDown(0.5)
    .fontSize(12)
    .font("Helvetica")
    .text(aiReport.summary)
    .moveDown(1);

  // Add sentiment breakdown section
  doc
    .fontSize(16)
    .font("Helvetica-Bold") // Use Helvetica-Bold for bold text
    .text("Sentiment Breakdown", { underline: true })
    .moveDown(0.5);

  // Calculate percentages
  const positivePercentage =
    Math.round((sentimentData.positive / sentimentData.total) * 100) || 0;
  const neutralPercentage =
    Math.round((sentimentData.neutral / sentimentData.total) * 100) || 0;
  const negativePercentage =
    Math.round((sentimentData.negative / sentimentData.total) * 100) || 0;

  // Add sentiment statistics
  doc
    .fontSize(12)
    .font("Helvetica")
    .text(`Total Reviews: ${sentimentData.total}`)
    .text(
      `Positive Feedback: ${sentimentData.positive} (${positivePercentage}%)`
    )
    .text(`Neutral Feedback: ${sentimentData.neutral} (${neutralPercentage}%)`)
    .text(
      `Negative Feedback: ${sentimentData.negative} (${negativePercentage}%)`
    )
    .moveDown(1);

  // Add top issues section
  doc
    .fontSize(16)
    .font("Helvetica-Bold") // Use Helvetica-Bold for bold text
    .text("Top Issues", { underline: true })
    .moveDown(0.5);

  // Add top issues list
  sentimentData.topIssues.forEach(
    (
      issue: { issue: string; count: number; percentage: number },
      index: number
    ) => {
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(
          `${index + 1}. ${issue.issue}: ${issue.count} mentions (${
            issue.percentage
          }%)`
        );
    }
  );
  doc.moveDown(1);

  // Add key insights section
  doc
    .fontSize(16)
    .font("Helvetica-Bold") // Use Helvetica-Bold for bold text
    .text("Key Insights", { underline: true })
    .moveDown(0.5);

  // Add key insights list
  aiReport.keyInsights.forEach((insight: string, index: number) => {
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`${index + 1}. ${insight}`);
  });
  doc.moveDown(1);

  // Add recommendations section
  doc
    .fontSize(16)
    .font("Helvetica-Bold") // Use Helvetica-Bold for bold text
    .text("Recommendations", { underline: true })
    .moveDown(0.5);

  // Add recommendations list
  aiReport.recommendations.forEach((recommendation: string, index: number) => {
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`${index + 1}. ${recommendation}`);
  });
  doc.moveDown(1);

  // Add trend analysis section
  doc
    .fontSize(16)
    .font("Helvetica-Bold") // Use Helvetica-Bold for bold text
    .text("Trend Analysis", { underline: true })
    .moveDown(0.5)
    .fontSize(12)
    .font("Helvetica")
    .text(aiReport.trendAnalysis)
    .moveDown(1);

  // Add full analysis section
  doc
    .fontSize(16)
    .font("Helvetica-Bold") // Use Helvetica-Bold for bold text
    .text("Full Analysis", { underline: true })
    .moveDown(0.5)
    .fontSize(12)
    .font("Helvetica")
    .text(aiReport.fullAnalysis)
    .moveDown(1);

  // Add footer
  doc
    .fontSize(10)
    .font("Helvetica") // Use standard font instead of Italic which might not be available
    .text(
      `Generated on ${new Date().toLocaleString()} by Negari Government Service Feedback System`,
      { align: "center" }
    );

  // Finalize the PDF
  doc.end();

  // Return a Promise that resolves when the PDF is written
  return new Promise((resolve, reject) => {
    stream.on("finish", () => {
      console.log(`PDF file written successfully: ${filePath}`);
      // Verify the file exists and has content
      try {
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
          reject(new Error(`Generated PDF file is empty: ${filePath}`));
        } else {
          console.log(`PDF file size: ${stats.size} bytes`);
          resolve(filename);
        }
      } catch (error) {
        console.error(`Error verifying PDF file: ${filePath}`, error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        reject(new Error(`Failed to verify PDF file: ${errorMessage}`));
      }
    });
    stream.on("error", (error) => {
      console.error(`Error writing PDF file: ${filePath}`, error);
      reject(error);
    });
  });
};

export default {
  generatePDFReport,
};
