import { cleanEnv, str, url } from "envalid";

const envSchema = {
	// Database
	DATABASE_URL: url(),
	PRISMA_FIELD_ENCRYPTION_KEY: str(),

	// mittwald
	EXTENSION_ID: str(),
	EXTENSION_SECRET: str(),

	// OpenAI / LLM
	OPENAI_API_KEY: str(),
	LLM_API_URL: url({
		default: "https://llm.aihosting.mittwald.de/v1",
	}),

	NODE_ENV: str({
		choices: ["development", "test", "production"],
		default: "development",
	}),
};

// Validate and clean the environment
export const env = cleanEnv(process.env, envSchema);
