export interface Darta {
  id: string;
  dartaNumber: string;
  title: string;
  description?: string | null;
  category?: string | null;
  subject?: string | null;
  status: string;
  priority: string;
  remarks?: string | null;
  createdAt: string;
  documents: Array<{ id: string; title: string; fileName: string }>;
  _count: {
    documents: number;
    movements: number;
  };
}

export interface PatraChalani {
  id: string;
  chalaniNumber: string;
  patraNumber?: string | null;
  type: string;
  subject: string;
  from?: string | null;
  to?: string | null;
  date: string;
  receivedDate?: string | null;
  sentDate?: string | null;
  priority: string;
  status: string;
  category?: string | null;
  createdAt: string;
  documents: Array<{ id: string; title: string; fileName: string }>;
  _count: {
    documents: number;
    actions: number;
  };
}

export type RecordType = 'darta' | 'chalani' | 'all';

