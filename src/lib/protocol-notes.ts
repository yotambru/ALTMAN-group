/** Extra protocol fields persisted in `notes` (no extra DB columns). */

export interface ProtocolNotesExtras {
  docIds: string[];
  meterElectricityReading?: string;
  meterWaterReading?: string;
  meterGasReading?: string;
  keysApartment?: number;
  keysStorage?: number;
  keysMailbox?: number;
  keysNote?: string;
}

interface StoredNotes {
  docs?: string;
  readings?: {
    electricity?: string;
    water?: string;
    gas?: string;
  };
  keys?: {
    apartment?: number;
    storage?: number;
    mailbox?: number;
    note?: string;
  };
}

export function serializeProtocolNotes(extras: ProtocolNotesExtras): string {
  const payload: StoredNotes = {
    docs: extras.docIds.join(","),
    readings: {
      electricity: extras.meterElectricityReading || undefined,
      water: extras.meterWaterReading || undefined,
      gas: extras.meterGasReading || undefined,
    },
    keys: {
      apartment: extras.keysApartment,
      storage: extras.keysStorage,
      mailbox: extras.keysMailbox,
      note: extras.keysNote || undefined,
    },
  };
  return JSON.stringify(payload);
}

export function parseProtocolNotes(notes?: string | null): ProtocolNotesExtras {
  if (!notes) return { docIds: [] };
  if (notes.startsWith("docs:")) {
    return { docIds: notes.slice(5).split(",").filter(Boolean) };
  }
  try {
    const parsed = JSON.parse(notes) as StoredNotes;
    const docs = String(parsed.docs ?? "");
    return {
      docIds: docs.split(",").filter(Boolean),
      meterElectricityReading: parsed.readings?.electricity || undefined,
      meterWaterReading: parsed.readings?.water || undefined,
      meterGasReading: parsed.readings?.gas || undefined,
      keysApartment: parsed.keys?.apartment,
      keysStorage: parsed.keys?.storage,
      keysMailbox: parsed.keys?.mailbox,
      keysNote: parsed.keys?.note || undefined,
    };
  } catch {
    return { docIds: [] };
  }
}
