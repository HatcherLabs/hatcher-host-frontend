import { describe, expect, it } from "vitest";
import type { ChatFolderSummary, ChatSessionSummary } from "@/lib/api";
import { groupChatSessionsByFolder } from "./chatFolders";

const folder: ChatFolderSummary = {
  id: "folder-1",
  name: "Audits",
  sortOrder: 0,
  sessionCount: 1,
  createdAt: 1,
  updatedAt: 1,
};

function session(id: string, folderId: string | null): ChatSessionSummary {
  return {
    id,
    folderId,
    title: id,
    preview: null,
    messageCount: 0,
    startedAt: 1,
    updatedAt: 1,
    current: false,
  };
}

describe("groupChatSessionsByFolder", () => {
  it("groups known folder assignments and treats stale assignments as unfiled", () => {
    const result = groupChatSessionsByFolder(
      [
        session("known", folder.id),
        session("none", null),
        session("stale", "removed-folder"),
      ],
      [folder],
    );

    expect(result.byFolder.get(folder.id)?.map((item) => item.id)).toEqual([
      "known",
    ]);
    expect(result.unfiled.map((item) => item.id)).toEqual(["none", "stale"]);
  });
});
