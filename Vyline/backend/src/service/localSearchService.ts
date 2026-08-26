import { getStoredChats, getStoredMessages } from "../storage/chatStore.js";

export type LocalSearchInput = {
  chatMid?: string;
  query: string;
  limit: number;
};

export type LocalSearchResult = {
  messageId: string;
  chatMid: string;
  chatName: string;
  senderMid: string;
  createdTime: number;
  excerpt: string;
};

export function validateLocalSearchInput(input: LocalSearchInput): string | null {
  if (input.chatMid != null && (!input.chatMid.trim() || input.chatMid.length > 256)) {
    return "chatMid must be a non-empty string up to 256 characters";
  }
  if (!input.query.trim() || input.query.trim().length > 200) {
    return "query must be 1-200 characters";
  }
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) {
    return "limit must be an integer between 1 and 100";
  }
  return null;
}

function excerpt(text: string, query: string): string {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const index = normalizedText.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (index < 0 || normalizedText.length <= 120) return normalizedText.slice(0, 120);
  const start = Math.max(0, index - 48);
  const end = Math.min(normalizedText.length, start + 120);
  return `${start > 0 ? "…" : ""}${normalizedText.slice(start, end)}${end < normalizedText.length ? "…" : ""}`;
}

export async function searchLocalMessages(
  accountId: string,
  input: LocalSearchInput,
): Promise<LocalSearchResult[]> {
  const error = validateLocalSearchInput(input);
  if (error) throw new Error(error);

  const query = input.query.trim();
  const queryLower = query.toLocaleLowerCase();
  const chats = await getStoredChats(accountId);
  const targets = input.chatMid ? chats.filter((chat) => chat.mid === input.chatMid) : chats;
  const results: LocalSearchResult[] = [];

  // ponytail: local JSON DB has no cross-chat iterator; bounded per-chat reads keep this API simple.
  for (const chat of targets) {
    const messages = await getStoredMessages(accountId, chat.mid, 100_000);
    for (const message of messages) {
      if (!message.text?.toLocaleLowerCase().includes(queryLower)) continue;
      results.push({
        messageId: message.id,
        chatMid: chat.mid,
        chatName: chat.name || chat.mid,
        senderMid: message.from,
        createdTime: message.createdTime,
        excerpt: excerpt(message.text, query),
      });
    }
  }

  return results
    .sort((a, b) => b.createdTime - a.createdTime || b.messageId.localeCompare(a.messageId))
    .slice(0, input.limit);
}
