import fs from "fs";

// Load raw JSON
const rawData = fs.readFileSync("leetcode_raw.json", "utf-8");
const data = JSON.parse(rawData);

// if it's single object, wrap into array for consistency
const dataArray = Array.isArray(data) ? data : [data];

const cleanedData = dataArray.map((item) => {
  let examplesArray = [];

  if (item.examples && typeof item.examples === "object") {
    // prefer PYTHON example if exists, else first available
    const exampleSource =
      item.examples.PYTHON || Object.values(item.examples)[0];

    if (exampleSource && exampleSource.input && exampleSource.output) {
      examplesArray.push({
        input: exampleSource.input || "",
        output: exampleSource.output || "",
        explanation: exampleSource.explanation || "",
      });
    }
  }

  // transform constraints & hints: string → array
  const constraintsArray = (item.constraints || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const hintsArray = (item.hints || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
    const codeSnippetsArray = Object.entries(data.codeSnippets || {}).map(([language, code]) => ({
  language,
  code
}));

const referenceSolutionsArray = Object.entries(data.referenceSolutions || {}).map(([language, code]) => ({
  language,
  code
}));



  return {
    title: item.title || "",
    description: item.description || "",
    difficulty: item.difficulty || "EASY",
    tags: item.tags || [],
    constraints: constraintsArray,
    examples: examplesArray,
    testcases: item.testcases || [],
    hints: hintsArray,
    editorial: item.editorial || "",
    codeSnippets: codeSnippetsArray || [],
    referenceSolutions: referenceSolutionsArray || [],
  };
});

fs.writeFileSync(
  "cleaned_problem.json",
  JSON.stringify(cleanedData, null, 2),
  "utf-8"
);

console.log("✅ Cleaned JSON saved to cleaned_problem.json");
