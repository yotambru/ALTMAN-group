import type { ChatMessage, ChatThread } from "@/types";

function threadFor(threads: ChatThread[], threadId: string): ChatThread | undefined {
  return threads.find((thread) => thread.id === threadId);
}

/** Messages from someone else that this user has not opened in the conversation. */
export function unreadChatMessages(
  userId: string,
  threads: ChatThread[],
  messages: ChatMessage[],
): ChatMessage[] {
  return messages.filter((message) => {
    if (message.fromUserId === userId) return false;
    const thread = threadFor(threads, message.threadId);
    if (!thread?.participantIds.includes(userId)) return false;
    const seenAt = thread.readAt?.[userId];
    return !seenAt || message.createdAt > seenAt;
  });
}

export function unreadChatCount(
  userId: string,
  threads: ChatThread[],
  messages: ChatMessage[],
): number {
  return unreadChatMessages(userId, threads, messages).length;
}

export function unreadCountInThread(
  userId: string,
  thread: ChatThread | undefined,
  messages: ChatMessage[],
): number {
  if (!thread) return 0;
  return unreadChatMessages(userId, [thread], messages).length;
}
