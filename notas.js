import { Redis } from "@upstash/redis";

// Aceita tanto as variáveis do Upstash quanto as antigas do Vercel KV
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const TTL = 60 * 60 * 24 * 30; // 30 dias sem uso => sala apagada
const MAX_NOTAS = 500;

const salaOk = (s) => typeof s === "string" && /^[a-z0-9]{12,40}$/i.test(s);
const idOk = (s) => typeof s === "string" && /^[a-z0-9]{1,60}$/i.test(s);
const key = (sala) => `sala:${sala}`;

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!redis) {
    return res.status(500).json({ erro: "Banco não configurado. Adicione o Upstash Redis em Storage no Vercel e faça um novo deploy." });
  }

  const q = req.query || {};
  const body = req.method === "GET" || req.method === "DELETE" ? {} : await readBody(req);
  const sala = q.sala || body.sala;
  if (!salaOk(sala)) return res.status(400).json({ erro: "Sala inválida." });
  const k = key(sala);

  try {
    if (req.method === "GET") {
      const all = (await redis.hgetall(k)) || {};
      const notas = Object.values(all)
        .map((v) => (typeof v === "string" ? JSON.parse(v) : v))
        .sort((a, b) => b.criadoEm - a.criadoEm);
      return res.status(200).json({ notas });
    }

    if (req.method === "POST") {
      const raw = String(body.raw || "").slice(0, 2000);
      if (!raw) return res.status(400).json({ erro: "Nada para enviar." });
      const m = raw.replace(/\s/g, "").match(/\d{44}/);
      const chave = m ? m[0] : null;
      const id = chave || "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

      if (chave && (await redis.hexists(k, id))) {
        return res.status(200).json({ duplicada: true, id });
      }
      if ((await redis.hlen(k)) >= MAX_NOTAS) {
        return res.status(409).json({ erro: "Limite de notas atingido. Limpe as copiadas no PC." });
      }
      const nota = { id, chave, raw, criadoEm: Date.now(), copiada: false };
      await redis.hset(k, { [id]: JSON.stringify(nota) });
      await redis.expire(k, TTL);
      return res.status(200).json({ ok: true, nota });
    }

    if (req.method === "PATCH") {
      const ids = Array.isArray(body.ids) ? body.ids.filter(idOk).slice(0, MAX_NOTAS) : [];
      if (!ids.length) return res.status(400).json({ erro: "Sem ids." });
      const atuais = await redis.hmget(k, ...ids);
      const upd = {};
      ids.forEach((id) => {
        const v = atuais && atuais[id];
        if (!v) return;
        const n = typeof v === "string" ? JSON.parse(v) : v;
        n.copiada = body.copiada !== false;
        upd[id] = JSON.stringify(n);
      });
      if (Object.keys(upd).length) await redis.hset(k, upd);
      await redis.expire(k, TTL);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const ids = String(q.ids || "").split(",").filter(idOk).slice(0, MAX_NOTAS);
      if (!ids.length) return res.status(400).json({ erro: "Sem ids." });
      await redis.hdel(k, ...ids);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ erro: "Método não permitido." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Erro no servidor." });
  }
}
