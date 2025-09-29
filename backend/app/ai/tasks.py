"""
CrewAI Tasks for Financial Document Analysis
Defines the tasks that agents will perform
"""

from crewai import Task
from app.ai.agents import financial_analyst
from app.ai.tools import financial_document_tool

# Creating a task to help solve user's query
financial_document_analysis_task = Task(
    description="""You MUST use the document_processor tool to read the financial document. The file_path is: {file_path}. 
    
    PRECISE DATA EXTRACTION INSTRUCTIONS:
    1. Use the document_processor tool with the exact file path to extract document content
    2. Extract ONLY the most critical financial metrics relevant to the user's query
    3. Focus on exact numbers, percentages, and specific data points from the document
    4. Look for data in tables, charts, and main text sections
    5. Pay attention to formats: $X million, X%, ratios, per share values, etc.
    6. Extract current period data and significant year-over-year changes
    7. Identify key trends and important financial ratios
    8. Extract main risk factors and opportunities with supporting data
    9. Do not provide analysis without first calling the document_processor tool
    
    User query: {query}""",
    expected_output="""Provide a COMPREHENSIVE, STRUCTURED financial analysis report following this EXACT format. You MUST include ALL sections with specific data:

KEY FINANCIAL METRICS:
- Revenue/Sales: [exact amount with currency and period]
- Operating Income/EBIT: [exact amount with currency and period]
- Net Income/Profit: [exact amount with currency and period]
- Cash and Cash Equivalents: [exact amount with currency and period]
- Free Cash Flow: [exact amount with currency and period]
- Key Margin percentages: [Operating: X%, Net: X%]

GROWTH & CHANGES:
- Revenue growth rate: [exact percentage year-over-year]
- Income growth/decline: [exact percentage year-over-year]
- Key quarterly trends: [most significant changes with numbers]

TOTAL INSIGHTS (MUST provide 3-5 insights):
- [Insight 1 with specific numbers and data points]
- [Insight 2 with specific numbers and data points]
- [Insight 3 with specific numbers and data points]
- [Insight 4 with specific numbers and data points]
- [Insight 5 with specific numbers and data points]

KEY FINDINGS (MUST provide 3-5 findings):
- [Finding 1 with supporting financial data]
- [Finding 2 with supporting financial data]
- [Finding 3 with supporting financial data]
- [Finding 4 with supporting financial data]
- [Finding 5 with supporting financial data]

FINANCIAL HIGHLIGHTS (MUST provide 3-5 highlights):
- [Highlight 1 with specific metrics and context]
- [Highlight 2 with specific metrics and context]
- [Highlight 3 with specific metrics and context]
- [Highlight 4 with specific metrics and context]
- [Highlight 5 with specific metrics and context]

RISK FACTORS (MUST provide 3-5 risks):
- [Risk 1 with supporting data and impact assessment]
- [Risk 2 with supporting data and impact assessment]
- [Risk 3 with supporting data and impact assessment]
- [Risk 4 with supporting data and impact assessment]
- [Risk 5 with supporting data and impact assessment]

OPPORTUNITIES (MUST provide 3-5 opportunities):
- [Opportunity 1 with supporting data and potential impact]
- [Opportunity 2 with supporting data and potential impact]
- [Opportunity 3 with supporting data and potential impact]
- [Opportunity 4 with supporting data and potential impact]
- [Opportunity 5 with supporting data and potential impact]

INVESTMENT RECOMMENDATION:
- [Recommendation based on key data points with specific metrics and rationale]

CRITICAL REQUIREMENTS:
- You MUST provide data for ALL sections above - NO EMPTY SECTIONS
- Use exact values as they appear in the document
- Include currency symbols, units (M, B, K), and time periods
- Each insight, finding, highlight, risk, and opportunity MUST have supporting data
- Be precise and data-driven with specific numbers
- Follow the exact structure above - ALL sections are mandatory""",
    agent=financial_analyst,
    tools=[financial_document_tool],
    async_execution=False,
)
