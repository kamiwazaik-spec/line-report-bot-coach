import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as api from "./addness-api.js";
import "dotenv/config";

const server = new Server(
  { name: "addness-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ツール一覧
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_todos",
      description: "Addnessの今日のTODOリストを取得する",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_goals",
      description: "Addnessの全ゴールツリーを取得する",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_goal_detail",
      description: "特定ゴールの詳細・サブタスクを取得する",
      inputSchema: {
        type: "object",
        properties: { goalId: { type: "string", description: "ゴールのUUID" } },
        required: ["goalId"],
      },
    },
    {
      name: "update_goal_status",
      description: "ゴールのステータスを変更する",
      inputSchema: {
        type: "object",
        properties: {
          goalId: { type: "string", description: "ゴールのUUID" },
          status: { type: "string", description: "新しいステータス (todo/in_progress/done)" },
        },
        required: ["goalId", "status"],
      },
    },
    {
      name: "add_goal_comment",
      description: "ゴールにコメントを追加する",
      inputSchema: {
        type: "object",
        properties: {
          goalId: { type: "string", description: "ゴールのUUID" },
          comment: { type: "string", description: "追加するコメント" },
        },
        required: ["goalId", "comment"],
      },
    },
    {
      name: "create_goal",
      description: "新しいゴールを作成する",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "ゴールのタイトル" },
          parentId: { type: "string", description: "親ゴールのUUID（任意）" },
        },
        required: ["title"],
      },
    },
    {
      name: "get_member_goals",
      description: "特定メンバーのゴール一覧を取得する",
      inputSchema: {
        type: "object",
        properties: { memberId: { type: "string", description: "メンバーID" } },
        required: ["memberId"],
      },
    },
    {
      name: "get_members",
      description: "チームメンバー一覧を取得する",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

// ツール実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case "get_todos":
        result = await api.getTodos();
        break;
      case "get_goals":
        result = await api.getGoals();
        break;
      case "get_goal_detail":
        result = await api.getGoalDetail(args.goalId);
        break;
      case "update_goal_status":
        result = await api.updateGoalStatus(args.goalId, args.status);
        break;
      case "add_goal_comment":
        result = await api.addGoalComment(args.goalId, args.comment);
        break;
      case "create_goal":
        result = await api.createGoal(args.title, args.parentId);
        break;
      case "get_member_goals":
        result = await api.getMemberGoals(args.memberId);
        break;
      case "get_members":
        result = await api.getMembers();
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `エラー: ${err.message}` }],
      isError: true,
    };
  }
});

// サーバー起動
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("✅ Addness MCP Server 起動完了");
