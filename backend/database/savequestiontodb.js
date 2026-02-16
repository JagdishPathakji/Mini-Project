const dataset = require("C:/Users/patha/OneDrive/Desktop/Mini-Project/leetcode_dataset.js");
const question = require("./models/question");
const db_connect = require("./dbconnection");

// slug → Title Case
function slugToTitle(slug = "") {
  return slug
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function savedata() {
  await db_connect();
  console.log("✅ DB connected");

  let count = 0;

  for (const item of dataset) {
    const row = item.row;

    if (!row?.question_id || !row?.problem_description || !row?.starter_code) {
      continue;
    }

    const doc = {
      qno: row.question_id,
      qheading: slugToTitle(row.task_id),
      qdescription: row.problem_description.trim(),
      qtags: Array.isArray(row.tags) ? row.tags : [],
      qinput_output: Array.isArray(row.input_output)
        ? row.input_output.map(io => ({
            input: String(io.input),
            output: String(io.output)
          }))
        : [],
      qstartcode: row.starter_code.trim(),
      qdifficulty: row.difficulty
    };

    try {
      await question.updateOne(
        { qno: doc.qno },
        { $setOnInsert: doc },
        { upsert: true }
      );
      count++;

      if(count == 50)
      break
    } catch (err) {
      console.error(`❌ Failed qno ${doc.qno}:`, err.message);
    }
  }

  console.log(`🎯 Import completed. Saved: ${count}`);
}

savedata().catch(err => {
  console.error("🔥 Fatal error:", err);
});
