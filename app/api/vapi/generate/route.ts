import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Input validation
    if (
      !body.type ||
      !body.role ||
      !body.level ||
      !body.techstack ||
      !body.amount ||
      !body.userid
    ) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { type, role, level, techstack, amount, userid } = body;

    const { text: questions } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.

                Important formatting rules:
        1. Return ONLY a valid JSON array of strings
        2. Each question must be a complete sentence
        3. Do not use special characters like /, *, or []
        4. Format must be exactly: ["Question 1", "Question 2", "Question 3"]
        5. No additional text or explanations
        6. No line breaks within the array

        Example format:
        ["Tell me about your experience with React", "How do you handle state management?"]


        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });

    let parsedQuestions;
    try {
      // First try to parse the raw response
      parsedQuestions = JSON.parse(questions);
    } catch (e) {
      // If parsing fails, try to clean and format the response
      const cleaned = questions
        .trim()
        .replace(/[\r\n]/g, "")
        .replace(/^[\[\s]*/, "[")
        .replace(/[\s\]]*$/, "]");
      try {
        parsedQuestions = JSON.parse(cleaned);
      } catch (e) {
        return Response.json(
          { success: false, error: "Failed to parse questions" },
          { status: 500 }
        );
      }
    }

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack.split(","),
      questions: parsedQuestions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("interviews").add(interview);

    return Response.json(
      {
        success: true,
        data: { interviewId: docRef.id },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      {
        success: false,
        error: "An error occurred while generating the interview",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
