const base = (process.argv[2] || "http://127.0.0.1:3000").replace(/\/$/, "");
const styles = ["guided", "standard", "buggy"];

console.log("Walk one child through guided, then standard, then buggy.");
console.log("Watch for confusion, frustration, an explanation said out loud, and time on task.");
for (const style of styles) {
  console.log(`${base}/preview/show-me-styles?style=${style}`);
}
console.log(`${base}/preview/show-me-styles?style=fix`);
console.log(`${base}/preview/show-me-styles?style=fallback`);
