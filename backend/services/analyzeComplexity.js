import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com";
const headers = {
  "x-rapidapi-key": process.env.RAPIDAPI_KEY,
  "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
  "Content-Type": "application/json",
};

export const analyzeComplexity = async ({ languageId, sourceCode }) => {
  const inputSizes = [10, 100, 1000]; // You can expand this list
  const performanceResults = [];

  for (const size of inputSizes) {
    const inputArr = Array(size).fill(1).join(",");
    const testCode = `
arr = [${inputArr}]
print(sum(arr))
`;

    const submissionRes = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
      {
        language_id: languageId,
        source_code: testCode,
      },
      { headers }
    );

    const token = submissionRes.data.token;

    let result;
    while (true) {
      const resultRes = await axios.get(
        `${JUDGE0_URL}/submissions/${token}?base64_encoded=false&fields=*`,
        { headers }
      );
      if (resultRes.data.status.id <= 2) {
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        result = resultRes.data;
        break;
      }
    }

    performanceResults.push({
      inputSize: size,
      time: result.time,
      memory: result.memory,
    });
  }

  return performanceResults;
};

// Example use:
