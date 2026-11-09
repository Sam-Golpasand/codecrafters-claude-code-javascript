import OpenAI from "openai";
import fs, { Utf8Stream } from "fs"
import { stdout } from "process";
import { ChildProcess } from "child_process";

const tools_available = [{
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
    },
  }
},
{
  type: "function",
  function: {
    name: "Write",
    description: "Write content to a file",
    parameters: {
      type: "object",
      required: ["file_path", "content"],
      properties: {
        file_path: {
          type: "string",
          description: "The path of the file to write to"
        },
        content: {
          type: "string",
          description: "The content to write to the file"
        }
      }
    }
  }
},
{
  type: "function",
  function: {
    name: "Bash",
    description: "Execute a shell command",
    parameters: {
      type: "object",
      required: ["command"],
      properties: {
        command: {
          type: "string",
          description: "The command to execute"
        }
      }
    }
  }
}]


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


  // You can use print statements as follows for debugging, they'll be visible when running tests.
  console.error("Logs from your program will appear here!");

  const messages = [{ role: "user", content: prompt }]


  while (true) {
    const response = await client.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      messages: messages,
      tools: tools_available
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response");
    }

    const message = response.choices[0].message;

    if (!message.tool_calls || message.tool_calls.length == 0) {
      console.log(message.content)
      break;
    }

    messages.push(message)

    const tools = message.tool_calls

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i]
      runTool(tool, tool.id);
    }
  }


  function runTool(tool, toolId) {
    switch (tool ? tool.function.name : null) {
      case "Read":
        const fileContent = read(tool.function.arguments)
        messages.push({
          role: "tool",
          tool_call_id: toolId,
          content: fileContent
        })
        break;
      case "Write":
        const writeMessage = write(tool.function.arguments);
        messages.push({
          role: "tool",
          tool_call_id: toolId,
          content: writeMessage
        })
      case "Bash":
        const bashMessage = runBash(tool.function.arguments);
        messages.push({
          role: "tool",
          tool_call_id: toolId,
          content: bashMessage
        })
    }
  }

  function read(args) {
    const { path } = JSON.parse(args)
    const fileContent = fs.readFileSync(path, { encoding: 'utf8' })
    return fileContent
  }

  function write(args) {
    const {file_path, content} = JSON.parse(args)
    fs.writeFileSync(file_path, content, { encoding: "utf8" })
    return "Succesfully created the file"
  }

  function runBash(args) {
    const {command} = JSON.parse(args)
    
    const returnStdout = ChildProcess.exec(command) 
    return returnStdout
  }

}

main();
