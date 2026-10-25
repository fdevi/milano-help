import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
}));
vi.mock("@/pages/EventoPage", () => ({ default: () => null }));
vi.mock("@/lib/publicEvent.functions", () => ({ getPublicEvent: vi.fn() }));

import { getPublicEvent } from "@/lib/publicEvent.functions";
import { Route } from "@/routes/evento/$id";

const route = Route as unknown as {
  loader: (input: { params: { id: string } }) => Promise<{ event: unknown }>;
};

describe("event share-preview loader", () => {
  it.each(["Invalid event ID", "Missing public configuration", "Lookup failed"])(
    "keeps the event page accessible when the preview fails: %s",
    async (message) => {
      vi.mocked(getPublicEvent).mockRejectedValueOnce(new Error(message));
      await expect(route.loader({ params: { id: "invalid" } })).resolves.toEqual({ event: null });
    },
  );

  it("preserves successful preview data", async () => {
    const event = {
      titolo: "Evento di quartiere", descrizione: "Incontro", luogo: "Milano",
      stato: "attivo", immagine: null, data: "2026-10-26T18:00:00Z", fine: null,
    };
    vi.mocked(getPublicEvent).mockResolvedValueOnce(event);
    await expect(route.loader({ params: { id: "9f66962c-1951-4336-9411-80bcd5585857" } })).resolves.toEqual({ event });
  });
});