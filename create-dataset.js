import fs from "fs";

const url =
  "https://datasets-server.huggingface.co/rows?dataset=newfacade%2FLeetCodeDataset&config=default&split=train&offset=0&length=100";

const res = await fetch(url);
const data = await res.json();

fs.writeFileSync("leetcode_dataset.json", JSON.stringify(data, null, 2));

console.log("Saved successfully");