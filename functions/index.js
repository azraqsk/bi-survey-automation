const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require('firebase-functions/params');
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

const DOTDIGITAL_API_USERNAME = defineSecret('DOTDIGITAL_API_USERNAME');
const DOTDIGITAL_API_PASSWORD = defineSecret('DOTDIGITAL_API_PASSWORD');
const IDENTITY_API_KEY = defineSecret('IDENTITY_API_KEY');
const BOT_EMAIL = defineSecret('BOT_EMAIL');
const BOT_PASSWORD = defineSecret('BOT_PASSWORD');

exports.syncDotdigitalSurveys = onSchedule({
  schedule: 'every day 00:00',
  region: 'asia-southeast1',
  secrets: [
    DOTDIGITAL_API_USERNAME,
    DOTDIGITAL_API_PASSWORD,
    IDENTITY_API_KEY,
    BOT_EMAIL,
    BOT_PASSWORD
  ],
  maxInstances: 1
}, async (event) => {
  try {
    console.log("Starting daily Dotdigital survey sync...");

    // 1. Authenticate Bot against Identity Toolkit
    const apiKey = IDENTITY_API_KEY.value();
    const email = BOT_EMAIL.value();
    const password = BOT_PASSWORD.value();

    console.log("Authenticating bot...");
    const authResponse = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email: email,
        password: password,
        returnSecureToken: true
      }
    );
    const idToken = authResponse.data.idToken;

    // 2. We only need to target Survey ID 2885
    const ddUsername = DOTDIGITAL_API_USERNAME.value();
    const ddPassword = DOTDIGITAL_API_PASSWORD.value();
    const ddAuthHeader = `Basic ${Buffer.from(`${ddUsername}:${ddPassword}`).toString('base64')}`;

    const targetSurveyId = '16271';
    const targetSurveyName = 'Dotdigital NPS Survey'; // Placeholder name

    // 3. Process Responses for Survey 2885 Since Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const endaBiEndpoint = 'https://api-bi.sitikhadijah.com/api/surveys';
    let totalSynced = 0;

    console.log(`Fetching responses for survey ID: ${targetSurveyId} since ${dateStr}`);
    try {
      const responsesResponse = await axios.get(
        `https://r3-api.dotdigital.com/v2/surveys/${targetSurveyId}/responses/activitysince/${dateStr}`,
        {
          headers: {
            'Authorization': ddAuthHeader
          }
        }
      );

      const responses = responsesResponse.data;
      console.log(`Survey ${targetSurveyId}: Found ${responses.length} responses.`);

      // 4. Transform and Load to Enda BI
      for (const response of responses) {

        // Extract rating from the specific question
        let ratingValue;
        const ratingQuestionSnippet = "On a scale of 0 to 10, how likely are you to recommend";

        // Handle potential Dotdigital response structures (answers array vs flat object)
        if (response.answers && Array.isArray(response.answers)) {
          const ans = response.answers.find(a =>
            (a.question || a.questionText || "").includes(ratingQuestionSnippet)
          );
          if (ans) ratingValue = Number(ans.answer || ans.value || ans.answerText);
        } else {
          const key = Object.keys(response).find(k => k.includes(ratingQuestionSnippet));
          if (key) ratingValue = Number(response[key]);
        }

        // Attempt to extract email/phone for auto-identification
        let emailValue, phoneValue;
        if (response.answers && Array.isArray(response.answers)) {
          const emailAns = response.answers.find(a => (a.questionText || a.question || "").toLowerCase().includes("email"));
          const phoneAns = response.answers.find(a =>
            (a.questionText || a.question || "").toLowerCase().includes("phone") ||
            (a.questionText || a.question || "").toLowerCase().includes("mobile")
          );
          if (emailAns) emailValue = emailAns.answer || emailAns.value || emailAns.answerText;
          if (phoneAns) phoneValue = phoneAns.answer || phoneAns.value || phoneAns.answerText;
        }

        const payload = {
          source: "dotdigital",
          submission_date: response.dateCompleted || new Date().toISOString(),
          rating: !isNaN(ratingValue) ? ratingValue : undefined, // Explicitly set rating at root
          data: {
            survey_id: targetSurveyId,
            survey_name: targetSurveyName,
            email: emailValue || response.email || response.Email,
            phone: phoneValue || response.phone || response.Phone || response.mobile,
            ...response
          }
        };

        try {
          await axios.post(endaBiEndpoint, payload, {
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          });
          totalSynced++;
        } catch (postErr) {
          const status = postErr.response ? postErr.response.status : null;
          const data = postErr.response ? postErr.response.data : postErr.message;

          if (status === 409) {
            console.log(`Skipped response ${response.id}: Duplicate entry.`);
          } else if (status === 403) {
            console.error(`Forbidden error for response ${response.id}: Ensure BOT_EMAIL is verified in Firebase Auth.`, data);
          } else {
            console.error(`Failed to post response ${response.id} to Enda BI (Status: ${status}):`, data);
          }
        }
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.log(`Survey ${targetSurveyId} might not have activitysince endpoint or no responses.`);
      } else {
        console.error(`Error processing survey ID ${targetSurveyId}:`, err.response ? err.response.data : err.message);
      }
    }

    console.log(`Sync complete. Total responses synced: ${totalSynced}`);
  } catch (error) {
    console.error("Critical error in syncDotdigitalSurveys:", error.response ? error.response.data : error.message);
  }
});
