import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_FILE = path.join(ROOT, "out", "demo-data.json");

const JAPANESE_TERMS = [
  "猫", "学校", "食べる", "勉強", "日本語", "ありがとう", "水", "本", "行く", "見る",
  "大きい", "小さい", "今日", "明日", "昨日", "友達", "先生", "学生", "時間", "仕事",
  "電車", "駅", "買う", "売る", "話す", "聞く", "読む", "書く", "分かる", "知る",
  "好き", "嫌い", "楽しい", "難しい", "易しい", "美しい", "新しい", "古い", "高い", "安い",
  "春", "夏", "秋", "冬", "雨", "雪", "風", "空", "海", "山",
  "犬", "鳥", "魚", "花", "木", "車", "道", "町", "国", "世界",
  "家族", "父", "母", "兄", "姉", "弟", "妹", "子供", "男", "女",
  "朝", "昼", "夜", "午前", "午後", "週末", "毎日", "時々", "全然", "少し",
  "大丈夫", "元気", "病気", "病院", "薬", "食事", "朝ごはん", "昼ごはん", "晩ごはん", "お茶",
  "コーヒー", "ビール", "酒", "肉", "野菜", "果物", "卵", "米", "パン", "砂糖",
];

const FIRST_NAMES = [
  "Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery", "Jamie",
  "Noah", "Emma", "Liam", "Olivia", "Yuki", "Hana", "Kenji", "Sakura", "Marco", "Lucía",
];

const LAST_NAMES = [
  "García", "Smith", "Tanaka", "Martín", "Lee", "Kim", "Brown", "López", "Müller", "Sato",
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Android 14; Mobile; rv:123.0) Gecko/123.0 Firefox/123.0",
];

const COMMENTS = [
  "La lectura no coincide con el diccionario.",
  "Furigana incorrecta en la tarjeta.",
  "Falta un sentido común en la definición.",
  "El término aparece vacío tras el lookup.",
  "Ejemplo de oración no carga.",
  "Confianza demasiado alta para este resultado.",
  "Kanji stroke order no se muestra.",
  "",
  "Typo en la traducción al español.",
  "Duplicado con otra entrada del mismo kanji.",
];

function pick(arr) {
  return arr[randomInt(arr.length)];
}

function randomPastIso(daysBack = 365) {
  const now = Date.now();
  const offset = randomInt(daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - offset).toISOString();
}

function fakeEmail(displayName, index) {
  const slug = displayName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, ".")
    .toLowerCase();
  const domain = pick(["example.com", "mail.test", "nihoncheck.demo", "learner.local"]);
  return `${slug || "user"}.${index}@${domain}`;
}

function generateUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const displayName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const user = {
      id: `u_${randomUUID()}`,
      email: fakeEmail(displayName, i + 1),
      displayName,
      createdAt: randomPastIso(400),
    };
    if (randomInt(100) < 75) {
      user.perfil = {
        nivelActual: randomInt(5) + 1,
        diagnosticoCompletado: randomInt(100) < 60,
      };
    }
    users.push(user);
  }
  return users;
}

function generateReports(count, users) {
  const reports = [];
  const userIds = users.map((u) => u.id);
  for (let i = 0; i < count; i++) {
    reports.push({
      id: `r_${randomBytes(8).toString("hex")}`,
      term: pick(JAPANESE_TERMS),
      comment: pick(COMMENTS),
      date: randomPastIso(180),
      userAgent: pick(USER_AGENTS),
      sourceUrl: pick([
        "http://localhost:3000/",
        "http://localhost:3000/index.html",
        "http://127.0.0.1:3000/",
        "http://localhost:3000/diagnostico.html",
      ]),
      userId: pick(userIds),
    });
  }
  return reports;
}

async function main() {
  const users = generateUsers(50);
  const reports = generateReports(200, users);
  const payload = {
    generatedAt: new Date().toISOString(),
    users,
    reports,
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload, null, 2), "utf8");

  const withPerfil = users.filter((u) => u.perfil).length;
  console.log("NihonCheck seed complete");
  console.log(`  Output: ${OUT_FILE}`);
  console.log(`  Users: ${users.length} (${withPerfil} with perfil snapshot)`);
  console.log(`  Reports: ${reports.length}`);
  console.log(`  Sample user: ${JSON.stringify(users[0], null, 2)}`);
  console.log(`  Sample report: ${JSON.stringify(reports[0], null, 2)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
