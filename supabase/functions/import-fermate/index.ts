import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get the CSV data from body
    const body = await req.text();
    if (!body || body.length < 10) {
      return new Response(JSON.stringify({ error: "Send CSV data as POST body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const lines = body.split("\n").filter((l) => l.trim().length > 0);
    
    // Skip header if present
    const firstLine = lines[0];
    const dataLines = firstLine.includes("stop_id") ? lines.slice(1) : lines;
    
    function parseCSVLine(line: string): string[] {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          result.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
      result.push(current);
      return result;
    }

    const rows = dataLines.map((line) => {
      const fields = parseCSVLine(line);
      return {
        stop_id: fields[0],
        stop_name: fields[2],
        stop_lat: parseFloat(fields[4]),
        stop_lon: parseFloat(fields[5]),
      };
    }).filter(r => r.stop_id && !isNaN(r.stop_lat) && !isNaN(r.stop_lon));

    let inserted = 0;
    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from("fermate_atm").upsert(batch, { onConflict: "stop_id" });
      if (error) {
        return new Response(JSON.stringify({ error: error.message, inserted, batch_index: i }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted += batch.length;
    }

    return new Response(JSON.stringify({ success: true, inserted, total_lines: dataLines.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
