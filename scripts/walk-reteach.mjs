const base = (process.argv[2] || "http://127.0.0.1:3000").replace(/\/$/, "");
const scenes = ["base-ten", "number-line", "fraction", "in", "out", "parent"];

console.log("Walk one child through the tools, the step back, the return, and the parent notes.");
console.log("Watch for relief or frustration, the return line, finger use, and whether the strategy tag matches.");
for (const scene of scenes) {
  console.log(`${base}/preview/reteach?scene=${scene}`);
}
