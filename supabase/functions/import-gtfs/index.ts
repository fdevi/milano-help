import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(parseCSVLine);
  return { headers, rows };
}

function getCol(headers: string[], row: string[], name: string): string {
  const idx = headers.indexOf(name);
  return idx >= 0 ? row[idx] ?? "" : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const table = url.searchParams.get("table");

    if (!table || !["routes", "trips", "stop_times", "fermate"].includes(table)) {
      return new Response(
        JSON.stringify({ error: "Specify ?table=routes|trips|stop_times|fermate" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    console.log(`[import-gtfs] table=${table}, body length=${body.length}, first 200 chars: ${body.substring(0, 200)}`);
    if (!body || body.length < 10) {
      return new Response(
        JSON.stringify({ error: "Send CSV data as POST body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { headers, rows } = parseCSV(body);
    let inserted = 0;
    const batchSize = 500;

    if (table === "fermate") {
      const data = rows
        .map((r) => ({
          stop_id: getCol(headers, r, "stop_id"),
          stop_name: getCol(headers, r, "stop_name"),
          stop_lat: parseFloat(getCol(headers, r, "stop_lat")),
          stop_lon: parseFloat(getCol(headers, r, "stop_lon")),
        }))
        .filter((r) => r.stop_id && !isNaN(r.stop_lat) && !isNaN(r.stop_lon));

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const { error } = await supabase.from("fermate_atm").upsert(batch, { onConflict: "stop_id" });
        if (error) return errorResp(error.message, inserted, i);
        inserted += batch.length;
      }
    } else if (table === "routes") {
      const data = rows
        .map((r) => ({
          route_id: getCol(headers, r, "route_id"),
          route_short_name: getCol(headers, r, "route_short_name"),
          route_long_name: getCol(headers, r, "route_long_name"),
          route_type: parseInt(getCol(headers, r, "route_type")) || 0,
        }))
        .filter((r) => r.route_id);

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const { error } = await supabase.from("routes_atm").upsert(batch, { onConflict: "route_id" });
        if (error) return errorResp(error.message, inserted, i);
        inserted += batch.length;
      }
    } else if (table === "trips") {
      const data = rows
        .map((r) => ({
          trip_id: getCol(headers, r, "trip_id"),
          route_id: getCol(headers, r, "route_id"),
          direction_id: parseInt(getCol(headers, r, "direction_id")) || 0,
          trip_headsign: getCol(headers, r, "trip_headsign"),
        }))
        .filter((r) => r.trip_id && r.route_id);

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const { error } = await supabase.from("trips_atm").upsert(batch, { onConflict: "trip_id" });
        if (error) return errorResp(error.message, inserted, i);
        inserted += batch.length;
      }
    } else if (table === "stop_times") {
      const data = rows
        .map((r) => ({
          trip_id: getCol(headers, r, "trip_id"),
          stop_id: getCol(headers, r, "stop_id"),
          arrival_time: getCol(headers, r, "arrival_time"),
          departure_time: getCol(headers, r, "departure_time"),
          stop_sequence: parseInt(getCol(headers, r, "stop_sequence")) || 0,
        }))
        .filter((r) => r.trip_id && r.stop_id);

      // Larger batches for stop_times since there are millions of rows
      const stBatchSize = 1000;
      for (let i = 0; i < data.length; i += stBatchSize) {
        const batch = data.slice(i, i + stBatchSize);
        const { error } = await supabase
          .from("stop_times_atm")
          .upsert(batch, { onConflict: "trip_id,stop_sequence" });
        if (error) return errorResp(error.message, inserted, i);
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted, total_lines: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function errorResp(msg: string, inserted: number, batchIndex: number) {
  return new Response(
    JSON.stringify({ error: msg, inserted, batch_index: batchIndex }),
    { status: 500, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
  );
}
