import OpenAI from "openai";
import fs, { Utf8Stream } from "fs"

async function main() {
  const [, , flag, prompt] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (flag !== "-p" || !prompt) {
    throw new Error("error: -p flag is required");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  const tools = [{
    type: "function",
    function: {
      name: "Read",
      description: "Read and return the contents of a file",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "The path to the file to read"
          }
        },
        required: ["file_path"]
      }
    }
  }]

  // You can use print statements as follows for debugging, they'll be visible when running tests.
  console.error("Logs from your program will appear here!");

  const messages = [{ role: "user", content: prompt }]



  for (let i = 0; i < messages.length; i++) {

    const response = await client.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      messages: [messages],
      tools: tools
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response");
    }

    messages.push(response.message)

    if (!response.message.tool_calls) {
      console.log(response.message.content[0])
    }

    const tools = response.message.tool_calls

    for (let i = 0; i < tools.length; i++) {

      switch (tool ? tool[0].function.name : null) {
        case "Read":
          const tool = response.choices[0].message.tool_calls[0]
          const path2 = JSON.parse(tool.function.arguments)
          const fileContent = fs.readFileSync(path2.file_path, { encoding: 'utf8' })
          console.log(fileContent);
          break;
      }


    }
  }


}

main();
