import { StateGraph, Annotation } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { allTools, toolsMap } from './tools';
import { SYSTEM_PROMPT } from './prompts/systemPrompt';

// Define the state schema for our agent graph
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

// Configure Google Gemini Chat Model
// Model is configurable via GEMINI_MODEL env var; defaults to gemini-2.0-flash.
const model = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
  temperature: 0.2,
});

// Bind tools to the model
const modelWithTools = model.bindTools(allTools);

// Node 1: Call LLM (Agent)
const callModel = async (state: typeof AgentState.State, config?: any) => {
  const { messages } = state;
  const systemMessage = new SystemMessage(SYSTEM_PROMPT);
  
  // Combine system prompt with conversation history
  const response = await modelWithTools.invoke([systemMessage, ...messages], config);
  return { messages: [response] };
};

// Node 2: Execute Tools (Tools Node)
const callTools = async (state: typeof AgentState.State, config?: any) => {
  const lastMessage = state.messages[state.messages.length - 1] as any;
  if (!lastMessage || !('tool_calls' in lastMessage) || !lastMessage.tool_calls) {
    throw new Error('No tool calls to execute.');
  }

  const toolMessages: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls) {
    const toolInstance = toolsMap[toolCall.name];
    if (!toolInstance) {
      toolMessages.push(
        new ToolMessage({
          content: `Error: Tool ${toolCall.name} not found.`,
          tool_call_id: toolCall.id!,
        })
      );
      continue;
    }

    try {
      // In LangGraph tool call nodes, we pass the execution config to propagate configurable context like companyId
      const output = await toolInstance.invoke(toolCall.args, config);
      toolMessages.push(
        new ToolMessage({
          content: output,
          tool_call_id: toolCall.id!,
        })
      );
    } catch (err: any) {
      toolMessages.push(
        new ToolMessage({
          content: `Error executing tool ${toolCall.name}: ${err.message || String(err)}`,
          tool_call_id: toolCall.id!,
        })
      );
    }
  }

  return { messages: toolMessages };
};

// Conditional Edge: Decide next step
const routeModel = (state: typeof AgentState.State) => {
  const lastMessage = state.messages[state.messages.length - 1] as any;
  if (
    lastMessage &&
    'tool_calls' in lastMessage &&
    lastMessage.tool_calls &&
    lastMessage.tool_calls.length > 0
  ) {
    return 'tools';
  }
  return '__end__';
};

// Create the state workflow graph
const workflow = new StateGraph(AgentState)
  .addNode('agent', callModel)
  .addNode('tools', callTools)
  .addEdge('__start__', 'agent')
  .addConditionalEdges('agent', routeModel)
  .addEdge('tools', 'agent');

// Compile the graph once to be reused across all requests
export const compiledGraph = workflow.compile();
