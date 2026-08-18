import type { ChatFolderSummary, ChatSessionSummary } from "@/lib/api";

export interface GroupedChatSessions {
  byFolder: Map<string, ChatSessionSummary[]>;
  unfiled: ChatSessionSummary[];
}

export function groupChatSessionsByFolder(
  sessions: ChatSessionSummary[],
  folders: ChatFolderSummary[],
): GroupedChatSessions {
  const folderIds = new Set(folders.map((folder) => folder.id));
  const byFolder = new Map(
    folders.map((folder) => [folder.id, [] as ChatSessionSummary[]]),
  );
  const unfiled: ChatSessionSummary[] = [];

  for (const session of sessions) {
    if (session.folderId && folderIds.has(session.folderId)) {
      byFolder.get(session.folderId)?.push(session);
    } else {
      unfiled.push(session);
    }
  }

  return { byFolder, unfiled };
}
