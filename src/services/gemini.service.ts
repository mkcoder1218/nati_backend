/**
 * Gemini AI Service
 *
 * This service integrates with Google's Gemini AI to provide advanced sentiment analysis
 * and report generation capabilities for government officials.
 */

import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

// Interface for sentiment data to be analyzed
interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  topIssues: Array<{
    issue: string;
    count: number;
    percentage: number;
  }>;
  reviewSamples?: Array<{
    text: string;
    sentiment: string;
    category?: string;
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  officeName?: string;
}

// Interface for the AI-generated report
interface AIReport {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  trendAnalysis: string;
  fullAnalysis: string;
}

/**
 * Analyzes sentiment data using Gemini AI and generates a comprehensive report
 * @param data Sentiment data to analyze
 * @returns AI-generated report
 */
export const analyzeSentimentWithGemini = async (
  data: SentimentData
): Promise<AIReport> => {
  try {
    // Check if API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === "") {
      console.warn(
        "❌ Gemini API key is not configured or empty. Using fallback report generation with REAL data."
      );
      return generateFallbackReport(data);
    }

    console.log(
      "✅ Gemini API key is configured. Attempting to call Gemini AI..."
    );
    console.log("📊 Office-specific data being sent to Gemini:", {
      officeName: data.officeName,
      total: data.total,
      positive: data.positive,
      negative: data.negative,
      neutral: data.neutral,
      topIssuesCount: data.topIssues?.length || 0,
      reviewSamplesCount: data.reviewSamples?.length || 0,
      dateRange: data.dateRange,
    });

    // Validate that we have meaningful data to analyze
    if (data.total === 0) {
      console.log(
        "⚠️ No review data available for analysis. Using fallback report."
      );
      return generateFallbackReport(data);
    }

    console.log("Creating prompt for Gemini AI...");
    // Create a prompt for Gemini AI
    const prompt = createGeminiPrompt(data);
    console.log("📝 Prompt length:", prompt.length, "characters");

    console.log("Calling Gemini API...");
    // Call Gemini API with timeout and better error handling
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      },
      {
        timeout: 30000, // 30 second timeout
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Gemini API response received");

    // Check if the response has the expected structure
    if (
      !response.data ||
      !response.data.candidates ||
      !response.data.candidates[0] ||
      !response.data.candidates[0].content ||
      !response.data.candidates[0].content.parts ||
      !response.data.candidates[0].content.parts[0] ||
      !response.data.candidates[0].content.parts[0].text
    ) {
      console.error(
        "Unexpected Gemini API response structure:",
        JSON.stringify(response.data)
      );
      throw new Error("Unexpected Gemini API response structure");
    }

    // Parse the response
    const aiResponse = response.data.candidates[0].content.parts[0].text;
    console.log("Parsing Gemini response...");
    return parseGeminiResponse(aiResponse);
  } catch (error: unknown) {
    console.error("❌ Error calling Gemini AI:", error);

    if (axios.isAxiosError(error)) {
      console.error("🔍 Axios error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        timeout:
          error.code === "ECONNABORTED" ? "Request timed out" : "No timeout",
      });

      // Specific error handling for common Gemini API issues
      if (error.response?.status === 400) {
        console.error("🚫 Bad Request - Check API key and request format");
      } else if (error.response?.status === 403) {
        console.error(
          "🔐 Forbidden - API key may be invalid or quota exceeded"
        );
      } else if (error.response?.status === 429) {
        console.error("⏰ Rate Limited - Too many requests to Gemini API");
      } else if (error.response?.status >= 500) {
        console.error("🔧 Server Error - Gemini API is experiencing issues");
      }
    } else if (error instanceof Error) {
      console.error("💥 Error message:", error.message);
      console.error("📍 Error stack:", error.stack);
    }

    // Return a fallback report if the API call fails
    console.log(
      "🔄 Gemini API call failed. Using fallback report generation with REAL office-specific data..."
    );
    console.log("📊 Fallback will use real data for office:", data.officeName, {
      total: data.total,
      positive: data.positive,
      negative: data.negative,
      neutral: data.neutral,
      topIssues: data.topIssues?.length || 0,
    });
    return generateFallbackReport(data);
  }
};

/**
 * Creates a detailed prompt for Gemini AI based on sentiment data
 * @param data Sentiment data
 * @returns Formatted prompt string
 */
const createGeminiPrompt = (data: SentimentData): string => {
  const {
    positive,
    neutral,
    negative,
    total,
    topIssues,
    reviewSamples,
    dateRange,
    officeName,
  } = data;

  // Calculate percentages
  const positivePercentage = Math.round((positive / total) * 100);
  const neutralPercentage = Math.round((neutral / total) * 100);
  const negativePercentage = Math.round((negative / total) * 100);

  // Format the prompt
  return `
You are an expert government service analyst. Analyze the following sentiment data from citizen feedback about ${
    officeName || "a government office"
  } for the period from ${dateRange.startDate} to ${dateRange.endDate}.

SENTIMENT BREAKDOWN:
- Positive feedback: ${positive} (${positivePercentage}%)
- Neutral feedback: ${neutral} (${neutralPercentage}%)
- Negative feedback: ${negative} (${negativePercentage}%)
- Total reviews: ${total}

TOP ISSUES MENTIONED:
${topIssues
  .map(
    (issue) =>
      `- ${issue.issue}: ${issue.count} mentions (${issue.percentage}%)`
  )
  .join("\n")}

${
  reviewSamples && reviewSamples.length > 0
    ? `
SAMPLE REVIEWS:
${reviewSamples
  .map(
    (review) =>
      `- "${review.text}" (Sentiment: ${review.sentiment}${
        review.category ? `, Category: ${review.category}` : ""
      })`
  )
  .join("\n")}
`
    : ""
}

Based on this data, please provide:
1. A concise executive summary (2-3 paragraphs)
2. 4-5 key insights from the data
3. 3-4 specific, actionable recommendations for improvement
4. A brief trend analysis comparing positive vs negative sentiment
5. A comprehensive analysis of the feedback (about 300-400 words)

Format your response as follows:
SUMMARY:
[Your executive summary]

KEY_INSIGHTS:
- [Insight 1]
- [Insight 2]
- [Insight 3]
- [Insight 4]
- [Insight 5]

RECOMMENDATIONS:
- [Recommendation 1]
- [Recommendation 2]
- [Recommendation 3]
- [Recommendation 4]

TREND_ANALYSIS:
[Your trend analysis]

FULL_ANALYSIS:
[Your comprehensive analysis]
`;
};

/**
 * Parses the Gemini AI response into structured report sections
 * @param response Raw text response from Gemini
 * @returns Structured AI report
 */
const parseGeminiResponse = (response: string): AIReport => {
  // Default empty report structure
  const report: AIReport = {
    summary: "",
    keyInsights: [],
    recommendations: [],
    trendAnalysis: "",
    fullAnalysis: "",
  };

  // Extract summary
  const summaryMatch = response.match(/SUMMARY:([\s\S]*?)(?=KEY_INSIGHTS:|$)/);
  if (summaryMatch && summaryMatch[1]) {
    report.summary = summaryMatch[1].trim();
  }

  // Extract key insights
  const insightsMatch = response.match(
    /KEY_INSIGHTS:([\s\S]*?)(?=RECOMMENDATIONS:|$)/
  );
  if (insightsMatch && insightsMatch[1]) {
    report.keyInsights = insightsMatch[1]
      .split("-")
      .map((insight) => insight.trim())
      .filter((insight) => insight.length > 0);
  }

  // Extract recommendations
  const recommendationsMatch = response.match(
    /RECOMMENDATIONS:([\s\S]*?)(?=TREND_ANALYSIS:|$)/
  );
  if (recommendationsMatch && recommendationsMatch[1]) {
    report.recommendations = recommendationsMatch[1]
      .split("-")
      .map((rec) => rec.trim())
      .filter((rec) => rec.length > 0);
  }

  // Extract trend analysis
  const trendMatch = response.match(
    /TREND_ANALYSIS:([\s\S]*?)(?=FULL_ANALYSIS:|$)/
  );
  if (trendMatch && trendMatch[1]) {
    report.trendAnalysis = trendMatch[1].trim();
  }

  // Extract full analysis
  const analysisMatch = response.match(/FULL_ANALYSIS:([\s\S]*?)$/);
  if (analysisMatch && analysisMatch[1]) {
    report.fullAnalysis = analysisMatch[1].trim();
  }

  return report;
};

/**
 * Generates a fallback report when the AI service is unavailable
 * @param data Sentiment data
 * @returns Basic report based on the data
 */
const generateFallbackReport = (data: SentimentData): AIReport => {
  const {
    positive,
    neutral,
    negative,
    total,
    topIssues,
    dateRange,
    officeName,
    reviewSamples = [],
  } = data;

  // Calculate percentages
  const positivePercentage = Math.round((positive / total) * 100) || 0;
  const neutralPercentage = Math.round((neutral / total) * 100) || 0;
  const negativePercentage = Math.round((negative / total) * 100) || 0;

  // Get the top issue categories
  const topIssueCategory = topIssues[0]?.issue || "service delays";
  const secondIssueCategory = topIssues[1]?.issue || "staff behavior";
  const thirdIssueCategory = topIssues[2]?.issue || "process complexity";

  // Check if we have real data or empty data
  if (total === 0) {
    return {
      summary: `No feedback data is available for ${
        officeName || "the selected office"
      } during the period from ${dateRange.startDate} to ${
        dateRange.endDate
      }. This office-specific report indicates that no reviews have been submitted for this particular office, or the reviews have not yet been approved for analysis.`,
      keyInsights: [
        `No citizen feedback data available for ${officeName || "this office"}`,
        `${
          officeName || "This office"
        } may benefit from increased citizen engagement initiatives`,
        "Review the feedback collection and approval process for this specific office",
        "Consider office-specific outreach programs to encourage feedback",
      ],
      recommendations: [
        `Implement targeted outreach programs for ${
          officeName || "this office"
        } to encourage citizen feedback`,
        `Review and streamline the feedback approval process specifically for ${
          officeName || "this office"
        }`,
        `Consider alternative feedback collection methods tailored to ${
          officeName || "this office"
        }'s services`,
        `Establish regular community engagement sessions for ${
          officeName || "this office"
        }`,
      ],
      trendAnalysis: `No trend data available for ${
        officeName || "this office"
      } due to insufficient feedback volume during the selected period.`,
      fullAnalysis: `A comprehensive analysis cannot be performed for ${
        officeName || "this office"
      } without sufficient feedback data. This office-specific report focuses exclusively on ${
        officeName || "the selected office"
      } and contains no data from other government offices. To improve data availability, focus on increasing citizen engagement and feedback collection specifically for ${
        officeName || "this office"
      }.`,
    };
  }

  // Generate a detailed executive summary using REAL office-specific data
  const summary = `
Office-Specific Analysis for ${
    officeName || "Government Office"
  }: This report contains data exclusively for ${
    officeName || "the selected office"
  } and includes no information from other government offices.

Analysis of ${total} citizen reviews submitted specifically to ${
    officeName || "this government office"
  } from ${dateRange.startDate} to ${
    dateRange.endDate
  } reveals important insights into ${
    officeName || "the office"
  }'s service delivery performance. The sentiment breakdown for ${
    officeName || "this office"
  } shows ${positivePercentage}% positive feedback, ${neutralPercentage}% neutral responses, and ${negativePercentage}% negative experiences.

${
  topIssues.length > 0
    ? `For ${
        officeName || "this office"
      }, the most frequently mentioned concern was "${topIssueCategory}" which appeared in ${
        topIssues[0]?.percentage || 0
      }% of all feedback submitted to this specific office. ${
        topIssues.length > 1
          ? `This was followed by "${secondIssueCategory}" at ${
              topIssues[1]?.percentage || 0
            }%`
          : ""
      } ${
        topIssues.length > 2
          ? ` and "${thirdIssueCategory}" at ${topIssues[2]?.percentage || 0}%`
          : ""
      }. These categories represent the primary areas where citizens are experiencing challenges specifically with ${
        officeName || "this office"
      }'s services.`
    : `No specific issue categories were identified in the feedback data for ${
        officeName || "this office"
      }.`
}

${
  positivePercentage > negativePercentage
    ? `With ${positivePercentage}% positive sentiment, the overall feedback indicates citizen satisfaction with ${
        officeName || "this office"
      }'s services, though the ${negativePercentage}% negative feedback highlights areas for continued improvement at this specific office.`
    : `The ${negativePercentage}% negative sentiment indicates significant opportunities for service enhancement at ${
        officeName || "this office"
      }, requiring focused attention on the identified issues specific to this office.`
} This office-specific analysis provides data-driven insights to guide service improvement initiatives exclusively for ${
    officeName || "this office"
  }.
  `.trim();

  // Generate key insights based on REAL data
  const keyInsights = [];

  // Always include overall satisfaction
  keyInsights.push(
    `${positivePercentage}% of feedback was positive, indicating ${
      positivePercentage > 60
        ? "good"
        : positivePercentage > 40
        ? "moderate"
        : "low"
    } citizen satisfaction with services.`
  );

  // Include negative feedback insight if significant
  if (negativePercentage > 0) {
    keyInsights.push(
      `${negativePercentage}% of feedback was negative, suggesting areas for improvement.`
    );
  }

  // Include top issue if available
  if (topIssues.length > 0) {
    keyInsights.push(
      `The most common issue was '${topIssues[0].issue}' (${topIssues[0].percentage}%).`
    );
  }

  // Include second issue if available
  if (topIssues.length > 1) {
    keyInsights.push(
      `${topIssues[1].issue} was the second most mentioned concern (${topIssues[1].percentage}%).`
    );
  }

  // Include review volume insight
  keyInsights.push(
    `Total of ${total} reviews were analyzed for this reporting period.`
  );

  // Generate actionable recommendations based on REAL data
  const recommendations = [];

  // Address top issues if they exist
  if (topIssues.length > 0) {
    recommendations.push(
      `Address the primary concern of '${topIssues[0].issue}' through process improvements and staff training.`
    );
  }

  if (topIssues.length > 1) {
    recommendations.push(
      `Implement targeted solutions for '${topIssues[1].issue}' to improve citizen experience.`
    );
  }

  // General recommendations based on sentiment
  if (negativePercentage > 30) {
    recommendations.push(
      `With ${negativePercentage}% negative feedback, implement a comprehensive service improvement plan.`
    );
  }

  if (positivePercentage < 70) {
    recommendations.push(
      `Establish regular staff training on customer service best practices to increase satisfaction.`
    );
  }

  // Always include feedback mechanism recommendation
  recommendations.push(
    `Implement a real-time feedback system to capture citizen experiences and enable rapid response to issues.`
  );

  // Generate trend analysis based on REAL data
  const trendAnalysis = `
The sentiment analysis reveals a ${positivePercentage}% positive, ${neutralPercentage}% neutral, and ${negativePercentage}% negative feedback distribution. The positive to negative feedback ratio stands at ${positive}:${negative}.

${
  positivePercentage > negativePercentage
    ? `The predominance of positive feedback (${positivePercentage}%) over negative feedback (${negativePercentage}%) indicates overall citizen satisfaction with services.`
    : `The higher negative feedback (${negativePercentage}%) compared to positive feedback (${positivePercentage}%) indicates significant room for service improvement.`
}

${
  topIssues.length > 0
    ? `The most frequently mentioned issue, "${topIssues[0].issue}" (${topIssues[0].percentage}%), represents a key area requiring immediate attention.`
    : "No specific issue patterns were identified in the current feedback data."
}

${
  total > 50
    ? `With ${total} reviews analyzed, this represents a substantial sample size for reliable trend analysis.`
    : `The current sample size of ${total} reviews provides initial insights, though a larger sample would strengthen trend analysis.`
}
  `.trim();

  // Generate a comprehensive full analysis based on REAL data
  const fullAnalysis = `
This analysis examines ${total} citizen reviews for ${
    officeName || "the government office"
  } from ${dateRange.startDate} to ${
    dateRange.endDate
  }. The sentiment distribution shows ${positivePercentage}% positive, ${neutralPercentage}% neutral, and ${negativePercentage}% negative feedback.

SENTIMENT ANALYSIS SUMMARY:
${
  positivePercentage > 0
    ? `Positive feedback (${positivePercentage}%): Citizens expressed satisfaction with services received.`
    : "No positive feedback recorded in this period."
}
${
  neutralPercentage > 0
    ? `Neutral feedback (${neutralPercentage}%): Citizens provided balanced or mixed feedback.`
    : ""
}
${
  negativePercentage > 0
    ? `Negative feedback (${negativePercentage}%): Citizens reported issues or dissatisfaction with services.`
    : "No negative feedback recorded in this period."
}

ISSUE ANALYSIS:
${
  topIssues.length > 0
    ? topIssues
        .map(
          (issue, index) =>
            `${index + 1}. ${issue.issue}: Mentioned in ${
              issue.count
            } reviews (${issue.percentage}% of total feedback)`
        )
        .join("\n")
    : "No specific issue categories were identified in the feedback data."
}

${
  reviewSamples.length > 0
    ? `SAMPLE FEEDBACK:
${reviewSamples
  .slice(0, 3)
  .map(
    (sample, index) =>
      `${index + 1}. "${sample.text.substring(0, 100)}${
        sample.text.length > 100 ? "..." : ""
      }" (${sample.sentiment})`
  )
  .join("\n")}`
    : "No review samples available for detailed analysis."
}

RECOMMENDATIONS FOR ACTION:
Based on this analysis, the following actions are recommended:
${recommendations.map((rec, index) => `${index + 1}. ${rec}`).join("\n")}

This data-driven analysis provides a foundation for targeted service improvements to enhance citizen satisfaction and address identified concerns.
  `.trim();

  return {
    summary,
    keyInsights,
    recommendations,
    trendAnalysis,
    fullAnalysis,
  };
};

export default {
  analyzeSentimentWithGemini,
};
