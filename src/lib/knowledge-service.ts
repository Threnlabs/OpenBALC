import { supabase } from "./supabase";

export interface KnowledgeNode {
  id: string;
  name: string;
  type: "course" | "subject" | "folder" | "file";
  path: string;
  body?: string;
}

export class KnowledgeService {
  private static LOOKUP_KEY = "scholarsanchor_knowledge_lookup";

  static async syncLookup() {
    console.log("Syncing knowledge lookup...");
    try {
      const profile = JSON.parse(localStorage.getItem('admin_profile') || localStorage.getItem('user_profile') || '{}');
      const teamId = profile.team_id;
      if (!teamId) return [];

      // Fetch all files from the knowledge schema
      const { data: files, error } = await supabase
        .from("knowledge_files")
        .select("id, name, folder_id, body")
        .eq("team_id", teamId);

      if (error) throw error;

      // For now, we'll just index files by name/path
      // In a real app, we'd fetch the whole tree to get full paths
      const lookup: KnowledgeNode[] = files.map(f => ({
        id: f.id,
        name: f.name,
        type: "file",
        path: `knowledge/${f.name}`, // Placeholder path
        body: f.body
      }));

      localStorage.setItem(this.LOOKUP_KEY, JSON.stringify(lookup));
      return lookup;
    } catch (err) {
      console.error("Failed to sync knowledge lookup:", err);
      return [];
    }
  }

  static getLookup(): KnowledgeNode[] {
    const data = localStorage.getItem(this.LOOKUP_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async getFileContent(fileId: string): Promise<string> {
    const { data, error } = await supabase
      .from("knowledge_files")
      .select("body")
      .eq("id", fileId)
      .single();

    if (error) return "";
    return data.body || "";
  }
}
