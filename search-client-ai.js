import fs from "fs";
import path from "path";

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".git" && file !== "dist") {
        results = results.concat(walk(filePath));
      }
    } else {
      results.push(filePath);
    }
  });
  return results;
};

const files = walk("./client/src");
const keywords = ["gemini", "openai", "google", "api-key", "apikey"];

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, "utf-8");
    const found = keywords.filter(kw => content.toLowerCase().includes(kw));
    if (found.length > 0) {
      console.log(`Found keywords ${JSON.stringify(found)} in: ${file}`);
    }
  } catch (e) {
    // ignore
  }
});
