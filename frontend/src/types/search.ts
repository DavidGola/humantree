export interface SearchResult {
  id: number;
  name: string;
  description: string | null;
  creator_username: string;
  created_at: string;
  tags: string[];
  score: number;
}

export interface SearchResults {
  results: SearchResult[];
  total: number;
  query: string;
}
