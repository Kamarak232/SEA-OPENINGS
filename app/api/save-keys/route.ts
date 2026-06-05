import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export async function POST(req: NextRequest) {
  try {
    const { keys } = await req.json() as { keys: Record<string, string> };
    const envPath = join(process.cwd(), ".env.local");

    let content = "";
    try { content = readFileSync(envPath, "utf-8"); } catch { /* file may not exist */ }

    for (const [k, v] of Object.entries(keys)) {
      if (!v) continue;
      const regex = new RegExp(`^${k}=.*$`, "m");
      if (regex.test(content)) {
        content = content.replace(regex, `${k}=${v}`);
      } else {
        content += `\n${k}=${v}`;
      }
      // Apply immediately without restart
      process.env[k] = v;
    }

    writeFileSync(envPath, content.trim() + "\n");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
