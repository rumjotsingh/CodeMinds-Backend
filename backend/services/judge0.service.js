import axios from "axios";

import dotenv from "dotenv";
dotenv.config();

export const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com";
export const HEADERS = {
  "x-rapidapi-key": process.env.RAPIDAPI_KEY,
  "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
  "Content-Type": "application/json",
};

export const createSubmission = async (languageId, sourceCode, stdin = "") => {
  const res = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
    {
      language_id: languageId,
      source_code: sourceCode,
      stdin,
    },
    { headers: HEADERS }
  );

  return res.data.token;
};

export const getSubmissionResult = async (token) => {
  const res = await axios.get(
    `${JUDGE0_URL}/submissions/${token}?base64_encoded=false&fields=*`,
    { headers: HEADERS }
  );

  return res.data;
};

export const getLanguages = async () => {
  const res = await axios.get(`${JUDGE0_URL}/languages`, { headers: HEADERS });
  return res.data;
};
