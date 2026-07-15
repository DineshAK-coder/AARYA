import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================
// LLM Column Classifier – Google Gemini 1.5 Flash
// ============================================================
// Called when fuzzy string matching cannot confidently map
// required columns. Sends headers + sample rows to Gemini and
// asks for a structured JSON mapping response.
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!GEMINI_API_KEY) {
      throw new Error(
        'GEMINI_API_KEY is not set. Add it to your .env file to use auto-column detection.'
      );
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

// ============================================================
// Prompt builder
// ============================================================

function buildPrompt(
  headers: string[],
  sampleRows: Record<string, string>[]
): string {
  return `You are a financial data analyst. Your task is to map columns from an uploaded CSV/Excel file to a standard financial transaction schema.

## Standard Schema Fields

| Field | Type | Description |
|-------|------|-------------|
| amount | numeric | The monetary value of the transaction (always positive). Required. |
| transaction_type | "income" or "expense" or "transfer" | The direction/nature of the transaction. Required. |
| due_date | ISO date (YYYY-MM-DD) | The date the transaction occurred or is due. Required. |
| description | string or null | Optional free-text description or memo. |

## Input File Details

**Column headers found in the uploaded file:**
${JSON.stringify(headers)}

**Sample rows (first ${sampleRows.length} rows):**
${JSON.stringify(sampleRows, null, 2)}

## Your Task

Analyse the headers and sample data and determine which uploaded column best corresponds to each schema field.

## Rules
1. Map each schema field to EXACTLY ONE header name from the provided list — or null if no suitable column exists.
2. Use only exact header strings from the list above. Do NOT invent or modify header names.
3. If multiple columns could map to one field, pick the best one.
4. For transaction_type: if there's no dedicated type column but amount can be negative, set transaction_type to null (we'll infer it from sign).
5. Respond ONLY with a single valid JSON object. No explanation text, no markdown fences.

## Required Output Format
{
  "amount": "<exact_header_name>",
  "transaction_type": "<exact_header_name_or_null>",
  "due_date": "<exact_header_name>",
  "description": "<exact_header_name_or_null>"
}`;
}

// ============================================================
// Main classifier function
// ============================================================

export interface LLMClassificationResult {
  amount: string | null;
  transaction_type: string | null;
  due_date: string | null;
  description: string | null;
}

/**
 * Calls Google Gemini 1.5 Flash to classify CSV headers into our canonical schema.
 * Returns a partial ColumnMappings (some fields may be null if Gemini can't map them).
 *
 * @throws If the API call fails or the response is not valid JSON.
 */
export async function classifyColumnsWithLLM(
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<LLMClassificationResult> {
  const ai    = getGenAI();
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',   // Force JSON response mode
      temperature: 0,                          // Deterministic output for mapping
      maxOutputTokens: 512,
    },
  });

  const prompt = buildPrompt(headers, sampleRows);

  let rawText: string;

  try {
    const result = await model.generateContent(prompt);
    rawText = result.response.text().trim();
  } catch (err) {
    throw new Error(
      `Gemini API call failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Strip markdown code fences if Gemini wraps the JSON anyway
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: LLMClassificationResult;

  try {
    parsed = JSON.parse(cleaned) as LLMClassificationResult;
  } catch {
    throw new Error(
      `Gemini returned non-JSON output. Raw response: ${rawText.slice(0, 300)}`
    );
  }

  // Validate that returned header names actually exist in the file
  const headerSet = new Set(headers);
  const validated: LLMClassificationResult = {
    amount:           parsed.amount           && headerSet.has(parsed.amount)           ? parsed.amount           : null,
    transaction_type: parsed.transaction_type && headerSet.has(parsed.transaction_type) ? parsed.transaction_type : null,
    due_date:         parsed.due_date         && headerSet.has(parsed.due_date)         ? parsed.due_date         : null,
    description:      parsed.description      && headerSet.has(parsed.description)      ? parsed.description      : null,
  };

  return validated;
}

// ============================================================
// Embedding generator – Google text-embedding-004 (768 dims)
// Uses @ai-sdk/google + embed() from ai (same provider used for chat)
// because the raw @google/generative-ai SDK returns 404 on all
// embedding models with this API key's routing.
// ============================================================

/**
 * Generates a 768-dimensional embedding vector for the given text
 * using the @ai-sdk/google provider's text-embedding-004 model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('[generateEmbedding] GEMINI_API_KEY environment variable is not set');
  }

  const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
  const { embed } = await import('ai');

  const google = createGoogleGenerativeAI({ apiKey });
  const { embedding } = await embed({
    model: google.textEmbeddingModel('text-embedding-004'),
    value: text,
  });

  if (!embedding || embedding.length === 0) {
    throw new Error(`[generateEmbedding] API returned empty or invalid embedding (got ${embedding?.length ?? 0} dims)`);
  }

  return embedding;
}
